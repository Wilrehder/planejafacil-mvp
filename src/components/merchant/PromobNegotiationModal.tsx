import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2,
  Armchair,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  QrCode,
  DollarSign,
  Landmark,
  FileText,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PromobProjectData } from '../../lib/promobParser';
import { fetchStoreCommercialSettings, StoreCommercialSettings } from '../../lib/expenseService';
import { 
  fetchFinancialPartners, 
  FinancialPartner,
  fetchStoreFurniture,
  ConventionalFurnitureItem 
} from '../../lib/conventionalFurnitureService';
import { CommercialProposal, PaymentAllocation } from '../../types';

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
    environmentTitle?: string;
    commercialProposal?: CommercialProposal;
    conventionalItems?: Array<{ id: string; name: string; quantity: number; salePrice: number; total: number; category?: string }>;
    paymentAllocations?: PaymentAllocation[];
    observations?: string;
  }) => Promise<void>;
  promobData: PromobProjectData;
  fileName: string;
  tenantId: string;
  clientName: string;
  environmentName: string;
  conventionalItems?: Array<{ id: string; name: string; quantity: number; salePrice: number; total: number; category?: string }>;
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
  conventionalItems = [],
}) => {
  const { currentUser } = useApp();

  // 3 Etapas Sequenciais: 1. Composição -> 2. Formas de Pagamento -> 3. Observações e Finalização
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ETAPA 1: COMPOSIÇÃO
  const [environmentTitle, setEnvironmentTitle] = useState<string>(
    environmentName || promobData.projectName || 'Projeto Planejado'
  );
  const [customPromobPrice, setCustomPromobPrice] = useState<number>(promobData.budgetValue || 0);
  const [discountPct, setDiscountPct] = useState<number>(0);

  // Itens Convencionais
  const [itemsList, setItemsList] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    salePrice: number;
    total: number;
    category?: string;
  }>>(conventionalItems || []);
  const [furnitureCatalog, setFurnitureCatalog] = useState<ConventionalFurnitureItem[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string>('');
  const [furnitureQty, setFurnitureQty] = useState<number>(1);

  // Configurações e Parceiros
  const [commercialSettings, setCommercialSettings] = useState<StoreCommercialSettings>({
    tenant_id: tenantId,
    max_discount_percentage: 15.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  });
  const [financialPartners, setFinancialPartners] = useState<FinancialPartner[]>([]);
  const [, setLoadingSettings] = useState(true);

  // ETAPA 2: FORMAS DE PAGAMENTO (Distribuição Multi-Método)
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [draftMethod, setDraftMethod] = useState<'pix' | 'cartao_vista' | 'cartao_parcelado' | 'financeira'>('pix');
  const [draftAmount, setDraftAmount] = useState<string>('');
  const [draftInstallments, setDraftInstallments] = useState<number>(1);
  const [draftPartnerId, setDraftPartnerId] = useState<string>('');
  const [passFeeToClient, setPassFeeToClient] = useState<boolean>(true);

  // ETAPA 3: OBSERVAÇÕES & FINALIZAÇÃO
  const [observations, setObservations] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEnvironmentTitle(environmentName || promobData.projectName || 'Projeto Planejado');
      setCustomPromobPrice(promobData.budgetValue || 0);
      setDiscountPct(0);
      setItemsList(conventionalItems || []);
      setObservations('');
      setAllocations([]);
      setDraftAmount('');
    }
  }, [isOpen, environmentName, promobData.projectName, promobData.budgetValue, conventionalItems]);

  // Carregar configurações da loja
  useEffect(() => {
    if (isOpen && tenantId) {
      setLoadingSettings(true);
      Promise.all([
        fetchStoreCommercialSettings(tenantId),
        fetchFinancialPartners(tenantId),
        fetchStoreFurniture(tenantId)
      ]).then(([settings, partners, furniture]) => {
        setCommercialSettings(settings);
        setFinancialPartners(partners);
        setFurnitureCatalog((furniture || []).filter(f => f.isActive));
        if (partners.length > 0) {
          setDraftPartnerId(partners[0].id);
        }
        setLoadingSettings(false);
      });
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  // CÁLCULOS DA ETAPA 1 (COMPOSIÇÃO)
  const promobBase = Number(customPromobPrice) || 0;
  const conventionalTotal = itemsList.reduce((acc, curr) => acc + (curr.total || (curr.salePrice * curr.quantity) || 0), 0);
  const baseValueGross = promobBase + conventionalTotal;
  
  const safeDiscountPct = Math.min(Math.max(Number(discountPct) || 0, 0), 100);
  const discountAmount = (baseValueGross * safeDiscountPct) / 100;
  // Este é o valor líquido do orçamento que deve ser distribuído nas formas de pagamento
  const budgetTargetValue = Math.max(0, Math.round((baseValueGross - discountAmount) * 100) / 100);

  // Custo de fábrica Promob mantido para analytics interno
  const factoryCost = promobData.factoryOrderCost || 0;

  // CÁLCULOS DA ETAPA 2 (PAGAMENTOS MULTI-MÉTODO)
  const totalAllocatedBase = allocations.reduce((acc, a) => acc + a.baseAmount, 0);
  const remainingBaseBalance = Math.round((budgetTargetValue - totalAllocatedBase) * 100) / 100;
  const finalPriceToClient = allocations.reduce((acc, a) => acc + a.totalAmount, 0);
  const totalSurcharges = allocations.reduce((acc, a) => acc + a.surchargeAmount, 0);

  // Formatador BRL
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);
  };

  // Funções de manipulação de itens convencionais
  const handleAddFurniture = () => {
    if (!selectedFurnitureId) return;
    const found = furnitureCatalog.find(f => f.id === selectedFurnitureId);
    if (!found) return;

    const qty = Math.max(1, Number(furnitureQty) || 1);
    const itemTotal = found.salePrice * qty;

    setItemsList(prev => [...prev, {
      id: found.id,
      name: found.name,
      category: found.category,
      quantity: qty,
      salePrice: found.salePrice,
      total: itemTotal,
    }]);
    setSelectedFurnitureId('');
    setFurnitureQty(1);
  };

  const handleRemoveFurniture = (idx: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== idx));
  };

  // Adicionar uma fatia de pagamento na Etapa 2
  const handleAddAllocation = () => {
    const amountNum = parseFloat(draftAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (amountNum > remainingBaseBalance + 0.01) return;

    let surchargePct = 0;
    let methodLabel = 'Pix / À Vista';
    let partnerName: string | undefined;

    if (draftMethod === 'pix') {
      surchargePct = 0;
      methodLabel = 'Pix / À Vista';
    } else if (draftMethod === 'cartao_vista') {
      surchargePct = commercialSettings.card_tax_percentage || 3.5;
      methodLabel = 'Cartão de Crédito à Vista';
    } else if (draftMethod === 'cartao_parcelado') {
      const baseFee = commercialSettings.card_tax_percentage || 3.5;
      const installmentTax = commercialSettings.installment_tax_percentage || 8.0;
      surchargePct = draftInstallments > 1 
        ? baseFee + (installmentTax * (draftInstallments / 12))
        : baseFee;
      methodLabel = `Cartão de Crédito ${draftInstallments}x`;
    } else if (draftMethod === 'financeira') {
      const p = financialPartners.find(fp => fp.id === draftPartnerId);
      surchargePct = p?.retentionPercentage || 10.0;
      partnerName = p?.name;
      methodLabel = `Financiamento ${partnerName || 'Parceiro'} ${draftInstallments}x`;
    }

    // O acréscimo incide EXCLUSIVAMENTE sobre a quantia atribuída a essa forma de pagamento
    const surchargeAmount = passFeeToClient ? Math.round(((amountNum * surchargePct) / 100) * 100) / 100 : 0;
    const sliceTotal = Math.round((amountNum + surchargeAmount) * 100) / 100;
    const installmentsCount = (draftMethod === 'cartao_parcelado' || draftMethod === 'financeira') ? draftInstallments : 1;
    const sliceInstallmentValue = Math.round((sliceTotal / installmentsCount) * 100) / 100;

    const newAllocation: PaymentAllocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      method: draftMethod,
      methodLabel,
      baseAmount: amountNum,
      installments: installmentsCount,
      feePercentage: surchargePct,
      feeAmount: surchargeAmount,
      totalAmountWithFee: sliceTotal,
      surchargePct,
      surchargeAmount,
      totalAmount: sliceTotal,
      installmentValue: sliceInstallmentValue,
      partnerId: draftMethod === 'financeira' ? draftPartnerId : undefined,
      partnerName,
    };

    setAllocations(prev => [...prev, newAllocation]);
    // Prepara próximo rascunho com saldo restante
    const nextRemaining = Math.max(0, Math.round((remainingBaseBalance - amountNum) * 100) / 100);
    setDraftAmount(nextRemaining > 0 ? nextRemaining.toFixed(2) : '');
  };

  const handleRemoveAllocation = (id: string) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
  };

  // Pre-popular distribuição automática com Pix se passar da etapa 1 sem pagamentos
  const handleGoToStep2 = () => {
    if (allocations.length === 0 && budgetTargetValue > 0) {
      setDraftAmount(budgetTargetValue.toFixed(2));
    }
    setStep(2);
  };

  // Submissão Final
  const handleFinalSubmit = async () => {
    if (Math.abs(remainingBaseBalance) > 0.01) return;
    setIsSubmitting(true);
    try {
      // Método principal de pagamento representativo
      const mainMethodLabel = allocations.length === 1 
        ? allocations[0].methodLabel 
        : `${allocations.length} Formas de Pagamento (${allocations.map(a => a.methodLabel).join(' + ')})`;

      const maxInstallments = Math.max(...allocations.map(a => a.installments), 1);
      const netStoreReceives = budgetTargetValue;
      const netProfit = netStoreReceives - factoryCost;

      const summaryNote = `Orçamento gerado para ${clientName} no valor de ${formatBRL(finalPriceToClient)} (${mainMethodLabel}). Ambiente: ${environmentTitle.trim()}.`;

      const commercialProposal: CommercialProposal = {
        promobValue: promobBase,
        promobCost: factoryCost,
        promobProjectName: environmentTitle.trim(),
        promobFileName: fileName,
        conventionalTotal,
        conventionalItems: itemsList,
        subtotal: baseValueGross,
        subtotalGross: baseValueGross,
        discountPct: safeDiscountPct,
        discountPercentage: safeDiscountPct,
        discountAmount,
        discountValue: discountAmount,
        subtotalAfterDiscount: budgetTargetValue,
        priceAfterDiscount: budgetTargetValue,
        paymentMethod: allocations[0]?.method || 'pix',
        paymentMethodLabel: mainMethodLabel,
        installments: maxInstallments,
        installmentValue: allocations[0]?.installmentValue || budgetTargetValue,
        paymentFeePct: totalSurcharges > 0 ? (totalSurcharges / budgetTargetValue) * 100 : 0,
        transactionFeePercentage: totalSurcharges > 0 ? (totalSurcharges / budgetTargetValue) * 100 : 0,
        paymentFeeAmount: totalSurcharges,
        transactionFeeAmount: totalSurcharges,
        passFeeToClient,
        finalOrderTotal: finalPriceToClient,
        netStoreReceives,
        estimatedCost: factoryCost,
        estimatedProfit: netProfit,
        paymentAllocations: allocations,
        notes: observations.trim(),
        observations: observations.trim(),
        approvedAt: new Date().toISOString(),
        calculatedAt: new Date().toISOString(),
      };

      await onConfirm({
        finalPrice: finalPriceToClient,
        factoryCost,
        discountPct: safeDiscountPct,
        paymentMethod: mainMethodLabel,
        installments: maxInstallments,
        netProfit,
        summaryNote,
        environmentTitle: environmentTitle.trim(),
        commercialProposal,
        conventionalItems: itemsList,
        paymentAllocations: allocations,
        observations: observations.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header com Stepper */}
        <div className="p-5 bg-[#1B2B48] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Etapa {step} de 3
                </span>
                <h3 className="font-extrabold text-base text-white">
                  {step === 1 && 'Composição do Orçamento'}
                  {step === 2 && 'Condições de Pagamento'}
                  {step === 3 && 'Resumo & Finalização'}
                </h3>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md mt-0.5">
                Cliente: <span className="font-semibold text-white">{clientName}</span>
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

        {/* Stepper Progress Bar */}
        <div className="flex items-center w-full bg-slate-100 border-b border-slate-200 text-xs font-semibold">
          <div className={`flex-1 py-2.5 text-center flex items-center justify-center space-x-2 ${step === 1 ? 'bg-emerald-50 text-emerald-700 font-bold border-b-2 border-emerald-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            <span>Composição</span>
          </div>
          <div className={`flex-1 py-2.5 text-center flex items-center justify-center space-x-2 ${step === 2 ? 'bg-emerald-50 text-emerald-700 font-bold border-b-2 border-emerald-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            <span>Pagamento</span>
          </div>
          <div className={`flex-1 py-2.5 text-center flex items-center justify-center space-x-2 ${step === 3 ? 'bg-emerald-50 text-emerald-700 font-bold border-b-2 border-emerald-600' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
            <span>Resumo</span>
          </div>
        </div>

        {/* Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs flex-1">
          
          {/* ETAPA 1: COMPOSIÇÃO */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Nome do Projeto / Ambiente (Editável, extraído do XML) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Nome do Ambiente / Projeto *</span>
                </label>
                <input
                  type="text"
                  value={environmentTitle}
                  onChange={(e) => setEnvironmentTitle(e.target.value)}
                  placeholder="Ex: Cozinha Integrada, Suíte Master, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500">
                  Nome extraído automaticamente do projeto técnico. Você pode ajustar antes de emitir.
                </p>
              </div>

              {/* Valor do Promob (Editável) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Valor Base Promob (Móveis Planejados) *</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Origem: {fileName}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPromobPrice || ''}
                    onChange={(e) => setCustomPromobPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Valor bruto de venda importado do Promob. Você pode editar este montante livremente.
                </p>
              </div>

              {/* Catálogo de Móveis Convencionais */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-2">
                    <Armchair className="w-4 h-4 text-indigo-600" />
                    <span>Adicionar Móveis Convencionais (Opcional)</span>
                  </label>
                  {conventionalTotal > 0 && (
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Total: {formatBRL(conventionalTotal)}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedFurnitureId}
                    onChange={(e) => setSelectedFurnitureId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione um móvel do catálogo da loja...</option>
                    {furnitureCatalog.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} — {formatBRL(f.salePrice)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={furnitureQty}
                    onChange={(e) => setFurnitureQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-2 rounded-xl border border-slate-300 text-xs font-bold text-center bg-white"
                  />

                  <button
                    type="button"
                    onClick={handleAddFurniture}
                    disabled={!selectedFurnitureId}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {itemsList.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2">
                    {itemsList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="text-slate-500">({item.quantity}x {formatBRL(item.salePrice)})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-indigo-700">{formatBRL(item.total)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFurniture(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desconto Geral (Apenas digitação, sem botões de atalho) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-black uppercase text-[#1B2B48] block">
                  Desconto Comercial (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={discountPct || ''}
                    onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                    placeholder="Digite a porcentagem de desconto (ex: 5)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    %
                  </span>
                </div>
                {safeDiscountPct > 0 && (
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Desconto de {safeDiscountPct}% equivale a -{formatBRL(discountAmount)}
                  </p>
                )}
              </div>

              {/* Card Resumo do Valor Base */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Subtotal Bruto (Promob + Convencionais):</span>
                  <span className="font-bold text-slate-800">{formatBRL(baseValueGross)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-rose-600">
                    <span>Desconto ({safeDiscountPct}%):</span>
                    <span className="font-bold">-{formatBRL(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-[#1B2B48] border-t border-emerald-200/80 pt-2">
                  <span>Valor do Orçamento:</span>
                  <span className="text-base text-emerald-800 font-extrabold">{formatBRL(budgetTargetValue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: FORMAS DE PAGAMENTO */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Barra de Distribuição de Saldo */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Valor Alvo do Orçamento:</span>
                  <span className="font-bold text-white">{formatBRL(budgetTargetValue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Base Distribuído:</span>
                  <span className="font-bold text-emerald-400">{formatBRL(totalAllocatedBase)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 font-bold">
                  <span className={Math.abs(remainingBaseBalance) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}>
                    {Math.abs(remainingBaseBalance) < 0.01 ? '✓ Saldo Totalmente Alocado' : 'Saldo Restante a Alocar:'}
                  </span>
                  <span className={`text-sm ${Math.abs(remainingBaseBalance) < 0.01 ? 'text-emerald-400 font-extrabold' : 'text-amber-400 font-extrabold'}`}>
                    {formatBRL(remainingBaseBalance)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
                  <div 
                    className={`h-full transition-all duration-300 ${Math.abs(remainingBaseBalance) < 0.01 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, budgetTargetValue > 0 ? (totalAllocatedBase / budgetTargetValue) * 100 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Formulário para Adicionar Fatia de Pagamento */}
              {remainingBaseBalance > 0.009 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <h4 className="font-black text-xs uppercase text-[#1B2B48] flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Adicionar Forma de Pagamento</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Método */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Método</label>
                      <select
                        value={draftMethod}
                        onChange={(e) => setDraftMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                      >
                        <option value="pix">Pix / Dinheiro (À Vista)</option>
                        <option value="cartao_vista">Cartão de Crédito à Vista</option>
                        <option value="cartao_parcelado">Cartão de Crédito Parcelado</option>
                        <option value="financeira">Financiamento / Parceiro</option>
                      </select>
                    </div>

                    {/* Valor da Fatia */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Valor da Fatia (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        max={remainingBaseBalance}
                        value={draftAmount}
                        onChange={(e) => setDraftAmount(e.target.value)}
                        placeholder={`Até ${remainingBaseBalance.toFixed(2)}`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* Parcelamento e Financeira se aplicável */}
                  {draftMethod === 'cartao_parcelado' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Número de Parcelas</label>
                        <select
                          value={draftInstallments}
                          onChange={(e) => setDraftInstallments(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center text-[11px] text-slate-500 pt-5">
                        <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Taxa do cartão aplicada exclusivamente sobre esta fatia.
                      </div>
                    </div>
                  )}

                  {draftMethod === 'financeira' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Parceiro Financeiro</label>
                        <select
                          value={draftPartnerId}
                          onChange={(e) => setDraftPartnerId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          {financialPartners.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Taxa: {p.retentionPercentage}%)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Parcelas</label>
                        <select
                          value={draftInstallments}
                          onChange={(e) => setDraftInstallments(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          {[6, 12, 18, 24, 36, 48].map(n => (
                            <option key={n} value={n}>{n}x</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center space-x-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passFeeToClient}
                        onChange={(e) => setPassFeeToClient(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Repassar encargos/taxas para o valor final do cliente</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddAllocation}
                      disabled={!draftAmount || parseFloat(draftAmount) <= 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Alocar Esta Fatia</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Fatias Alocadas */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase text-[#1B2B48]">
                  Fatias de Pagamento Adicionadas ({allocations.length})
                </h4>

                {allocations.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                    Nenhuma fatia de pagamento alocada ainda. Adicione uma ou mais fatias acima para cobrir o total do orçamento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allocations.map((alloc) => (
                      <div key={alloc.id} className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                            {alloc.method === 'pix' && <QrCode className="w-4 h-4 text-emerald-600" />}
                            {alloc.method === 'cartao_vista' && <CreditCard className="w-4 h-4 text-blue-600" />}
                            {alloc.method === 'cartao_parcelado' && <CreditCard className="w-4 h-4 text-indigo-600" />}
                            {alloc.method === 'financeira' && <Landmark className="w-4 h-4 text-amber-600" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{alloc.methodLabel}</div>
                            <div className="text-[11px] text-slate-500">
                              Base: {formatBRL(alloc.baseAmount)}
                              {alloc.surchargeAmount > 0 && ` + Taxas: ${formatBRL(alloc.surchargeAmount)}`}
                              {alloc.installments > 1 && ` • ${alloc.installments}x de ${formatBRL(alloc.installmentValue)}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-black text-slate-900 text-xs">{formatBRL(alloc.totalAmount)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAllocation(alloc.id)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Final ao Cliente */}
              {allocations.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-900 block">Total Final ao Cliente</span>
                    <span className="text-[11px] text-emerald-700">
                      Inclui encargos de fatias parceladas repassadas
                    </span>
                  </div>
                  <span className="text-lg font-black text-emerald-800">{formatBRL(finalPriceToClient)}</span>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: OBSERVAÇÕES & FINALIZAÇÃO */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Resumo Executivo da Proposta */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-black text-xs uppercase text-[#1B2B48] flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Resumo Executivo do Orçamento</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Cliente:</span>
                    <span className="font-bold text-slate-800">{clientName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Ambiente / Projeto:</span>
                    <span className="font-bold text-slate-800">{environmentTitle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Móveis Planejados (Promob):</span>
                    <span className="font-bold text-slate-800">{formatBRL(promobBase)}</span>
                  </div>
                  {conventionalTotal > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Móveis Convencionais ({itemsList.length} itens):</span>
                      <span className="font-bold text-slate-800">+{formatBRL(conventionalTotal)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-rose-600">
                      <span>Desconto Comercial ({safeDiscountPct}%):</span>
                      <span className="font-bold">-{formatBRL(discountAmount)}</span>
                    </div>
                  )}
                  {totalSurcharges > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 text-amber-700">
                      <span>Encargos de Pagamento Repassados:</span>
                      <span className="font-bold">+{formatBRL(totalSurcharges)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 text-sm font-black text-emerald-800 pt-2">
                    <span>Total da Proposta Comercial:</span>
                    <span className="text-base font-extrabold">{formatBRL(finalPriceToClient)}</span>
                  </div>
                </div>

                {/* Resumo dos Pagamentos */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">Distribuição Financeira:</span>
                  <div className="space-y-1">
                    {allocations.map((a, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-700">
                        <span>• {a.methodLabel}:</span>
                        <span className="font-bold">{formatBRL(a.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campo de Observações Comerciais / Contratuais (Opcional) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-black uppercase text-[#1B2B48] block">
                  Observações Comerciais & Contratuais (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Inclua termos adicionais, detalhes de acabamento, condições de entrega ou qualquer nota que deva constar no histórico e no futuro contrato..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-normal text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  Ao salvar, o orçamento será registrado com o status <strong>"Orçado"</strong>. O lead não será convertido em pedido até que o cliente dê o aceite formal da venda.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer com Navegação */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <div className="flex items-center space-x-2">
            {step === 1 && (
              <button
                type="button"
                onClick={handleGoToStep2}
                disabled={budgetTargetValue <= 0 || !environmentTitle.trim()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
              >
                <span>Avançar para Pagamento</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={Math.abs(remainingBaseBalance) > 0.01 || allocations.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
              >
                <span>Avançar para Resumo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || Math.abs(remainingBaseBalance) > 0.01}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Salvando Orçamento...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Orçamento (Orçado)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
