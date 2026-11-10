import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Printer, 
  Download, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Loader2, 
  Edit3, 
  Save, 
  AlertCircle,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Order, StoreContractTemplate, ContractClause } from '../../types';
import { 
  fetchStoreContractTemplate, 
  generateContractPdfBlob, 
  downloadContractPdf, 
  getContractSigningUrl, 
  generateContractQrCodeDataUrl,
  DEFAULT_CONTRACT_CLAUSES
} from '../../lib/customerContractService';
import { STORE_ID_TO_TENANT_UUID } from '../../lib/crmService';

interface CustomerContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Partial<Order>;
  lead?: any;
  onContractIssued?: () => void;
}

export const CustomerContractModal: React.FC<CustomerContractModalProps> = ({
  isOpen,
  onClose,
  order,
  lead,
  onContractIssued
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'sign_digital' | 'edit_clauses'>('preview');
  const [template, setTemplate] = useState<StoreContractTemplate | null>(null);
  const [editableClauses, setEditableClauses] = useState<ContractClause[]>(DEFAULT_CONTRACT_CLAUSES);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [signingUrl, setSigningUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const tenantId = order.storeId ? (STORE_ID_TO_TENANT_UUID[order.storeId] || order.storeId) : 'b1010000-0000-0000-0000-000000000001';
  const contractToken = order.contractToken || (order as any)?.contract_token || `ctk_${order.id || Date.now()}`;
  const isAlreadySigned = order.contractStatus === 'assinado' || (order as any)?.contract_status === 'assinado';

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchStoreContractTemplate(tenantId).then(async (tpl) => {
        setTemplate(tpl);
        setEditableClauses(tpl.clauses && tpl.clauses.length > 0 ? tpl.clauses : DEFAULT_CONTRACT_CLAUSES);

        const url = getContractSigningUrl(contractToken);
        setSigningUrl(url);

        const qr = await generateContractQrCodeDataUrl(url);
        setQrCodeUrl(qr);

        setLoading(false);
      });
    } else {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(null);
      }
    }
  }, [isOpen, tenantId, contractToken]);

  if (!isOpen) return null;

  const clientName = lead?.name || order.clientName || 'Cliente';
  const orderNum = order.orderNumber || '#PED-1000';
  const totalValue = order.contractedValue || order.totalValue || (order as any)?.commercialProposal?.finalOrderTotal || 0;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val || 0);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      await downloadContractPdf({
        order,
        template: template ? { ...template, clauses: editableClauses } : undefined,
        lead,
        signingUrl,
        qrCodeDataUrl: qrCodeUrl
      }, `CONTRATO_${orderNum}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsExporting(true);
      const blob = await generateContractPdfBlob({
        order,
        template: template ? { ...template, clauses: editableClauses } : undefined,
        lead,
        signingUrl,
        qrCodeDataUrl: qrCodeUrl
      });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
        setTimeout(() => win.print(), 1000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-[#1B2B48] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Contrato Comercial do Cliente</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAlreadySigned 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isAlreadySigned ? '✓ Assinado Digitalmente' : 'Pendente de Assinatura'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pedido <span className="font-bold text-white">{orderNum}</span> • Cliente: <span className="font-semibold text-white">{clientName}</span> • Total: <span className="text-emerald-400 font-bold">{formatBRL(totalValue)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center bg-slate-100 border-b border-slate-200 text-xs font-semibold px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'preview' 
                ? 'bg-white text-slate-900 font-bold border-t border-x border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Visualizar Contrato Completo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sign_digital')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'sign_digital' 
                ? 'bg-white text-slate-900 font-bold border-t border-x border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Assinatura Digital (Link / QR Code)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit_clauses')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'edit_clauses' 
                ? 'bg-white text-slate-900 font-bold border-t border-x border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span>Revisar / Ajustar Cláusulas</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-slate-500 font-semibold">Carregando dados e modelo do contrato...</p>
            </div>
          ) : (
            <>
              {/* ABA 1: PREVIEW DO CONTRATO */}
              {activeTab === 'preview' && (
                <div className="space-y-5">
                  {/* Banner de Status */}
                  {isAlreadySigned ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-900">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-xs">Contrato Comercial Assinado com Sucesso</h4>
                        <p className="text-[11px] text-emerald-700">
                          Assinado por <strong>{order.contractSignedByName || clientName}</strong> (CPF {order.contractSignedByCpf || lead?.cpf || 'verificado'}) em {new Date(order.contractSignedAt || Date.now()).toLocaleString('pt-BR')}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-900">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-xs">Contrato Pronto para Coleta de Assinatura</h4>
                          <p className="text-[11px] text-amber-700">
                            Envie o link seguro ao cliente ou imprima para assinatura física.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('sign_digital')}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Ver Opção Digital</span>
                      </button>
                    </div>
                  )}

                  {/* Espelho do Contrato em Formato Documento */}
                  <div className="border border-slate-300 rounded-2xl bg-white p-6 shadow-xs space-y-6 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                      <div>
                        <h2 className="text-base font-black text-[#1B2B48] uppercase tracking-wide">
                          {template?.tradeName || template?.companyName || 'Móveis Planejados'}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          CNPJ: {template?.cnpj || 'Não informado'} • {template?.address || 'Endereço da loja'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {[template?.phone, template?.email].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-slate-400 uppercase block">Contrato Pedido</span>
                        <span className="text-sm font-black text-[#1B2B48]">{orderNum}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date().toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Contratante */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <h4 className="text-xs font-black uppercase text-[#1B2B48]">1. Contratante</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Nome: </span>
                          <strong className="text-slate-800">{clientName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">CPF: </span>
                          <strong className="text-slate-800">{lead?.cpf || order.clientCpf || 'Não informado'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Telefone: </span>
                          <strong className="text-slate-800">{lead?.phone || order.phone || 'Não informado'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">E-mail: </span>
                          <strong className="text-slate-800">{lead?.email || 'Não informado'}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500">Cobrança: </span>
                          <strong className="text-slate-800">{lead?.billingAddress || order.billingAddress || 'Não informado'}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500">Instalação: </span>
                          <strong className="text-slate-800">{lead?.installationAddress || order.installationAddress || lead?.billingAddress || 'Não informado'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Produtos */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-[#1B2B48]">2. Ambientes e Produtos Contratados</h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between">
                          <span>Descrição</span>
                          <span>Tipo</span>
                          <span>Valor Comercial</span>
                        </div>
                        <div className="p-3 border-t border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {(order as any)?.commercialProposal?.promobProjectName || order.environment || 'Projeto Planejado Sob Medida'}
                            </span>
                            <span className="text-[11px] text-slate-500">Projeto Técnico e Engenharia de Produção</span>
                          </div>
                          <span className="text-[11px] text-slate-600 font-medium">Móveis Planejados</span>
                          <span className="font-bold text-slate-900">{formatBRL(totalValue)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pagamentos */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase text-[#1B2B48]">3. Condições Comerciais e Pagamento</h4>
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-900 block">Total do Contrato</span>
                          <span className="text-xs text-emerald-700">
                            {(order as any)?.commercialProposal?.paymentMethodLabel || 'Condições validadas no CRM'}
                          </span>
                        </div>
                        <span className="text-base font-black text-emerald-900">{formatBRL(totalValue)}</span>
                      </div>
                    </div>

                    {/* Prazo */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 flex justify-between">
                      <span>Prazo de Entrega e Montagem:</span>
                      <strong className="text-slate-900">
                        {lead?.desiredDeadline || (template?.defaultDeliveryDays ? `${template.defaultDeliveryDays} dias úteis` : '45 dias úteis')} após medição fina
                      </strong>
                    </div>

                    {/* Cláusulas Preview */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-black uppercase text-[#1B2B48]">4. Cláusulas Gerais</h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-[11px] text-slate-600">
                        {editableClauses.map((c, i) => (
                          <div key={i} className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">{c.number} - {c.title}</span>
                            <p className="text-justify leading-relaxed">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: ASSINATURA DIGITAL (LINK / QR CODE) */}
              {activeTab === 'sign_digital' && (
                <div className="space-y-6 max-w-2xl mx-auto py-2">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-extrabold text-[#1B2B48]">Assinatura Eletrônica do Cliente</h3>
                    <p className="text-xs text-slate-500">
                      O cliente pode ler e assinar este contrato diretamente pelo smartphone ou computador com validade jurídica.
                    </p>
                  </div>

                  {/* Card com QR Code */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 text-center">
                    {qrCodeUrl ? (
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                        <img src={qrCodeUrl} alt="QR Code Assinatura" className="w-48 h-48 rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-slate-200 rounded-2xl animate-pulse" />
                    )}

                    <div className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                        Aponte a Câmera do Smartphone
                      </span>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        O QR Code abre o contrato completo para leitura e confirmação da assinatura digital pelo cliente.
                      </p>
                    </div>
                  </div>

                  {/* Card com Link para Enviar via WhatsApp */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <label className="text-xs font-black uppercase text-[#1B2B48] block">
                      Link Seguro de Assinatura (Enviar por WhatsApp ou E-mail)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={signingUrl}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 text-slate-700 select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                      </button>
                      <a
                        href={signingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Abrir página de assinatura em nova aba"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Informações de Validade Jurídica */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-[11px] leading-relaxed">
                      <span className="font-bold text-blue-950 block">Conformidade e Evidências Auditáveis:</span>
                      Ao assinar digitalmente, o sistema registra data/hora exata (timestamp), endereço IP do dispositivo e confirmação de identidade com CPF e aceite expresso, em conformidade com a MP nº 2.200-2/2001 e Lei Federal nº 14.063/2020.
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: REVISAR / AJUSTAR CLÁUSULAS */}
              {activeTab === 'edit_clauses' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-[#1B2B48]">Cláusulas do Contrato deste Pedido</h3>
                      <p className="text-xs text-slate-500">
                        Você pode adaptar os textos das cláusulas antes de exportar ou enviar para o cliente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditableClauses(DEFAULT_CONTRACT_CLAUSES)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Restaurar padrão
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editableClauses.map((clause, idx) => (
                      <div key={clause.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1B2B48]">{clause.number} - {clause.title}</span>
                        </div>
                        <textarea
                          rows={3}
                          value={clause.text}
                          onChange={(e) => {
                            const updated = [...editableClauses];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setEditableClauses(updated);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer com Ações de Emissão e Impressão */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
          >
            Fechar
          </button>

          <div className="flex items-center space-x-2">
            {/* Opção A: Imprimir ou Exportar PDF */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1.5 text-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-4 py-2.5 bg-[#1B2B48] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1.5 text-xs"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Baixar PDF (Opção A)</span>
            </button>

            {/* Opção B: Assinatura Digital */}
            <button
              type="button"
              onClick={() => setActiveTab('sign_digital')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer flex items-center space-x-1.5 text-xs"
            >
              <QrCode className="w-4 h-4" />
              <span>Assinatura Digital (Opção B)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

