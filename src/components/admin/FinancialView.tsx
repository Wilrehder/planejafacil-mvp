import React from 'react';
import { ArrowUpRight, DollarSign, Layers, PieChart, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FinancialView: React.FC = () => {
  const { stores } = useApp();

  const plansComparison = [
    {
      name: 'Plano Gold',
      price: 'R$ 890 / mês',
      storesCount: 42,
      mrr: 37380,
      features: ['Até 30 leads/mês', 'Região exclusiva', 'Suporte standard'],
    },
    {
      name: 'Plano Platinum',
      price: 'R$ 1.490 / mês',
      storesCount: 78,
      mrr: 116220,
      features: ['Até 80 leads/mês', 'Região ampliada', 'Notificações no WhatsApp', 'Atendimento prioritário'],
      highlight: true,
    },
    {
      name: 'Plano Diamond',
      price: 'R$ 2.490 / mês',
      storesCount: 36,
      mrr: 89640,
      features: ['Leads ilimitados', 'Múltiplas filiais', 'Integração CRM via Webhook', 'Gerente de conta exclusivo'],
    },
  ];

  const totalMrr = plansComparison.reduce((acc, p) => acc + p.mrr, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-8">
      
      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Recorrente (MRR)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalMrr)}</div>
          <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% em relação ao mês anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Anualizada (ARR)</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalMrr * 12)}</div>
          <div className="text-xs text-slate-400 font-medium">Contratos recorrentes ativos</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Lojas Ativas Pagantes</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">156 lojas</div>
          <div className="text-xs text-emerald-600 font-bold">Churn Rate: 0.8% (Baixíssimo)</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio / Loja</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalMrr / 156)}</div>
          <div className="text-xs text-slate-400 font-medium">Média por mensalidade</div>
        </div>

      </div>

      {/* Plan Comparisons */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Desempenho por Plano SaaS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansComparison.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-3xl p-6 border shadow-sm space-y-5 relative ${
                plan.highlight ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'
              }`}
            >
              {plan.highlight && (
                <span className="absolute top-4 right-4 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Mais Rentável
                </span>
              )}
              <div>
                <h4 className="font-extrabold text-slate-900 text-xl">{plan.name}</h4>
                <div className="text-2xl font-black text-brand-600 mt-1">{plan.price}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lojas Inscritas:</span>
                  <span className="font-bold text-slate-900">{plan.storesCount} assinantes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Faturamento Mensal:</span>
                  <span className="font-extrabold text-emerald-600">{formatCurrency(plan.mrr)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recursos</span>
                {plan.features.map((feat) => (
                  <div key={feat} className="text-xs font-semibold text-slate-700 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
