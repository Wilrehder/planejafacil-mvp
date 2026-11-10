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
  RotateCcw
} from 'lucide-react';
import { fetchContractForSigning, submitDigitalSignature } from '../../lib/customerContractService';
import { StoreContractTemplate } from '../../types';

interface ContractSigningViewProps {
  token: string;
  onClose?: () => void;
}

export const ContractSigningView: React.FC<ContractSigningViewProps> = ({ token, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<{
    order?: any;
    template?: StoreContractTemplate;
    alreadySigned?: boolean;
    signedInfo?: any;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulário do signatário
  const [signerName, setSignerName] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

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
          setContractData({
            order: res.order,
            template: res.template,
            alreadySigned: res.alreadySigned,
            signedInfo: res.signedInfo,
          });
          setSignerName(res.order.client_name || '');
          setSignerCpf(res.order.client_cpf || '');
          if (res.alreadySigned) {
            setSignSuccess(true);
          }
        }
        setLoading(false);
      });
    }
  }, [token]);

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

  const { order, template } = contractData;
  const storeName = template?.tradeName || template?.companyName || 'Móveis Planejados';
  const orderNum = order.order_number || '#PED';
  const totalVal = order.contracted_value || order.total_value || 0;
  const deliveryDays = order.desired_deadline || (template?.defaultDeliveryDays ? `${template.defaultDeliveryDays} dias úteis` : '45 dias úteis');

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-[#1B2B48] text-white p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Portal de Assinatura Eletrônica
              </span>
              <h1 className="text-lg font-extrabold text-white">{storeName}</h1>
              <p className="text-xs text-slate-300">Contrato de Fornecimento • Pedido {orderNum}</p>
            </div>
          </div>
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Total Contratado</span>
            <span className="text-xl font-black text-emerald-400">{formatBRL(totalVal)}</span>
          </div>
        </div>

        {/* Sucesso se já assinado */}
        {signSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-emerald-950 space-y-2 shadow-xs animate-in zoom-in-95">
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-black">Contrato Assinado com Validade Jurídica</h3>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Este contrato foi formalizado eletronicamente por <strong>{signerName}</strong> (CPF {signerCpf}) em {new Date().toLocaleString('pt-BR')}. Uma via foi registrada na ordem de produção da marcenaria e estará disponível durante todo o pós-venda.
            </p>
          </div>
        )}

        {/* Corpo do Documento para Leitura Completa */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 text-xs text-slate-800">
          
          {/* Identificação das Partes */}
          <div className="border-b border-slate-200 pb-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contratada</span>
              <strong className="text-sm font-extrabold text-[#1B2B48]">{storeName}</strong>
              <p className="text-[11px] text-slate-500">
                CNPJ: {template?.cnpj || 'Não informado'} • {template?.address || 'Endereço comercial'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Contratante</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>Nome: <strong className="text-slate-900">{order.client_name}</strong></div>
                <div>CPF: <strong className="text-slate-900">{order.client_cpf || 'Não informado'}</strong></div>
                <div>Telefone: <strong className="text-slate-900">{order.phone || 'Não informado'}</strong></div>
                <div>E-mail: <strong className="text-slate-900">{order.client_email || 'Não informado'}</strong></div>
                <div className="sm:col-span-2">Instalação: <strong className="text-slate-900">{order.installation_address || order.address || 'Não informado'}</strong></div>
              </div>
            </div>
          </div>

          {/* Ambientes Contratados */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-[#1B2B48]">Ambientes e Produtos Contratados</h3>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-sm text-slate-900 block">{order.environment || 'Móveis Planejados Sob Medida'}</strong>
                <span className="text-[11px] text-slate-500">Engenharia e Projeto Executivo Sob Medida</span>
              </div>
              <span className="text-sm font-black text-slate-900">{formatBRL(totalVal)}</span>
            </div>
          </div>

          {/* Prazo */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Prazo de Entrega Estimado</span>
                <span className="text-xs font-extrabold text-emerald-950">{deliveryDays} após medição fina</span>
              </div>
            </div>
          </div>

          {/* Cláusulas */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase text-[#1B2B48]">Termos e Cláusulas Contratuais</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2 text-[11px] text-slate-600 border border-slate-200 p-4 rounded-2xl bg-slate-50">
              {(template?.clauses || []).map((c, i) => (
                <div key={i} className="space-y-1">
                  <strong className="text-slate-900 block">{c.number} - {c.title}</strong>
                  <p className="text-justify leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário de Assinatura Digital */}
          {!signSuccess && (
            <form onSubmit={handleSign} className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Assinatura do(a) Contratante</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Nome Completo do Signatário *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    CPF do Signatário *
                  </label>
                  <input
                    type="text"
                    required
                    value={signerCpf}
                    onChange={(e) => setSignerCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>
              </div>

              {/* Campo de Assinatura Manuscrita / Rubrica na Tela */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-700 flex items-center space-x-1.5">
                    <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Desenhe sua Assinatura / Rubrica no Quadro Abaixo (Touch ou Mouse):</span>
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

              <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span>
                  Declaro que li atentamente e concordo integralmente com todas as cláusulas, valores, prazos e condições comerciais descritas neste contrato de fornecimento.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !signerName.trim() || !signerCpf.trim() || !agreedTerms}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando Assinatura Eletrônica...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>Confirmar Assinatura Eletrônica</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Assinatura eletrônica autenticada nos termos da MP 2.200-2/2001 e da Lei nº 14.063/2020.
              </p>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

