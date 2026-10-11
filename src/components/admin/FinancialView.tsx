import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  PieChart,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  FileText,
  RefreshCw,
  PlusCircle,
  CreditCard,
  Calendar,
  X,
  Search,
  Filter,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STORE_PLANS } from '../../data/mockData';
import {
  fetchAdminFinancialMetrics,
  generateStoreMonthlyInvoice,
  registerManualPayment,
  registerInvoiceAdjustment
} from '../../lib/financialService';
import { AdminFinancialMetrics, Invoice } from '../../types';

export const FinancialView: React.FC = () => {
  const { stores } = useApp();
  const [metrics, setMetrics] = useState<AdminFinancialMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtros de Faturas
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCompetenceFilter, setSelectedCompetenceFilter] = useState<string>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');

  // Modal de Registro Manual de Pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    storeName: '',
    competence: '',
    totalDue: 0,
    amountPaidSoFar: 0,
    balanceDue: 0,
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'pix' as 'pix' | 'transferencia' | 'dinheiro' | 'outro',
    externalReference: '',
    notes: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Modal de Ajuste / Desconto
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    invoiceId: '',
    invoiceNumber: '',
    adjustmentAmount: '',
    reason: '',
  });
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);

  const loadMetrics = async () => {
    setLoading(true);
    const res = await fetchAdminFinancialMetrics();
    if (res.success && res.metrics) {
      setMetrics(res.metrics);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
  };

  // Valores calculados reais do backend ou fallback
  const currentMrr = metrics ? metrics.mrr : stores.reduce((acc, s) => acc + (s.monthlyRevenue || (s.plan === 'Pro' ? 219.90 : 119.90)), 0);
  const currentArr = metrics ? metrics.arr : currentMrr * 12;
  const activeCount = metrics ? metrics.activeStoresCount : stores.filter((s) => s.status === 'Ativa').length;
  const variableRevenue = metrics ? metrics.variableRevenue : stores.reduce((acc, s) => acc + (s.leadsCount || 0), 0) * 50;

  const handleRunMonthlyBilling = async () => {
    setIsGeneratingInvoices(true);
    setFeedbackMessage(null);
    try {
      const now = new Date();
      const competence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      for (const st of (metrics?.storesBreakdown || [])) {
        await generateStoreMonthlyInvoice(st.storeId, competence);
      }
      setFeedbackMessage({
        text: `Faturas da competência ${competence} consolidadas com sucesso no PostgreSQL.`,
        type: 'success',
      });
      await loadMetrics();
    } catch (err: any) {
      setFeedbackMessage({
        text: 'Falha ao processar faturamento: ' + (err?.message || 'Erro'),
        type: 'error',
      });
    } finally {
      setIsGeneratingInvoices(false);
    }
  };

  const handleOpenPaymentModal = (invoice?: Invoice) => {
    if (invoice) {
      const remaining = Number(invoice.balanceDue ?? (invoice.totalDue - (invoice.amountPaid || 0)));
      setPaymentForm({
        invoiceId: invoice.id,
        storeName: invoice.storeName || 'Loja Parceira',
        competence: invoice.competenceMonth,
        totalDue: Number(invoice.totalDue),
        amountPaidSoFar: Number(invoice.amountPaid || 0),
        balanceDue: remaining > 0 ? remaining : 0,
        amount: (remaining > 0 ? remaining : Number(invoice.totalDue)).toFixed(2),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'pix',
        externalReference: '',
        notes: '',
      });
    } else {
      // Aberto do botão superior, seleciona a primeira fatura aberta se houver
      const invoicesArr = (metrics?.invoices || metrics?.invoicesList || []) as Invoice[];
      const firstOpen = invoicesArr.find((i: Invoice) => i.status !== 'paid');
      if (firstOpen) {
        const remaining = Number(firstOpen.balanceDue ?? (firstOpen.totalDue - (firstOpen.amountPaid || 0)));
        setPaymentForm({
          invoiceId: firstOpen.id,
          storeName: firstOpen.storeName || 'Loja Parceira',
          competence: firstOpen.competenceMonth,
          totalDue: Number(firstOpen.totalDue),
          amountPaidSoFar: Number(firstOpen.amountPaid || 0),
          balanceDue: remaining > 0 ? remaining : 0,
          amount: (remaining > 0 ? remaining : Number(firstOpen.totalDue)).toFixed(2),
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'pix',
          externalReference: '',
          notes: '',
        });
      } else {
        setPaymentForm({
          invoiceId: '',
          storeName: '',
          competence: '',
          totalDue: 0,
          amountPaidSoFar: 0,
          balanceDue: 0,
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'pix',
          externalReference: '',
          notes: '',
        });
      }
    }
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId) {
      setFeedbackMessage({ text: 'Por favor, selecione uma fatura para registrar o pagamento.', type: 'error' });
      return;
    }

    const payAmount = parseFloat(paymentForm.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setFeedbackMessage({ text: 'Informe um valor válido maior que zero.', type: 'error' });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await registerManualPayment({
        invoiceId: paymentForm.invoiceId,
        amountPaid: payAmount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
        externalReference: paymentForm.externalReference,
        idempotencyKey: `pay-${paymentForm.invoiceId}-${paymentForm.paymentDate}-${payAmount}-${Date.now()}`
      });

      if (res.success) {
        setFeedbackMessage({
          text: `Recebimento manual de ${formatCurrency(payAmount)} registrado com sucesso para a fatura! Situação: ${res.status === 'paid' ? 'Integralmente Paga' : 'Parcialmente Paga'}.`,
          type: 'success',
        });
        setIsPaymentModalOpen(false);
        await loadMetrics();
      } else {
        setFeedbackMessage({ text: res.error || 'Falha ao registrar recebimento.', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Erro inesperado.', type: 'error' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOpenAdjustmentModal = (invoice: Invoice) => {
    setAdjustmentForm({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      adjustmentAmount: '',
      reason: '',
    });
    setIsAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const adjAmount = parseFloat(adjustmentForm.adjustmentAmount);
    if (isNaN(adjAmount) || adjAmount === 0) {
      setFeedbackMessage({ text: 'Informe um valor de ajuste válido.', type: 'error' });
      return;
    }
    if (!adjustmentForm.reason.trim()) {
      setFeedbackMessage({ text: 'Informe a justificativa do ajuste/desconto.', type: 'error' });
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const res = await registerInvoiceAdjustment({
        invoiceId: adjustmentForm.invoiceId,
        adjustmentAmount: adjAmount,
        description: adjustmentForm.reason,
      });

      if (res.success) {
        setFeedbackMessage({
          text: `Ajuste financeiro de ${formatCurrency(adjAmount)} registrado na fatura ${adjustmentForm.invoiceNumber}.`,
          type: 'success',
        });
        setIsAdjustmentModalOpen(false);
        await loadMetrics();
      } else {
        setFeedbackMessage({ text: res.error || 'Falha ao registrar ajuste.', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Erro inesperado.', type: 'error' });
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Filtragem de faturas
  const allInvoices: Invoice[] = (metrics?.invoices || metrics?.invoicesList || []) as Invoice[];
  const filteredInvoices: Invoice[] = allInvoices.filter((inv: Invoice) => {
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'open' && (inv.status === 'pending' || inv.status === 'partially_paid' || inv.status === 'past_due' || inv.status === 'overdue')) ||
      inv.status === selectedStatusFilter;

    const matchesCompetence =
      selectedCompetenceFilter === 'all' || inv.competenceMonth === selectedCompetenceFilter;

    const matchesSearch =
      !invoiceSearchQuery ||
      inv.invoiceNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
      (inv.storeName && inv.storeName.toLowerCase().includes(invoiceSearchQuery.toLowerCase()));

    return matchesStatus && matchesCompetence && matchesSearch;
  });

  const uniqueCompetences: string[] = Array.from(new Set(allInvoices.map((i: Invoice) => i.competenceMonth))).sort().reverse();

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Gestão Financeira & Cobranças Manuais SaaS</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
              Sem Gateway • Pagamentos Diretos
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            O PlanejaFácil não intermedia pagamentos. O titular recebe externamente (Pix/transferência) e registra os recebimentos manualmente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Atualizar Métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleRunMonthlyBilling}
            disabled={isGeneratingInvoices}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all flex items-center gap-2 border border-slate-200 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            {isGeneratingInvoices ? 'Consolidando...' : 'Consolidar Faturas'}
          </button>

          <button
            onClick={() => handleOpenPaymentModal()}
            className="px-4 py-2 bg-[#1B2B48] hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registrar Pagamento Manual</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Recorrente (MRR)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentMrr)}</div>
          <div className="text-xs text-emerald-700 font-bold">● Assinaturas das Lojas Parceiras</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Anualizada (ARR)</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(currentArr)}</div>
          <div className="text-xs text-slate-500 font-medium">Contratos recorrentes ativos</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Lojas Ativas Pagantes</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeCount} unidades</div>
          <div className="text-xs text-slate-500 font-medium">
            {metrics?.suspendedStoresCount ? (
              <span className="text-rose-600 font-bold">{metrics.suspendedStoresCount} loja(s) suspensa(s)</span>
            ) : (
              'Todas as lojas ativas no roteamento'
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Pay-Per-Lead</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(variableRevenue)}</div>
          <div className="text-xs text-slate-500 font-medium">Faturamento sobre leads entregues (R$ 50/un)</div>
        </div>

      </div>

      {/* Cards de Faturamento & Recebimentos Manuais */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Faturado Emitido</span>
          <div className="text-xl font-extrabold text-white">{formatCurrency(metrics?.totalInvoiced || 0)}</div>
          <p className="text-[11px] text-slate-400">Consolidado em faturas no banco</p>
        </div>

        <div className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Registrado como Recebido</span>
          <div className="text-xl font-extrabold text-emerald-700">{formatCurrency(metrics?.totalCollected || 0)}</div>
          <p className="text-[11px] text-emerald-700 font-medium">Liquidação manual via Pix/Transferência</p>
        </div>

        <div className="bg-white border border-amber-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Saldo Pendente em Aberto</span>
          <div className="text-xl font-extrabold text-amber-700">{formatCurrency(metrics?.totalReceivables || 0)}</div>
          <p className="text-[11px] text-amber-700 font-medium">Aguardando recebimento externo</p>
        </div>

        <div className="bg-white border border-rose-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Inadimplência / Vencido</span>
          <div className="text-xl font-extrabold text-rose-700">{formatCurrency(metrics?.overdueAmount || 0)}</div>
          <p className="text-[11px] text-rose-700 font-medium">{metrics?.overdueCount || 0} fatura(s) vencida(s)</p>
        </div>
      </div>

      {/* Alerta de Vencimentos Próximos */}
      {((metrics?.dueNext7Days && metrics.dueNext7Days > 0) || (metrics?.dueNext30Days && metrics.dueNext30Days > 0)) && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-extrabold">Monitoramento de Vencimentos Contratuais:</span>
              <span className="ml-2 font-medium">
                {metrics?.dueNext7Days || 0} fatura(s) vencendo nos próximos 7 dias • {metrics?.dueNext30Days || 0} nos próximos 30 dias.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-black uppercase text-[10px]">
            Cobrança Manual Ativa
          </span>
        </div>
      )}

      {/* SEÇÃO 1: FATURAS CONSOLIDADAS & REGISTRO DE RECEBIMENTO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Faturas Consolidadas & Controle de Quitação</h3>
            <p className="text-xs text-slate-500">
              Visualize faturas por competência, registre pagamentos parciais ou totais e aplique ajustes auditados.
            </p>
          </div>

          {/* Filtros da Tabela de Faturas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar fatura ou loja..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="open">Em Aberto (Pendentes / Parciais / Vencidas)</option>
              <option value="pending">Pendente</option>
              <option value="partially_paid">Parcialmente Pago</option>
              <option value="paid">Integralmente Pago</option>
              <option value="overdue">Vencido</option>
            </select>

            <select
              value={selectedCompetenceFilter}
              onChange={(e) => setSelectedCompetenceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Todas Competências</option>
              {uniqueCompetences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Faturas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Fatura #</th>
                <th className="py-3 px-4">Loja Parceira</th>
                <th className="py-3 px-4">Competência</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Total Devido</th>
                <th className="py-3 px-4">Valor Pago</th>
                <th className="py-3 px-4">Saldo em Aberto</th>
                <th className="py-3 px-4">Situação</th>
                <th className="py-3 px-4 text-right">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    Nenhuma fatura encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv: Invoice) => {
                  const balance = inv.balanceDue ?? (inv.totalDue - (inv.amountPaid || 0));
                  const isPaid = inv.status === 'paid' || balance <= 0;
                  const isPartial = inv.status === 'partially_paid' || ((inv.amountPaid || 0) > 0 && !isPaid);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.storeName || 'Loja Parceira'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{inv.competenceMonth}</td>
                      <td className="py-3 px-4">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{formatCurrency(inv.totalDue)}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(inv.amountPaid || 0)}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {balance > 0 ? (
                          <span className="text-amber-700">{formatCurrency(balance)}</span>
                        ) : (
                          <span className="text-emerald-700">R$ 0,00</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-blue-100 text-blue-800'
                            : inv.status === 'overdue' || inv.status === 'past_due'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? 'Pago' : isPartial ? 'Parcialmente Pago' : inv.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        {!isPaid && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[11px] shadow-sm transition-all cursor-pointer"
                          >
                            Registrar Recebimento
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenAdjustmentModal(inv)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Ajuste / Desconto
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 2: HISTÓRICO DE RECEBIMENTOS REGISTRADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Histórico de Recebimentos Externos Auditados</h3>
            <p className="text-xs text-slate-500">
              Registros inseridos manualmente pela administração ao confirmar créditos via Pix ou transferência.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            {metrics?.recentPayments?.length || 0} registros encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Data Recebimento</th>
                <th className="py-3 px-4">Loja Parceira</th>
                <th className="py-3 px-4">Competência</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Valor Recebido</th>
                <th className="py-3 px-4">Ref. Externa / Pix E2E</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {!metrics?.recentPayments || metrics.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    Nenhum recebimento manual registrado ainda.
                  </td>
                </tr>
              ) : (
                metrics.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {new Date(p.paymentDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.storeName}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{p.competenceMonth}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">{formatCurrency(p.amountPaid || p.amount || 0)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.externalReference || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{p.recordedByEmail || 'Admin'}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{p.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 3: DEMONSTRATIVO POR LOJA PARCEIRA */}
      {metrics && metrics.storesBreakdown && metrics.storesBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
          <h3 className="text-base font-extrabold text-slate-900">Situação Cadastral & Financeira por Loja</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Loja / Unidade</th>
                  <th className="py-3 px-4">Cidade / Região</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Mensalidade (MRR)</th>
                  <th className="py-3 px-4">Dia Venc.</th>
                  <th className="py-3 px-4">Leads Entregues</th>
                  <th className="py-3 px-4">Total Faturado</th>
                  <th className="py-3 px-4">Total Pago</th>
                  <th className="py-3 px-4">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {metrics.storesBreakdown.map((s) => (
                  <tr key={s.storeId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.storeName}</td>
                    <td className="py-3 px-4">{s.cityName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        s.planTier === 'pro' || s.planTier === 'Pro' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {s.planTier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(s.mrr)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">Dia {s.dueDay || s.billingDueDay || 10}</td>
                    <td className="py-3 px-4">{s.leadsCount} un. ({formatCurrency(s.leadsBilled)})</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(s.totalBilled)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{formatCurrency(s.totalPaid)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'Ativa' || s.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Comparisons */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Preços Contratados dos Planos SaaS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STORE_PLANS.filter(p => p.id === 'Basic' || p.id === 'Pro').map((plan) => {
            const countOnPlan = metrics?.plansBreakdown
              ? (plan.id === 'Pro' ? metrics.plansBreakdown.pro : metrics.plansBreakdown.basic)
              : stores.filter((s) => s.plan === plan.id).length;
            const planRevenue = countOnPlan * plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 relative"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">{plan.title}</h4>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">R$ {plan.priceMonthly.toFixed(2)} /mês</div>
                  <div className="text-xs text-slate-500 font-medium">+ R$ 50,00 por lead entregue faturável</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unidades Inscritas:</span>
                    <span className="font-bold text-slate-900">{countOnPlan} unidades</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Faturamento Recorrente:</span>
                    <span className="font-extrabold text-emerald-700">{formatCurrency(planRevenue)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Benefícios</span>
                  {plan.features.map((feat) => (
                    <div key={feat} className="text-xs font-semibold text-slate-700 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: REGISTRAR PAGAMENTO MANUAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">Registrar Recebimento Manual</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Confirme o valor recebido por fora (Pix, transferência bancária ou dinheiro) diretamente da loja parceira.
              </p>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-left">
              
              {/* Seleção de Fatura */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fatura / Competência *</label>
                <select
                  required
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const invoicesArr = (metrics?.invoices || metrics?.invoicesList || []) as Invoice[];
                    const chosen = invoicesArr.find((i: Invoice) => i.id === e.target.value);
                    if (chosen) {
                      const remaining = Number(chosen.balanceDue ?? (chosen.totalDue - (chosen.amountPaid || 0)));
                      setPaymentForm({
                        ...paymentForm,
                        invoiceId: chosen.id,
                        storeName: chosen.storeName || 'Loja',
                        competence: chosen.competenceMonth,
                        totalDue: Number(chosen.totalDue),
                        amountPaidSoFar: Number(chosen.amountPaid || 0),
                        balanceDue: remaining > 0 ? remaining : 0,
                        amount: (remaining > 0 ? remaining : Number(chosen.totalDue)).toFixed(2),
                      });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Selecione uma fatura...</option>
                  {((metrics?.invoices || metrics?.invoicesList || []) as Invoice[]).map((inv: Invoice) => {
                    const bal = inv.balanceDue ?? (inv.totalDue - (inv.amountPaid || 0));
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.storeName || 'Loja'} ({inv.competenceMonth}) — Saldo: {formatCurrency(bal)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Informações da fatura selecionada */}
              {paymentForm.invoiceId && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Fatura</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(paymentForm.totalDue)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Já Pago</span>
                    <span className="font-extrabold text-emerald-700">{formatCurrency(paymentForm.amountPaidSoFar)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Restante</span>
                    <span className="font-extrabold text-amber-700">{formatCurrency(paymentForm.balanceDue)}</span>
                  </div>
                </div>
              )}

              {/* Valor Recebido & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Recebido (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="Ex: 219.90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">Aceita pagamentos integrais ou parciais</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data do Pagamento *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              {/* Forma de Pagamento & Ref Externa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Forma de Pagamento *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência Bancária (TED/DOC)</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="outro">Outro meio externo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ref. Externa / ID Pix</label>
                  <input
                    type="text"
                    value={paymentForm.externalReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, externalReference: e.target.value })}
                    placeholder="Ex: E2E Pix ou comprovante"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações do Recebimento</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Ex: Pagamento confirmado via extrato Itaú pelo administrador."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  O registro manual gera um lançamento de auditoria assinado por sua conta administrativa. Valores parciais manterão a fatura como <strong>Parcialmente Paga</strong>.
                </span>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Gravando...' : 'Confirmar Recebimento'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR AJUSTE / DESCONTO */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <button
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left">
              <h3 className="text-base font-black text-slate-900">Ajuste ou Desconto na Fatura</h3>
              <p className="text-xs text-slate-500 font-medium">
                Fatura: <strong>{adjustmentForm.invoiceNumber}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor do Ajuste (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustmentForm.adjustmentAmount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentAmount: e.target.value })}
                  placeholder="Ex: -50.00 para desconto ou 50.00 para acréscimo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Use valores negativos para desconto / abatimento</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo do Ajuste *</label>
                <textarea
                  rows={3}
                  required
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  placeholder="Ex: Desconto acordado por contestação de lead sem contato comercial."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="w-2/3 py-2.5 rounded-xl bg-[#1B2B48] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdjustment ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
