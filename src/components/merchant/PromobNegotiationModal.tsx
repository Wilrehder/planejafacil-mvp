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
  Landmark,
  Armchair,
  Sparkles,
  Plus,
  Trash2
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
import { CommercialProposal } from '../../types';

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
  
  // Regra Estrita de Permissão
  const isManagerOrOwner = currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';

  // Etapas do Modal: 1º Detalhes do Ambiente Planejado -> 2º Proposta Comercial
  const [modalStep, setModalStep] = useState<'detalhes' | 'proposta'>('detalhes');
  const [environmentTitleInput, setEnvironmentTitleInput] = useState<string>(environmentName || promobData.projectName || 'Cozinha');

  // Preço Cheio do Promob Editável pelo Usuário
  const [customPromobPrice, setCustomPromobPrice] = useState<number>(promobData.budgetValue || 0);

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

  // Estados para Móveis Convencionais Avulsos adicionados dentro da proposta
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

  // Estados de Negociação Comercial
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_vista' | 'cartao_parcelado' | 'financeira'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItemsList(conventionalItems || []);
      setModalStep('detalhes');
      setEnvironmentTitleInput(environmentName || promobData.projectName || 'Cozinha');
      setCustomPromobPrice(promobData.budgetValue || 0);
    }
  }, [isOpen, conventionalItems, environmentName, promobData.projectName, promobData.budgetValue]);

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
          setSelectedPartnerId(partners[0].id);
        }
        setLoadingSettings(false);
      });
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  // Valor Cheio editável do Promob
  const baseBudget = customPromobPrice > 0 ? customPromobPrice : (promobData.budgetValue || 0);
  // Custo de fábrica mantido internamente para cálculos de Analytics / DRE
  const factoryCost = promobData.factoryOrderCost || 0;
  const maxDiscountAllowed = commercialSettings.max_discount_percentage || 15.0;

  // Móveis Convencionais Agregados
  const conventionalTotal = itemsList.reduce(
    (acc, curr) => acc + (curr.total || (curr.salePrice * curr.quantity) || 0),
    0
  );
  const subtotalGross = baseBudget + conventionalTotal;

  // Validação de Teto de Desconto
  const isDiscountOverCeiling = discountPct > maxDiscountAllowed;

  // 1. Cálculo de Desconto Comercial sobre o Subtotal Consolidado (Promob + Convencionais)
  const discountAmount = (subtotalGross * Math.min(Math.max(discountPct, 0), 100)) / 100;
  const priceAfterDiscount = Math.max(subtotalGross - discountAmount, 0);

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

  const handleAddFurnitureToProposal = () => {
    if (!selectedFurnitureId) return;
    const found = furnitureCatalog.find(f => f.id === selectedFurnitureId);
    if (!found) return;

    const qty = Math.max(1, Number(furnitureQty) || 1);
    const itemTotal = found.salePrice * qty;

    const newItem = {
      id: found.id,
      name: found.name,
      category: found.category,
      quantity: qty,
      salePrice: found.salePrice,
      total: itemTotal,
    };

    setItemsList(prev => [...prev, newItem]);
    setSelectedFurnitureId('');
    setFurnitureQty(1);
  };

  const handleRemoveFurnitureFromProposal = (indexToRemove: number) => {
    setItemsList(prev => prev.filter((_, idx) => idx !== indexToRemove));
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

      const conventionalSummary = conventionalTotal > 0 ? ` + Convencionais: ${formatBRL(conventionalTotal)} (${itemsList.length} itens)` : '';

      const note = `Proposta comercial Promob aprovada: ${formatBRL(finalPriceToClient)} (${paymentMethodLabel})${conventionalSummary}. Condições comerciais validadas.`;

      const commercialProposal: CommercialProposal = {
        promobValue: baseBudget,
        promobCost: factoryCost,
        promobProjectName: environmentTitleInput.trim() || promobData.projectName || environmentName,
        promobFileName: fileName,
        conventionalTotal,
        conventionalItems: itemsList,
        subtotal: subtotalGross,
        subtotalGross,
        discountPct,
        discountPercentage: discountPct,
        discountAmount,
        discountValue: discountAmount,
        subtotalAfterDiscount: priceAfterDiscount,
        priceAfterDiscount,
        paymentMethod,
        paymentMethodLabel,
        installments: paymentMethod === 'cartao_parcelado' || paymentMethod === 'financeira' ? installments : 1,
        installmentValue,
        paymentFeePct: transactionFeePct,
        transactionFeePercentage: transactionFeePct,
        paymentFeeAmount: transactionFeeAmount,
        transactionFeeAmount,
        passFeeToClient,
        finalOrderTotal: finalPriceToClient,
        partnerName: paymentMethod === 'financeira' ? currentPartner?.name : undefined,
        netStoreReceives,
        estimatedCost: factoryCost,
        estimatedProfit: netProfit,
        approvedAt: new Date().toISOString(),
        calculatedAt: new Date().toISOString(),
      };

      await onConfirm({
        finalPrice: finalPriceToClient,
        factoryCost,
        discountPct,
        paymentMethod: paymentMethodLabel,
        installments,
        netProfit,
        summaryNote: note,
        environmentTitle: environmentTitleInput.trim() || promobData.projectName || environmentName || 'Cozinha',
        commercialProposal,
        conventionalItems: itemsList,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // PASSO 1: Informar Detalhes do Ambiente Planejado
  if (modalStep === 'detalhes') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Detalhes do Planejado</h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{clientName} • Arquivo Importado</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4 text-xs text-slate-800">
            <div>
              <label className="text-xs font-black uppercase text-[#1B2B48] block mb-1.5">
                Nome do Ambiente Planejado *
              </label>
              <input
                type="text"
                value={environmentTitleInput}
                onChange={(e) => setEnvironmentTitleInput(e.target.value)}
                placeholder="Ex: Cozinha, Quarto Casal, Cozinha e Sala"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-bold text-sm text-slate-900 outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!environmentTitleInput.trim()) {
                      setEnvironmentTitleInput(promobData.projectName || environmentName || 'Cozinha');
                    }
                    setModalStep('proposta');
                  }
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Este título identificará os móveis deste projeto no orçamento e no pedido.
              </p>
            </div>

            {/* Identificação encontrada no XML */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Identificação no Arquivo Promob:</span>
              <div className="font-mono text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Projeto: {promobData.projectName || 'Identificado no XML'}</span>
                {promobData.itemsCount > 0 && <span className="text-emerald-600 font-bold">{promobData.itemsCount} módulos</span>}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{fileName}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!environmentTitleInput.trim()) {
                    setEnvironmentTitleInput(promobData.projectName || environmentName || 'Cozinha');
                  }
                  setModalStep('proposta');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Avançar para Orçamento Comercial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PASSO 2: Orçamento Comercial e Negociação
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Proposta Comercial: {environmentTitleInput}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  XML Validado
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-md">
                {fileName} • Projeto Promob: {promobData.projectName || environmentTitleInput}
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Card do Preço Cheio do Promob (Editável livremente, sem exibição de custos ou margens) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-[#1B2B48] flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Preço Cheio do Projeto Promob (R$)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">Valor do XML editável</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={customPromobPrice}
                onChange={(e) => setCustomPromobPrice(Number(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-black text-lg text-slate-900 bg-white focus:border-[#439346] outline-none"
                placeholder="0,00"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Valor base sugerido pelo Promob XML. Você pode alterar este valor livremente para ajustar a tabela.
            </p>
          </div>

          {/* Seção Integrada: Adicionar Móveis Convencionais Avulsos Direto no Orçamento */}
          <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-black uppercase text-amber-950 flex items-center space-x-1.5">
                  <Armchair className="w-4 h-4 text-amber-600" />
                  <span>Adicionar Móveis Convencionais Avulsos ao Pedido</span>
                </label>
                <p className="text-[11px] text-amber-800">
                  Agregue sofás, mesas e estofados que somarão automaticamente ao valor do contrato.
                </p>
              </div>
              {itemsList.length > 0 && (
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
                  {itemsList.length} item(s) • +{formatBRL(conventionalTotal)}
                </span>
              )}
            </div>

            {/* Seletor do Catálogo da Loja */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <select
                value={selectedFurnitureId}
                onChange={(e) => setSelectedFurnitureId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-amber-300 text-xs font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Selecione um móvel do catálogo da loja...</option>
                {furnitureCatalog.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.category || 'Móvel'}) — {formatBRL(f.salePrice)}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-amber-300">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Qtd:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={furnitureQty}
                    onChange={(e) => setFurnitureQty(Math.max(1, Number(e.target.value)))}
                    className="w-10 text-center text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddFurnitureToProposal}
                  disabled={!selectedFurnitureId}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Lista dos Móveis Adicionados */}
            {itemsList.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-900 block">
                  Itens Convencionais Inclusos no Orçamento:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {itemsList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/90 shadow-xs text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-800 truncate">{item.quantity}x {item.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Unit: {formatBRL(item.salePrice)} • Total: <strong className="text-amber-900">{formatBRL(item.total || item.salePrice * item.quantity)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFurnitureFromProposal(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remover móvel convencional do orçamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs font-bold text-amber-950">
                  <span>Subtotal Consolidado (Promob + Convencionais):</span>
                  <span className="font-mono text-sm font-black text-slate-900">{formatBRL(subtotalGross)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800/80 italic pt-1">
                Nenhum móvel avulso adicionado ainda. Se este cliente comprou sofás ou mesas convencionais, adicione acima para somar no pedido.
              </p>
            )}
          </div>

          {/* Seção 1: Ajuste de Desconto Comercial (Apenas Digitado) */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
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

              <div className="text-right">
                <div className="text-xs font-bold text-slate-500">Valor com Desconto:</div>
                <div className="text-base font-black text-[#1B2B48]">{formatBRL(priceAfterDiscount)}</div>
              </div>
            </div>

            <div className="relative">
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
                placeholder="Digite a % de desconto (ex: 8)"
              />
              <span className="absolute right-4 top-2.5 font-bold text-slate-400 text-sm">%</span>
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
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
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
                onClick={() => {
                  setPaymentMethod('pix');
                  setInstallments(1);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs text-slate-900">Pix / À Vista</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Sem taxa</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_vista');
                  setInstallments(1);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'cartao_vista'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs text-slate-900">Cartão à Vista</div>
                <div className="text-[10px] text-blue-700 font-semibold mt-0.5">
                  Taxa de {commercialSettings.card_tax_percentage || 3.5}%
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cartao_parcelado');
                  if (installments <= 1) setInstallments(6);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'cartao_parcelado'
                    ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs text-slate-900">Cartão Parcelado</div>
                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Taxa da Maquininha</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('financeira');
                  if (installments <= 1) setInstallments(24);
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'financeira'
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold text-xs text-slate-900 flex items-center space-x-1">
                  <Landmark className="w-3.5 h-3.5 text-purple-600" />
                  <span>Financeira</span>
                </div>
                <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Crédito / Carnê</div>
              </button>
            </div>

            {/* Seletor de Financeiras Parceiras */}
            {paymentMethod === 'financeira' && (
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">Instituição Financeira:</label>
                    <select
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-purple-300 text-xs font-bold text-slate-900 bg-white outline-none"
                    >
                      {financialPartners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.retentionPercentage}% retenção - até {p.maxInstallments}x)
                        </option>
                      ))}
                    </select>
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

          {/* Resumo Comercial do Orçamento (Limpo e Focado no Cliente - Custos e Margens Preservados para Analytics) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#1B2B48] text-white space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Resumo Comercial da Proposta
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                Proposta Pronta para o Cliente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {conventionalTotal > 0 ? 'Subtotal Consolidado' : 'Tabela do Projeto'}
                </span>
                <div className="text-base font-black text-white">{formatBRL(subtotalGross)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Desconto Comercial</span>
                <div className="text-base font-black text-blue-300">
                  {discountPct > 0 ? `-${formatBRL(discountAmount)} (${discountPct}%)` : 'R$ 0,00'}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Final da Proposta</span>
                <div className="text-lg font-black text-emerald-400">{formatBRL(finalPriceToClient)}</div>
              </div>
            </div>

            {installments > 1 && (
              <div className="pt-2 border-t border-white/10 text-xs text-slate-300 flex justify-between items-center">
                <span>Condição Parcelada Aprovada:</span>
                <span className="font-extrabold text-white">
                  {installments}x de <strong className="text-emerald-300 font-mono text-sm">{formatBRL(installmentValue)}</strong>
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting || isDiscountOverCeiling}
            className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center space-x-1.5 transition-all shadow-md ${
              isDiscountOverCeiling || isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#439346] hover:bg-[#387F3B] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
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
