import React from 'react';
import { DollarSign, PieChart, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STORE_PLANS } from '../../data/mockData';

export const FinancialView: React.FC = () => {
  const { stores } = useApp();

  const totalMrr = stores.reduce(
    (acc, s) => acc + (s.monthlyRevenue || (s.plan === 'Pro' ? 219.90 : 119.90)),
    0
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const activeCount = stores.filter((s) => s.status === 'Ativa').length;
  const avgTicket = activeCount > 0 ? totalMrr / activeCount : 0;

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Recorrente (MRR)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalMrr)}</div>
          <div className="text-xs text-emerald-700 font-bold">● Assinaturas das Lojas Smarth House</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Anualizada (ARR)</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalMrr * 12)}</div>
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
          <div className="text-xs text-emerald-700 font-bold">100% de adimplência</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Pay-Per-Lead</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(stores.reduce((acc, s) => acc + (s.leadsCount || 0), 0) * 50)}</div>
          <div className="text-xs text-slate-500 font-medium">Faturamento sobre leads gerados</div>
        </div>

      </div>

      {/* Plan Comparisons */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Desempenho dos Planos SaaS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STORE_PLANS.map((plan) => {
            const countOnPlan = stores.filter((s) => s.plan === plan.id).length;
            const planRevenue = countOnPlan * plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 relative"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xl">{plan.title}</h4>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">R$ {plan.priceMonthly} /mês</div>
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

    </div>
  );
};
