import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  CreditCard, 
  Landmark, 
  Percent, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  Pencil, 
  ShieldCheck, 
  HelpCircle,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchStoreCommercialSettings, 
  saveStoreCommercialSettings, 
  StoreCommercialSettings 
} from '../../lib/expenseService';
import { 
  fetchFinancialPartners, 
  saveFinancialPartner, 
  deleteFinancialPartner, 
  FinancialPartner 
} from '../../lib/conventionalFurnitureService';

interface MerchantSettingsViewProps {
  tenantId: string;
}

export const MerchantSettingsView: React.FC<MerchantSettingsViewProps> = ({ tenantId }) => {
  const { currentUser } = useApp();
  const isOwnerOrManager = !currentUser?.role || currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';

  // Configurações da Maquininha e Desconto Comercial
  const [commercialSettings, setCommercialSettings] = useState<StoreCommercialSettings>({
    tenant_id: tenantId,
    max_discount_percentage: 10.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  });

  const [cardAtSight, setCardAtSight] = useState<string>('3.5');
  const [cardInstallment, setCardInstallment] = useState<string>('8.0');
  const [maxDiscount, setMaxDiscount] = useState<string>('10.0');

  // Financeiras e Acréscimos Percentuais
  const [partners, setPartners] = useState<FinancialPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCardSettings, setIsSavingCardSettings] = useState(false);

  // Modal Nova / Editar Financeira
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<FinancialPartner | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerRetention, setPartnerRetention] = useState('10.0');
  const [partnerMaxInstallments, setPartnerMaxInstallments] = useState(24);
  const [isSavingPartner, setIsSavingPartner] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadAllSettings = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [settings, partnersList] = await Promise.all([
        fetchStoreCommercialSettings(tenantId),
        fetchFinancialPartners(tenantId)
      ]);

      setCommercialSettings(settings);
      setCardAtSight(String(settings.card_tax_percentage ?? 3.5));
      setCardInstallment(String(settings.installment_tax_percentage ?? 8.0));
      setMaxDiscount(String(settings.max_discount_percentage ?? 10.0));
      setPartners(partnersList);
    } catch (err: any) {
      showToast('Erro ao carregar configurações da loja.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, [tenantId]);

  // Salvar Taxas da Maquininha e Desconto
  const handleSaveCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerOrManager) {
      showToast('Apenas a gerência ou proprietário pode alterar taxas comerciais.', 'error');
      return;
    }

    setIsSavingCardSettings(true);
    try {
      const parsedAtSight = Math.max(0, parseFloat(cardAtSight.replace(',', '.')) || 0);
      const parsedInstallment = Math.max(0, parseFloat(cardInstallment.replace(',', '.')) || 0);
      const parsedDiscount = Math.max(0, parseFloat(maxDiscount.replace(',', '.')) || 0);

      const payload: StoreCommercialSettings = {
        tenant_id: tenantId,
        card_tax_percentage: parsedAtSight,
        installment_tax_percentage: parsedInstallment,
        max_discount_percentage: parsedDiscount,
      };

      const res = await saveStoreCommercialSettings(payload);
      if (!res.success) throw new Error(res.error || 'Falha ao salvar taxas.');

      setCommercialSettings(payload);
      showToast('Taxas do cartão e desconto atualizadas com sucesso!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar configurações.', 'error');
    } finally {
      setIsSavingCardSettings(false);
    }
  };

  // Abrir Modal para Nova Financeira
  const handleOpenNewPartner = () => {
    setEditingPartner(null);
    setPartnerName('');
    setPartnerRetention('10.0');
    setPartnerMaxInstallments(24);
    setIsPartnerModalOpen(true);
  };

  // Abrir Modal para Editar Financeira
  const handleOpenEditPartner = (p: FinancialPartner) => {
    setEditingPartner(p);
    setPartnerName(p.name);
    setPartnerRetention(String(p.retentionPercentage));
    setPartnerMaxInstallments(p.maxInstallments || 24);
    setIsPartnerModalOpen(true);
  };

  // Salvar Financeira / Acréscimo
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;
    if (!isOwnerOrManager) {
      showToast('Permissão restrita à gerência.', 'error');
      return;
    }

    setIsSavingPartner(true);
    try {
      const retention = Math.max(0, parseFloat(partnerRetention.replace(',', '.')) || 0);
      const res = await saveFinancialPartner({
        id: editingPartner?.id,
        tenantId,
        name: partnerName.trim(),
        retentionPercentage: retention,
        maxInstallments: partnerMaxInstallments,
      });

      if (!res.success) throw new Error(res.error || 'Erro ao salvar financeira.');

      showToast(`Financeira "${partnerName}" salva com sucesso!`);
      setIsPartnerModalOpen(false);
      setEditingPartner(null);
      await loadAllSettings();
    } catch (err: any) {
      showToast(err.message || 'Erro ao processar financeira.', 'error');
    } finally {
      setIsSavingPartner(false);
    }
  };

  // Excluir Financeira
  const handleDeletePartner = async (id: string, name: string) => {
    if (!isOwnerOrManager) {
      showToast('Permissão restrita à gerência.', 'error');
      return;
    }

    if (!window.confirm(`Deseja realmente remover a financeira "${name}"?`)) return;

    try {
      const ok = await deleteFinancialPartner(id);
      if (ok) {
        showToast(`Financeira "${name}" removida.`);
        await loadAllSettings();
      } else {
        throw new Error('Não foi possível excluir.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover parceiro financeiro.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-left font-sans max-w-6xl mx-auto">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-black animate-in fade-in slide-in-from-bottom-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
            : 'bg-rose-950 text-rose-200 border-rose-800'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Banner Clean */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black text-[#439346] uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Configurações Comerciais & Taxas da Loja</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Taxas de Cartão, Descontos & Financeiras
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Defina os percentuais que a sua loja pratica na maquininha de cartão, limites de desconto comercial e parceiros bancários de financiamento.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {isOwnerOrManager ? 'Modo Gerência / Proprietário' : 'Visualização (Vendedor)'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-7 h-7 text-[#439346] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Carregando parâmetros comerciais da loja...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CARD 1: TAXAS DA MAQUININHA & DESCONTO (Lado Esquerdo - 5 colunas) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Maquininha & Desconto</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Percentuais padrão da loja</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCardSettings} className="space-y-4 pt-1">
                {/* Taxa Cartão à Vista */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    Taxa Cartão à Vista / Débito (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isOwnerOrManager || isSavingCardSettings}
                      value={cardAtSight}
                      onChange={(e) => setCardAtSight(e.target.value)}
                      placeholder="3.5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-800 outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 bg-slate-50/50 disabled:opacity-60 transition-all pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Aplicada automaticamente na opção "Cartão à Vista" na negociação do CRM.
                  </p>
                </div>

                {/* Taxa Cartão Parcelado */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    Taxa Cartão Parcelado (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isOwnerOrManager || isSavingCardSettings}
                      value={cardInstallment}
                      onChange={(e) => setCardInstallment(e.target.value)}
                      placeholder="8.0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-800 outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 bg-slate-50/50 disabled:opacity-60 transition-all pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Taxa estimada da operadora para vendas parceladas na maquininha da loja.
                  </p>
                </div>

                {/* Teto de Desconto Comercial */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    Teto Máximo de Desconto Permitido (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!isOwnerOrManager || isSavingCardSettings}
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      placeholder="10.0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-800 outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 bg-slate-50/50 disabled:opacity-60 transition-all pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Bloqueia descontos superiores no formulário comercial do CRM.
                  </p>
                </div>

                {isOwnerOrManager && (
                  <button
                    type="submit"
                    disabled={isSavingCardSettings}
                    className="w-full mt-2 px-4 py-2.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] disabled:opacity-60 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSavingCardSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando alterações...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Salvar Taxas do Cartão</span>
                      </>
                    )}
                  </button>
                )}
              </form>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 space-y-1">
              <span className="font-black flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                Como as taxas são utilizadas?
              </span>
              <p className="text-blue-800/90 leading-relaxed">
                Esses percentuais são carregados automaticamente quando qualquer vendedor da sua loja orçar propostas comerciais no CRM ou gerar pedidos no ERP.
              </p>
            </div>
          </div>

          {/* CARD 2: FINANCEIRAS & LINHAS DE CRÉDITO (Lado Direito - 7 colunas) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Financeiras & Acréscimos</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bancos parceiros e acréscimos percentuais</p>
                </div>
              </div>

              {isOwnerOrManager && (
                <button
                  type="button"
                  onClick={handleOpenNewPartner}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Financeira</span>
                </button>
              )}
            </div>

            {/* Lista das Financeiras */}
            {partners.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Nenhuma financeira ou linha de acréscimo cadastrada.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Cadastre parceiros como Losango, Santander Financiamentos ou BV para que seus vendedores possam selecionar e parcelar nos orçamentos.
                </p>
                {isOwnerOrManager && (
                  <button
                    type="button"
                    onClick={handleOpenNewPartner}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Primeira Financeira</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                          <Landmark className="w-4 h-4" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase">
                          Até {partner.maxInstallments}x
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900">{partner.name}</h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                          <span>Taxa de Retenção:</span>
                          <strong className="text-purple-900 font-black">{partner.retentionPercentage}%</strong>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center justify-between mt-0.5">
                          <span>Limite de Parcelas:</span>
                          <span className="font-bold text-slate-800">{partner.maxInstallments} parcelas</span>
                        </div>
                      </div>
                    </div>

                    {isOwnerOrManager && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPartner(partner)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePartner(partner.id, partner.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-[11px] text-purple-900 space-y-1">
              <span className="font-black flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-purple-600" />
                Dica de Uso:
              </span>
              <p className="text-purple-900/90 leading-relaxed">
                Você pode cadastrar tanto bancos oficiais (ex: Santander, BV) quanto regras de crediário próprio ou acréscimos percentuais especiais praticados pela sua loja.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* MODAL NOVA / EDITAR FINANCEIRA */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPartner ? 'Editar Financeira' : 'Adicionar Financeira / Acréscimo'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Configure o banco conveniado e sua taxa de retenção
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-slate-700">
                  Nome da Financeira ou Acréscimo *
                </label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Ex: Santander Financiamentos, BV Financeira, Losango"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-xs text-slate-800 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    Retenção (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={partnerRetention}
                      onChange={(e) => setPartnerRetention(e.target.value)}
                      placeholder="10.0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-xs text-slate-800 outline-none focus:border-purple-600 pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-slate-700">
                    Máximo Parcelas *
                  </label>
                  <select
                    value={partnerMaxInstallments}
                    onChange={(e) => setPartnerMaxInstallments(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-xs text-slate-800 outline-none focus:border-purple-600 bg-white"
                  >
                    {[6, 10, 12, 18, 24, 30, 36, 48].map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPartner}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingPartner ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Financeira</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
