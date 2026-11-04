import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Search,
  Copy,
  Check,
  Eye,
  X,
  RefreshCw,
  Store as StoreIcon,
  Sparkles,
  CreditCard,
  MessageCircle,
  FileText,
  TrendingUp,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Info,
  LayoutGrid,
  List
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  fetchAdminBillingHub, 
  adminQuickPayStore,
  registerInvoiceAdjustment
} from '../../lib/financialService';
import { 
  AdminBillingHubData, 
  StoreBillingCycle, 
  BillingCycleStatus, 
  StoreCycleLead 
} from '../../types';

export const FinancialView: React.FC = () => {
  const { stores: contextStores } = useApp();

  // Mês atual no formato YYYY-MM
  const currentRealMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentRealMonth);
  const [billingData, setBillingData] = useState<AdminBillingHubData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | BillingCycleStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal de Detalhes dos Leads do Ciclo
  const [selectedStoreForLeads, setSelectedStoreForLeads] = useState<StoreBillingCycle | null>(null);

  // Modal de Quitação Rápida via Pix
  const [payingStore, setPayingStore] = useState<StoreBillingCycle | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [pixReference, setPixReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Modal de Ajuste / Desconto
  const [adjustingStore, setAdjustingStore] = useState<StoreBillingCycle | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState<boolean>(false);

  // Estado para copiar mensagem de WhatsApp
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);

  // Carregar dados da competência
  const loadBillingData = async (month: string) => {
    setLoading(true);
    setFeedbackBanner(null);
    try {
      const res = await fetchAdminBillingHub(month);
      if (res.success && res.data) {
        setBillingData(res.data);
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Não foi possível carregar os dados financeiros.',
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro de conexão com o banco.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData(selectedMonth);
  }, [selectedMonth]);

  // Navegação de Meses
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentRealMonth);
  };

  // Formatação de Moeda
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Formatação do nome do mês
  const formatMonthTitle = (competence: string): string => {
    const [year, month] = competence.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    const name = d.toLocaleDateString('pt-BR', { month: 'long' });
    return `${name.charAt(0).toUpperCase() + name.slice(1)} de ${year}`;
  };

  // Filtragem das lojas
  const filteredStores = useMemo(() => {
    if (!billingData?.stores) return [];
    return billingData.stores.filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.responsibleName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || s.cycleStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [billingData?.stores, searchQuery, statusFilter]);

  // Copiar Cobrança para WhatsApp
  const handleCopyWhatsApp = (store: StoreBillingCycle) => {
    const dueDateFormatted = store.dueDate
      ? new Date(store.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
      : `Dia ${store.billingDueDay}`;

    const text = 
`Olá ${store.responsibleName || store.storeName}, tudo bem? 

Aqui é da equipe PlanejaFácil! Segue o fechamento da sua fatura da competência *${formatMonthTitle(selectedMonth)}*:

• *Mensalidade (Plano ${store.planTier.toUpperCase()}):* ${formatCurrency(store.monthlyFee)}
• *Leads Entregues no Ciclo:* ${store.leadsCount} lead(s) (${formatCurrency(store.leadsAmount)})
• *Valor Total a Pagar:* *${formatCurrency(store.balanceDue > 0 ? store.balanceDue : store.totalDue)}*
• *Data de Vencimento:* ${dueDateFormatted}

Chave Pix para quitação:
pix@planejafacil.com.br (ou seu CNPJ cadastrado)

Assim que realizar o pagamento, por gentileza nos envie o comprovante por aqui para darmos a baixa no sistema! Obrigado pela parceria.`;

    navigator.clipboard.writeText(text);
    setCopiedStoreId(store.storeId);
    setTimeout(() => {
      setCopiedStoreId(null);
    }, 3000);
  };

  // Abrir Modal de Pagamento
  const handleOpenPaymentModal = (store: StoreBillingCycle) => {
    setPayingStore(store);
    setPaymentAmount(store.balanceDue > 0 ? store.balanceDue.toFixed(2) : store.totalDue.toFixed(2));
    setPixReference('');
    setPaymentNotes('');
  };

  // Confirmar Quitação via Pix
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStore) return;

    const amountNum = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await adminQuickPayStore({
        storeId: payingStore.storeId,
        competenceMonth: selectedMonth,
        amount: amountNum,
        method: 'pix',
        reference: pixReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          text: `Pagamento de ${formatCurrency(amountNum)} para "${payingStore.storeName}" registrado com sucesso!`,
        });
        setPayingStore(null);
        await loadBillingData(selectedMonth);
      } else {
        alert(res.error || 'Erro ao registrar pagamento.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Abrir Modal de Ajuste/Desconto
  const handleOpenAdjustmentModal = (store: StoreBillingCycle) => {
    setAdjustingStore(store);
    setAdjustmentAmount('');
    setAdjustmentReason('');
  };

  // Confirmar Ajuste
  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStore || !adjustingStore.invoiceId) return;

    const amountNum = parseFloat(adjustmentAmount.replace(',', '.'));
    if (isNaN(amountNum)) {
      alert('Informe um valor de desconto válido.');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const res = await registerInvoiceAdjustment({
        invoiceId: adjustingStore.invoiceId,
        adjustmentAmount: amountNum,
        description: adjustmentReason.trim() || 'Ajuste administrativo',
      });

      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          text: `Ajuste na fatura de "${adjustingStore.storeName}" aplicado com sucesso!`,
        });
        setAdjustingStore(null);
        await loadBillingData(selectedMonth);
      } else {
        alert(res.error || 'Erro ao aplicar ajuste.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const summary = billingData?.summary || {
    totalProjected: 0,
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    activeStores: 0,
    openCount: 0,
    closedCount: 0,
    paidCount: 0,
    overdueCount: 0,
  };

  const isCurrentMonthActive = selectedMonth === currentRealMonth;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. NAVEGADOR DE COMPETÊNCIA & CABEÇALHO PRINCIPAL */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Faturamento SaaS Automático
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                Sem Gateway • Pix Direto
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Gestão Financeira & Cobranças por Ciclo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Acompanhe o fechamento mensal de cada loja parceira, controle os leads entregues e dê baixa nos pagamentos via Pix.
            </p>
          </div>

          {/* Navegador Temporal do Mês */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-2xl shrink-0 self-start lg:self-auto shadow-inner">
            <button
              onClick={handlePrevMonth}
              title="Mês Anterior"
              className="p-2 hover:bg-white text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-none hover:shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-4 py-1.5 text-center min-w-[190px]">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Competência
              </div>
              <div className="text-sm font-black text-slate-900 flex items-center justify-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{formatMonthTitle(selectedMonth)}</span>
              </div>
            </div>

            <button
              onClick={handleNextMonth}
              title="Próximo Mês"
              className="p-2 hover:bg-white text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-none hover:shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {!isCurrentMonthActive && (
              <button
                onClick={handleCurrentMonth}
                className="ml-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                Mês Atual
              </button>
            )}

            <button
              onClick={() => loadBillingData(selectedMonth)}
              title="Recarregar dados"
              className="p-2 hover:bg-white text-slate-500 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <span>{feedbackBanner.text}</span>
            <button
              onClick={() => setFeedbackBanner(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. OS 4 CARDS EXECUTIVOS ESSENCIAIS (ALTO SINAL, ZERO RUÍDO) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Previsão Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total a Faturar
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(summary.totalProjected)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {summary.activeStores} loja(s) parceira(s) no ciclo
          </p>
        </div>

        {/* Card 2: Recebido */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Recebido via Pix
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
            {formatCurrency(summary.totalCollected)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {summary.paidCount} fatura(s) 100% quitada(s)
          </p>
        </div>

        {/* Card 3: Saldo em Aberto */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Saldo a Receber
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
            {formatCurrency(summary.totalPending)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {summary.openCount + summary.closedCount} fatura(s) aguardando
          </p>
        </div>

        {/* Card 4: Inadimplência / Atraso */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Em Atraso
            </span>
            <div className={`p-2 rounded-xl ${summary.totalOverdue > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${summary.totalOverdue > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {formatCurrency(summary.totalOverdue)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {summary.overdueCount > 0 ? `${summary.overdueCount} loja(s) vencida(s)` : 'Nenhuma loja em atraso'}
          </p>
        </div>
      </div>

      {/* 3. FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Pílulas de Status */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({billingData?.stores.length || 0})
          </button>

          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Em Aberto ({summary.openCount})
          </button>

          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'closed'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Fechadas ({summary.closedCount})
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Pagas ({summary.paidCount})
          </button>

          {summary.overdueCount > 0 && (
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Em Atraso ({summary.overdueCount})
            </button>
          )}

          {Boolean(summary.notEnrolledCount && summary.notEnrolledCount > 0) && (
            <button
              onClick={() => setStatusFilter('not_enrolled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'not_enrolled'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Sem Assinatura no Mês ({summary.notEnrolledCount})
            </button>
          )}
        </div>

        {/* Controles à Direita: Busca & Seletor de Modo */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Input de Busca */}
          <div className="relative min-w-[200px] flex-1 md:flex-initial">
            <input
              type="text"
              placeholder="Buscar marcenaria ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Seletor Compacto Modo Cards / Modo Lista */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Modo Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Modo Lista Compacta"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px]">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. VISUALIZAÇÃO DAS LOJAS: MODO CARDS OU MODO LISTA COMPACTA */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Calculando ciclo e faturas das lojas parceiras...</p>
          <p className="text-xs text-slate-400 mt-1">Sincronizando dados em tempo real no Supabase.</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-900">Nenhuma loja encontrada para este filtro</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {billingData?.stores.length === 0
              ? 'Nenhuma loja parceira credenciada no momento. Cadastre novas lojas na aba "Lojas Credenciadas" para começar o faturamento.'
              : 'Nenhuma loja corresponde aos critérios de busca ou status selecionados.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* MODO LISTA COMPACTA (ALTA DENSIDADE) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Loja Parceira & Plano</th>
                  <th className="py-4 px-5">Gestor / Contato</th>
                  <th className="py-4 px-5">Ciclo / Vencimento</th>
                  <th className="py-4 px-5">Mensalidade</th>
                  <th className="py-4 px-5">Leads Entregues</th>
                  <th className="py-4 px-5">Total a Pagar</th>
                  <th className="py-4 px-5">Situação</th>
                  <th className="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStores.map((store) => {
                  const isPaid = store.cycleStatus === 'paid';
                  const isOpen = store.cycleStatus === 'open';
                  const isClosed = store.cycleStatus === 'closed';
                  const isOverdue = store.cycleStatus === 'overdue';
                  const isNotEnrolled = store.cycleStatus === 'not_enrolled';

                  const dueDateFormatted = store.dueDate
                    ? new Date(store.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
                    : `Dia ${store.billingDueDay}`;

                  return (
                    <tr 
                      key={store.storeId} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isNotEnrolled ? 'bg-slate-50/30 opacity-80' : isOverdue ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Loja & Plano */}
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{store.storeName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            store.planTier === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {store.planTier.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {store.cityName} - {store.stateUf}
                        </div>
                      </td>

                      {/* Gestor / Contato */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-800">{store.responsibleName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{store.phone}</div>
                      </td>

                      {/* Ciclo / Vencimento */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {isNotEnrolled ? (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {store.enrolledDate ? `Ingressou em ${store.enrolledDate}` : 'Mês posterior'}
                          </span>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900">{dueDateFormatted}</div>
                            <div className="text-[10px] text-slate-400">Vencimento da Fatura</div>
                          </div>
                        )}
                      </td>

                      {/* Mensalidade */}
                      <td className="py-3.5 px-5 whitespace-nowrap font-bold text-slate-900">
                        {formatCurrency(store.monthlyFee)}
                      </td>

                      {/* Leads Entregues */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {isNotEnrolled ? (
                          <span className="text-slate-400 text-xs">-</span>
                        ) : (
                          <div>
                            <span className="font-black text-emerald-700">{store.leadsCount} leads</span>
                            <span className="text-[11px] text-slate-400 block">{formatCurrency(store.leadsAmount)}</span>
                          </div>
                        )}
                      </td>

                      {/* Total a Pagar */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className={`text-sm font-black ${
                          isPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-slate-900'
                        }`}>
                          {formatCurrency(store.balanceDue > 0 ? store.balanceDue : store.totalDue)}
                        </div>
                        {store.invoiceNumber && (
                          <span className="text-[9px] font-mono text-slate-400 block">#{store.invoiceNumber}</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {isNotEnrolled && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            Sem Assinatura
                          </span>
                        )}
                        {isPaid && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Quitada
                          </span>
                        )}
                        {isOpen && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Aberta
                          </span>
                        )}
                        {isClosed && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> Fechada
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Em Atraso
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                        {isNotEnrolled ? (
                          <span className="text-[11px] text-slate-400 italic">Sem débitos</span>
                        ) : (
                          <>
                            {/* Ver Leads */}
                            <button
                              onClick={() => setSelectedStoreForLeads(store)}
                              title="Ver leads deste ciclo"
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>({store.leadsCount})</span>
                            </button>

                            {/* Copiar WhatsApp */}
                            <button
                              onClick={() => handleCopyWhatsApp(store)}
                              title="Copiar mensagem para WhatsApp"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              {copiedStoreId === store.storeId ? (
                                <span className="text-emerald-800 font-black">Copiado!</span>
                              ) : (
                                <>
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Whats</span>
                                </>
                              )}
                            </button>

                            {/* Quitar Pix */}
                            {!isPaid ? (
                              <button
                                onClick={() => handleOpenPaymentModal(store)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Quitar</span>
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Pago
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODO CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStores.map((store) => {
            const isPaid = store.cycleStatus === 'paid';
            const isOpen = store.cycleStatus === 'open';
            const isClosed = store.cycleStatus === 'closed';
            const isOverdue = store.cycleStatus === 'overdue';
            const isNotEnrolled = store.cycleStatus === 'not_enrolled';

            const dueDateFormatted = store.dueDate
              ? new Date(store.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
              : `Dia ${store.billingDueDay}`;

            const cutoffDateFormatted = store.cutoffDate
              ? new Date(store.cutoffDate + 'T12:00:00').toLocaleDateString('pt-BR')
              : 'Fim do ciclo';

            return (
              <div
                key={store.storeId}
                className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  isNotEnrolled
                    ? 'border-slate-200/90 bg-slate-50/40 opacity-90'
                    : isOverdue
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : isPaid
                    ? 'border-emerald-200'
                    : isClosed
                    ? 'border-amber-200'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Topo do Card */}
                <div className="p-5 pb-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                          {store.storeName}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          store.planTier === 'pro'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {store.planTier.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{store.cityName} - {store.stateUf}</span>
                        <span>•</span>
                        <span>Vence dia {store.billingDueDay}</span>
                      </div>
                    </div>

                    {/* Badge de Status do Ciclo */}
                    <div className="shrink-0">
                      {isNotEnrolled && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                          Sem Assinatura
                        </span>
                      )}
                      {isPaid && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Quitada
                        </span>
                      )}
                      {isOpen && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          Aberta
                        </span>
                      )}
                      {isClosed && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Fechada
                        </span>
                      )}
                      {isOverdue && (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Em Atraso
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informação do Ciclo */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="font-semibold text-slate-500">
                      {isNotEnrolled ? 'Credenciamento no SaaS:' : 'Vencimento da Fatura:'}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {isNotEnrolled ? (store.enrolledDate ? `Iniciado em ${store.enrolledDate}` : 'Mês posterior') : dueDateFormatted}
                    </span>
                  </div>
                </div>

                {/* Corpo do Card: Valores e Composição */}
                {isNotEnrolled ? (
                  <div className="p-6 py-8 space-y-3 flex-1 text-center flex flex-col justify-center items-center">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <StoreIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <div className="text-xs font-black text-slate-800">
                        Loja Não Credenciada Nesta Competência
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Esta loja parceira ingressou no aplicativo em <strong className="text-slate-700">{store.enrolledMonth ? formatMonthTitle(store.enrolledMonth) : 'mês posterior'}</strong>. Faturamento e cobrança de mensalidade vigoram a partir do mês de credenciamento.
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                      R$ 0,00 cobrado neste mês
                    </div>
                  </div>
                ) : (
                  <div className="p-5 py-4 space-y-3.5 flex-1">
                    {/* Linhas de Composição */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Mensalidade Fixa SaaS:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(store.monthlyFee)}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1">
                          <span>Leads Entregues no Ciclo:</span>
                          <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                            {store.leadsCount} un
                          </span>
                        </span>
                        <span className="font-bold text-slate-900">{formatCurrency(store.leadsAmount)}</span>
                      </div>

                      {store.amountPaid > 0 && !isPaid && (
                        <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-dashed border-slate-200">
                          <span>Valor Já Pago:</span>
                          <span>- {formatCurrency(store.amountPaid)}</span>
                        </div>
                      )}
                    </div>

                    {/* Total em Destaque */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {isPaid ? 'Total Quitado' : 'Valor Total a Pagar'}
                        </div>
                        <div className={`text-xl font-black tracking-tight ${
                          isPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-slate-900'
                        }`}>
                          {formatCurrency(store.balanceDue > 0 ? store.balanceDue : store.totalDue)}
                        </div>
                      </div>

                      {store.invoiceNumber && (
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          #{store.invoiceNumber}
                        </span>
                      )}
                    </div>

                    {/* Mensagem Contextual Inteligente */}
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {isOpen && (
                        <p className="flex items-center gap-1.5 text-blue-700">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Novos clientes do simulador acumulam nesta fatura até o dia do fechamento.</span>
                        </p>
                      )}
                      {isClosed && (
                        <p className="flex items-center gap-1.5 text-amber-700">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Ciclo fechado. Próximos leads cairão no mês seguinte. Aguardando Pix.</span>
                        </p>
                      )}
                      {isPaid && (
                        <p className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Fatura 100% quitada no banco de dados. Tudo certo!</span>
                        </p>
                      )}
                      {isOverdue && (
                        <p className="flex items-center gap-1.5 text-rose-700 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Vencimento expirado em {dueDateFormatted}. Envie cobrança no WhatsApp.</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Rodapé de Ações */}
                {isNotEnrolled ? (
                  <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-center">
                    <span className="text-[11px] font-bold text-slate-400">
                      Nenhuma cobrança devida nesta competência
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Botão Ver Leads do Ciclo */}
                    <button
                      onClick={() => setSelectedStoreForLeads(store)}
                      title="Ver clientes entregues nesta fatura"
                      className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline">Leads ({store.leadsCount})</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Botão Copiar WhatsApp */}
                      <button
                        onClick={() => handleCopyWhatsApp(store)}
                        title="Copiar mensagem pronta de cobrança para WhatsApp"
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-emerald-300"
                      >
                        {copiedStoreId === store.storeId ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-800 font-black">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span className="font-extrabold">WhatsApp</span>
                          </>
                        )}
                      </button>

                      {/* Botão Quitar / Dar Baixa no Pix */}
                      {!isPaid ? (
                        <button
                          onClick={() => handleOpenPaymentModal(store)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Quitar Pix</span>
                        </button>
                      ) : (
                        <span className="px-3 py-2 bg-emerald-100/80 text-emerald-800 rounded-xl text-xs font-extrabold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Pago
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: DETALHES DOS LEADS ENTREGUES NO CICLO */}
      {selectedStoreForLeads && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Transparência de Faturamento
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Leads Entregues — {selectedStoreForLeads.storeName}
                </h3>
                <p className="text-xs text-slate-500">
                  Competência {formatMonthTitle(selectedMonth)} • {selectedStoreForLeads.leadsCount} lead(s) faturados (R$ 50 cada)
                </p>
              </div>

              <button
                onClick={() => setSelectedStoreForLeads(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista dos Leads */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {selectedStoreForLeads.leadsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Nenhum lead comercial entregue neste ciclo.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">A fatura desta loja é composta unicamente pela mensalidade fixa.</p>
                </div>
              ) : (
                selectedStoreForLeads.leadsList.map((lead, idx) => (
                  <div
                    key={lead.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white flex items-center justify-between gap-3 text-xs shadow-none hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{lead.name}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>📞 {lead.phone}</span>
                        <span>•</span>
                        <span>📍 {lead.city}</span>
                        <span>•</span>
                        <span>🏷️ {lead.environment}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(lead.cost || 50)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {lead.deliveredAt ? new Date(lead.deliveredAt).toLocaleDateString('pt-BR') : 'Entregue'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Total acumulado em leads: <strong className="text-slate-900">{formatCurrency(selectedStoreForLeads.leadsAmount)}</strong>
              </div>
              <button
                onClick={() => setSelectedStoreForLeads(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: DAR BAIXA / REGISTRAR PIX RECEBIDO */}
      {payingStore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleConfirmPayment}>
              {/* Topo do Modal */}
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Livro-Caixa SaaS
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Dar Baixa no Pix — {payingStore.storeName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Competência {formatMonthTitle(selectedMonth)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingStore(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Campos do Pagamento */}
              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <div className="flex justify-between font-medium">
                    <span>Mensalidade Fixa:</span>
                    <span>{formatCurrency(payingStore.monthlyFee)}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-1">
                    <span>Leads ({payingStore.leadsCount} un):</span>
                    <span>{formatCurrency(payingStore.leadsAmount)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-emerald-200 pt-1.5 mt-2">
                    <span>Total da Fatura:</span>
                    <span>{formatCurrency(payingStore.totalDue)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Recebido no Pix (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="0,00"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Se a loja pagou integralmente, mantenha o valor total acima.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código do Comprovante / E2E do Pix (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pixReference}
                    onChange={(e) => setPixReference(e.target.value)}
                    placeholder="Ex: E1234567820261103..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observações Internas (Opcional)
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ex: Comprovante enviado no WhatsApp pelo Wilson"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingStore(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirmar Baixa no Banco</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
