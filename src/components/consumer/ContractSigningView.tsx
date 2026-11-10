import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  Clock, 
  FileCheck,
  PenTool,
  RotateCcw,
  Download,
  AlertTriangle,
  Lock,
  Layers,
  CreditCard,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { 
  fetchContractForSigning, 
  submitDigitalSignature,
  downloadContractPdf,
  ContractSigningResponse 
} from '../../lib/customerContractService';
import { StoreContractTemplate, ContractClause, PaymentAllocation } from '../../types';

interface ContractSigningViewProps {
  token: string;
  onClose?: () => void;
}

export const ContractSigningView: React.FC<ContractSigningViewProps> = ({ token, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<ContractSigningResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulário do signatário
  const [signerName, setSignerName] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Canvas de assinatura manual
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchContractForSigning(token).then((res) => {
        if (!res.success || !res.order) {
          setErrorMessage(res.error || 'Contrato não encontrado ou link expirado.');
        } else {
          setContractData(res);
          const initialName = res.snapshot?.customer?.name || res.order.clientName || res.order.client_name || '';
          const initialCpf = res.snapshot?.customer?.cpf || res.order.clientCpf || res.order.client_cpf || '';
          setSignerName(initialName);
          setSignerCpf(initialCpf);
          if (res.alreadySigned) {
            setSignSuccess(true);
          }
        }
        setLoading(false);
      });
    }
  }, [token]);

  // Formatação de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setSignerCpf(v);
  };

  // Funções do Canvas de Assinatura
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1B2B48';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerCpf.trim() || !agreedTerms) return;

    const cleanCpf = signerCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert('Por favor, digite um CPF válido com 11 dígitos.');
      return;
    }

    let signatureImage: string | undefined = undefined;
    if (canvasRef.current && hasDrawn) {
      signatureImage = canvasRef.current.toDataURL('image/png');
    }

    setIsSubmitting(true);
    try {
      const res = await submitDigitalSignature(token, {
        name: signerName.trim(),
        cpf: signerCpf.trim(),
        userAgent: navigator.userAgent,
        signatureImage
      });

      if (!res.success) {
        alert(res.error || 'Erro ao assinar contrato eletrônico.');
      } else {
        setSignSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val || 0);
  };

  const handleDownloadPdf = async () => {
    if (!contractData || !contractData.order) return;
    try {
      setIsDownloadingPdf(true);
      const isAlreadySigned = contractData.alreadySigned || signSuccess;
      const sigImg = (canvasRef.current && hasDrawn) 
        ? canvasRef.current.toDataURL('image/png') 
        : contractData.signedInfo?.signature_image || contractData.order.contract_signature_image;

      await downloadContractPdf({
        order: contractData.order,
        template: contractData.template,
        signingUrl: window.location.href,
        isSigned: isAlreadySigned,
        signatureImage: sigImg,
        signerName: signerName.trim() || contractData.signedInfo?.signer_name || contractData.order.contract_signed_by_name || contractData.order.client_name,
        signerCpf: signerCpf.trim() || contractData.signedInfo?.signer_cpf || contractData.order.contract_signed_by_cpf || contractData.order.client_cpf,
        signedAt: contractData.signedInfo?.signed_at || contractData.order.contract_signed_at || new Date().toISOString(),
        signatureId: contractData.signedInfo?.signature_id || contractData.order.id
      }, `CONTRATO_ASSINADO_${contractData.order.orderNumber || contractData.order.order_number || 'PEDIDO'}.pdf`);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      alert('Não foi possível gerar o arquivo PDF no momento.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-semibold text-slate-300">Carregando contrato digital seguro...</p>
      </div>
    );
  }

  if (errorMessage || !contractData || !contractData.order) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-white">Acesso Indisponível</h2>
          <p className="text-xs text-slate-400">{errorMessage || 'Não foi possível encontrar o contrato solicitado.'}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          )}
        </div>
      </div>
    );
  }

  const { order, template, snapshot } = contractData;

  // Extração robusta priorizando o Snapshot oficial
  const storeName = snapshot?.contractor?.tradeName || snapshot?.contractor?.companyName || template?.tradeName || template?.companyName || 'Loja Parceira Planeja Fácil';
  const storeCompanyName = snapshot?.contractor?.companyName || template?.companyName || storeName;
  const storeCnpj = snapshot?.contractor?.cnpj || template?.cnpj || '';
  const storeAddress = snapshot?.contractor?.address || template?.address || '';
  const storePhone = snapshot?.contractor?.phone || template?.phone || '';
  const storeEmail = snapshot?.contractor?.email || template?.email || '';
  const sellerName = snapshot?.contractor?.sellerName || order.sellerName || order.seller_name || 'Consultor Comercial';

  const clientName = snapshot?.customer?.name || order.clientName || order.client_name || 'Cliente';
  const clientCpf = snapshot?.customer?.cpf || order.clientCpf || order.client_cpf || '';
  const clientRg = snapshot?.customer?.rg || order.clientRg || order.client_rg || '';
  const clientPhone = snapshot?.customer?.phone || order.phone || order.client_phone || '';
  const clientEmail = snapshot?.customer?.email || order.clientEmail || order.client_email || '';
  const billingAddr = snapshot?.customer?.billingAddress || order.billingAddress || order.billing_address || '';
  const installAddr = snapshot?.customer?.installationAddress || order.installationAddress || order.installation_address || billingAddr || '';
  const clientCity = snapshot?.customer?.city || order.clientCity || order.client_city || '';
  const clientState = snapshot?.customer?.state || order.clientState || order.client_state || '';
  const clientCep = snapshot?.customer?.cep || order.clientCep || order.client_cep || '';

  const orderNum = order.orderNumber || order.order_number || '#PED';
  const contractVer = snapshot?.version || order.contractVersion || order.contract_version || 1;
  const orderDate = new Date(order.createdAt || order.created_at || Date.now()).toLocaleDateString('pt-BR');

  // Produtos e Ambientes
  const promobProjectName = snapshot?.products?.promobProjectName || order.commercialProposal?.promobProjectName || order.environment || 'Projeto Planejado Sob Medida';
  const promobFileName = snapshot?.products?.promobFileName || order.commercialProposal?.promobFileName || '';
  const promobValue = snapshot?.products?.promobValue ?? (order.commercialProposal?.promobValue || 0);
  const conventionalItems = snapshot?.products?.conventionalItems || order.commercialProposal?.conventionalItems || [];
  const conventionalTotal = snapshot?.products?.conventionalTotal ?? (order.commercialProposal?.conventionalTotal || 0);
  const simulationEnvironments = snapshot?.products?.simulationEnvironments || [];

  // Financeiro
  const grossSubtotal = snapshot?.financials?.subtotalGross || order.commercialProposal?.subtotalGross || order.totalValue || 0;
  const discountAmount = snapshot?.financials?.discountAmount || order.commercialProposal?.discountAmount || order.commercialProposal?.discountValue || 0;
  const discountPct = snapshot?.financials?.discountPct || order.commercialProposal?.discountPct || order.commercialProposal?.discountPercentage || 0;
  const subtotalAfterDiscount = snapshot?.financials?.subtotalAfterDiscount || order.commercialProposal?.subtotalAfterDiscount || (grossSubtotal - discountAmount);
  const paymentFeeAmount = snapshot?.financials?.paymentFeeAmount || order.commercialProposal?.paymentFeeAmount || 0;
  const totalContract = snapshot?.financials?.finalContractedValue || order.contractedValue || order.contracted_value || order.totalValue || order.total_value || 0;
  const paymentMethodLabel = snapshot?.financials?.paymentMethodLabel || order.commercialProposal?.paymentMethodLabel || 'Condições Acordadas';
  const paymentAllocations: PaymentAllocation[] = snapshot?.financials?.paymentAllocations || order.paymentAllocations || order.payment_allocations || order.commercialProposal?.paymentAllocations || [];

  // Prazos e Observações
  const deliveryDays = snapshot?.delivery?.deliveryDays || order.desiredDeadline || order.desired_deadline || (template?.defaultDeliveryDays ? `${template.defaultDeliveryDays} dias úteis` : '45 dias úteis');
  const deliveryReference = snapshot?.delivery?.deliveryReference || 'Contados em dias úteis a partir da conclusão da Medição Fina presencial e da assinatura formal do Projeto Executivo Final.';
  const orderNotes = snapshot?.delivery?.observations || order.orderNotes || order.order_notes || order.commercialProposal?.observations || '';

  // Cláusulas
  const clauses: ContractClause[] = snapshot?.clauses && Array.isArray(snapshot.clauses) && snapshot.clauses.length > 0
    ? snapshot.clauses
    : (template?.clauses && Array.isArray(template.clauses) && template.clauses.length > 0 
      ? template.clauses 
      : []);

  const hasMissingClauses = clauses.length === 0;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-[#1B2B48] text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold flex-shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  Contrato de Fornecimento Sob Medida
                </span>
                <span className="text-[10px] bg-slate-700/80 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-600">
                  Versão {contractVer}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight">{storeName}</h1>
              <p className="text-xs text-slate-300">
                Pedido <strong className="text-white">{orderNum}</strong> • Emissão: {orderDate}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Total Contratado</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{formatBRL(totalContract)}</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/15"
              title="Baixar versão PDF oficial"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400" />
              )}
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
          </div>
        </div>

        {/* Banner de Sucesso quando já assinado */}
        {signSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-400 p-6 rounded-3xl text-emerald-950 space-y-3 shadow-md animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5 text-emerald-800">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-base font-black">Contrato Assinado Eletronicamente com Validade Jurídica</h3>
                <span className="text-xs text-emerald-700">Autenticação registrada conforme MP nº 2.200-2/2001 e Lei Federal nº 14.063/2020</span>
              </div>
            </div>
            <div className="bg-white/90 p-4 rounded-2xl border border-emerald-200 text-xs space-y-1.5 text-emerald-900">
              <div>
                Signatário: <strong>{contractData.signedInfo?.signedByName || signerName}</strong> (CPF {contractData.signedInfo?.signedByCpf || signerCpf})
              </div>
              <div>
                Data/Hora da Assinatura: <strong>{new Date(contractData.signedInfo?.signedAt || Date.now()).toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                Endereço IP Registrado: <span className="font-mono text-[11px] text-slate-600">{contractData.signedInfo?.signatureIp || 'Dispositivo Web do Cliente'}</span>
              </div>
              {contractData.signedInfo?.signatureImage && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Rubrica Eletrônica Capturada:</span>
                  <img src={contractData.signedInfo.signatureImage} alt="Assinatura" className="h-16 border border-slate-200 rounded-lg p-1 bg-white" />
                </div>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Via do Contrato Assinado (PDF)</span>
              </button>
            </div>
          </div>
        )}

        {/* Alerta de Cláusulas Ausentes */}
        {hasMissingClauses && (
          <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl text-rose-950 flex items-start space-x-3 text-xs">
            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-sm font-black text-rose-900 block">Cláusulas Contratuais Não Localizadas</strong>
              <p className="text-rose-800 leading-relaxed">
                As cláusulas e termos deste contrato não foram carregadas corretamente. Por exigência de segurança jurídica e integridade contratual, o botão de assinatura permanecerá bloqueado até que a loja regularize as cláusulas.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CORPO INTEGRAL DO CONTRATO COMERCIAL E TÉCNICO (DOCUMENT VIEW) */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-10 space-y-8 text-xs text-slate-800">

          {/* 1. IDENTIFICAÇÃO COMPLETA DAS PARTES */}
          <section className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-2 text-[#1B2B48]">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black uppercase tracking-wide">1. Identificação das Partes Contratantes</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contratada (Loja) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  CONTRATADA (FORNECEDORA)
                </span>
                <strong className="text-sm font-extrabold text-[#1B2B48] block">{storeName}</strong>
                {storeCompanyName && storeCompanyName !== storeName && (
                  <p className="text-[11px] text-slate-600">Razão Social: <strong>{storeCompanyName}</strong></p>
                )}
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div>CNPJ: <strong className="text-slate-800">{storeCnpj || 'Não informado'}</strong></div>
                  <div>Endereço: <strong className="text-slate-800">{storeAddress || 'Não informado'}</strong></div>
                  {(storePhone || storeEmail) && (
                    <div>Contato: <strong className="text-slate-800">{[storePhone, storeEmail].filter(Boolean).join(' • ')}</strong></div>
                  )}
                  <div>Vendedor Responsável: <strong className="text-slate-800">{sellerName}</strong></div>
                </div>
              </div>

              {/* Contratante (Cliente) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  CONTRATANTE (CLIENTE)
                </span>
                <strong className="text-sm font-extrabold text-[#1B2B48] block">{clientName}</strong>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                  <div>CPF: <strong className="text-slate-800">{clientCpf || 'Não informado'}</strong></div>
                  <div>RG: <strong className="text-slate-800">{clientRg || 'Não informado'}</strong></div>
                  <div>Telefone: <strong className="text-slate-800">{clientPhone || 'Não informado'}</strong></div>
                  <div>E-mail: <strong className="text-slate-800">{clientEmail || 'Não informado'}</strong></div>
                  <div className="col-span-2">
                    Cobrança: <strong className="text-slate-800">{billingAddr || [clientCity, clientState, clientCep].filter(Boolean).join(' - ') || 'Não informado'}</strong>
                  </div>
                  <div className="col-span-2">
                    Instalação: <strong className="text-slate-800">{installAddr || billingAddr || 'Não informado'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. DISCRIMINAÇÃO DETALHADA DOS PRODUTOS E AMBIENTES */}
          <section className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#1B2B48]">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wide">2. Discriminação dos Ambientes e Produtos Contratados</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Engenharia Sob Medida</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-700 grid grid-cols-12 gap-2 border-b border-slate-200">
                <span className="col-span-6 sm:col-span-7">Item / Descrição Técnica</span>
                <span className="col-span-3 sm:col-span-2 text-center">Tipo / Qtd</span>
                <span className="col-span-3 text-right">Valor Comercial</span>
              </div>

              {/* Móveis Planejados Promob */}
              <div className="p-4 bg-white grid grid-cols-12 gap-2 items-center text-xs border-b border-slate-100">
                <div className="col-span-6 sm:col-span-7 space-y-0.5">
                  <strong className="text-slate-900 block font-bold text-sm">
                    {promobProjectName}
                  </strong>
                  <span className="text-[11px] text-slate-500 block">
                    Fabricação sob medida conforme projeto técnico executivo Promob {promobFileName ? `(${promobFileName})` : ''}
                  </span>
                </div>
                <div className="col-span-3 sm:col-span-2 text-center text-[11px] text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold">1 conjunto</span>
                </div>
                <div className="col-span-3 text-right font-black text-slate-900 text-sm">
                  {formatBRL(promobValue > 0 ? promobValue : totalContract)}
                </div>
              </div>

              {/* Ambientes da Simulação com Dimensões Reais (se houver) */}
              {simulationEnvironments.length > 0 && (
                <div className="bg-slate-50/70 p-3 sm:p-4 border-b border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Detalhamento dos Ambientes Especificados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {simulationEnvironments.map((env: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <strong className="text-slate-800">{env.name}</strong>
                          <span className="text-slate-500 block text-[10px]">
                            Área: {env.areaM2} m² {env.ceilingHeight ? `• Pé direito: ${env.ceilingHeight}m` : ''} {env.wallCount ? `• ${env.wallCount} paredes` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Integrado
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Móveis Convencionais (se houver) */}
              {conventionalItems.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {conventionalItems.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 bg-white grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-6 sm:col-span-7">
                        <strong className="text-slate-900 block font-bold">{item.name}</strong>
                        <span className="text-[11px] text-slate-500">Item convencional complementar</span>
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-center text-[11px] text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-semibold">{item.quantity} un</span>
                      </div>
                      <div className="col-span-3 text-right font-black text-slate-900 text-sm">
                        {formatBRL(item.total || (item.salePrice * item.quantity))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 3. INFORMAÇÕES FINANCEIRAS COMPLETAS E CONDIÇÕES DE PAGAMENTO */}
          <section className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-2 text-[#1B2B48]">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black uppercase tracking-wide">3. Condições Comerciais e Formas de Pagamento</h2>
            </div>

            {/* Resumo Numérico */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Subtotal dos Produtos</span>
                <strong className="text-slate-800 text-sm">{formatBRL(grossSubtotal)}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Desconto Comercial</span>
                <strong className="text-emerald-700 text-sm">
                  {discountAmount > 0 ? `-${formatBRL(discountAmount)} (${discountPct}%)` : 'R$ 0,00'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Subtotal c/ Desconto</span>
                <strong className="text-slate-800 text-sm">{formatBRL(subtotalAfterDiscount)}</strong>
              </div>
              <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-800 uppercase block">Total Contratado</span>
                <strong className="text-emerald-900 text-base font-black">{formatBRL(totalContract)}</strong>
              </div>
            </div>

            {/* Quadro de Formas de Pagamento Negociadas */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Detalhamento das Formas de Pagamento Negociadas:
              </span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-[11px] font-bold text-slate-700 grid grid-cols-12 gap-2">
                  <span className="col-span-5">Modalidade</span>
                  <span className="col-span-3 text-center">Parcelamento</span>
                  <span className="col-span-2 text-right">Valor Parcela</span>
                  <span className="col-span-2 text-right">Subtotal</span>
                </div>

                {paymentAllocations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {paymentAllocations.map((alloc: PaymentAllocation, idx: number) => (
                      <div key={idx} className="p-3 bg-white grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-5 font-bold text-slate-800 flex items-center space-x-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{alloc.methodLabel || 'Forma de Pagamento'}</span>
                        </div>
                        <div className="col-span-3 text-center text-[11px] text-slate-600">
                          {alloc.installments > 1 ? `${alloc.installments} parcelas` : 'À Vista'}
                        </div>
                        <div className="col-span-2 text-right text-slate-800 font-semibold">
                          {formatBRL(alloc.installmentValue)}
                        </div>
                        <div className="col-span-2 text-right font-black text-slate-900">
                          {formatBRL(alloc.totalAmount || alloc.totalAmountWithFee || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-5 font-bold text-slate-800">
                      {paymentMethodLabel}
                    </div>
                    <div className="col-span-3 text-center text-[11px] text-slate-600">
                      Condição Acordada
                    </div>
                    <div className="col-span-2 text-right text-slate-800 font-semibold">
                      {formatBRL(totalContract)}
                    </div>
                    <div className="col-span-2 text-right font-black text-slate-900">
                      {formatBRL(totalContract)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 4. PRAZO, ENTREGA E OBSERVAÇÕES */}
          <section className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-2 text-[#1B2B48]">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black uppercase tracking-wide">4. Prazos de Fabricação, Entrega e Montagem</h2>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Prazo Contratual de Fornecimento
                  </span>
                  <strong className="text-sm sm:text-base font-black text-emerald-950">
                    {deliveryDays.toUpperCase()}
                  </strong>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                  Dias Úteis
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                <strong>Referência de contagem:</strong> {deliveryReference}
              </p>
              {orderNotes && (
                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950">
                  <strong>Observações Comerciais do Pedido:</strong> {orderNotes}
                </div>
              )}
            </div>
          </section>

          {/* 5. TERMOS E CLÁUSULAS CONTRATUAIS COMPLETAS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#1B2B48]">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-black uppercase tracking-wide">5. Termos e Cláusulas Contratuais Gerais</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                {clauses.length} Cláusulas Contratuais
              </span>
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-2 text-[11px] text-slate-700 border border-slate-200 p-5 rounded-2xl bg-slate-50 divide-y divide-slate-200/70">
              {clauses.map((clause, idx) => (
                <div key={clause.id || idx} className={`space-y-1.5 ${idx > 0 ? 'pt-3.5' : ''}`}>
                  <strong className="text-slate-900 block font-extrabold text-xs">
                    {clause.number} — {clause.title}
                  </strong>
                  <p className="text-justify leading-relaxed whitespace-pre-line text-slate-600">
                    {clause.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FORMULÁRIO DE ASSINATURA ELETRÔNICA DO CLIENTE */}
          {!signSuccess && (
            <form onSubmit={handleSign} className="border-t-2 border-slate-200 pt-8 space-y-6">
              <div className="flex items-center space-x-2 text-slate-900 font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Formalização e Assinatura Eletrônica do Contratante</span>
              </div>

              {/* 1. Declaração de Ciência e Concordância (NÃO pré-marcada) */}
              <label className="flex items-start space-x-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-300 cursor-pointer text-xs text-amber-950 hover:bg-amber-50 transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 w-4 h-4 cursor-pointer"
                />
                <span className="leading-relaxed">
                  <strong>Declaro sob as penas da lei</strong> que li atentamente e concordo integralmente com todas as especificações técnicas, valores, formas de pagamento, prazos de entrega e cláusulas gerais deste contrato de fornecimento de móveis planejados sob medida.
                </span>
              </label>

              {/* 2. Identificação do Signatário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                    Nome Completo do Signatário *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Seu nome completo conforme CPF"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                    CPF do Signatário *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerCpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 3. Assinatura Manuscrita / Rubrica na Tela */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-700 flex items-center space-x-1.5">
                    <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Desenhe sua Assinatura / Rubrica no Quadro Abaixo (Touch no Celular ou Mouse):</span>
                  </label>
                  {hasDrawn && (
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpar Assinatura</span>
                    </button>
                  )}
                </div>

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden touch-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 sm:h-36 block cursor-crosshair bg-white"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs">
                      <span>Clique ou use o dedo para assinar aqui</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Confirmação */}
              <button
                type="submit"
                disabled={isSubmitting || hasMissingClauses || !signerName.trim() || !signerCpf.trim() || !agreedTerms}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Registrando Assinatura Eletrônica e Avançando Pedido...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>Confirmar e Assinar Contrato Eletronicamente</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                Assinatura eletrônica autenticada nos termos da Medida Provisória nº 2.200-2/2001 e da Lei Federal nº 14.063/2020.
              </p>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
