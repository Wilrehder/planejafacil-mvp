import React, { useState, useEffect, useRef } from 'react';
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
  FolderOpen,
  FileSignature,
  Edit3,
  Calendar,
  MapPin,
  Clock,
  Save,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus, CommercialProposal, Order, isCustomerRegistrationComplete } from '../../types';
import { 
  uploadAndAttachProposal, 
  addLeadNoteOnServer, 
  updateLeadStageOnServer, 
  convertLeadToOrderOnServer,
  saveLeadCommercialProposal,
  updateLeadRegistrationData,
  updateLeadEnvironment,
  STORE_ID_TO_TENANT_UUID 
} from '../../lib/crmService';
import { getOrderDocumentSignedUrl } from '../../lib/erpService';
import { parsePromobXML, PromobProjectData } from '../../lib/promobParser';
import { PromobNegotiationModal } from './PromobNegotiationModal';
import { PromobViewerModal } from './PromobViewerModal';
import { CustomerContractModal } from './CustomerContractModal';
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

  // Estados dos Dados Cadastrais do Cliente (Ficha Completa)
  const [isEditingRegistration, setIsEditingRegistration] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regRg, setRegRg] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regBillingAddress, setRegBillingAddress] = useState('');
  const [regInstallationAddress, setRegInstallationAddress] = useState('');
  const [regDesiredDays, setRegDesiredDays] = useState('');
  const [isSavingRegistration, setIsSavingRegistration] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado do Modal de Contrato Comercial
  const [contractModalOrder, setContractModalOrder] = useState<Partial<Order> | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado do Modal de Negociação Promob XML
  const [pendingPromob, setPendingPromob] = useState<{
    file: File;
    promobInfo: PromobProjectData;
    tenantUuid: string;
  } | null>(null);

  // Estado do Visualizador Estruturado Promob
  const [isPromobViewerOpen, setIsPromobViewerOpen] = useState(false);

  useEffect(() => {
    if (selectedLeadForDetail) {
      setRegName(selectedLeadForDetail.name || '');
      setRegPhone(selectedLeadForDetail.phone || selectedLeadForDetail.whatsapp || '');
      setRegEmail(selectedLeadForDetail.email || '');
      setRegCpf(selectedLeadForDetail.cpf || '');
      setRegRg(selectedLeadForDetail.rg || '');
      setRegBirthDate(selectedLeadForDetail.birthDate || '');
      setRegBillingAddress(selectedLeadForDetail.billingAddress || '');
      setRegInstallationAddress(selectedLeadForDetail.installationAddress || '');
      const rawDeadline = selectedLeadForDetail.desiredDeadline || '';
      const extractedDays = rawDeadline.replace(/\D/g, '');
      setRegDesiredDays(extractedDays || rawDeadline);
      setIsEditingRegistration(false);
      setRegistrationMessage(null);
    }
  }, [
    selectedLeadForDetail?.id, 
    selectedLeadForDetail?.name,
    selectedLeadForDetail?.phone,
    selectedLeadForDetail?.whatsapp,
    selectedLeadForDetail?.email,
    selectedLeadForDetail?.cpf, 
    selectedLeadForDetail?.rg,
    selectedLeadForDetail?.birthDate, 
    selectedLeadForDetail?.billingAddress, 
    selectedLeadForDetail?.installationAddress, 
    selectedLeadForDetail?.desiredDeadline
  ]);

  if (!selectedLeadForDetail) return null;

  const lead = selectedLeadForDetail;
  const isPlatformLead = !lead.isExternal && lead.source !== 'instagram' && lead.source !== 'google' && lead.source !== 'indicacao' && lead.source !== 'balcao';
  const assignmentId = lead.assignmentId || lead.id;

  const registrationValidation = isCustomerRegistrationComplete({
    name: lead.name,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    cpf: lead.cpf,
    rg: lead.rg,
    billingAddress: lead.billingAddress,
    installationAddress: lead.installationAddress,
    desiredDeadline: lead.desiredDeadline,
  });

  const hasAllRegistrationData = registrationValidation.isComplete;

  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRegistration(true);
    setRegistrationMessage(null);

    const formattedDeadline = regDesiredDays.trim() ? `${regDesiredDays.trim()} dias` : '';

    try {
      const res = await updateLeadRegistrationData(assignmentId, {
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        cpf: regCpf.trim(),
        rg: regRg.trim(),
        birthDate: regBirthDate.trim(),
        billingAddress: regBillingAddress.trim(),
        installationAddress: regInstallationAddress.trim(),
        desiredDeadline: formattedDeadline,
      });

      if (!res.success) {
        setRegistrationMessage({ type: 'error', text: res.error || 'Erro ao salvar dados cadastrais.' });
        setIsSavingRegistration(false);
        return;
      }

      const updatedFields: any = {
        name: regName.trim(),
        phone: regPhone.trim(),
        whatsapp: regPhone.trim(),
        email: regEmail.trim(),
        cpf: regCpf.trim(),
        rg: regRg.trim(),
        birthDate: regBirthDate.trim(),
        billingAddress: regBillingAddress.trim(),
        installationAddress: regInstallationAddress.trim(),
        desiredDeadline: formattedDeadline,
      };

      updateLead(lead.id, updatedFields);
      setSelectedLeadForDetail({
        ...lead,
        ...updatedFields,
      });

      setRegistrationMessage({ type: 'success', text: 'Dados cadastrais salvos com sucesso!' });
      setIsEditingRegistration(false);
      onLeadUpdated?.();
    } catch (err: any) {
      setRegistrationMessage({ type: 'error', text: err?.message || 'Falha ao salvar dados.' });
    } finally {
      setIsSavingRegistration(false);
    }
  };

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
      environmentTitle?: string;
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
        if (commercialOverride.environmentTitle) {
          updatedLeadData.environment = commercialOverride.environmentTitle;
          await updateLeadEnvironment(lead.id, commercialOverride.environmentTitle);
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

    if (!hasAllRegistrationData) {
      setValidationError(`⚠️ Bloqueio de Orçamento: Complete o cadastro do cliente antes de criar o orçamento. Pendências: ${registrationValidation.missingFields.join(', ')}.`);
      setIsEditingRegistration(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
    environmentTitle?: string;
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
      environmentTitle: result.environmentTitle,
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
        const convRes = await convertLeadToOrderOnServer(assignmentId, orderFinalValue);
        if (convRes.success) {
          setContractModalOrder({
            id: convRes.orderId,
            orderNumber: convRes.orderNumber,
            clientName: lead.name,
            phone: lead.phone,
            clientCpf: lead.cpf,
            clientRg: lead.rg,
            billingAddress: lead.billingAddress,
            installationAddress: lead.installationAddress,
            environment: lead.environment,
            totalValue: convRes.totalValue || orderFinalValue,
            contractedValue: convRes.totalValue || orderFinalValue,
            contractToken: (convRes as any).contractToken,
            contractStatus: 'rascunho',
            storeId: lead.assignedStoreId,
            commercialProposal: lead.commercialProposal,
            paymentAllocations: lead.commercialProposal?.paymentAllocations,
          });
          setIsContractModalOpen(true);
        }
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
        const convRes = await convertLeadToOrderOnServer(assignmentId, orderFinalValue);
        if (convRes.success) {
          setContractModalOrder({
            id: convRes.orderId,
            orderNumber: convRes.orderNumber,
            clientName: lead.name,
            phone: lead.phone,
            clientCpf: lead.cpf,
            clientRg: lead.rg,
            billingAddress: lead.billingAddress,
            installationAddress: lead.installationAddress,
            environment: lead.environment,
            totalValue: convRes.totalValue || orderFinalValue,
            contractedValue: convRes.totalValue || orderFinalValue,
            contractToken: (convRes as any).contractToken,
            contractStatus: 'rascunho',
            storeId: lead.assignedStoreId,
            commercialProposal: lead.commercialProposal,
            paymentAllocations: lead.commercialProposal?.paymentAllocations,
          });
          setIsContractModalOpen(true);
        }
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

          {/* Input oculto para upload de arquivos */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".pdf,.xml,.png,.jpg,.jpeg" 
            onChange={handleRealFileUpload} 
            disabled={isUploading} 
            className="hidden" 
          />

          {/* Grid Principal: Coluna Esquerda (Dados do Cliente) | Coluna Direita (Orçamento, Anexos, Decisão & Comentários) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUNA ESQUERDA */}
            <div className="space-y-5">
              
              {/* Card Único e Minimalista: Dados do Cliente */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3.5 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-[#439346]" />
                    <span>Dados do Cliente</span>
                  </div>

                  {/* Ícone / Indicador Sutil e Clicável dos Dados Cadastrais */}
                  <button
                    type="button"
                    onClick={() => setIsEditingRegistration(true)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hasAllRegistrationData
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                    title={hasAllRegistrationData ? 'Cadastro completo. Clique para visualizar ou editar.' : 'Faltam dados cadastrais. Clique para preencher.'}
                  >
                    <span className={`w-2 h-2 rounded-full ${hasAllRegistrationData ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                    <span>{hasAllRegistrationData ? 'Cadastro Completo' : 'Faltam Dados'}</span>
                    <Edit3 className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                </div>

                <div className="space-y-2.5 pt-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Nome:</span> 
                    <strong className="text-slate-900 font-bold">{lead.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">WhatsApp:</span> 
                    <strong className="text-[#439346] font-bold">{lead.phone}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">E-mail:</span> 
                    <strong className="text-slate-800 font-semibold">{lead.email}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Cidade/UF:</span> 
                    <strong className="text-slate-800 font-semibold">{lead.city} - {lead.state}</strong>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">CPF, endereços e prazos</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingRegistration(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{hasAllRegistrationData ? 'Ver / Editar Cadastro' : 'Preencher Cadastro'}</span>
                  </button>
                </div>
              </div>

              {/* Pré-Orçamento e Cômodos da Plataforma (Padronizado para Novo e Em Atendimento) */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3.5 shadow-sm border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#439346]" />
                    <span>Simulação de Móveis no App</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                    Pré-Orçamento
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-xs text-slate-400">Estimativa Calculada:</span>
                  <span className="text-base font-black text-[#439346]">
                    {lead.estimatedMin > 0 || lead.estimatedMax > 0
                      ? `${formatCurrency(lead.estimatedMin || 15000)} ~ ${formatCurrency(lead.estimatedMax || 25000)}`
                      : 'Sob Consulta'}
                  </span>
                </div>

                <div className="text-xs">
                  <span className="text-slate-400 block font-medium mb-1">Ambientes Solicitados:</span>
                  <strong className="text-white text-sm block">{lead.environment || 'Móveis Planejados Sob Medida'}</strong>
                </div>

                {lead.environmentsData && lead.environmentsData.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    {lead.environmentsData.map((env, idx) => (
                      <div key={idx} className="bg-slate-800/90 p-2 rounded-xl text-[11px] flex justify-between font-semibold border border-slate-700/60">
                        <span>{env.name}</span>
                        <span className="text-emerald-400">{env.areaM2}m² • {env.wallCount} Paredes</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA */}
            <div className="space-y-5">
              
              {/* Se o lead AINDA NÃO tem proposta: Botão Verde Criar Orçamento (Bloqueado se cadastro incompleto) */}
              {!lead.commercialProposal && !lead.attachmentName ? (
                hasAllRegistrationData ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-4 px-6 rounded-2xl bg-[#439346] hover:bg-[#387F3B] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando Arquivo...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Criar Orçamento</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingRegistration(true)}
                      className="w-full py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-sm flex items-center justify-center space-x-2 border-2 border-dashed border-slate-300 transition-all cursor-pointer"
                      title="Complete os dados cadastrais obrigatórios do cliente para liberar a criação de orçamento"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Criar Orçamento (Bloqueado)</span>
                    </button>
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-extrabold block">Cadastro Incompleto para Orçamento</span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Para liberar o orçamento comercial e assegurar o futuro contrato, preencha: <strong className="text-amber-950">{registrationValidation.missingFields.join(', ')}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEditingRegistration(true)}
                          className="text-[11px] font-black text-amber-900 underline hover:text-amber-950 cursor-pointer pt-0.5 inline-block"
                        >
                          Completar Ficha Cadastral Agora →
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {/* Botão de Visualização / Emissão de Contrato Comercial */}
                  <button
                    type="button"
                    onClick={() => {
                      setContractModalOrder({
                        id: lead.orderId || `ord_${lead.id}`,
                        orderNumber: lead.orderNumber || '#PED-1000',
                        clientName: lead.name,
                        phone: lead.phone,
                        clientCpf: lead.cpf,
                        clientRg: lead.rg,
                        billingAddress: lead.billingAddress,
                        installationAddress: lead.installationAddress,
                        environment: lead.environment,
                        totalValue: lead.commercialProposal?.finalOrderTotal || lead.estimatedMax || 0,
                        contractedValue: lead.commercialProposal?.finalOrderTotal || lead.estimatedMax || 0,
                        contractToken: lead.contractToken,
                        contractStatus: (lead.contractStatus as any) || 'rascunho',
                        storeId: lead.assignedStoreId,
                        commercialProposal: lead.commercialProposal,
                        paymentAllocations: lead.commercialProposal?.paymentAllocations,
                      });
                      setIsContractModalOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FileSignature className="w-4 h-4 text-indigo-600" />
                    <span>Visualizar / Emitir Contrato Comercial</span>
                  </button>
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

                  {/* Documentos & Anexos do Cliente */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-xs">
                    <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                      <Paperclip className="w-4 h-4 text-[#439346]" />
                      <span>Documentos & Anexos do Cliente</span>
                    </div>

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
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full text-center py-1.5 text-[11px] font-bold text-slate-500 hover:text-emerald-700 cursor-pointer transition-colors"
                      >
                        Substituir ou anexar nova versão do documento
                      </button>
                    </div>

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
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
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
                          className="py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all bg-[#439346] hover:bg-[#387F3B] text-white cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Fechado</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFinalDecision('perdido')}
                          className="py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Perdido</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

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

      {/* Modal Ficha Completa de Cadastro do Cliente */}
      {isEditingRegistration && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-[#1B2B48] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ficha Cadastral Completa do Cliente</h3>
                  <p className="text-[11px] text-slate-300">
                    {hasAllRegistrationData ? '✓ Cadastro Completo para Contrato' : `Pendências: ${registrationValidation.missingFields.length} campos restantes`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingRegistration(false);
                  setRegistrationMessage(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRegistration} className="p-6 space-y-4 text-xs text-slate-800 overflow-y-auto flex-1">
              {registrationMessage && (
                <div className={`p-3 rounded-2xl text-xs font-semibold ${
                  registrationMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {registrationMessage.text}
                </div>
              )}

              {/* Informações Pessoais */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  Identificação do Contratante
                </span>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-600">Nome Completo *</label>
                    {!regName.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nome completo do cliente"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      !regName.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-600">WhatsApp / Telefone *</label>
                      {!regPhone.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                    </div>
                    <input
                      type="text"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        !regPhone.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-600">E-mail *</label>
                      {!regEmail.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        !regEmail.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-600">CPF do Cliente *</label>
                      {!regCpf.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                    </div>
                    <input
                      type="text"
                      required
                      value={regCpf}
                      onChange={(e) => setRegCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        !regCpf.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">RG do Cliente</label>
                    <input
                      type="text"
                      value={regRg}
                      onChange={(e) => setRegRg(e.target.value)}
                      placeholder="00.000.000-0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-[#439346] outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-[#439346] outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Endereços e Prazos */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  Endereços & Prazos Contratuais
                </span>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-600">Endereço de Cobrança / Moradia *</label>
                    {!regBillingAddress.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={regBillingAddress}
                    onChange={(e) => setRegBillingAddress(e.target.value)}
                    placeholder="Rua, número, complemento, bairro, cidade - UF"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      !regBillingAddress.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center space-x-2">
                      <label className="text-[10px] uppercase font-bold text-slate-600">Endereço de Instalação *</label>
                      {regBillingAddress && (
                        <button
                          type="button"
                          onClick={() => setRegInstallationAddress(regBillingAddress)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          (Copiar da cobrança)
                        </button>
                      )}
                    </div>
                    {!regInstallationAddress.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={regInstallationAddress}
                    onChange={(e) => setRegInstallationAddress(e.target.value)}
                    placeholder="Endereço onde os móveis serão instalados"
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      !regInstallationAddress.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-600">Prazo Desejado (Quantidade de dias) *</label>
                    {!regDesiredDays.trim() && <span className="text-[10px] text-rose-600 font-bold">Obrigatório</span>}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      max="365"
                      value={regDesiredDays}
                      onChange={(e) => setRegDesiredDays(e.target.value)}
                      placeholder="Ex: 45"
                      className={`w-full pl-3.5 pr-14 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                        !regDesiredDays.trim() ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' : 'border-slate-300 bg-white focus:border-[#439346]'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      dias
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingRegistration(false);
                    setRegistrationMessage(null);
                  }}
                  disabled={isSavingRegistration}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingRegistration}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#439346] hover:bg-[#387F3B] text-white flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-colors cursor-pointer"
                >
                  {isSavingRegistration ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando Dados...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Ficha Cadastral</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Emissão e Assinatura do Contrato Comercial */}
      {isContractModalOpen && contractModalOrder && (
        <CustomerContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          order={contractModalOrder}
          lead={lead}
          onContractIssued={() => {
            onLeadUpdated?.();
          }}
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
