import React, { useState, useRef, useEffect } from 'react';
import {
  X, Ruler, FileCheck, Wrench, CheckCircle2, Upload, FileText, Clock, ShieldCheck, Sparkles, Check, Package,
  ExternalLink, AlertCircle, Edit2, AlertTriangle, Percent, CreditCard, Sliders, Eye, Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStage, StoreOrder, OrderDocumentItem } from '../../types';
import {
  advanceOrderStageOnServer,
  uploadAndAttachOrderDocument,
  getOrderDocumentSignedUrl,
  updateOrderContractedValueOnServer,
  updateOrderPendencyOnServer
} from '../../lib/erpService';
import { fetchStoreCommercialSettings, StoreCommercialSettings } from '../../lib/expenseService';
import { CustomerContractModal } from './CustomerContractModal';
import { 
  confirmPhysicalContractOnServer,
  downloadContractPdf,
  generateContractPdfBlob,
  ensureOrderSignedContractArchived
} from '../../lib/customerContractService';

interface OrderFolderModalProps {
  order: StoreOrder;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

const STAGES: { key: OrderStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'formalizacao_contratual', label: '1. Formalização', icon: FileCheck },
  { key: 'medicao', label: '2. Medição', icon: Ruler },
  { key: 'projeto_aprovacao', label: '3. Projeto & Aprovação', icon: FileText },
  { key: 'producao', label: '4. Produção', icon: Package },
  { key: 'montagem', label: '5. Montagem', icon: Wrench },
  { key: 'entrega_aceite', label: '6. Entrega / Aceite', icon: ShieldCheck },
  { key: 'concluido', label: '7. Concluído', icon: CheckCircle2 },
];

export const OrderFolderModal: React.FC<OrderFolderModalProps> = ({ order, onClose, onOrderUpdated }) => {
  const { updateOrder } = useApp();

  // Estados locais para arquivos e confirmações
  const [contratoFileName, setContratoFileName] = useState(order.contractFile || '');
  const [medicaoFileName, setMedicaoFileName] = useState(order.medicaoFile || '');
  const [projectFileName, setProjectFileName] = useState(order.projectFile || '');
  const [clientApprovedProject, setClientApprovedProject] = useState(order.projectApproved || false);
  const [producaoFileName, setProducaoFileName] = useState(order.producaoFile || '');
  const [montagemFotoName, setMontagemFotoName] = useState(order.montagemFoto || '');
  const [aceiteFileName, setAceiteFileName] = useState(order.aceiteFile || '');
  const [clientConfirmedAceite, setClientConfirmedAceite] = useState(order.clientConfirmedAceite || false);

  // Estados de gestão operacional
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [contractedValueInput, setContractedValueInput] = useState(order.contractedValue || order.totalValue);
  const [currentContractedValue, setCurrentContractedValue] = useState(order.contractedValue || order.totalValue);

  // Regras Comerciais da Loja (Teto de Desconto & Taxa de Cartão)
  const [commercialSettings, setCommercialSettings] = useState<StoreCommercialSettings>({
    tenant_id: order.tenantId || '',
    max_discount_percentage: 10.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  });
  const [basePriceInput, setBasePriceInput] = useState<number>(order.estimatedBudget || order.totalValue || 25000);
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'cartao_vista' | 'cartao_parcelado'>('pix');

  useEffect(() => {
    if (order.tenantId) {
      fetchStoreCommercialSettings(order.tenantId).then((settings) => {
        setCommercialSettings(settings);
      });
    }
  }, [order.tenantId]);

  const discountAmount = (basePriceInput * discountPercentInput) / 100;
  const subtotalAfterDiscount = Math.max(0, basePriceInput - discountAmount);
  const appliedCardTaxPercent =
    paymentMethod === 'cartao_vista'
      ? commercialSettings.card_tax_percentage
      : paymentMethod === 'cartao_parcelado'
        ? commercialSettings.installment_tax_percentage
        : 0;
  const cardTaxAmount = (subtotalAfterDiscount * appliedCardTaxPercent) / 100;
  const calculatedFinalTotal = Math.round(subtotalAfterDiscount + cardTaxAmount);
  const isDiscountOverCeiling = discountPercentInput > commercialSettings.max_discount_percentage;

  const [hasPendingIssues, setHasPendingIssues] = useState(Boolean(order.hasPendingIssues));
  const [pendingNotesInput, setPendingNotesInput] = useState(order.pendingNotes || '');
  const [showPendingBox, setShowPendingBox] = useState(false);

  // Estados de submissão e erros
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do Visualizador de PDF do Contrato Assinado
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfTitle, setViewingPdfTitle] = useState<string>('');
  const [isGeneratingPdfView, setIsGeneratingPdfView] = useState(false);

  // Sincronização automática para arquivamento de pedidos assinados
  useEffect(() => {
    if (order.contractStatus === 'assinado' && !order.documents?.some(d => d.stage === 'contrato')) {
      ensureOrderSignedContractArchived(order).then((res) => {
        if (res.success && onOrderUpdated) {
          onOrderUpdated();
        }
      });
    }
  }, [order.id, order.contractStatus]);

  // Visualizar PDF do contrato assinado
  const handleViewContractPdf = async () => {
    setIsGeneratingPdfView(true);
    setErrorMessage(null);
    try {
      const contractDoc = order.documents?.find(d => d.stage === 'contrato' || d.docType === 'contrato_assinado');
      if (contractDoc?.filePath) {
        const url = await getOrderDocumentSignedUrl(contractDoc.filePath);
        if (url) {
          setViewingPdfUrl(url);
          setViewingPdfTitle(`Contrato Assinado — ${order.orderNumber || order.id}`);
          return;
        }
      }

      // Fallback: gera na hora com o snapshot e assinatura
      const blob = await generateContractPdfBlob({
        order,
        isSigned: true,
        signatureImage: order.contractSignatureImage,
        signerName: order.contractSignedByName || order.clientName,
        signerCpf: order.contractSignedByCpf || order.clientCpf,
        signedAt: order.contractSignedAt,
        signatureIp: order.contractSignatureIp
      });
      const objectUrl = URL.createObjectURL(blob);
      setViewingPdfUrl(objectUrl);
      setViewingPdfTitle(`Contrato Assinado — ${order.orderNumber || order.id}`);
    } catch (err: any) {
      console.error('Erro ao visualizar contrato:', err);
      setErrorMessage('Não foi possível carregar a pré-visualização do contrato assinado.');
    } finally {
      setIsGeneratingPdfView(false);
    }
  };

  // Baixar PDF do contrato assinado
  const handleDownloadContractPdf = async () => {
    try {
      await downloadContractPdf(
        {
          order,
          isSigned: true,
          signatureImage: order.contractSignatureImage,
          signerName: order.contractSignedByName || order.clientName,
          signerCpf: order.contractSignedByCpf || order.clientCpf,
          signedAt: order.contractSignedAt,
          signatureIp: order.contractSignatureIp
        },
        `CONTRATO_ASSINADO_${order.orderNumber || order.id}.pdf`
      );
    } catch (e) {
      alert('Erro ao realizar download do contrato assinado.');
    }
  };

  // File input refs para upload real
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadStage, setActiveUploadStage] = useState<string>('medicao');

  const getStageIndex = (stageKey: OrderStage) => {
    return STAGES.findIndex((s) => s.key === stageKey);
  };

  const currentIndex = getStageIndex(order.currentStage);

  // Manipulador de upload real para o Supabase Storage
  const handleRealFileUpload = async (stage: string, file: File) => {
    setUploadingStage(stage);
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetUuid = order.uuid || order.id;
    const targetTenantId = order.tenantId || 'b1020000-0000-0000-0000-000000000002';

    const res = await uploadAndAttachOrderDocument(targetUuid, targetTenantId, stage, file);

    setUploadingStage(null);

    if (!res.success) {
      setErrorMessage(res.error || 'Falha ao fazer upload do documento.');
      return;
    }

    setSuccessMessage(`Documento "${file.name}" anexado com sucesso na etapa "${stage}"!`);

    // Atualiza states locais conforme a etapa
    if (stage === 'contrato') setContratoFileName(file.name);
    else if (stage === 'medicao') setMedicaoFileName(file.name);
    else if (stage === 'projeto') setProjectFileName(file.name);
    else if (stage === 'producao') setProducaoFileName(file.name);
    else if (stage === 'montagem') setMontagemFotoName(file.name);
    else if (stage === 'aceite') setAceiteFileName(file.name);

    // Atualizar no contexto da aplicação
    updateOrder(
      order.id,
      {
        ...(stage === 'contrato' ? { contractFile: file.name } : {}),
        ...(stage === 'medicao' ? { medicaoFile: file.name, medicaoDone: true } : {}),
        ...(stage === 'projeto' ? { projectFile: file.name } : {}),
        ...(stage === 'producao' ? { producaoFile: file.name, producaoDone: true } : {}),
        ...(stage === 'montagem' ? { montagemFoto: file.name, montagemDone: true } : {}),
        ...(stage === 'aceite' ? { aceiteFile: file.name, clientConfirmedAceite: true } : {}),
      },
      `Documento "${file.name}" anexado à Pasta Digital na etapa "${stage}".`,
      'Operador ERP',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  const triggerFileInput = (stage: string) => {
    setActiveUploadStage(stage);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Abrir documento anexado com Signed URL
  const handleOpenDocument = async (doc?: OrderDocumentItem) => {
    if (!doc?.filePath) {
      alert('Documento registrado em modo de homologação.');
      return;
    }
    const signedUrl = await getOrderDocumentSignedUrl(doc.filePath);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      alert('Não foi possível gerar link seguro para o documento.');
    }
  };

  // Salvar alteração de valor contratado
  const handleSaveContractedValue = async () => {
    const finalValue = calculatedFinalTotal > 0 ? calculatedFinalTotal : contractedValueInput;
    if (finalValue <= 0) return;
    if (isDiscountOverCeiling) {
      setErrorMessage(`O desconto de ${discountPercentInput}% excede o teto máximo permitido da loja (${commercialSettings.max_discount_percentage}%).`);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    const targetUuid = order.uuid || order.id;
    const res = await updateOrderContractedValueOnServer(targetUuid, finalValue);

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Falha ao atualizar valor contratado.');
      return;
    }

    setCurrentContractedValue(finalValue);
    setContractedValueInput(finalValue);
    setIsEditingValue(false);
    setSuccessMessage(`Valor contratado atualizado para R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    updateOrder(
      order.id,
      { totalValue: finalValue, contractedValue: finalValue },
      `Valor contratado atualizado: R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Desc: ${discountPercentInput}%, Pgto: ${paymentMethod}).`,
      'Financeiro / Gerência',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // Salvar pendências
  const handleSavePendency = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const targetUuid = order.uuid || order.id;
    const res = await updateOrderPendencyOnServer(targetUuid, hasPendingIssues, pendingNotesInput);

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao registrar pendência.');
      return;
    }

    setShowPendingBox(false);
    setSuccessMessage(hasPendingIssues ? 'Pendência operacional registrada!' : 'Pendências resolvidas!');

    updateOrder(
      order.id,
      { hasPendingIssues, pendingNotes: pendingNotesInput },
      hasPendingIssues ? `Pendência registrada: ${pendingNotesInput}` : 'Pendências operacionais resolvidas.',
      'Operador ERP',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 0. FORMALIZAÇÃO CONTRATUAL
  const handleConfirmPhysicalContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const targetUuid = order.uuid || order.id;

    const hasDoc = contratoFileName || (order.documents && order.documents.some(d => d.stage === 'contrato' || d.docType === 'contrato' || d.docType === 'contrato_assinado'));
    if (!hasDoc) {
      setErrorMessage('Por favor, anexe o arquivo PDF ou foto do contrato físico assinado pelo cliente antes de confirmar.');
      return;
    }

    setIsSubmitting(true);
    const res = await confirmPhysicalContractOnServer(targetUuid, `Contrato assinado fisicamente anexado (${contratoFileName || 'documento'}).`);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao confirmar formalização física do contrato.');
      return;
    }

    setSuccessMessage('Formalização contratual física confirmada! Pedido liberado para Medição Fina.');
    updateOrder(
      order.id,
      { currentStage: 'medicao', contractStatus: 'assinado_externo', contractFile: contratoFileName },
      `Contrato assinado fisicamente confirmado e anexado. Pedido liberado para Medição Fina.`,
      'Formalização Contratual',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  const handleAdvanceFromFormalizacao = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    const res = await advanceOrderStageOnServer(
      targetUuid,
      'medicao',
      'Formalização contratual confirmada. Pedido avançado para Medição Fina.',
      undefined,
      true
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao avançar pedido para Medição Fina.');
      return;
    }

    setSuccessMessage('Contrato validado! Pedido avançado para a etapa de Medição Fina.');
    updateOrder(
      order.id,
      { currentStage: 'medicao' },
      'Formalização contratual concluída. Pedido liberado para Medição Fina.',
      'Formalização Contratual',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 1. MEDIÇÃO
  const handleSaveMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!medicaoFileName) {
      setErrorMessage('Por favor, anexe a Ficha de Medição ou foto contendo as medidas.');
      return;
    }

    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    // Avançar etapa no servidor
    const res = await advanceOrderStageOnServer(
      targetUuid,
      'projeto_aprovacao',
      `Medição concluída. Arquivo: ${medicaoFileName}`,
      undefined,
      true
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao avançar etapa de Medição.');
      return;
    }

    setSuccessMessage('Medição concluída e registrada com sucesso!');
    updateOrder(
      order.id,
      { currentStage: 'projeto_aprovacao', medicaoFile: medicaoFileName, medicaoDone: true },
      `Medição concluída. Arquivo anexado: ${medicaoFileName}`,
      'Medição',
      'Carlos Medições'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 2. PROJETO
  const handleSaveProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!projectFileName) {
      setErrorMessage('Por favor, anexe pelo menos um arquivo de projeto executivo.');
      return;
    }
    if (!clientApprovedProject) {
      setErrorMessage('Você deve confirmar que o cliente aprovou o projeto executivo.');
      return;
    }

    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    const res = await advanceOrderStageOnServer(
      targetUuid,
      'producao',
      `Projeto aprovado pelo cliente. Arquivo: ${projectFileName}`,
      undefined,
      clientApprovedProject
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao avançar etapa de Projeto & Aprovação.');
      return;
    }

    setSuccessMessage('Projeto executivo aprovado! Pedido avançado para Produção.');
    updateOrder(
      order.id,
      { currentStage: 'producao', projectFile: projectFileName, projectApproved: true },
      `Projeto anexado e aprovação confirmada. Arquivo: ${projectFileName}`,
      'Projetista',
      'Fernanda Designer'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 3. PRODUÇÃO
  const handleSaveProducao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    const res = await advanceOrderStageOnServer(
      targetUuid,
      'montagem',
      `Produção concluída e liberada para montagem.${producaoFileName ? ' Documentos: ' + producaoFileName : ''}`,
      undefined,
      true
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao avançar etapa de Produção.');
      return;
    }

    setSuccessMessage('Produção finalizada! Pedido encaminhado para Montagem.');
    updateOrder(
      order.id,
      { currentStage: 'montagem', producaoFile: producaoFileName, producaoDone: true },
      `Produção concluída.${producaoFileName ? ' Documentos anexados: ' + producaoFileName : ''}`,
      'Fábrica / PCP',
      'Operador ERP'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 4. MONTAGEM
  const handleSaveMontagem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!montagemFotoName) {
      setErrorMessage('Por favor, anexe pelo menos uma foto da montagem finalizada na obra.');
      return;
    }

    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    const res = await advanceOrderStageOnServer(
      targetUuid,
      'entrega_aceite',
      `Montagem concluída na obra. Fotos anexadas: ${montagemFotoName}`,
      undefined,
      true
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao avançar etapa de Montagem.');
      return;
    }

    setSuccessMessage('Montagem finalizada! Pedido liberado para Entrega e Aceite.');
    updateOrder(
      order.id,
      { currentStage: 'entrega_aceite', montagemFoto: montagemFotoName, montagemDone: true },
      `Montagem concluída. Fotos anexadas: ${montagemFotoName}`,
      'Montador',
      'Roberto Montagens'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  // 5. ACEITE
  const handleSaveAceite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!aceiteFileName && !clientConfirmedAceite) {
      setErrorMessage('Por favor, anexe o Termo de Aceite assinado ou confirme formalmente o recebimento pelo cliente.');
      return;
    }

    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

    const res = await advanceOrderStageOnServer(
      targetUuid,
      'concluido',
      `Recebimento e Aceite confirmados pelo cliente. Pedido finalizado com sucesso.`,
      undefined,
      clientConfirmedAceite
    );

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao concluir o pedido.');
      return;
    }

    setSuccessMessage('Pedido concluído com sucesso e Termo de Aceite validado!');
    updateOrder(
      order.id,
      { currentStage: 'concluido', aceiteFile: aceiteFileName, clientConfirmedAceite },
      `Recebimento e Aceite confirmados pelo cliente.`,
      'Diretoria / Pós-Venda',
      'Lojista Parceiro'
    );

    if (onOrderUpdated) onOrderUpdated();
  };

  const renderContractRow = () => {
    const contractDoc = order.documents?.find(d => d.stage === 'contrato' || d.docType === 'contrato_assinado');
    const isSigned = order.contractStatus === 'assinado' || Boolean(contractDoc);
    const fileName = contractDoc?.fileName || order.contractFile || `contrato_assinado_${order.orderNumber || order.id}.pdf`;

    return (
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between col-span-2 gap-3 transition-all ${
        isSigned ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="truncate pr-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. CONTRATO COMERCIAL
            </span>
            {isSigned ? (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                Assinado Eletronicamente
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Pendente no CRM
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FileText className={`w-4 h-4 shrink-0 ${isSigned ? 'text-emerald-700' : 'text-slate-400'}`} />
            <span className={`text-xs font-bold truncate ${isSigned ? 'text-slate-900' : 'text-slate-500 italic'}`}>
              {fileName}
            </span>
          </div>

          {isSigned && (order.contractSignedByName || order.contractSignedByCpf) && (
            <p className="text-[11px] text-slate-600 mt-1 truncate">
              Signatário: <strong className="text-slate-800">{order.contractSignedByName || order.clientName}</strong>
              {order.contractSignedByCpf ? ` (CPF: ${order.contractSignedByCpf})` : ''}
              {order.contractSignedAt ? ` • Assinado em ${new Date(order.contractSignedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSigned ? (
            <>
              <button
                type="button"
                onClick={handleViewContractPdf}
                disabled={isGeneratingPdfView}
                title="Abrir e ler o contrato completo com todas as páginas e assinaturas"
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{isGeneratingPdfView ? 'Carregando...' : 'Visualizar PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadContractPdf}
                title="Baixar cópia oficial em PDF"
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Baixar</span>
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => triggerFileInput('contrato')}
            disabled={uploadingStage === 'contrato'}
            title="Anexar ou atualizar documento do contrato"
            className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span className="text-[11px]">{isSigned ? 'Substituir' : 'Anexar'}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderFileRow = (
    label: string,
    stageKey: string,
    filename?: string,
    fallbackText: string = '—',
    doc?: OrderDocumentItem
  ) => (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${filename ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
      <div className="truncate pr-2 flex-1">
        <span className="text-[11px] font-semibold uppercase text-slate-400 block">{label}</span>
        <span className={`text-xs font-medium truncate block ${filename ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {filename || fallbackText}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {filename ? (
          <>
            {doc?.filePath && (
              <button
                type="button"
                onClick={() => handleOpenDocument(doc)}
                title="Abrir arquivo do Storage"
                className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="p-1 text-emerald-600 bg-emerald-50 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => triggerFileInput(stageKey)}
            disabled={uploadingStage === stageKey}
            className="px-2 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            {uploadingStage === stageKey ? 'Enviando...' : 'Anexar'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Hidden input para upload real de arquivos */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleRealFileUpload(activeUploadStage, file);
          }
        }}
      />

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">

        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-blue-600 text-white font-mono text-sm px-2.5 py-0.5 rounded-md font-bold tracking-wide">
                {order.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {order.environment}
              </span>
              {order.hasPendingIssues && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Pendência Ativa
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {order.clientName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.address} • Tel: {order.phone}
            </p>
            {(order.clientCpf || order.installationAddress || order.desiredDeadline) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                {order.clientCpf && <span>CPF: <strong className="text-white">{order.clientCpf}</strong></span>}
                {order.installationAddress && <span>Instalação: <strong className="text-white">{order.installationAddress}</strong></span>}
                {order.desiredDeadline && <span>Prazo Desejado: <strong className="text-emerald-400">{order.desiredDeadline}</strong></span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs text-slate-400 block uppercase font-medium">Valor Contratado</span>
                <button
                  type="button"
                  onClick={() => setIsEditingValue(!isEditingValue)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Ajustar preço, desconto e taxas de pagamento"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>

              <span className="text-xl font-bold text-emerald-400 block">
                R$ {currentContractedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>

              {order.estimatedBudget && order.estimatedBudget !== currentContractedValue && (
                <span className="text-[10px] text-slate-400 block">
                  Orçamento Original: R$ {order.estimatedBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}

              {/* Popover / Calculadora Comercial com Teto de Desconto & Taxa de Cartão */}
              {isEditingValue && (
                <div className="absolute right-6 top-20 z-50 bg-slate-900 border border-slate-700 p-5 rounded-2xl shadow-2xl w-80 text-left space-y-3.5 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      Condições Comerciais
                    </span>
                    <button
                      onClick={() => setIsEditingValue(false)}
                      className="text-slate-400 hover:text-white font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Valor Base do Orçamento (R$)
                    </label>
                    <input
                      type="number"
                      value={basePriceInput}
                      onChange={(e) => setBasePriceInput(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-400">
                        Desconto Concedido (%)
                      </label>
                      <span className="text-[9px] font-extrabold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Teto Loja: {commercialSettings.max_discount_percentage}%
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={discountPercentInput}
                        onChange={(e) => setDiscountPercentInput(Number(e.target.value))}
                        className={`w-full px-3 py-1.5 rounded-lg bg-slate-800 border text-xs font-bold text-white outline-none ${isDiscountOverCeiling ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                          }`}
                      />
                      <span className="absolute right-3 top-1.5 text-xs font-extrabold text-slate-400">%</span>
                    </div>
                    {isDiscountOverCeiling && (
                      <div className="text-[10px] text-red-400 font-bold mt-1">
                        ⚠️ Desconto excede o teto máximo da loja ({commercialSettings.max_discount_percentage}%).
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none"
                    >
                      <option value="pix">À Vista / PIX (Sem taxa)</option>
                      <option value="boleto">Boleto Bancário (Sem taxa)</option>
                      <option value="cartao_vista">
                        Cartão à Vista (+{commercialSettings.card_tax_percentage}% taxa)
                      </option>
                      <option value="cartao_parcelado">
                        Cartão Parcelado (+{commercialSettings.installment_tax_percentage}% taxa)
                      </option>
                    </select>
                  </div>

                  {/* Detalhamento do Cálculo */}
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal com Desconto:</span>
                      <span>R$ {subtotalAfterDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {appliedCardTaxPercent > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Taxa do Cartão ({appliedCardTaxPercent}%):</span>
                        <span>+ R$ {cardTaxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-700 pt-1.5 flex justify-between font-black text-xs text-emerald-400">
                      <span>Valor Final do Pedido:</span>
                      <span>R$ {calculatedFinalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingValue(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDiscountOverCeiling || isSubmitting}
                      onClick={handleSaveContractedValue}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${isDiscountOverCeiling || isSubmitting
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                        }`}
                    >
                      Aplicar e Salvar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MENSAGENS DE ALERTA E ERRO */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold">×</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
          </div>
        )}

        {/* TIMELINE DE ESTÁGIOS DO PEDIDO */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between relative">
            {STAGES.map((s, idx) => {
              const IconComp = s.icon;
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={s.key} className="flex-1 flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-400'
                      }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <IconComp className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium text-center ${isCurrent
                      ? 'text-blue-700 font-bold'
                      : isCompleted
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                      }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CORPO DO MODAL (2 COLUNAS) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">

          {/* COLUNA ESQUERDA: FORMULÁRIO E DOCUMENTOS DA ETAPA */}
          <div className="lg:col-span-7 space-y-6">

            {/* PASTA DIGITAL DO PEDIDO */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Pasta Digital do Pedido (Storage Seguro)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Bucket: order-documents
                  </span>
                </div>
                {order.contractStatus === 'assinado' ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Contrato Formalizado
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Aguardando Assinatura
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {renderContractRow()}
                {renderFileRow('2. Medição', 'medicao', medicaoFileName || order.medicaoFile, undefined, order.documents?.find(d => d.stage === 'medicao'))}
                {renderFileRow('3. Projeto', 'projeto', projectFileName || order.projectFile, undefined, order.documents?.find(d => d.stage === 'projeto'))}
                {renderFileRow('4. Documentos de Produção', 'producao', producaoFileName || order.producaoFile, undefined, order.documents?.find(d => d.stage === 'producao'))}
                {renderFileRow('5. Fotos da Montagem', 'montagem', montagemFotoName || order.montagemFoto, undefined, order.documents?.find(d => d.stage === 'montagem'))}
                {renderFileRow('6. Aceite', 'aceite', aceiteFileName || order.aceiteFile || (clientConfirmedAceite ? '(Confirmação via Sistema)' : undefined), undefined, order.documents?.find(d => d.stage === 'aceite'))}
              </div>
            </div>

            {/* FORMULÁRIO DA ETAPA ATUAL */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Ação Requerida: {STAGES[currentIndex]?.label}
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Preencha as informações essenciais para avançar o status do pedido com persistência no PostgreSQL.
              </p>

              {/* ETAPA 1: FORMALIZAÇÃO CONTRATUAL */}
              {order.currentStage === 'formalizacao_contratual' && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : order.contractStatus === 'assinado_externo'
                      ? 'bg-blue-50 border-blue-200 text-blue-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                    {order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico' || order.contractStatus === 'assinado_externo' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold uppercase tracking-wider text-[11px]">
                          Situação do Contrato:
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico'
                          ? 'bg-emerald-200 text-emerald-900'
                          : order.contractStatus === 'assinado_externo'
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-amber-200 text-amber-900'
                          }`}>
                          {order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico'
                            ? 'Assinado Eletronicamente'
                            : order.contractStatus === 'assinado_externo'
                              ? 'Assinado Fisicamente'
                              : 'Aguardando Formalização'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico'
                          ? `Contrato assinado eletronicamente por ${order.contractSignedByName || order.clientName} (CPF ${order.contractSignedByCpf || 'conferido'}) em ${order.contractSignedAt ? new Date(order.contractSignedAt).toLocaleString('pt-BR') : 'recente'}. Pedido apto para Medição Fina.`
                          : order.contractStatus === 'assinado_externo'
                            ? 'Contrato assinado em meio físico validado e anexado à pasta digital. Pedido apto para Medição Fina.'
                            : 'O contrato comercial precisa ser assinado pelo cliente (digitalmente via Link/QR Code) ou fisicamente (impresso e anexado) para liberar a etapa de Medição Fina.'}
                      </p>
                    </div>
                  </div>

                  {/* Ações de Formalização */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opção 1: Assinatura Eletrônica (Recomendada) */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                          Opção A (Recomendada)
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">Emissão & Assinatura Digital</h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Gere o PDF com QR Code ou envie o link seguro para o cliente assinar na tela do celular.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsContractModalOpen(true)}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Abrir Emissão / QR Code / Link</span>
                      </button>
                    </div>

                    {/* Opção 2: Contrato Físico Impresso */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block mb-1">
                          Opção B (Física)
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">Assinatura em Papel</h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Imprima o contrato gerado, colha a assinatura manual e anexe o arquivo escaneado ou foto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerFileInput('contrato')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{contratoFileName ? 'Substituir PDF Assinado' : 'Anexar Contrato Assinado'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Confirmação Física ou Avanço Manual */}
                  {contratoFileName && order.contractStatus !== 'assinado' && order.contractStatus !== 'assinado_eletronico' && (
                    <form onSubmit={handleConfirmPhysicalContract} className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3">
                      <div className="flex items-center space-x-2 text-indigo-900 text-xs font-bold">
                        <Check className="w-4 h-4 text-indigo-600" />
                        <span>Arquivo de Contrato Anexado: <strong>{contratoFileName}</strong></span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirmar Formalização Física & Liberar Medição Fina →</span>
                      </button>
                    </form>
                  )}

                  {/* Se já foi assinado eletronicamente ou externamente, botão direto para avançar */}
                  {(order.contractStatus === 'assinado' || order.contractStatus === 'assinado_eletronico' || order.contractStatus === 'assinado_externo') && (
                    <button
                      type="button"
                      onClick={handleAdvanceFromFormalizacao}
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Contrato Formalizado: Avançar para Medição Fina →</span>
                    </button>
                  )}
                </div>
              )}

              {/* ETAPA 2: MEDIÇÃO */}
              {order.currentStage === 'medicao' && (
                <form onSubmit={handleSaveMedicao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Medição (Ficha/PDF/Foto) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: medicao_cliente.pdf"
                        value={medicaoFileName}
                        onChange={(e) => setMedicaoFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput('medicao')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar Arquivo
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando no Servidor...' : 'Medição Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 2: PROJETO & APROVAÇÃO */}
              {order.currentStage === 'projeto_aprovacao' && (
                <form onSubmit={handleSaveProjeto} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Projeto (PDF/Render/Imagens) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: projeto_final.pdf"
                        value={projectFileName}
                        onChange={(e) => setProjectFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput('projeto')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar Arquivo
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="client-approval"
                      checked={clientApprovedProject}
                      onChange={(e) => setClientApprovedProject(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="client-approval" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Cliente aprovou o projeto executivo formalmente
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando no Servidor...' : 'Confirmar Aprovação do Projeto →'}
                  </button>
                </form>
              )}

              {/* ETAPA 3: PRODUÇÃO */}
              {order.currentStage === 'producao' && (
                <form onSubmit={handleSaveProducao} className="space-y-4">
                  <p className="text-sm text-slate-700 bg-orange-50 border border-orange-200 p-3 rounded-lg font-medium">
                    O móvel está atualmente <strong>em produção na fábrica</strong>. Quando a fabricação e o plano de corte forem finalizados, conclua esta etapa para encaminhar à montagem.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Documentos de Produção (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: plano_corte.pdf, romaneio.pdf"
                        value={producaoFileName}
                        onChange={(e) => setProducaoFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput('producao')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando no Servidor...' : 'Produção Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 4: MONTAGEM */}
              {order.currentStage === 'montagem' && (
                <form onSubmit={handleSaveMontagem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Fotos da Montagem Finalizada *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: foto_montagem_1.jpg"
                        value={montagemFotoName}
                        onChange={(e) => setMontagemFotoName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput('montagem')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando no Servidor...' : 'Montagem Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 5: ENTREGA / ACEITE */}
              {order.currentStage === 'entrega_aceite' && (
                <form onSubmit={handleSaveAceite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Termo de Aceite Assinado (PDF)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: termo_aceite.pdf"
                        value={aceiteFileName}
                        onChange={(e) => setAceiteFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput('aceite')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="client-confirmed"
                      checked={clientConfirmedAceite}
                      onChange={(e) => setClientConfirmedAceite(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="client-confirmed" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                      Cliente confirmou o recebimento e aceite da obra
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Finalizando Pedido...' : 'Concluir Pedido 🎉'}
                  </button>
                </form>
              )}

              {/* ETAPA 6: CONCLUÍDO */}
              {order.currentStage === 'concluido' && (
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">
                    Pedido #{order.id} Finalizado!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                    O pedido foi concluído com sucesso e todas as informações e documentos estão salvos na Pasta Digital.
                  </p>
                </div>
              )}
            </div>

            {/* GESTÃO OPERACIONAL DE PENDÊNCIAS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${hasPendingIssues ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800">Controle de Pendências Operacionais</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPendingBox(!showPendingBox)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  {showPendingBox ? 'Recolher' : 'Gerenciar'}
                </button>
              </div>

              {showPendingBox && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has-pending-check"
                      checked={hasPendingIssues}
                      onChange={(e) => setHasPendingIssues(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300"
                    />
                    <label htmlFor="has-pending-check" className="text-xs text-slate-700 font-medium">
                      Pedido possui pendência em aberto (assistência técnica, peça faltante, etc.)
                    </label>
                  </div>

                  {hasPendingIssues && (
                    <textarea
                      placeholder="Descreva a pendência operacional e ações necessárias..."
                      value={pendingNotesInput}
                      onChange={(e) => setPendingNotesInput(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}

                  <button
                    onClick={handleSavePendency}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
                  >
                    Salvar Status de Pendência
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* COLUNA DIREITA: TIMELINE DE AUDITORIA */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Timeline de Auditoria
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {order.timeline?.length || 0} Registros
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[500px]">
              {order.timeline && order.timeline.length > 0 ? (
                order.timeline.map((log) => (
                  <div key={log.id} className="relative pl-5 border-l-2 border-slate-200 group hover:border-blue-500 transition-colors">
                    <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600 transition-colors" />

                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-800">
                        {log.user}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mb-1">
                      {log.userRole}
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                      {log.action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Nenhum evento registrado.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Sistema Integrado de Auditoria e Persistência ERP Ativo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Fechar Pasta
          </button>
        </div>

        {/* Modal Visualizador Integrado do Contrato Assinado */}
        {viewingPdfUrl && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              
              <div className="bg-[#1B2B48] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-3 truncate pr-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-white truncate">{viewingPdfTitle}</h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                        ✓ Assinatura Válida
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-0.5">
                      Contrato definitivo com todas as cláusulas, produtos, valores e evidências forenses
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadContractPdf}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baixar PDF</span>
                  </button>
                  <a
                    href={viewingPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Abrir em Nova Aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (viewingPdfUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(viewingPdfUrl);
                      }
                      setViewingPdfUrl(null);
                    }}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-2 sm:p-3 overflow-hidden">
                <iframe
                  src={viewingPdfUrl}
                  className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-inner"
                  title="Visualizador de Contrato Assinado"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal do Contrato Comercial do Cliente */}
        {isContractModalOpen && (
          <CustomerContractModal
            isOpen={isContractModalOpen}
            onClose={() => setIsContractModalOpen(false)}
            order={order}
            onContractIssued={() => {
              onOrderUpdated?.();
            }}
          />
        )}

      </div>
    </div>
  );
};
