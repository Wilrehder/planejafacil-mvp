import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  Loader2,
  Landmark
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PromobProjectData } from '../../lib/promobParser';
import { fetchStoreCommercialSettings, StoreCommercialSettings } from '../../lib/expenseService';
import { fetchFinancialPartners, FinancialPartner } from '../../lib/conventionalFurnitureService';

interface PromobNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: {
    finalPrice: number;
    factoryCost: number;
    discountPct: number;
    paymentMethod: string;
    installments: number;
    netProfit: number;
    summaryNote: string;
  }) => Promise<void>;
  promobData: PromobProjectData;
  fileName: string;
  tenantId: string;
  clientName: string;
  environmentName: string;
}

export const PromobNegotiationModal: React.FC<PromobNegotiationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  promobData,
  fileName,
  tenantId,
  clientName,
  environmentName,
}) => {
  const { currentUser } = useApp();
  const isOwner = !currentUser?.role || currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';

  const [commercialSettings, setCommercialSettings] = useState<StoreCommercialSettings>({
    tenant_id: tenantId,
    max_discount_percentage: 15.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  });
  const [financialPartners, setFinancialPartners] = useState<FinancialPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [passFeeToClient, setPassFeeToClient] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Estados de Negociação Comercial
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_vista' | 'cartao_parcelado' | 'financeira'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && tenantId) {
      setLoadingSettings(true);
      Promise.all([
        fetchStoreCommercialSettings(tenantId),
        fetchFinancialPartners(tenantId)
      ]).then(([settings, partners]) => {
        setCommercialSettings(settings);
        setFinancialPartners(partners);
        if (partners.length > 0) {
          setSelectedPartnerId(partners[0].id);
        }
        setLoadingSettings(false);
      });
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const baseBudget = promobData.budgetValue || 0;
  const factoryCost = promobData.factoryOrderCost || 0;
  const maxDiscountAllowed = commercialSettings.max_discount_percentage || 15.0;

  // Validação de Teto de Desconto
  const isDiscountOverCeiling = discountPct > maxDiscountAllowed;

  // 1. Cálculo de Desconto Comercial
  const discountAmount = (baseBudget * Math.min(Math.max(discountPct, 0), 100)) / 100;
  const priceAfterDiscount = Math.max(baseBudget - discountAmount, 0);

  // 2. Taxas de Meio de Pagamento & Parcelamento da Loja ou Financeira
  let transactionFeePct = 0;
  const currentPartner = financialPartners.find(p => p.id === selectedPartnerId);

  if (paymentMethod === 'cartao_vista') {
    transactionFeePct = commercialSettings.card_tax_percentage || 3.5;
  } else if (paymentMethod === 'cartao_parcelado') {
    const baseFee = commercialSettings.card_tax_percentage || 3.5;
    const installmentTax = commercialSettings.installment_tax_percentage || 8.0;
    transactionFeePct = installments > 1 
      ? baseFee + (installmentTax * (installments / 12))
      : baseFee;
  } else if (paymentMethod === 'financeira') {
    transactionFeePct = currentPartner?.retentionPercentage || 10.0;
  }

  // Se a taxa for repassada ao cliente:
  const feeAddedToClient = passFeeToClient ? (priceAfterDiscount * transactionFeePct) / 100 : 0;
  const finalPriceToClient = Math.round(priceAfterDiscount + feeAddedToClient);
  const transactionFeeAmount = (finalPriceToClient * transactionFeePct) / 100;
  const netStoreReceives = finalPriceToClient - transactionFeeAmount;
  const netProfit = netStoreReceives - factoryCost;
  const profitMarginPct = finalPriceToClient > 0 ? (netProfit / finalPriceToClient) * 100 : 0;
  const installmentValue = installments > 0 ? finalPriceToClient / installments : finalPriceToClient;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);
  };

  const handleApply = async () => {
    if (isDiscountOverCeiling) return;
    setIsSubmitting(true);
    try {
      let paymentMethodLabel = 'Pix / À Vista';
      if (paymentMethod === 'cartao_vista') {
        paymentMethodLabel = 'Cartão à Vista';
      } else if (paymentMethod === 'cartao_parcelado') {
        paymentMethodLabel = `Cartão ${installments}x de ${formatBRL(installmentValue)}`;
      } else if (paymentMethod === 'financeira') {
        paymentMethodLabel = `Financiamento ${currentPartner?.name || 'Bancário'} (${installments}x de ${formatBRL(installmentValue)})`;
      }

      // Se for o vendedor (store_operator), oculta custo de fábrica e lucro líquido da nota!
      const note = isOwner
        ? `📐 Orçamento Promob Negociado: Venda ${formatBRL(finalPriceToClient)} (${discountPct > 0 ? `Desconto de ${discountPct}% | ` : ''}${paymentMethodLabel}) | Custo Fábrica: ${formatBRL(factoryCost)} | Lucro Líquido: ${formatBRL(netProfit)} (${profitMarginPct.toFixed(1)}%) | Arquivo: ${fileName}`
        : `📐 Orçamento Promob Aprovado: Venda ${formatBRL(finalPriceToClient)} (${discountPct > 0 ? `Desconto de ${discountPct}% | ` : ''}${paymentMethodLabel}) | Arquivo: ${fileName}`;

      await onConfirm({
        finalPrice: finalPriceToClient,
        factoryCost: isOwner ? factoryCost : 0,
        discountPct,
        paymentMethod: paymentMethodLabel,
        installments,
        netProfit: isOwner ? netProfit : 0,
        summaryNote: note,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Proposta Técnica Promob Importada</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  XML Validado
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-md">
                {fileName} • {promobData.projectName || environmentName || 'Projeto Sob Medida'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Card Resumo Inicial Promob (Custo de fábrica estritamente restrito ao Gerente/Dono) */}
          {isOwner ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tabela de Venda Promob</span>
                <div className="text-xl font-black text-slate-900">{formatBRL(baseBudget)}</div>
                <span className="text-[10px] text-slate-500 font-medium">Orçamento sugerido</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-600">Custo de Fábrica (Order)</span>
                <div className="text-xl font-black text-amber-900">{formatBRL(factoryCost)}</div>
                <span className="text-[10px] text-amber-700 font-medium">Pedido com fornecedor</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Margem Bruta Inicial</span>
                <div className="text-xl font-black text-emerald-900">{formatBRL(baseBudget - factoryCost)}</div>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {baseBudget > 0 ? (((baseBudget - factoryCost) / baseBudget) * 100).toFixed(1) : 0}% de margem
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/30 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tabela de Venda do Projeto Promob</span>
                <div className="text-2xl font-black text-slate-900">{formatBRL(baseBudget)}</div>
                <span className="text-[11px] text-slate-500">Valor oficial do projeto para orçamentação ao cliente</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1.5 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Projeto Validado</span>
              </div>
            </div>
          )}

          {/* Seção 1: Ajuste de Desconto Comercial */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-1.5">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span>Percentual de Desconto Comercial</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Teto máximo permitido pela sua loja: <strong className="text-slate-800">{maxDiscountAllowed}%</strong>
                </p>
              </div>

              {/* Botões rápidos de atalho */}
              <div className="flex items-center space-x-1">
                {[0, 5, 10, maxDiscountAllowed].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPct(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      discountPct === pct 
                        ? 'bg-[#1B2B48] text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm outline-none transition-all ${
                    isDiscountOverCeiling 
                      ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-400' 
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20'
                  }`}
                  placeholder="0"
                />
                <span className="absolute right-4 top-2.5 font-bold text-slate-400 text-sm">%</span>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-500">Valor com Desconto:</div>
                <div className="text-base font-black text-[#1B2B48]">{formatBRL(priceAfterDiscount)}</div>
              </div>
            </div>

            {isDiscountOverCeiling && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center space-x-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>
                  Desconto de {discountPct}% excede o teto permitido de {maxDiscountAllowed}% configurado nas regras da sua loja.
                </span>
              </div>
            )}
          </div>

          {/* Seção 2: Forma de Pagamento, Maquininha e Financeiras */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Forma de Pagamento, Maquininha & Financeiras</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Taxas configuradas: Débito/Crédito ({commercialSettings.card_tax_percentage || 3.5}%) • Parcelamento ({commercialSettings.installment_tax_percentage || 8.0}%)
                </p>
              </div>

              {/* Toggle Repasse de Taxa */}
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={passFeeToClient}
                  onChange={(e) => setPassFeeToClient(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span>Repassar taxa no valor final do cliente</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => { setPaymentMethod('pix'); setInstallments(1); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'pix' 
                    ? 'border-[#439346] bg-emerald-50 text-emerald-950 shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">Pix / À Vista</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">Sem taxa</div>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod('cartao_vista'); setInstallments(1); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cartao_vista' 
                    ? 'border-[#439346] bg-emerald-50 text-emerald-950 shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">Cartão à Vista</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Taxa de {commercialSettings.card_tax_percentage || 3.5}%</div>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod('cartao_parcelado'); if (installments <= 1) setInstallments(6); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cartao_parcelado' 
                    ? 'border-[#439346] bg-emerald-50 text-emerald-950 shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">Cartão Parcelado</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Taxa da Maquininha</div>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod('financeira'); if (installments <= 1) setInstallments(24); }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'financeira' 
                    ? 'border-[#439346] bg-emerald-50 text-emerald-950 shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-purple-600" />
                  <span>Financeira</span>
                </div>
                <div className="text-[10px] text-purple-700 font-bold mt-0.5">Crédito / Carnê</div>
              </button>
            </div>

            {/* Configuração de Financeira Bancária */}
            {paymentMethod === 'financeira' && (
              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">Financeira Parceira:</label>
                    {financialPartners.length > 0 ? (
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-300 text-xs font-bold text-slate-900 bg-white outline-none"
                      >
                        {financialPartners.map((fp) => (
                          <option key={fp.id} value={fp.id}>
                            {fp.name} (Retenção {fp.retentionPercentage}% • Até {fp.maxInstallments}x)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] text-purple-700 font-semibold bg-white p-2 rounded-lg border border-purple-200">
                        Nenhuma financeira cadastrada. Usando taxa padrão de 10.0%.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">Parcelas do Financiamento:</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-purple-300 text-xs font-bold text-slate-900 bg-white outline-none"
                    >
                      {[6, 12, 18, 24, 30, 36].map((num) => (
                        <option key={num} value={num}>
                          {num}x de {formatBRL(finalPriceToClient / num)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-purple-800 flex justify-between pt-1 border-t border-purple-200/60 font-semibold">
                  <span>Percentual de retenção da financeira ({currentPartner?.name || 'Parceira'}):</span>
                  <span className="font-bold text-purple-950">{transactionFeePct}% ({formatBRL(transactionFeeAmount)})</span>
                </div>
              </div>
            )}

            {/* Seletor de Parcelas Cartão */}
            {paymentMethod === 'cartao_parcelado' && (
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Número de Parcelas no Cartão:</span>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 18].map((num) => (
                      <option key={num} value={num}>
                        {num}x de {formatBRL(finalPriceToClient / num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Taxa estimada da operadora:</span>
                  <span className="font-bold text-red-600">-{formatBRL(transactionFeeAmount)} ({transactionFeePct.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* DRE da Negociação Final (Visão Gerente vs Visão Vendedor) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#1B2B48] text-white space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Resultado Comercial do Orçamento
              </span>
              {isOwner ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                  Margem Líquida da Loja: {profitMarginPct.toFixed(1)}%
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                  Proposta Pronta para o Cliente
                </span>
              )}
            </div>

            {isOwner ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Preço Cliente</span>
                  <div className="text-base font-black text-white">{formatBRL(finalPriceToClient)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Custo Fábrica</span>
                  <div className="text-base font-black text-amber-300">-{formatBRL(factoryCost)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Taxa Pagamento</span>
                  <div className="text-base font-black text-red-300">-{formatBRL(transactionFeeAmount)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Lucro Líquido</span>
                  <div className="text-base font-black text-emerald-400">{formatBRL(netProfit)}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tabela do Projeto</span>
                  <div className="text-base font-black text-white">{formatBRL(baseBudget)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Desconto Concedido</span>
                  <div className="text-base font-black text-blue-300">
                    {discountPct > 0 ? `-${formatBRL(discountAmount)} (${discountPct}%)` : 'R$ 0,00'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Final da Proposta</span>
                  <div className="text-lg font-black text-emerald-400">{formatBRL(finalPriceToClient)}</div>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {installments > 1 ? `${installments}x de ${formatBRL(installmentValue)}` : 'À Vista'}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting || isDiscountOverCeiling}
            className={`px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md ${
              isDiscountOverCeiling || isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#439346] hover:bg-[#387F3B] text-white shadow-emerald-700/20 active:scale-95'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando Proposta...</span>
              </>
            ) : (
              <>
                <span>Aprovar Proposta e Avançar para Orçado</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
