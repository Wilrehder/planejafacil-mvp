import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Search, 
  Sparkles, 
  Lock, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Ruler, 
  Wrench, 
  ShieldCheck, 
  DollarSign,
  Package,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStage, StoreOrder, ERPMetrics } from '../../types';
import { fetchStoreOrders, fetchERPMetrics } from '../../lib/erpService';
import { OrderDetailView } from './OrderDetailView';

interface MerchantERPProps {
  merchantPlan: 'Basic' | 'Pro';
  storeId?: string;
}

const STAGE_LABELS: Record<OrderStage, { label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  formalizacao_contratual: { label: '1. Formalização Contratual', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: FileText },
  medicao: { label: '2. Medição', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Ruler },
  projeto_aprovacao: { label: '3. Projeto & Aprovação', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: FileText },
  producao: { label: '4. Produção', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: Package },
  montagem: { label: '5. Montagem', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Wrench },
  entrega_aceite: { label: '6. Entrega / Aceite', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: ShieldCheck },
  concluido: { label: '7. Concluído', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
};

export const MerchantERP: React.FC<MerchantERPProps> = ({ merchantPlan, storeId = 'store-suzano' }) => {
  const { selectedOrderForFolder, setSelectedOrderForFolder } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('todos');
  const [liveOrders, setLiveOrders] = useState<StoreOrder[]>([]);
  const [erpMetrics, setErpMetrics] = useState<ERPMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [activeModalOrder, setActiveModalOrder] = useState<StoreOrder | null>(null);

  // Carrega pedidos e métricas do banco de dados
  const loadOrdersAndMetrics = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, metricsRes] = await Promise.all([
        fetchStoreOrders(storeId),
        fetchERPMetrics(storeId),
      ]);

      if (ordersRes.success) {
        setLiveOrders(ordersRes.orders);
        setErrorMessage(null);
        setErrorCode(null);
        setIsStale(false);
      } else {
        setErrorMessage(ordersRes.error || 'Erro ao carregar pedidos.');
        setErrorCode(ordersRes.errorCode || 'RPC_ERROR');
        // Se já existirem pedidos na tela, preservá-los e sinalizar que estão desatualizados
        setIsStale(liveOrders.length > 0);
      }

      if (metricsRes.success && metricsRes.metrics) {
        setErpMetrics(metricsRes.metrics);
      }
    } catch (err: any) {
      console.warn('[MerchantERP] Erro ao carregar dados do ERP:', err);
      setErrorMessage('Falha na comunicação com o servidor ao consultar pedidos.');
      setErrorCode('NETWORK_ERROR');
      setIsStale(liveOrders.length > 0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersAndMetrics();
  }, [storeId]);

  // Sincroniza pedido selecionado pela URL (ex: ?pedido=PED-4153)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pedidoParam = params.get('pedido');
    if (pedidoParam && liveOrders.length > 0) {
      const matched = liveOrders.find(
        (o) => o.id === pedidoParam || o.orderNumber === pedidoParam || o.uuid === pedidoParam
      );
      if (matched) {
        setActiveModalOrder(matched);
      }
    }
  }, [liveOrders]);

  // Listener para navegação pelo histórico do navegador (botão voltar/avançar)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pedidoParam = params.get('pedido');
      if (!pedidoParam) {
        setActiveModalOrder(null);
        setSelectedOrderForFolder(null);
      } else if (liveOrders.length > 0) {
        const matched = liveOrders.find(
          (o) => o.id === pedidoParam || o.orderNumber === pedidoParam || o.uuid === pedidoParam
        );
        if (matched) {
          setActiveModalOrder(matched);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [liveOrders]);

  const handleOpenOrder = (order: StoreOrder) => {
    setActiveModalOrder(order);
    setSelectedOrderForFolder(order);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('pedido', order.orderNumber || order.id);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      // ignore
    }
  };

  const handleBackToList = () => {
    setActiveModalOrder(null);
    setSelectedOrderForFolder(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('pedido');
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      // ignore
    }
  };

  const displayedOrders = liveOrders;

  const filteredOrders = displayedOrders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (order.clientName || '').toLowerCase().includes(query) ||
      (order.id || '').toLowerCase().includes(query) ||
      (order.orderNumber || '').toLowerCase().includes(query) ||
      (order.environment || '').toLowerCase().includes(query);
    
    const matchesStage = stageFilter === 'todos' || order.currentStage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const totalContractVolume = erpMetrics?.totalContractedValue || displayedOrders.reduce((acc, curr) => acc + (curr.contractedValue || curr.totalValue), 0);
  const activeOrdersCount = erpMetrics?.activeOrders ?? displayedOrders.filter((o) => o.currentStage !== 'concluido').length;
  const completedOrdersCount = erpMetrics?.completedOrders ?? displayedOrders.filter((o) => o.currentStage === 'concluido').length;
  const delayedOrdersCount = erpMetrics?.delayedOrders ?? displayedOrders.filter((o) => o.hasPendingIssues).length;

  if (merchantPlan === 'Basic') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-3xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
          Recurso Exclusivo do Plano Pro
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          Módulo ERP Pós-Venda Operacional
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto mb-6">
          Ao fechar uma venda no CRM, promova o cliente automaticamente para um <strong>Pedido de Produção (#PED-XXXX)</strong>. Gerencie medição técnica, projetos 3D, plano de corte, montagem e vistoria final com pasta digital e linha do tempo de auditoria.
        </p>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left max-w-md mx-auto mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Trilha de Auditoria com Usuário, Horário e Ação
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Avanço Automático de Etapa por Anexo de Documentos
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pasta Digital de Documentos (Contrato, Medição, 3D, Aceite)
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Alterne a chave do <strong>Plano Pro ⭐ (R$ 219,90/mês)</strong> no topo da tela para testar o ERP operacional.
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO DA PÁGINA DEDICADA DE DETALHES DO PEDIDO
  const currentDetailOrder = activeModalOrder || selectedOrderForFolder;
  if (currentDetailOrder) {
    const detailedOrder =
      liveOrders.find((o) => 
        o.id === currentDetailOrder.id || 
        o.uuid === currentDetailOrder.uuid ||
        o.orderNumber === currentDetailOrder.orderNumber
      ) || currentDetailOrder;

    return (
      <OrderDetailView
        order={detailedOrder}
        onBack={handleBackToList}
        onOrderUpdated={loadOrdersAndMetrics}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* CARDS DE INDICADORES / KPIS DO ERP (COMPACTOS E MODERNOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* VOLUME TOTAL CONTRATADO */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Volume Contratado
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              R$ {totalContractVolume.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Faturamento Contratado
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100/80 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* PEDIDOS ATIVOS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Pedidos Ativos
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {activeOrdersCount}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
              <Package className="w-3 h-3" /> Em esteira de produção
            </span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/80 shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* PEDIDOS CONCLUÍDOS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Pedidos Concluídos
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {completedOrdersCount}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Entregues com Aceite
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100/80 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* PENDÊNCIAS / PRAZOS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Pendências / Alertas
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {delayedOrdersCount}
            </span>
            <span className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${delayedOrdersCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              <AlertTriangle className="w-3 h-3" /> {delayedOrdersCount > 0 ? 'Atenção requerida' : 'Nenhuma pendência'}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${delayedOrdersCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTROS E BUSCA DE PEDIDOS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* BUSCA */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por Pedido (#PED-XXXX), cliente ou ambiente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* FILTRO POR ETAPA E REFRESH */}
        <div className="flex items-center gap-2.5">
          <div className="w-full md:w-auto shrink-0 relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer appearance-none pr-8 transition-all"
            >
              <option value="todos">Filtrar: Todas as Etapas</option>
              {Object.entries(STAGE_LABELS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <button
            onClick={loadOrdersAndMetrics}
            disabled={isLoading}
            title="Recarregar pedidos"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

      </div>

      {/* BANNER DE AVISO DE DADOS DESATUALIZADOS (EM CASO DE FALHA DE RECONEXÃO) */}
      {errorMessage && liveOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Atenção:</strong> Não foi possível sincronizar os dados mais recentes do ERP ({errorMessage}). Os registros abaixo estão preservados, mas podem estar desatualizados.
            </span>
          </div>
          <button
            onClick={loadOrdersAndMetrics}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1.5 self-end sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Tentar novamente
          </button>
        </div>
      )}

      {/* TABELA DE PEDIDOS OPERACIONAIS DO ERP */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Pedido / Cliente</th>
                <th className="py-3 px-4">Ambiente</th>
                <th className="py-3 px-4 text-center">Etapa Atual</th>
                <th className="py-3 px-4 text-right">Valor Contratado</th>
                <th className="py-3 px-4 text-center">Última Atualização</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading && liveOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-semibold text-slate-700 text-xs">Carregando pedidos de produção do ERP...</span>
                      <span className="text-[11px] text-slate-400">Consultando banco de dados seguro</span>
                    </div>
                  </td>
                </tr>
              ) : errorMessage && liveOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-200 shrink-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Falha ao consultar pedidos do ERP</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{errorMessage}</p>
                        {errorCode && (
                          <span className="inline-block mt-1 font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Código: {errorCode}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={loadOrdersAndMetrics}
                        disabled={isLoading}
                        className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Tentar novamente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const stageInfo = STAGE_LABELS[order.currentStage] || STAGE_LABELS.medicao;
                  const IconComp = stageInfo.icon;
                  const lastAudit = order.timeline?.[0];
                  const contractedVal = order.contractedValue || order.totalValue;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* PEDIDO & CLIENTE */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70 shrink-0">
                            {order.id}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5 truncate">
                              {order.clientName}
                              {order.hasPendingIssues && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                  Pendência
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {order.city} / {order.state} • {order.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AMBIENTE */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md text-xs inline-block">
                          {order.environment}
                        </span>
                      </td>

                      {/* ETAPA ATUAL */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${stageInfo.bg} ${stageInfo.text}`}>
                          <IconComp className="w-3 h-3" />
                          {stageInfo.label}
                        </span>
                      </td>

                      {/* VALOR CONTRATADO */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-slate-900 block text-xs">
                          R$ {contractedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {order.estimatedBudget && order.estimatedBudget !== contractedVal && (
                          <span className="text-[10px] text-slate-400 block">
                            Est: R$ {order.estimatedBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* ÚLTIMA ATUALIZAÇÃO */}
                      <td className="py-3 px-4 text-center">
                        {lastAudit ? (
                          <div className="text-left inline-block max-w-[160px] truncate">
                            <span className="text-[11px] font-semibold text-slate-700 block truncate">
                              {lastAudit.user}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {new Date(lastAudit.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sem registro</span>
                        )}
                      </td>

                      {/* AÇÃO: ABRIR PASTA DO PEDIDO */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenOrder(order)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderCheck className="w-3.5 h-3.5" />
                          <span>Abrir Pasta</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : liveOrders.length > 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    <p className="font-semibold text-slate-600">Nenhum pedido encontrado para o filtro selecionado.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setStageFilter('todos'); }}
                      className="mt-2 text-blue-600 hover:underline font-bold text-xs cursor-pointer"
                    >
                      Limpar filtros de busca
                    </button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-2">
                      <Package className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">Nenhum pedido em produção na esteira</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ao fechar uma venda no CRM ou emitir um contrato comercial, o pedido aparecerá aqui automaticamente na etapa de formalização contratual.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
