import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Ruler,
  FileCheck,
  Wrench,
  CheckCircle2,
  Upload,
  FileText,
  Clock,
  ShieldCheck,
  Sparkles,
  Check,
  Package,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Eye,
  Download,
  Sliders,
  X,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ChevronRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
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

interface OrderDetailViewProps {
  order: StoreOrder;
  onBack: () => void;
  onOrderUpdated?: () => void;
}

type TabType = 'geral' | 'etapas' | 'documentos' | 'historico';

const STAGES: {
  key: OrderStage;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}[] = [
  {
    key: 'formalizacao_contratual',
    label: '1. Formalização Contratual',
    shortLabel: 'Formalização',
    icon: FileCheck,
    description: 'Validação e assinatura eletrônica ou física do contrato comercial'
  },
  {
    key: 'medicao',
    label: '2. Medição Técnica',
    shortLabel: 'Medição',
    icon: Ruler,
    description: 'Conferência técnica no local da obra e preenchimento da ficha'
  },
  {
    key: 'projeto_aprovacao',
    label: '3. Projeto & Aprovação',
    shortLabel: 'Projeto 3D',
    icon: FileText,
    description: 'Elaboração do projeto executivo e aprovação formal pelo cliente'
  },
  {
    key: 'producao',
    label: '4. Produção na Fábrica',
    shortLabel: 'Produção',
    icon: Package,
    description: 'Corte, borda, usinagem e preparação dos módulos e ferragens'
  },
  {
    key: 'montagem',
    label: '5. Montagem na Obra',
    shortLabel: 'Montagem',
    icon: Wrench,
    description: 'Instalação dos móveis planejados no endereço do cliente'
  },
  {
    key: 'entrega_aceite',
    label: '6. Entrega & Aceite',
    shortLabel: 'Entrega / Aceite',
    icon: ShieldCheck,
    description: 'Vistoria final e validação do Termo de Aceite pelo cliente'
  },
  {
    key: 'concluido',
    label: '7. Concluído',
    shortLabel: 'Concluído',
    icon: CheckCircle2,
    description: 'Pedido finalizado com sucesso e arquivado na Pasta Digital'
  },
];

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, onBack, onOrderUpdated }) => {
  const { updateOrder } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);

  // Estados locais para arquivos e confirmações
  const [localDocuments, setLocalDocuments] = useState<OrderDocumentItem[]>(order.documents || []);
  const [contratoFileName, setContratoFileName] = useState(order.contractFile || '');
  const [medicaoFileName, setMedicaoFileName] = useState(order.medicaoFile || '');
  const [projectFileName, setProjectFileName] = useState(order.projectFile || '');
  const [clientApprovedProject, setClientApprovedProject] = useState(order.projectApproved || false);
  const [producaoFileName, setProducaoFileName] = useState(order.producaoFile || '');
  const [montagemFotoName, setMontagemFotoName] = useState(order.montagemFoto || '');
  const [aceiteFileName, setAceiteFileName] = useState(order.aceiteFile || '');
  const [clientConfirmedAceite, setClientConfirmedAceite] = useState(order.clientConfirmedAceite || false);

  const getStageIndex = (stageKey: OrderStage) => {
    const idx = STAGES.findIndex((s) => s.key === stageKey);
    return idx >= 0 ? idx : 0;
  };

  const currentStageIndex = getStageIndex(order.currentStage);

  // Sincronizar selectedStageIndex com o estágio atual ao carregar
  useEffect(() => {
    setSelectedStageIndex(currentStageIndex);
  }, [order.currentStage]);

  useEffect(() => {
    setLocalDocuments(order.documents || []);
    if (order.contractFile) setContratoFileName(order.contractFile);
    if (order.medicaoFile) setMedicaoFileName(order.medicaoFile);
    if (order.projectFile) setProjectFileName(order.projectFile);
    if (order.producaoFile) setProducaoFileName(order.producaoFile);
    if (order.montagemFoto) setMontagemFotoName(order.montagemFoto);
    if (order.aceiteFile) setAceiteFileName(order.aceiteFile);
  }, [order.documents, order.contractFile, order.medicaoFile, order.projectFile, order.producaoFile, order.montagemFoto, order.aceiteFile]);

  // Gestão de Valores Comerciais
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [contractedValueInput, setContractedValueInput] = useState(order.contractedValue || order.totalValue);
  const [currentContractedValue, setCurrentContractedValue] = useState(order.contractedValue || order.totalValue);

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

  // Gestão de Pendências
  const [hasPendingIssues, setHasPendingIssues] = useState(Boolean(order.hasPendingIssues));
  const [pendingNotesInput, setPendingNotesInput] = useState(order.pendingNotes || '');
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Estados de submissão e alertas
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados do Visualizador de Documentos e Contrato
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfTitle, setViewingPdfTitle] = useState<string>('');
  const [viewingDoc, setViewingDoc] = useState<OrderDocumentItem | null>(null);
  const [isGeneratingPdfView, setIsGeneratingPdfView] = useState(false);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadStage, setActiveUploadStage] = useState<string>('medicao');

  // Sincronização automática para arquivamento de contrato assinado
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
          setViewingPdfTitle(`Contrato Comercial — ${order.orderNumber || order.id}`);
          setViewingDoc(contractDoc);
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
      setViewingPdfTitle(`Contrato Comercial — ${order.orderNumber || order.id}`);
      setViewingDoc(null);
    } catch (err: any) {
      console.error('Erro ao visualizar contrato:', err);
      setErrorMessage('Não foi possível carregar a pré-visualização do contrato.');
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
      alert('Erro ao realizar download do contrato.');
    }
  };

  // Upload real para o Supabase Storage
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

    if (stage === 'contrato') setContratoFileName(file.name);
    else if (stage === 'medicao') setMedicaoFileName(file.name);
    else if (stage === 'projeto') setProjectFileName(file.name);
    else if (stage === 'producao') setProducaoFileName(file.name);
    else if (stage === 'montagem') setMontagemFotoName(file.name);
    else if (stage === 'aceite') setAceiteFileName(file.name);

    const newDocItem: OrderDocumentItem = {
      id: res.documentId || `doc_${Date.now()}`,
      stage: stage as any,
      docType: 'documento',
      fileName: file.name,
      filePath: res.filePath || '',
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/pdf',
      authorName: 'Operador ERP',
      createdAt: new Date().toISOString()
    };
    setLocalDocuments((prev) => [newDocItem, ...prev.filter((d) => d.stage !== stage)]);

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

  // Abrir documento anexado com Signed URL no visualizador integrado
  const handleOpenDocument = async (docOrStage?: OrderDocumentItem | string, fallbackFileName?: string) => {
    let filePath = typeof docOrStage === 'object' ? docOrStage?.filePath : undefined;
    let fileName = typeof docOrStage === 'object' ? docOrStage?.fileName : fallbackFileName;
    let stage = typeof docOrStage === 'object' ? docOrStage?.stage : docOrStage;

    if (!filePath) {
      const found =
        localDocuments.find((d) => d.stage === stage || (fileName && d.fileName === fileName)) ||
        order.documents?.find((d) => d.stage === stage || (fileName && d.fileName === fileName));
      if (found?.filePath) {
        filePath = found.filePath;
        fileName = found.fileName;
      }
    }

    if (!filePath) {
      const targetUuid = order.uuid || order.id;
      const targetTenantId = order.tenantId || 'b1020000-0000-0000-0000-000000000002';
      try {
        const { data: fileList } = await supabase.storage
          .from('order-documents')
          .list(`${targetTenantId}/${targetUuid}`);
        if (fileList && fileList.length > 0) {
          const match =
            fileList.find((f) => stage && f.name.startsWith(`${stage}_`)) ||
            fileList.find((f) => fileName && f.name.includes(fileName));
          if (match) {
            filePath = `${targetTenantId}/${targetUuid}/${match.name}`;
          }
        }
      } catch (e) {
        console.warn('Fallback storage list error:', e);
      }
    }

    if (!filePath) {
      alert('Documento registrado em modo de homologação ou sem arquivo no Storage.');
      return;
    }

    const signedUrl = await getOrderDocumentSignedUrl(filePath);
    if (signedUrl) {
      setViewingPdfUrl(signedUrl);
      setViewingPdfTitle(`${fileName || 'Documento'} — Etapa ${stage || ''}`);
      setViewingDoc({
        id: `doc_${Date.now()}`,
        stage: (stage as any) || 'documentos',
        docType: 'documento',
        fileName: fileName || 'documento.pdf',
        filePath,
        fileSizeBytes: 0,
        mimeType: fileName?.toLowerCase().endsWith('.png')
          ? 'image/png'
          : fileName?.toLowerCase().endsWith('.jpg') || fileName?.toLowerCase().endsWith('.jpeg')
            ? 'image/jpeg'
            : 'application/pdf',
        createdAt: new Date().toISOString(),
      });
    } else {
      alert('Não foi possível gerar link seguro para o documento.');
    }
  };

  // Baixar documento anexado
  const handleDownloadDocument = async (docOrStage?: OrderDocumentItem | string, fallbackFileName?: string) => {
    let filePath = typeof docOrStage === 'object' ? docOrStage?.filePath : undefined;
    let fileName = typeof docOrStage === 'object' ? docOrStage?.fileName : fallbackFileName;
    let stage = typeof docOrStage === 'object' ? docOrStage?.stage : docOrStage;

    if (!filePath) {
      const found =
        localDocuments.find((d) => d.stage === stage || (fileName && d.fileName === fileName)) ||
        order.documents?.find((d) => d.stage === stage || (fileName && d.fileName === fileName));
      if (found?.filePath) {
        filePath = found.filePath;
        fileName = found.fileName;
      }
    }

    if (!filePath) {
      const targetUuid = order.uuid || order.id;
      const targetTenantId = order.tenantId || 'b1020000-0000-0000-0000-000000000002';
      try {
        const { data: fileList } = await supabase.storage
          .from('order-documents')
          .list(`${targetTenantId}/${targetUuid}`);
        if (fileList && fileList.length > 0) {
          const match =
            fileList.find((f) => stage && f.name.startsWith(`${stage}_`)) ||
            fileList.find((f) => fileName && f.name.includes(fileName));
          if (match) {
            filePath = `${targetTenantId}/${targetUuid}/${match.name}`;
          }
        }
      } catch (e) {
        console.warn('Fallback storage list error:', e);
      }
    }

    if (!filePath) {
      alert('Documento sem arquivo no Storage para download.');
      return;
    }

    try {
      const signedUrl = await getOrderDocumentSignedUrl(filePath);
      if (!signedUrl) throw new Error('Signed URL falhou');
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = fileName || 'documento.pdf';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro ao baixar documento:', err);
      alert('Não foi possível baixar o arquivo.');
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

    setShowPendingModal(false);
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

  // Formalização: Contrato Físico
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

  // Formalização: Avançar quando já assinado
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

  // 1. Salvar Medição
  const handleSaveMedicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!medicaoFileName) {
      setErrorMessage('Por favor, anexe a Ficha de Medição ou foto contendo as medidas.');
      return;
    }

    setIsSubmitting(true);
    const targetUuid = order.uuid || order.id;

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

  // 2. Salvar Projeto
  const handleSaveProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!projectFileName) {
      setErrorMessage('Por favor, anexe pelo menos um arquivo de projeto executivo.');
      return;
    }
    if (!clientApprovedProject) {
      setErrorMessage('Você deve confirmar que o cliente aprovou o projeto executivo formalmente.');
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

  // 3. Salvar Produção
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

  // 4. Salvar Montagem
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

  // 5. Salvar Aceite
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

  const isContractSigned =
    order.contractStatus === 'assinado' ||
    order.contractStatus === 'assinado_eletronico' ||
    order.documents?.some((d) => d.stage === 'contrato' || d.docType === 'contrato_assinado');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hidden input para upload de arquivos */}
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

      {/* CABEÇALHO COMPACTO E PROFISSIONAL */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        
        {/* BARRA SUPERIOR DE NAVEGAÇÃO E METADADOS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Voltar para Pedidos</span>
            </button>

            <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/80">
              {order.orderNumber || order.id}
            </span>

            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80">
              {order.environment}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status do Contrato */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isContractSigned
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : order.contractStatus === 'assinado_externo'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isContractSigned ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  Contrato Assinado
                </>
              ) : order.contractStatus === 'assinado_externo' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                  Contrato Físico
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Aguardando Formalização
                </>
              )}
            </span>

            {/* Pendência */}
            {order.hasPendingIssues && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Pendência Ativa
              </span>
            )}
          </div>
        </div>

        {/* LINHA PRINCIPAL: CLIENTE, DADOS ESSENCIAIS E VALOR CONTRATADO */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {order.clientName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              {order.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-700">{order.phone}</strong>
                </span>
              )}
              {order.clientCpf && (
                <span>
                  CPF: <strong className="text-slate-700">{order.clientCpf}</strong>
                </span>
              )}
              {(order.installationAddress || order.address) && (
                <span className="flex items-center gap-1.5 truncate max-w-md" title={order.installationAddress || order.address}>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{order.installationAddress || order.address}</span>
                </span>
              )}
              {order.desiredDeadline && (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Prazo: {order.desiredDeadline}
                </span>
              )}
            </div>
          </div>

          {/* VALOR CONTRATADO */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:px-5 shrink-0 self-start lg:self-center">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Contratado
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingValue(!isEditingValue)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                  title="Ajustar condições comerciais"
                >
                  <Sliders className="w-3 h-3 text-amber-500" />
                </button>
              </div>
              <span className="text-xl font-black text-slate-900 block mt-0.5">
                R$ {currentContractedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {order.estimatedBudget && order.estimatedBudget !== currentContractedValue && (
                <span className="text-[10px] text-slate-400 block">
                  Orçamento: R$ {order.estimatedBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* POPOVER / CALCULADORA COMERCIAL */}
        {isEditingValue && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700 space-y-3.5 animate-in fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Ajuste de Condições Comerciais do Pedido
              </span>
              <button
                onClick={() => setIsEditingValue(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                  Valor Base (R$)
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
                    Desconto (%)
                  </label>
                  <span className="text-[9px] font-extrabold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    Teto: {commercialSettings.max_discount_percentage}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountPercentInput}
                  onChange={(e) => setDiscountPercentInput(Number(e.target.value))}
                  className={`w-full px-3 py-1.5 rounded-lg bg-slate-800 border text-xs font-bold text-white outline-none ${
                    isDiscountOverCeiling ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                  }`}
                />
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
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-300">
                Total Calculado: <strong className="text-emerald-400 text-sm">R$ {calculatedFinalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex gap-2">
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
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                    isDiscountOverCeiling || isSubmitting
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
                  }`}
                >
                  Salvar Novo Valor
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ALERTAS GLOBAIS DE ERRO E SUCESSO */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-red-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold px-2">×</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 font-bold px-2">×</button>
        </div>
      )}

      {/* RÉGUA OPERACIONAL: STEPPER DE 7 ETAPAS COMPACTO E ELEGANTE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {STAGES.map((s, idx) => {
            const IconComp = s.icon;
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSelectedStageIndex(idx);
                  setActiveTab('etapas');
                }}
                className="flex-1 min-w-[110px] flex flex-col items-center group cursor-pointer transition-all p-1.5 rounded-xl hover:bg-slate-50"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : isCurrent
                        ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <IconComp className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] mt-1.5 text-center font-semibold truncate max-w-full ${
                    isCurrent
                      ? 'text-blue-700 font-bold'
                      : isCompleted
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {s.shortLabel}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  Etapa {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE AS 4 ABAS */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-px">
        <button
          onClick={() => setActiveTab('geral')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'geral'
              ? 'text-blue-700 border-blue-600 bg-white shadow-2xs'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('etapas')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'etapas'
              ? 'text-blue-700 border-blue-600 bg-white shadow-2xs'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Etapas do Pedido</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {currentStageIndex + 1}/7
          </span>
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'documentos'
              ? 'text-blue-700 border-blue-600 bg-white shadow-2xs'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documentos (Pasta Digital)</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {localDocuments.length + (isContractSigned ? 1 : 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'historico'
              ? 'text-blue-700 border-blue-600 bg-white shadow-2xs'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico & Auditoria</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {order.timeline?.length || 0}
          </span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* CARD HERO: PRÓXIMA AÇÃO OPERACIONAL */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-blue-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300 block">
                  Ação Operacional Necessária
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  {order.currentStage === 'formalizacao_contratual' && 'Formalizar Contrato Comercial'}
                  {order.currentStage === 'medicao' && 'Concluir Medição Técnica Fina'}
                  {order.currentStage === 'projeto_aprovacao' && 'Aprovar Projeto Executivo 3D'}
                  {order.currentStage === 'producao' && 'Acompanhar Produção no PCP'}
                  {order.currentStage === 'montagem' && 'Registrar Montagem na Obra'}
                  {order.currentStage === 'entrega_aceite' && 'Validar Termo de Aceite Final'}
                  {order.currentStage === 'concluido' && 'Pedido Concluído e Arquivado'}
                </h3>
                <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
                  {order.currentStage === 'formalizacao_contratual' &&
                    'O cliente precisa assinar o contrato comercial eletronicamente ou a loja deve anexar a via impressa com assinatura para liberar o pedido para medição.'}
                  {order.currentStage === 'medicao' &&
                    'Visite o imóvel para conferência das medidas precisas, anexe a ficha técnica de medição e libere o pedido para o projetista.'}
                  {order.currentStage === 'projeto_aprovacao' &&
                    'Elabore o projeto executivo detalhado e confirme o aceite formal do cliente para liberar a esteira de fabricação.'}
                  {order.currentStage === 'producao' &&
                    'Os móveis estão na esteira de produção. Conclua esta fase quando os módulos e ferragens estiverem liberados para transporte.'}
                  {order.currentStage === 'montagem' &&
                    'A equipe está executando a montagem no endereço do cliente. Anexe fotos da montagem concluída para prosseguir.'}
                  {order.currentStage === 'entrega_aceite' &&
                    'Faça a vistoria final com o cliente e colha a assinatura no Termo de Aceite para finalizar o ciclo operacional.'}
                  {order.currentStage === 'concluido' &&
                    'Todas as 7 etapas foram finalizadas com sucesso. Os documentos e o contrato assinado estão preservados na Pasta Digital.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {order.currentStage !== 'concluido' ? (
                  <button
                    onClick={() => {
                      setSelectedStageIndex(currentStageIndex);
                      setActiveTab('etapas');
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Executar Etapa Agora</span>
                    <ChevronRight className="w-4 h-4 text-blue-700" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ver Pasta Digital</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* GRID DE INFORMAÇÕES: RESUMO DO PEDIDO E PENDÊNCIAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* CARD 1: CONTRATO COMERCIAL */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Contrato Comercial
                </span>
                {isContractSigned ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Assinado
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Pendente
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {order.contractFile || `contrato_${order.orderNumber || order.id}.pdf`}
                </span>
                {order.contractSignedByName && (
                  <p className="text-[11px] text-slate-500">
                    Assinado por: <strong className="text-slate-700">{order.contractSignedByName}</strong>
                  </p>
                )}
                {order.contractSignedAt && (
                  <p className="text-[11px] text-slate-400">
                    Data: {new Date(order.contractSignedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                {isContractSigned ? (
                  <button
                    onClick={handleViewContractPdf}
                    disabled={isGeneratingPdfView}
                    className="flex-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar Contrato</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsContractModalOpen(true)}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Gerar / Assinar</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: DADOS DO CLIENTE & ENTREGA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Local de Instalação
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {order.environment}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <p className="leading-snug">
                  <strong className="text-slate-800">Endereço: </strong>
                  {order.installationAddress || order.address || 'Não informado'}
                </p>
                <p>
                  <strong className="text-slate-800">Cidade: </strong>
                  {order.city} / {order.state}
                </p>
                <p>
                  <strong className="text-slate-800">Prazo Desejado: </strong>
                  <span className="text-emerald-700 font-semibold">{order.desiredDeadline || 'A combinar'}</span>
                </p>
              </div>
            </div>

            {/* CARD 3: CONTROLE DE PENDÊNCIAS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Pendências Operacionais
                </span>
                <button
                  onClick={() => setShowPendingModal(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Gerenciar
                </button>
              </div>

              {hasPendingIssues ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Pendência Registrada</span>
                  </div>
                  <p className="text-[11px] text-amber-800 line-clamp-2">
                    {pendingNotesInput || 'Sem detalhes fornecidos.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Nenhuma pendência operacional ativa.</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                Registre itens faltantes, assistência técnica ou imprevistos de montagem.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: ETAPAS DO PEDIDO */}
      {activeTab === 'etapas' && (
        <div className="space-y-6">
          
          {/* SELETOR HORIZONTAL DE ETAPAS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {STAGES.map((s, idx) => {
              const IconComp = s.icon;
              const isSelected = selectedStageIndex === idx;
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <button
                  key={s.key}
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : isCurrent
                          ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                  {isDone && <Check className="w-3 h-3 text-emerald-600" />}
                </button>
              );
            })}
          </div>

          {/* CARD PRINCIPAL DA ETAPA SELECIONADA */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
            
            {/* CABEÇALHO DA ETAPA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Etapa {selectedStageIndex + 1} de 7
                  </span>
                  {selectedStageIndex < currentStageIndex && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Concluída
                    </span>
                  )}
                  {selectedStageIndex === currentStageIndex && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      ● Etapa Atual
                    </span>
                  )}
                  {selectedStageIndex > currentStageIndex && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                      Futura
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {STAGES[selectedStageIndex].label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {STAGES[selectedStageIndex].description}
                </p>
              </div>

              {/* Botão de navegação rápida para a etapa ativa se estiver vendo outra */}
              {selectedStageIndex !== currentStageIndex && (
                <button
                  type="button"
                  onClick={() => setSelectedStageIndex(currentStageIndex)}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
                >
                  Ir para a Etapa Ativa ({STAGES[currentStageIndex].shortLabel}) →
                </button>
              )}
            </div>

            {/* SELEÇÃO DO FORMULÁRIO OPERACIONAL */}

            {/* ETAPA 1: FORMALIZAÇÃO */}
            {selectedStageIndex === 0 && (
              <div className="space-y-5">
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isContractSigned
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : order.contractStatus === 'assinado_externo'
                      ? 'bg-blue-50 border-blue-200 text-blue-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}>
                  {isContractSigned || order.contractStatus === 'assinado_externo' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold uppercase tracking-wider block">
                      Situação do Contrato Comercial:
                    </span>
                    <p className="leading-relaxed opacity-90">
                      {isContractSigned
                        ? `Contrato assinado eletronicamente por ${order.contractSignedByName || order.clientName} (CPF: ${order.contractSignedByCpf || 'conferido'}) em ${order.contractSignedAt ? new Date(order.contractSignedAt).toLocaleString('pt-BR') : 'recente'}.`
                        : order.contractStatus === 'assinado_externo'
                          ? 'Contrato assinado fisicamente anexado e validado pela loja parceira.'
                          : 'O contrato comercial precisa ser assinado pelo cliente (digitalmente ou fisicamente) para prosseguir.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Opção Digital */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">
                      Opção A — Assinatura Digital
                    </span>
                    <p className="text-xs text-slate-600">
                      Abra o QR Code ou gere o link seguro para o cliente assinar no celular ou tablet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsContractModalOpen(true)}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Abrir Emissão / QR Code</span>
                    </button>
                  </div>

                  {/* Opção Física */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] font-black uppercase text-blue-700 block">
                      Opção B — Assinatura em Papel
                    </span>
                    <p className="text-xs text-slate-600">
                      Imprima o contrato, colha a assinatura manual e anexe o arquivo escaneado.
                    </p>
                    <button
                      type="button"
                      onClick={() => triggerFileInput('contrato')}
                      disabled={uploadingStage === 'contrato'}
                      className="w-full py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{contratoFileName ? 'Substituir Arquivo' : 'Anexar Contrato Físico'}</span>
                    </button>
                  </div>
                </div>

                {contratoFileName && !isContractSigned && (
                  <form onSubmit={handleConfirmPhysicalContract} className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                      <Check className="w-4 h-4 text-indigo-600" />
                      <span>Arquivo Anexado: <strong>{contratoFileName}</strong></span>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirmar Formalização Física & Liberar Medição Fina →</span>
                    </button>
                  </form>
                )}

                {(isContractSigned || order.contractStatus === 'assinado_externo') && currentStageIndex === 0 && (
                  <button
                    type="button"
                    onClick={handleAdvanceFromFormalizacao}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Contrato Validado: Avançar para Medição Fina →</span>
                  </button>
                )}
              </div>
            )}

            {/* ETAPA 2: MEDIÇÃO */}
            {selectedStageIndex === 1 && (
              <div className="space-y-4">
                {currentStageIndex === 1 ? (
                  <form onSubmit={handleSaveMedicao} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ficha de Medição Técnica (PDF ou Foto) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: ficha_medicao_tecnica.pdf"
                          value={medicaoFileName}
                          onChange={(e) => setMedicaoFileName(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileInput('medicao')}
                          disabled={uploadingStage === 'medicao'}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'medicao' ? 'Enviando...' : 'Anexar Ficha'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Registrando no Servidor...' : 'Concluir Medição Fina & Liberar Projeto 3D →'}</span>
                    </button>
                  </form>
                ) : selectedStageIndex < currentStageIndex ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Medição concluída e arquivada: <strong>{medicaoFileName || 'Ficha anexada'}</strong></span>
                    </div>
                    {medicaoFileName && (
                      <button
                        type="button"
                        onClick={() => handleOpenDocument('medicao', medicaoFileName)}
                        className="px-3 py-1.5 bg-white text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Visualizar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Esta etapa será liberada assim que o contrato comercial for formalizado.
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: PROJETO & APROVAÇÃO */}
            {selectedStageIndex === 2 && (
              <div className="space-y-4">
                {currentStageIndex === 2 ? (
                  <form onSubmit={handleSaveProjeto} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Projeto Executivo / 3D (PDF ou Imagem) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: projeto_executivo_aprovado.pdf"
                          value={projectFileName}
                          onChange={(e) => setProjectFileName(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileInput('projeto')}
                          disabled={uploadingStage === 'projeto'}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'projeto' ? 'Enviando...' : 'Anexar Projeto'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="client-approval-detail"
                        checked={clientApprovedProject}
                        onChange={(e) => setClientApprovedProject(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="client-approval-detail" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Confirmo que o cliente aprovou o projeto executivo e os acabamentos especificados.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Registrando no Servidor...' : 'Aprovar Projeto & Liberar Produção →'}</span>
                    </button>
                  </form>
                ) : selectedStageIndex < currentStageIndex ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Projeto executivo aprovado formalmente: <strong>{projectFileName || 'projeto.pdf'}</strong></span>
                    </div>
                    {projectFileName && (
                      <button
                        type="button"
                        onClick={() => handleOpenDocument('projeto', projectFileName)}
                        className="px-3 py-1.5 bg-white text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Visualizar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Esta etapa será liberada após a conclusão da medição técnica.
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: PRODUÇÃO */}
            {selectedStageIndex === 3 && (
              <div className="space-y-4">
                {currentStageIndex === 3 ? (
                  <form onSubmit={handleSaveProducao} className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 leading-relaxed">
                      O pedido está em fase de <strong>corte, usinagem e borda na fábrica</strong>. Quando os módulos estiverem prontos para entrega na obra, anexe o romaneio ou documentos de fábrica e libere para a equipe de montagem.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Documentos de Produção / Romaneio (Opcional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: romaneio_fabrica.pdf"
                          value={producaoFileName}
                          onChange={(e) => setProducaoFileName(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileInput('producao')}
                          disabled={uploadingStage === 'producao'}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'producao' ? 'Enviando...' : 'Anexar'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Registrando no Servidor...' : 'Concluir Produção & Encaminhar para Montagem →'}</span>
                    </button>
                  </form>
                ) : selectedStageIndex < currentStageIndex ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Produção na fábrica finalizada com sucesso.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Esta etapa será liberada após a aprovação formal do projeto executivo.
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 5: MONTAGEM */}
            {selectedStageIndex === 4 && (
              <div className="space-y-4">
                {currentStageIndex === 4 ? (
                  <form onSubmit={handleSaveMontagem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Fotos da Montagem Concluída na Obra *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: foto_montagem_final.jpg"
                          value={montagemFotoName}
                          onChange={(e) => setMontagemFotoName(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileInput('montagem')}
                          disabled={uploadingStage === 'montagem'}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'montagem' ? 'Enviando...' : 'Anexar Fotos'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Registrando no Servidor...' : 'Concluir Montagem & Liberar para Entrega/Aceite →'}</span>
                    </button>
                  </form>
                ) : selectedStageIndex < currentStageIndex ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Montagem concluída. Arquivo anexado: <strong>{montagemFotoName || 'fotos_montagem.jpg'}</strong></span>
                    </div>
                    {montagemFotoName && (
                      <button
                        type="button"
                        onClick={() => handleOpenDocument('montagem', montagemFotoName)}
                        className="px-3 py-1.5 bg-white text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Visualizar
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Esta etapa será liberada após a conclusão da fabricação dos móveis.
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 6: ENTREGA / ACEITE */}
            {selectedStageIndex === 5 && (
              <div className="space-y-4">
                {currentStageIndex === 5 ? (
                  <form onSubmit={handleSaveAceite} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Termo de Aceite Assinado (PDF ou Foto)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: termo_aceite_cliente.pdf"
                          value={aceiteFileName}
                          onChange={(e) => setAceiteFileName(e.target.value)}
                          className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => triggerFileInput('aceite')}
                          disabled={uploadingStage === 'aceite'}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'aceite' ? 'Enviando...' : 'Anexar'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="client-aceite-detail"
                        checked={clientConfirmedAceite}
                        onChange={(e) => setClientConfirmedAceite(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="client-aceite-detail" className="text-xs font-bold text-emerald-950 cursor-pointer">
                        Confirmo que o cliente realizou a vistoria final e aprovou a entrega da obra sem ressalvas pendentes.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Finalizando Pedido...' : 'Concluir Pedido com Sucesso 🎉'}</span>
                    </button>
                  </form>
                ) : selectedStageIndex < currentStageIndex ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Termo de Aceite validado e arquivado.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    Esta etapa será liberada após a conclusão da montagem na obra.
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 7: CONCLUÍDO */}
            {selectedStageIndex === 6 && (
              <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-emerald-950">
                  Pedido #{order.orderNumber || order.id} Concluído com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Todas as etapas da esteira operacional foram concluídas e todos os documentos, projetos e contratos estão devidamente armazenados na Pasta Digital.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Acessar Documentos Arquivados</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* CONTEÚDO DA ABA 3: DOCUMENTOS (PASTA DIGITAL) */}
      {activeTab === 'documentos' && (
        <div className="space-y-6">
          
          {/* NÍVEL 1: CONTRATO COMERCIAL PRINCIPAL */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  1. Contrato Comercial Formalizado
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  isContractSigned
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isContractSigned ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Formalizado
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pendente
                  </>
                )}
              </span>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
              isContractSigned ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className={`w-4 h-4 shrink-0 ${isContractSigned ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold truncate ${isContractSigned ? 'text-slate-900' : 'text-slate-500 italic'}`}>
                    {order.contractFile || `contrato_assinado_${order.orderNumber || order.id}.pdf`}
                  </span>
                </div>
                {isContractSigned && (order.contractSignedByName || order.contractSignedByCpf) && (
                  <p className="text-[11px] text-slate-600">
                    Signatário: <strong className="text-slate-800">{order.contractSignedByName || order.clientName}</strong>
                    {order.contractSignedByCpf && ` (CPF: ${order.contractSignedByCpf})`}
                    {order.contractSignedAt && ` • Assinado em ${new Date(order.contractSignedAt).toLocaleString('pt-BR')}`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isContractSigned ? (
                  <>
                    <button
                      type="button"
                      onClick={handleViewContractPdf}
                      disabled={isGeneratingPdfView}
                      className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isGeneratingPdfView ? 'Carregando...' : 'Visualizar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadContractPdf}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Baixar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFileInput('contrato')}
                      disabled={uploadingStage === 'contrato'}
                      title="Substituir contrato por outro arquivo"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerFileInput('contrato')}
                    disabled={uploadingStage === 'contrato'}
                    className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingStage === 'contrato' ? 'Enviando...' : 'Anexar Contrato'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* NÍVEL 2: DOCUMENTOS OPERACIONAIS POR ETAPA */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  2. Documentos das Etapas Operacionais
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Anexos sincronizados na Pasta Digital
              </span>
            </div>

            {/* TABELA / LISTA LIMPA DE DOCUMENTOS POR ETAPA (LAYOUT ORGANIZADO E PROFISSIONAL) */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              
              {/* LINHA: MEDIÇÃO */}
              {(() => {
                const stageDoc = localDocuments.find((d) => d.stage === 'medicao') || order.documents?.find((d) => d.stage === 'medicao');
                const hasFile = Boolean(medicaoFileName || stageDoc);
                const displayFileName = medicaoFileName || stageDoc?.fileName || 'Nenhuma medição anexada';

                return (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800">
                          2. Medição Técnica
                        </span>
                        {hasFile ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Anexado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-400">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${hasFile ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'}`}>
                        {displayFileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasFile ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(stageDoc || 'medicao', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(stageDoc || 'medicao', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileInput('medicao')}
                            disabled={uploadingStage === 'medicao'}
                            title="Substituir arquivo"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFileInput('medicao')}
                          disabled={uploadingStage === 'medicao'}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'medicao' ? 'Enviando...' : 'Anexar Ficha'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LINHA: PROJETO & APROVAÇÃO */}
              {(() => {
                const stageDoc = localDocuments.find((d) => d.stage === 'projeto') || order.documents?.find((d) => d.stage === 'projeto');
                const hasFile = Boolean(projectFileName || stageDoc);
                const displayFileName = projectFileName || stageDoc?.fileName || 'Nenhum projeto anexado';

                return (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800">
                          3. Projeto Executivo / 3D
                        </span>
                        {hasFile ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Anexado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-400">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${hasFile ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'}`}>
                        {displayFileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasFile ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(stageDoc || 'projeto', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(stageDoc || 'projeto', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileInput('projeto')}
                            disabled={uploadingStage === 'projeto'}
                            title="Substituir arquivo"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFileInput('projeto')}
                          disabled={uploadingStage === 'projeto'}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'projeto' ? 'Enviando...' : 'Anexar Projeto'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LINHA: DOCUMENTOS DE PRODUÇÃO */}
              {(() => {
                const stageDoc = localDocuments.find((d) => d.stage === 'producao') || order.documents?.find((d) => d.stage === 'producao');
                const hasFile = Boolean(producaoFileName || stageDoc);
                const displayFileName = producaoFileName || stageDoc?.fileName || 'Nenhum documento de produção anexado';

                return (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800">
                          4. Documentos de Produção / PCP
                        </span>
                        {hasFile ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Anexado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-400">
                            Opcional
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${hasFile ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'}`}>
                        {displayFileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasFile ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(stageDoc || 'producao', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(stageDoc || 'producao', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileInput('producao')}
                            disabled={uploadingStage === 'producao'}
                            title="Substituir arquivo"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFileInput('producao')}
                          disabled={uploadingStage === 'producao'}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'producao' ? 'Enviando...' : 'Anexar'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LINHA: FOTOS DA MONTAGEM */}
              {(() => {
                const stageDoc = localDocuments.find((d) => d.stage === 'montagem') || order.documents?.find((d) => d.stage === 'montagem');
                const hasFile = Boolean(montagemFotoName || stageDoc);
                const displayFileName = montagemFotoName || stageDoc?.fileName || 'Nenhuma foto anexada';

                return (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800">
                          5. Fotos da Montagem na Obra
                        </span>
                        {hasFile ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Anexado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-400">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${hasFile ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'}`}>
                        {displayFileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasFile ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(stageDoc || 'montagem', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(stageDoc || 'montagem', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileInput('montagem')}
                            disabled={uploadingStage === 'montagem'}
                            title="Substituir foto"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFileInput('montagem')}
                          disabled={uploadingStage === 'montagem'}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'montagem' ? 'Enviando...' : 'Anexar Foto'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* LINHA: TERMO DE ACEITE */}
              {(() => {
                const stageDoc = localDocuments.find((d) => d.stage === 'aceite') || order.documents?.find((d) => d.stage === 'aceite');
                const hasFile = Boolean(aceiteFileName || stageDoc || clientConfirmedAceite);
                const displayFileName = aceiteFileName || stageDoc?.fileName || (clientConfirmedAceite ? 'Confirmação digital registrada no sistema' : 'Nenhum termo anexado');

                return (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-800">
                          6. Termo de Entrega & Aceite
                        </span>
                        {hasFile ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Confirmado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-400">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${hasFile ? 'text-slate-700 font-semibold' : 'text-slate-400 italic'}`}>
                        {displayFileName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {stageDoc || aceiteFileName ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(stageDoc || 'aceite', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(stageDoc || 'aceite', displayFileName)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baixar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileInput('aceite')}
                            disabled={uploadingStage === 'aceite'}
                            title="Substituir arquivo"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFileInput('aceite')}
                          disabled={uploadingStage === 'aceite'}
                          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingStage === 'aceite' ? 'Enviando...' : 'Anexar Aceite'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

        </div>
      )}

      {/* CONTEÚDO DA ABA 4: HISTÓRICO & AUDITORIA */}
      {activeTab === 'historico' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Trilha de Auditoria & Linha do Tempo
              </h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {order.timeline?.length || 0} Registros
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {order.timeline && order.timeline.length > 0 ? (
              order.timeline.map((log, index) => (
                <div key={log.id || index} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-l-transparent last:pb-0">
                  <div className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold">{log.user}</strong>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {log.userRole}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed mt-1">
                    {log.action}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-8">
                Nenhum evento registrado nesta trilha de auditoria.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO VISUALIZADOR INTEGRADO DE DOCUMENTOS */}
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
                      {viewingDoc ? (viewingDoc.stage === 'contrato' ? '✓ Assinatura Válida' : `Etapa: ${viewingDoc.stage}`) : '✓ Assinatura Válida'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate mt-0.5">
                    {viewingDoc
                      ? `Arquivo da Pasta Digital (${viewingDoc.fileName})`
                      : 'Contrato comercial definitivo com cláusulas, especificações e evidências forenses'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (viewingDoc) {
                      handleDownloadDocument(viewingDoc);
                    } else {
                      handleDownloadContractPdf();
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
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
                    setViewingDoc(null);
                  }}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 sm:p-3 overflow-hidden flex items-center justify-center">
              {viewingDoc?.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(viewingPdfUrl) ? (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-slate-900/10 rounded-2xl">
                  <img
                    src={viewingPdfUrl}
                    alt={viewingPdfTitle}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : (
                <iframe
                  src={viewingPdfUrl}
                  className="w-full h-full rounded-2xl border border-slate-300 bg-white shadow-inner"
                  title={viewingPdfTitle || 'Visualizador de Documento'}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE PENDÊNCIAS */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Controle de Pendências Operacionais
              </h3>
              <button onClick={() => setShowPendingModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPendingIssues}
                  onChange={(e) => setHasPendingIssues(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Marcar pedido como contendo pendência ativa (peça em assistência, aguardando cliente, etc.)
                </span>
              </label>

              {hasPendingIssues && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Descrição da Pendência / Ação Corretiva
                  </label>
                  <textarea
                    rows={3}
                    value={pendingNotesInput}
                    onChange={(e) => setPendingNotesInput(e.target.value)}
                    placeholder="Descreva a peça faltante ou ocorrência..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePendency}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
              >
                Salvar Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO CONTRATO COMERCIAL DO CLIENTE (EMISSÃO / QR CODE / LINK) */}
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
  );
};

