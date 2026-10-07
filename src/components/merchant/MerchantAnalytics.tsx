import React from 'react';
import { useApp } from '../../context/AppContext';
import { Lead, StoreOrder } from '../../types';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Activity,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const MerchantAnalytics: React.FC = () => {
  const { leads, orders, stores } = useApp();
  // Assume lojista is looking at all their leads/orders (or we could filter by store, but context has the list).
  // For simplicity MVP we use all leads from the context since we are "logged in" as the merchant.
  
  // Basic computations
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'convertido');
  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

  // Pipeline (Em Atendimento + Orçado)
  const pipelineLeads = leads.filter(l => l.status === 'em_atendimento' || l.status === 'orcado');
  const pipelineValue = pipelineLeads.reduce((acc, l) => acc + (l.estimatedMax || 0), 0);

  // Ticket Médio (Using Orders because they have exact totalValue, or converted leads estimatedMax)
  const totalSalesValue = orders.reduce((acc, o) => acc + o.totalValue, 0);
  const averageTicket = orders.length > 0 ? totalSalesValue / orders.length : 0;

  // Comparativo de Vendas (Mês Atual vs Mês Anterior) dinâmico baseado nos dados
  const latestOrderDate = orders.reduce((latest, o) => {
    const d = new Date(o.createdAt);
    return d > latest ? d : latest;
  }, new Date(0));
  
  const now = latestOrderDate.getTime() === 0 ? new Date() : latestOrderDate;
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  const ordersThisMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const ordersLastMonth = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const salesThisMonth = ordersThisMonth.reduce((acc, o) => acc + o.totalValue, 0);
  const salesLastMonth = ordersLastMonth.reduce((acc, o) => acc + o.totalValue, 0);

  let salesGrowth = 0;
  if (salesLastMonth > 0) {
    salesGrowth = ((salesThisMonth - salesLastMonth) / salesLastMonth) * 100;
  } else if (salesThisMonth > 0) {
    salesGrowth = 100;
  }

  // ERP Metrics (Pós-Venda Operacional)
  const activeOrders = orders.filter(o => o.currentStage !== 'concluido');
  const erpVolume = activeOrders.reduce((acc, o) => acc + o.totalValue, 0);

  // Top Channels (Desempenho por Origem)
  const sources = ['plataforma', 'instagram', 'indicacao', 'google', 'balcao'];
  const sourceStats = sources.map(src => {
    const sourceLeads = leads.filter(l => (l.source || 'plataforma') === src);
    const sourceConverted = sourceLeads.filter(l => l.status === 'convertido').length;
    const rate = sourceLeads.length > 0 ? (sourceConverted / sourceLeads.length) * 100 : 0;
    return {
      source: src,
      total: sourceLeads.length,
      converted: sourceConverted,
      rate
    };
  }).filter(s => s.total > 0).sort((a, b) => b.rate - a.rate);

  // Formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER DO DASHBOARD */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Analytics Pro
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Inteligência de Vendas e Desempenho da Loja de Móveis Planejados
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total de Vendas (Geral)</div>
          <div className="text-3xl font-black text-emerald-400">{formatCurrency(totalSalesValue)}</div>
        </div>
      </div>

      {/* CARDS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card: Pipeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-blue-500 mr-2 mt-2" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dinheiro na Mesa (Pipeline)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(pipelineValue)}</div>
          </div>
          <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 self-start px-2 py-1 rounded-md border border-slate-100">
            {pipelineLeads.length} leads em negociação
          </div>
        </div>

        {/* Card: Ticket Médio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:border-purple-300 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-purple-500 mr-2 mt-2" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Médio de Venda</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(averageTicket)}</div>
          </div>
          <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 self-start px-2 py-1 rounded-md border border-purple-100">
            Baseado em {orders.length} pedidos pagos
          </div>
        </div>

        {/* Card: ERP Operação */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mr-2 mt-2" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retido em Produção (ERP)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(erpVolume)}</div>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 self-start px-2 py-1 rounded-md border border-emerald-100">
            {activeOrders.length} pedidos em andamento
          </div>
        </div>

        {/* Card: Comparativo Mensal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-amber-500 mr-2 mt-2" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendas (Mês Atual vs Ant)</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(salesThisMonth)}</div>
          </div>
          <div className={`text-[11px] font-bold self-start px-2 py-1 rounded-md border flex items-center gap-1 ${
            salesGrowth >= 0 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
              : 'text-red-700 bg-red-50 border-red-100'
          }`}>
            {salesGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {salesGrowth > 0 ? '+' : ''}{salesGrowth.toFixed(1)}% vs Mês Passado
          </div>
        </div>

      </div>

      {/* SEGUNDA LINHA: GRÁFICOS / TABELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Desempenho por Canal */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-800">Desempenho por Origem (Canal)</h3>
          </div>
          
          <div className="space-y-5">
            {sourceStats.map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 uppercase tracking-wide">
                    {stat.source === 'plataforma' ? '🏆 Plataforma PlanejaFácil' : stat.source}
                  </span>
                  <span className="text-slate-900">{stat.rate.toFixed(1)}% Conversão</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                  <div 
                    className={`h-2.5 rounded-full ${
                      stat.source === 'plataforma' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} 
                    style={{ width: `${stat.rate}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold text-right">
                  {stat.converted} vendas de {stat.total} leads
                </div>
              </div>
            ))}
            {sourceStats.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-400 italic">
                Nenhum lead com origem identificada.
              </div>
            )}
          </div>
        </div>

        {/* Mês Passado Breakdown detalhado */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-800">Resumo: Mês Atual vs Anterior</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês Atual (Até agora)</div>
                <div className="text-xl font-black text-slate-800">{formatCurrency(salesThisMonth)}</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">{ordersThisMonth.length} contratos assinados</div>
              </div>
              <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">{currentMonth + 1}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mês Anterior (Fechado)</div>
                <div className="text-xl font-black text-slate-800">{formatCurrency(salesLastMonth)}</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">{ordersLastMonth.length} contratos assinados</div>
              </div>
              <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-slate-400">{lastMonth + 1}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
