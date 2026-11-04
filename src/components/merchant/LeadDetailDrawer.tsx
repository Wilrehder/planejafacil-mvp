import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Mail, 
  Phone, 
  User, 
  X,
  FileText, 
  Paperclip, 
  Send, 
  MessageSquare, 
  AlertCircle, 
  XCircle, 
  Upload,
  ExternalLink,
  Loader2,
  Armchair,
  Plus,
  Trash2,
  ShoppingBag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus } from '../../types';
import { 
  uploadAndAttachProposal, 
  addLeadNoteOnServer, 
  updateLeadStageOnServer, 
  convertLeadToOrderOnServer,
  STORE_ID_TO_TENANT_UUID 
} from '../../lib/crmService';
import { parsePromobXML, PromobProjectData } from '../../lib/promobParser';
import { PromobNegotiationModal } from './PromobNegotiationModal';
import { 
  fetchStoreFurniture, 
  updateLeadConventionalItems, 
  ConventionalFurnitureItem 
} from '../../lib/conventionalFurnitureService';

interface LeadDetailDrawerProps {
  onLeadUpdated?: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ onLeadUpdated }) => {
  const { selectedLeadForDetail, setSelectedLeadForDetail, updateLead, updateLeadStatus } = useApp();
  const [newCommentText, setNewCommentText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(null);

  // Estado do Modal de Negociação Promob XML
  const [pendingPromob, setPendingPromob] = useState<{
    file: File;
    promobInfo: PromobProjectData;
    tenantUuid: string;
  } | null>(null);

  // Móveis Convencionais
  const [storeFurnitureCatalog, setStoreFurnitureCatalog] = useState<ConventionalFurnitureItem[]>([]);
  const [isFurniturePickerOpen, setIsFurniturePickerOpen] = useState(false);
  const [selectedFurnitureToAdd, setSelectedFurnitureToAdd] = useState<string>('');
  const [furnitureQuantity, setFurnitureQuantity] = useState<number>(1);
  const [savingFurniture, setSavingFurniture] = useState(false);

  useEffect(() => {
    if (selectedLeadForDetail?.assignedStoreId) {
      const tid = STORE_ID_TO_TENANT_UUID[selectedLeadForDetail.assignedStoreId] || selectedLeadForDetail.assignedStoreId;
      fetchStoreFurniture(tid).then(items => {
        setStoreFurnitureCatalog(items.filter(i => i.isActive));
      });
    }
  }, [selectedLeadForDetail?.assignedStoreId]);

  if (!selectedLeadForDetail) return null;

  const lead = selectedLeadForDetail;
  const isPlatformLead = !lead.isExternal && lead.source !== 'instagram' && lead.source !== 'google' && lead.source !== 'indicacao' && lead.source !== 'balcao';
  const assignmentId = lead.assignmentId || lead.id;

  const handleAddFurnitureItem = async () => {
    if (!selectedFurnitureToAdd) return;
    const found = storeFurnitureCatalog.find(f => f.id === selectedFurnitureToAdd);
    if (!found) return;

    setSavingFurniture(true);
    const qty = Math.max(1, Number(furnitureQuantity) || 1);
    const existing = lead.conventionalItems || [];
    const itemTotal = found.salePrice * qty;

    const newItem = {
      id: found.id,
      name: found.name,
      category: found.category,
      quantity: qty,
      salePrice: found.salePrice,
      total: itemTotal,
    };

    const updatedItems = [...existing, newItem];
    await updateLeadConventionalItems(assignmentId, updatedItems);
    
    const updatedLead = {
      ...lead,
      conventionalItems: updatedItems,
    };
    updateLead(lead.id, { conventionalItems: updatedItems });
    setSelectedLeadForDetail(updatedLead);
    setIsFurniturePickerOpen(false);
    setSelectedFurnitureToAdd('');
    setFurnitureQuantity(1);
    setSavingFurniture(false);
    onLeadUpdated?.();
  };

  const handleRemoveFurnitureItem = async (indexToRemove: number) => {
    const existing = lead.conventionalItems || [];
    const updatedItems = existing.filter((_, idx) => idx !== indexToRemove);
    await updateLeadConventionalItems(assignmentId, updatedItems);
    const updatedLead = {
      ...lead,
      conventionalItems: updatedItems,
    };
    updateLead(lead.id, { conventionalItems: updatedItems });
    setSelectedLeadForDetail(updatedLead);
    onLeadUpdated?.();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const text = newCommentText.trim();
    setNewCommentText('');

    try {
      const res = await addLeadNoteOnServer(assignmentId, text);
      const newNote = res.success && res.note ? res.note : {
        id: `note-${Date.now()}`,
        author: 'Consultor Comercial',
        text,
        createdAt: new Date().toISOString(),
      };

      const currentNotes = lead.notesList || [];
      const updatedNotes = [newNote, ...currentNotes];

      updateLead(lead.id, {
        notesList: updatedNotes,
      });

      setSelectedLeadForDetail({
        ...lead,
        notesList: updatedNotes,
      });
      onLeadUpdated?.();
    } catch {
      // fallback
    }
  };

  const executeUploadAndAttach = async (
    file: File, 
    tenantUuid: string, 
    commercialOverride?: { finalPrice: number; factoryCost: number; summaryNote: string }
  ) => {
    try {
      setIsUploading(true);
      setValidationError(null);

      const uploadRes = await uploadAndAttachProposal(assignmentId, file, tenantUuid);
      if (!uploadRes.success) {
        setValidationError(uploadRes.error || 'Erro ao enviar anexo.');
        setIsUploading(false);
        return;
      }

      await updateLeadStageOnServer(assignmentId, 'orcado');

      const updatedLeadData: any = {
        attachmentName: uploadRes.attachmentName || file.name,
        attachmentUrl: uploadRes.attachmentUrl || URL.createObjectURL(file),
        status: 'orcado' as LeadStatus,
      };

      if (commercialOverride) {
        updatedLeadData.estimatedMax = commercialOverride.finalPrice;
        if (commercialOverride.factoryCost > 0) {
          updatedLeadData.estimatedMin = commercialOverride.factoryCost;
        }
        await addLeadNoteOnServer(assignmentId, commercialOverride.summaryNote);
      }

      updateLead(lead.id, updatedLeadData);
      setSelectedLeadForDetail({
        ...lead,
        ...updatedLeadData,
      });

      onLeadUpdated?.();
    } catch (err: any) {
      setValidationError(err?.message || 'Falha ao processar upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setValidationError('O arquivo não pode exceder 15MB.');
      return;
    }

    const tenantUuid =
      STORE_ID_TO_TENANT_UUID[lead.assignedStoreId] ||
      lead.assignedStoreId ||
      'b1010000-0000-0000-0000-000000000001';

    // Se for arquivo XML do Promob, intercepta para abrir o Modal de Conferência e Negociação
    if (file.name.toLowerCase().endsWith('.xml')) {
      try {
        const xmlText = await file.text();
        const promobInfo = parsePromobXML(xmlText);
        if (promobInfo && promobInfo.budgetValue > 0) {
          setPendingPromob({ file, promobInfo, tenantUuid });
          return;
        }
      } catch (err: any) {
        console.warn('Erro ao processar XML Promob:', err);
      }
    }

    // Caso seja PDF ou outro arquivo normal
    await executeUploadAndAttach(file, tenantUuid);
  };

  const handleConfirmPromobNegotiation = async (result: {
    finalPrice: number;
    factoryCost: number;
    discountPct: number;
    paymentMethod: string;
    installments: number;
    netProfit: number;
    summaryNote: string;
  }) => {
    if (!pendingPromob) return;
    await executeUploadAndAttach(pendingPromob.file, pendingPromob.tenantUuid, {
      finalPrice: result.finalPrice,
      factoryCost: result.factoryCost,
      summaryNote: result.summaryNote,
    });
    setPendingPromob(null);
  };

  const handleStageChangeAttempt = async (targetStatus: LeadStatus) => {
    setValidationError(null);
    setRecommendationNotice(null);

    // Regra Rígida: Só pode passar para 'orcado' se tiver documento Promob ou proposta anexada
    if (targetStatus === 'orcado' && !lead.attachmentName) {
      setValidationError('⚠️ Bloqueio de Etapa: Para avançar para "Orçado", é obrigatório anexar o projeto técnico ou documento do Promob no campo abaixo.');
      return;
    }

    try {
      const res = await updateLeadStageOnServer(assignmentId, targetStatus);
      if (!res.success) {
        setValidationError(res.error || 'Erro ao alterar etapa.');
        return;
      }

      if (targetStatus === 'convertido') {
        const estValue = Math.round(((lead.estimatedMin || 15000) + (lead.estimatedMax || 25000)) / 2);
        await convertLeadToOrderOnServer(assignmentId, estValue);
      }

      updateLeadStatus(lead.id, targetStatus);
      setSelectedLeadForDetail({
        ...lead,
        status: targetStatus,
      });
      onLeadUpdated?.();
    } catch (err: any) {
      setValidationError(err?.message || 'Falha ao atualizar etapa.');
    }
  };

  const handleFinalDecision = async (decision: 'convertido' | 'perdido') => {
    setValidationError(null);
    setRecommendationNotice(null);

    if (decision === 'convertido' && !lead.attachmentName) {
      setRecommendationNotice('Atenção: A conversão em pedido ERP foi efetuada. Recomendamos incluir o contrato ou proposta na pasta do cliente.');
    }

    try {
      const res = await updateLeadStageOnServer(assignmentId, decision);
      if (!res.success) {
        setValidationError(res.error || 'Falha ao registrar decisão.');
        return;
      }

      if (decision === 'convertido') {
        const estValue = Math.round(((lead.estimatedMin || 15000) + (lead.estimatedMax || 25000)) / 2);
        await convertLeadToOrderOnServer(assignmentId, estValue);
      }

      const updates = {
        finalDecision: decision,
        status: decision,
      };
      updateLead(lead.id, updates);
      setSelectedLeadForDetail({
        ...lead,
        ...updates,
      });
      setValidationError(null);
      onLeadUpdated?.();
    } catch (err: any) {
      setValidationError(err?.message || 'Erro ao processar resultado.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header Limpo do Modal */}
        <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg sm:text-xl font-black text-white">{lead.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              isPlatformLead ? 'bg-[#439346] text-white' : 'bg-amber-400 text-slate-950'
            }`}>
              {isPlatformLead ? 'Lead da Plataforma' : `Lead Externo (${lead.source || 'Manual'})`}
            </span>
          </div>

          <button
            onClick={() => setSelectedLeadForDetail(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid 2-Colunas */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          
          {/* Mensagem de Alerta se faltar anexo ou erro de validação */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Aviso Recomendatório (Flexibilização da Regra Comercial) */}
          {recommendationNotice && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{recommendationNotice}</span>
            </div>
          )}

          {/* Bar de Troca Rápida de Etapa no Funil */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black text-[#1B2B48] uppercase tracking-wider">Etapa Atual:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'novo', label: 'Novo' },
                { id: 'em_atendimento', label: 'Em Atendimento' },
                { id: 'orcado', label: 'Orçado' },
                { id: 'convertido', label: 'Fechado' },
                { id: 'perdido', label: 'Perdido' },
              ].map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => handleStageChangeAttempt(stg.id as LeadStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    lead.status === stg.id
                      ? 'bg-[#1B2B48] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {stg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Principal: Coluna Esquerda (Dados & Orçamento) | Coluna Direita (Anexos, Decisão & Comentários) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUNA ESQUERDA */}
            <div className="space-y-5">
              
              {/* Contato Inicial */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-[#439346]" />
                  <span>Contato do Cliente</span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">WhatsApp:</span> <strong className="text-[#439346]">{lead.phone}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">E-mail:</span> <strong className="text-slate-800">{lead.email}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Cidade/UF:</span> <strong className="text-slate-800">{lead.city} - {lead.state}</strong></div>
              </div>

              {/* Orçamento e Cômodos da Plataforma */}
              {isPlatformLead && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#439346]" />
                    <span>Simulação de Móveis no App</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Estimativa Calculada:</span>
                    <span className="text-base font-black text-[#439346]">{formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}</span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">Ambientes Solicitados:</span>
                    <strong className="text-white text-sm">{lead.environment}</strong>
                  </div>

                  {lead.environmentsData && lead.environmentsData.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      {lead.environmentsData.map((env, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded-xl text-[11px] flex justify-between font-semibold">
                          <span>{env.name}</span>
                          <span className="text-emerald-400">{env.areaM2}m² • {env.wallCount} Paredes</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Seção de Móveis Convencionais / Pronta Entrega */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                    <Armchair className="w-4 h-4 text-amber-600" />
                    <span>Móveis Convencionais</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFurniturePickerOpen(true)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Móvel</span>
                  </button>
                </div>

                {lead.conventionalItems && lead.conventionalItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      {lead.conventionalItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {item.quantity}x de {formatCurrency(item.salePrice)} • {item.category || 'Móvel'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs">{formatCurrency(item.total)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFurnitureItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Remover móvel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Subtotal Convencionais:</span>
                      <span className="font-black text-amber-700 text-sm">
                        {formatCurrency(lead.conventionalItems.reduce((acc, curr) => acc + curr.total, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-[11px]">
                    Nenhum móvel convencional adicionado a este orçamento.
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA */}
            <div className="space-y-5">
              
              {/* Anexo de Orçamento Obrigatório com Storage Real */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                  <Paperclip className="w-4 h-4 text-[#439346]" />
                  <span>Anexo do Orçamento Técnico *</span>
                </div>

                {lead.attachmentName ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center space-x-2 text-[#439346] font-extrabold">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[180px]">{lead.attachmentName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {lead.attachmentUrl && (
                        <a 
                          href={lead.attachmentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 rounded bg-white text-emerald-700 hover:text-emerald-900 border border-emerald-200"
                          title="Visualizar documento"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-[10px] font-black bg-[#439346] text-white px-2 py-0.5 rounded-md">Anexado</span>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#439346] rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-1 bg-slate-50 text-center">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 text-[#439346] animate-spin" />
                        <span className="text-xs font-bold text-slate-700">Processando e enviando anexo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-xs font-bold text-[#1B2B48]">Anexar Proposta Técnica ou Promob XML</span>
                        <span className="text-[10px] text-slate-400">Aceita arquivos PDF ou XML Promob (.xml) com auto-preenchimento</span>
                        <input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" onChange={handleRealFileUpload} disabled={isUploading} className="hidden" />
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Decisão Final de Fechamento */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider">Resultado da Venda:</div>

                {lead.finalDecision ? (
                  <div className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-between ${
                    lead.finalDecision === 'convertido' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                  }`}>
                    <span>Decisão: {lead.finalDecision === 'convertido' ? 'VENDA FECHADA' : 'PERDIDO'}</span>
                    <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded uppercase font-bold">Registrado</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFinalDecision('convertido')}
                      disabled={!lead.attachmentName}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all ${
                        lead.attachmentName ? 'bg-[#439346] hover:bg-[#387F3B] text-white cursor-pointer shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Fechado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinalDecision('perdido')}
                      disabled={!lead.attachmentName}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all ${
                        lead.attachmentName ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Perdido</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Feed de Comentários / Observações */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-[#439346]" />
                  <span>Observações & Histórico</span>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Adicionar nota comercial..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#439346]"
                  />
                  <button type="submit" className="px-3 py-2 rounded-xl bg-[#1B2B48] hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {lead.notesList && lead.notesList.length > 0 ? (
                    lead.notesList.map((note) => (
                      <div key={note.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                          <span>{note.author}</span>
                          <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-800 font-semibold">{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 py-2">Sem observações ainda.</p>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Modal de Conferência e Negociação Promob XML */}
      {pendingPromob && (
        <PromobNegotiationModal
          isOpen={!!pendingPromob}
          onClose={() => setPendingPromob(null)}
          onConfirm={handleConfirmPromobNegotiation}
          promobData={pendingPromob.promobInfo}
          fileName={pendingPromob.file.name}
          tenantId={pendingPromob.tenantUuid}
          clientName={lead.name}
          environmentName={lead.environment}
        />
      )}

      {/* Modal / Pop-up de Adição de Móvel Convencional ao Orçamento */}
      {isFurniturePickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Armchair className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-[#1B2B48]">Adicionar Móvel ao Orçamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFurniturePickerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {storeFurnitureCatalog.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold space-y-2">
                <p>Nenhum móvel cadastrado no catálogo da loja.</p>
                <p className="text-[11px] text-amber-700 font-normal">
                  Cadastre produtos na aba <strong>"Móveis Convencionais"</strong> do painel.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    Selecione o Produto do Catálogo:
                  </label>
                  <select
                    value={selectedFurnitureToAdd}
                    onChange={(e) => setSelectedFurnitureToAdd(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white outline-none focus:border-amber-500"
                  >
                    <option value="">-- Escolha um móvel --</option>
                    {storeFurnitureCatalog.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {formatCurrency(f.salePrice)} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                    Quantidade:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={furnitureQuantity}
                    onChange={(e) => setFurnitureQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                {selectedFurnitureToAdd && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                    <span className="font-bold text-amber-900">Total do Item:</span>
                    <span className="font-black text-amber-900 text-sm">
                      {formatCurrency(
                        (storeFurnitureCatalog.find((f) => f.id === selectedFurnitureToAdd)?.salePrice || 0) * furnitureQuantity
                      )}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFurniturePickerOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFurnitureItem}
                    disabled={!selectedFurnitureToAdd || savingFurniture}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {savingFurniture ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
