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
  ShoppingBag,
  Eye,
  FileSpreadsheet,
  Download,
  Sparkles,
  DollarSign,
  CreditCard,
  Layers,
  FolderOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus, CommercialProposal } from '../../types';
import { 
  uploadAndAttachProposal, 
  addLeadNoteOnServer, 
  updateLeadStageOnServer, 
  convertLeadToOrderOnServer,
  saveLeadCommercialProposal,
  STORE_ID_TO_TENANT_UUID 
} from '../../lib/crmService';
import { getOrderDocumentSignedUrl } from '../../lib/erpService';
import { parsePromobXML, PromobProjectData } from '../../lib/promobParser';
import { PromobNegotiationModal } from './PromobNegotiationModal';
import { PromobViewerModal } from './PromobViewerModal';
import { updateLeadConventionalItems } from '../../lib/conventionalFurnitureService';

interface LeadDetailDrawerProps {
  onLeadUpdated?: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ onLeadUpdated }) => {
  const { currentUser, selectedLeadForDetail, setSelectedLeadForDetail, updateLead, updateLeadStatus } = useApp();
  const isManagerOrOwner = currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';
  const isOwner = isManagerOrOwner;
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

  // Estado do Visualizador Estruturado Promob
  const [isPromobViewerOpen, setIsPromobViewerOpen] = useState(false);

  if (!selectedLeadForDetail) return null;

  const lead = selectedLeadForDetail;
  const isPlatformLead = !lead.isExternal && lead.source !== 'instagram' && lead.source !== 'google' && lead.source !== 'indicacao' && lead.source !== 'balcao';
  const assignmentId = lead.assignmentId || lead.id;

  const handleOpenOrderDocument = async (doc: any) => {
    if (!doc?.filePath) {
      alert('Documento registrado sem arquivo no Storage.');
      return;
    }
    const signedUrl = await getOrderDocumentSignedUrl(doc.filePath);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      alert('Não foi possível gerar link seguro para o documento.');
    }
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
    commercialOverride?: { 
      finalPrice: number; 
      factoryCost: number; 
      summaryNote: string;
      commercialProposal?: CommercialProposal;
      conventionalItems?: Array<{ id: string; name: string; quantity: number; salePrice: number; total: number; category?: string }>;
    }
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
        if (commercialOverride.commercialProposal) {
          updatedLeadData.commercialProposal = commercialOverride.commercialProposal;
        }
        if (commercialOverride.conventionalItems) {
          updatedLeadData.conventionalItems = commercialOverride.conventionalItems;
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
    commercialProposal?: CommercialProposal;
    conventionalItems?: Array<{ id: string; name: string; quantity: number; salePrice: number; total: number; category?: string }>;
  }) => {
    if (!pendingPromob) return;

    if (result.conventionalItems) {
      await updateLeadConventionalItems(assignmentId, result.conventionalItems);
    }

    if (result.commercialProposal) {
      await saveLeadCommercialProposal(assignmentId, result.commercialProposal);
    }

    await executeUploadAndAttach(pendingPromob.file, pendingPromob.tenantUuid, {
      finalPrice: result.finalPrice,
      factoryCost: result.factoryCost,
      summaryNote: result.summaryNote,
      commercialProposal: result.commercialProposal,
      conventionalItems: result.conventionalItems,
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
        const orderFinalValue = lead.commercialProposal?.finalOrderTotal || lead.estimatedMax || Math.round(((lead.estimatedMin || 15000) + (lead.estimatedMax || 25000)) / 2);
        await convertLeadToOrderOnServer(assignmentId, orderFinalValue);
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
        const orderFinalValue = lead.commercialProposal?.finalOrderTotal || lead.estimatedMax || Math.round(((lead.estimatedMin || 15000) + (lead.estimatedMax || 25000)) / 2);
        await convertLeadToOrderOnServer(assignmentId, orderFinalValue);
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

            </div>

            {/* COLUNA DIREITA */}
            <div className="space-y-5">
              
              {/* Composição Consolidada do Pedido (Promob + Móveis Convencionais + Taxa de Pagamento) */}
              {lead.commercialProposal && (
                <div className="bg-gradient-to-br from-slate-900 to-[#1B2B48] text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3.5 border border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Composição do Pedido Consolidado
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/30">
                      {lead.commercialProposal.paymentMethodLabel}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                        <span>Promob Sob Medida:</span>
                      </span>
                      <strong className="text-white font-mono">{formatCurrency(lead.commercialProposal.promobValue)}</strong>
                    </div>

                    {lead.commercialProposal.conventionalTotal > 0 && (
                      <div className="flex justify-between items-center text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <Armchair className="w-3.5 h-3.5 text-amber-400" />
                          <span>Móveis Convencionais ({lead.commercialProposal.conventionalItems?.length || 0} itens):</span>
                        </span>
                        <strong className="font-mono">+{formatCurrency(lead.commercialProposal.conventionalTotal)}</strong>
                      </div>
                    )}

                    {lead.commercialProposal.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-blue-300">
                        <span>Desconto Comercial ({lead.commercialProposal.discountPct}%):</span>
                        <strong className="font-mono">-{formatCurrency(lead.commercialProposal.discountAmount)}</strong>
                      </div>
                    )}

                    {lead.commercialProposal.paymentFeePct > 0 && (
                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>Taxa de Pagamento ({lead.commercialProposal.paymentFeePct}%):</span>
                        <span className="font-mono">
                          {lead.commercialProposal.passFeeToClient 
                            ? `+${formatCurrency(lead.commercialProposal.paymentFeeAmount)} (repassada)` 
                            : `${formatCurrency(lead.commercialProposal.paymentFeeAmount)} (absorvida)`}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Final do Pedido</span>
                        <span className="text-[11px] text-slate-300">
                          {lead.commercialProposal.installments > 1
                            ? `${lead.commercialProposal.installments}x de ${formatCurrency(lead.commercialProposal.installmentValue)}`
                            : 'Pagamento à Vista'}
                        </span>
                      </div>
                      <div className="text-lg font-black text-emerald-400 font-mono">
                        {formatCurrency(lead.commercialProposal.finalOrderTotal)}
                      </div>
                    </div>

                    {isOwner && lead.commercialProposal.estimatedProfit !== undefined && (
                      <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-slate-400">
                        <span>Custo Fábrica Promob: <strong className="text-amber-300">{formatCurrency(lead.commercialProposal.promobCost || 0)}</strong></span>
                        <span>Lucro Líquido Loja: <strong className="text-emerald-300">{formatCurrency(lead.commercialProposal.estimatedProfit)}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {lead.attachmentName?.toLowerCase().endsWith('.xml') && (
                      <button
                        type="button"
                        onClick={() => setIsPromobViewerOpen(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Visualizar Engenharia Promob</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPromob({
                          file: new File([], lead.attachmentName || 'proposta.xml'),
                          promobInfo: {
                            projectName: lead.environment || 'Projeto Promob',
                            clientName: lead.name,
                            budgetValue: lead.commercialProposal?.promobValue || lead.estimatedMax,
                            factoryOrderCost: lead.commercialProposal?.promobCost || 0,
                            tablePrice: lead.commercialProposal?.promobValue || lead.estimatedMax,
                            itemsCount: 0,
                          },
                          tenantUuid: STORE_ID_TO_TENANT_UUID[lead.assignedStoreId] || lead.assignedStoreId || '',
                        });
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ajustar Condições / Desconto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Anexo de Orçamento Obrigatório & Central de Documentos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                  <Paperclip className="w-4 h-4 text-[#439346]" />
                  <span>Documentos & Anexos do Cliente</span>
                </div>

                {lead.attachmentName ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div 
                        onClick={() => {
                          if (lead.attachmentName?.toLowerCase().endsWith('.xml')) {
                            setIsPromobViewerOpen(true);
                          } else if (lead.attachmentUrl) {
                            window.open(lead.attachmentUrl, '_blank');
                          }
                        }}
                        className="flex items-center space-x-2 text-[#439346] font-extrabold cursor-pointer hover:underline"
                        title={lead.attachmentName?.toLowerCase().endsWith('.xml') ? 'Clique para abrir o visualizador estruturado Promob' : 'Abrir anexo'}
                      >
                        {lead.attachmentName?.toLowerCase().endsWith('.xml') ? (
                          <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                        )}
                        <span className="truncate max-w-[170px] sm:max-w-[200px]">{lead.attachmentName}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {lead.attachmentName?.toLowerCase().endsWith('.xml') ? (
                          <button
                            type="button"
                            onClick={() => setIsPromobViewerOpen(true)}
                            className="px-2.5 py-1 rounded bg-[#439346] hover:bg-[#387F3B] text-white text-[11px] font-bold flex items-center space-x-1 shadow-xs cursor-pointer transition-colors"
                            title="Visualizar Proposta Promob Estruturada"
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                            <span>Abrir</span>
                          </button>
                        ) : lead.attachmentUrl ? (
                          <a 
                            href={lead.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 rounded bg-white text-emerald-700 hover:text-emerald-900 border border-emerald-200"
                            title="Visualizar documento em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}

                        {lead.attachmentUrl && (
                          <a
                            href={lead.attachmentUrl}
                            download={lead.attachmentName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-white text-emerald-700 hover:text-emerald-900 border border-emerald-200"
                            title="Baixar arquivo original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <span className="text-[10px] font-black bg-[#439346] text-white px-2 py-0.5 rounded-md">
                          Anexado
                        </span>
                      </div>
                    </div>

                    {/* Botão para atualizar ou enviar nova versão */}
                    <label className="block text-center py-1.5 text-[11px] font-bold text-slate-500 hover:text-emerald-700 cursor-pointer transition-colors">
                      <span>Substituir ou anexar nova versão do documento</span>
                      <input type="file" accept=".pdf,.xml,.png,.jpg,.jpeg" onChange={handleRealFileUpload} disabled={isUploading} className="hidden" />
                    </label>
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

                {/* Documentos da Pasta de Execução do Pedido (ERP) */}
                {lead.orderDocuments && lead.orderDocuments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Documentos da Pasta do Pedido ({lead.orderNumber || 'ERP'})</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {lead.orderDocuments.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="min-w-0 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-[11px] truncate">{doc.fileName}</p>
                              <p className="text-[9px] text-slate-500">
                                Etapa: <strong className="uppercase text-blue-700">{doc.stage}</strong> • {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenOrderDocument(doc)}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="Abrir documento com link seguro"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
          conventionalItems={lead.conventionalItems || []}
        />
      )}

      {/* Visualizador Estruturado Promob XML */}
      {isPromobViewerOpen && lead.attachmentName && (
        <PromobViewerModal
          isOpen={isPromobViewerOpen}
          onClose={() => setIsPromobViewerOpen(false)}
          attachmentName={lead.attachmentName}
          attachmentUrl={lead.attachmentUrl}
          commercialProposal={lead.commercialProposal}
          clientName={lead.name}
          clientPhone={lead.phone}
          clientEmail={lead.email}
          environmentName={lead.environment}
        />
      )}
    </div>
  );
};
