import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Lead, StoreOrder } from '../../types';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
  Sliders,
  Check,
  X,
  CreditCard,
  Percent,
  Receipt,
  Building,
  RefreshCw
} from 'lucide-react';
import {
  fetchStoreExpenses,
  createStoreExpense,
  deleteStoreExpense,
  fetchStoreCommercialSettings,
  saveStoreCommercialSettings,
  StoreExpense,
  StoreCommercialSettings,
  CATEGORY_LABELS,
} from '../../lib/expenseService';

interface MerchantAnalyticsProps {
  storeId?: string;
}

export const MerchantAnalytics: React.FC<MerchantAnalyticsProps> = ({ storeId }) => {
  const { leads, orders, currentUser } = useApp();

  const activeTenantId = storeId || currentUser?.tenantId || 'a85abd35-5e55-4c52-a6e9-6c79401c57a1';

  // Despesas & Configurações Comerciais
  const [expenses, setExpenses] = useState<StoreExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [commercialSettings, setCommercialSettings] = useState<StoreCommercialSettings>({
    tenant_id: activeTenantId,
    max_discount_percentage: 10.0,
    card_tax_percentage: 3.5,
    installment_tax_percentage: 8.0,
  });

  // Modais
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State para Nova Despesa
  const currentMonthStr = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'geral' as StoreExpense['category'],
    expense_type: 'fixo' as StoreExpense['expense_type'],
    amount: 1500,
    reference_month: currentMonthStr,
    paid_at: new Date().toISOString().split('T')[0],
  });

  // Carregar dados de despesas e regras comerciais
  const loadData = async () => {
    setLoadingExpenses(true);
    const [expRes, setRes] = await Promise.all([
      fetchStoreExpenses(activeTenantId, selectedMonth),
      fetchStoreCommercialSettings(activeTenantId),
    ]);
    if (expRes.success) setExpenses(expRes.expenses);
    setCommercialSettings(setRes);
    setLoadingExpenses(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId, selectedMonth]);

  // Cálculos Básicos
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === 'convertido');
  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

  // Pipeline (Em Atendimento + Orçado)
  const pipelineLeads = leads.filter((l) => l.status === 'em_atendimento' || l.status === 'orcado');
  const pipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.estimatedMax || 0), 0);

  // Faturamento e Pedidos
  const totalSalesValue = orders.reduce((acc, o) => acc + (o.contractedValue || o.totalValue || 0), 0);
  const averageTicket = orders.length > 0 ? totalSalesValue / orders.length : 0;

  // Comparativo de Vendas
  const latestOrderDate = orders.reduce((latest, o) => {
    const d = new Date(o.createdAt);
    return d > latest ? d : latest;
  }, new Date(0));

  const now = latestOrderDate.getTime() === 0 ? new Date() : latestOrderDate;
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const ordersThisMonth = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const salesThisMonth = ordersThisMonth.reduce(
    (acc, o) => acc + (o.contractedValue || o.totalValue || 0),
    0
  );

  // Confronto: Faturamento vs Custos da Loja
  const totalExpensesThisMonth = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfitThisMonth = salesThisMonth - totalExpensesThisMonth;
  const netMarginPercent =
    salesThisMonth > 0 ? (netProfitThisMonth / salesThisMonth) * 100 : 0;

  // Handlers para Despesas
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description.trim() || newExpense.amount <= 0) return;

    const res = await createStoreExpense({
      tenant_id: activeTenantId,
      description: newExpense.description,
      category: newExpense.category,
      expense_type: newExpense.expense_type,
      amount: Number(newExpense.amount),
      reference_month: newExpense.reference_month,
      paid_at: newExpense.paid_at,
    });

    if (res.success) {
      setIsExpenseModalOpen(false);
      setNewExpense({
        description: '',
        category: 'geral',
        expense_type: 'fixo',
        amount: 1500,
        reference_month: selectedMonth,
        paid_at: new Date().toISOString().split('T')[0],
      });
      setActionSuccess('Despesa lançada com sucesso!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadData();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await deleteStoreExpense(id);
    if (res.success) {
      loadData();
    }
  };

  // Handler para Salvar Regras Comerciais
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveStoreCommercialSettings(commercialSettings);
    if (res.success) {
      setIsSettingsModalOpen(false);
      setActionSuccess('Regras comerciais salvas com sucesso!');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-left">
      {/* HEADER DO DASHBOARD */}
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Analytics & DRE da Loja
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestão Comercial, Faturamento vs Custos e Lucro Líquido Real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Teto de Desconto & Cartão</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lançar Despesa</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* CARDS PRINCIPAIS: CONFRONTO FATURAMENTO VS CUSTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento do Mês */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Faturamento (Mês)
            </span>
            <div className="p-2 bg-emerald-50 text-[#439346] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(salesThisMonth)}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {ordersThisMonth.length} contratos assinados
            </div>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Despesas & Custos (Mês)
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{formatCurrency(totalExpensesThisMonth)}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {expenses.length} lançamentos de custo
            </div>
          </div>
        </div>

        {/* Lucro Líquido Real */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Lucro Líquido Real
            </span>
            <div
              className={`p-2 rounded-xl ${
                netProfitThisMonth >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-black ${
                netProfitThisMonth >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(netProfitThisMonth)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Margem Líquida: <strong className="text-slate-700">{netMarginPercent.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        {/* Pipeline de Vendas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Pipeline Comercial
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{formatCurrency(pipelineValue)}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {pipelineLeads.length} propostas em negociação
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DRE: LANÇAMENTOS DE GASTOS & CONFRONTO */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-base font-black text-[#1B2B48]">Lançamentos de Custos & Despesas</h3>
              <p className="text-xs text-slate-500">
                Lançamentos confrontados diretamente contra o faturamento do mês selecionado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="text-xs font-extrabold text-slate-500">Mês de Referência:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
            />
          </div>
        </div>

        {/* Tabela de Despesas */}
        {loadingExpenses ? (
          <div className="text-center py-10 text-xs font-bold text-slate-400">
            Carregando despesas da loja...
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-400">
                  <th className="py-2.5 px-3">Descrição da Despesa</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-extrabold text-[#1B2B48]">{exp.description}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          exp.expense_type === 'fixo'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {exp.expense_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{exp.paid_at}</td>
                    <td className="py-3 px-3 font-extrabold text-red-600 text-right">
                      - {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-black text-xs text-slate-900 bg-slate-50">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider">
                    Total de Custos no Mês:
                  </td>
                  <td className="py-3 px-3 text-right text-red-600 font-black">
                    - {formatCurrency(totalExpensesThisMonth)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-600">
              Nenhuma despesa lançada para o mês {selectedMonth}.
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="text-xs font-extrabold text-[#439346] hover:underline"
            >
              + Clique aqui para lançar a primeira despesa
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: CADASTRAR DESPESA */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-black text-[#1B2B48]">Lançar Nova Despesa</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel do Showroom, Folha de Pagamento..."
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Categoria *
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, category: e.target.value as any })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                  >
                    <option value="aluguel">Aluguel / Imóvel</option>
                    <option value="salarios">Folha & Salários</option>
                    <option value="comissao">Comissões</option>
                    <option value="materia_prima">MDF & Ferragens</option>
                    <option value="energia_consumo">Energia / Luz / Água</option>
                    <option value="marketing">Marketing & Anúncios</option>
                    <option value="geral">Despesas Gerais</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Tipo de Custo
                  </label>
                  <select
                    value={newExpense.expense_type}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, expense_type: e.target.value as any })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                  >
                    <option value="fixo">Custo Fixo</option>
                    <option value="variavel">Custo Variável</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Valor (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: Number(e.target.value) })
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                    Mês de Referência
                  </label>
                  <input
                    type="month"
                    required
                    value={newExpense.reference_month}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, reference_month: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-[#439346]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURAÇÕES COMERCIAIS DA LOJA (TETO DE DESCONTO & CARTÃO) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-[#1B2B48]">Regras Comerciais da Loja</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-black"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Configure as travas automáticas que serão aplicadas pelos vendedores ao ajustar propostas e finalizar pedidos.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Teto Máximo de Desconto Permitido (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={commercialSettings.max_discount_percentage}
                    onChange={(e) =>
                      setCommercialSettings({
                        ...commercialSettings,
                        max_discount_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-extrabold text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  O vendedor não conseguirá conceder um desconto superior a este teto.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Taxa de Cartão de Crédito à Vista (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={commercialSettings.card_tax_percentage}
                    onChange={(e) =>
                      setCommercialSettings({
                        ...commercialSettings,
                        card_tax_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-extrabold text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Taxa da sua maquininha aplicada automaticamente ao selecionar Cartão.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                  Taxa Média de Cartão Parcelado (até 12x) (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={commercialSettings.installment_tax_percentage}
                    onChange={(e) =>
                      setCommercialSettings({
                        ...commercialSettings,
                        installment_tax_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-extrabold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md"
                >
                  Salvar Regras da Loja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
