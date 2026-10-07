import React from 'react';
import { 
  ArrowUpRight, 
  BarChart3, 
  DollarSign, 
  LayoutDashboard, 
  MapPin, 
  Percent, 
  Settings, 
  Store, 
  Users, 
  Zap 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminTab } from '../../types';
import { BrazilMap } from './BrazilMap';
import { FinancialView } from './FinancialView';
import { LeadsTable } from './LeadsTable';
import { SettingsView } from './SettingsView';
import { StoresManager } from './StoresManager';

export const AdminDashboard: React.FC = () => {
  const { adminTab, setAdminTab, stores, leads } = useApp();

  const menuItems: { id: AdminTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'stores', label: 'Lojas Parceiras', icon: Store },
    { id: 'regions', label: 'Mapa de Regiões', icon: MapPin },
    { id: 'financial', label: 'Financeiro SaaS', icon: DollarSign },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const totalLeadsCount = leads.length;
  const activeStoresCount = stores.filter((s) => s.status === 'Ativa').length;
  const totalMRR = stores.reduce((acc, s) => acc + (s.monthlyRevenue || (s.plan === 'Pro' ? 219.90 : 119.90)), 0);
  const avgTicket = leads.length > 0 
    ? Math.round(leads.reduce((acc, l) => acc + ((l.estimatedMin + l.estimatedMax) / 2), 0) / leads.length)
    : 28400;

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div className="space-y-8">
          
          {/* Official Brand Logo in Sidebar */}
          <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-2xl border border-white/10">
            <img 
              src="/logo.png" 
              alt="PlanejaFácil Admin" 
              className="h-9 w-auto object-contain brightness-0 invert"
            />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-blue-glow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="font-semibold text-slate-300">Painel Geral Administrador</div>
          <div>PlanejaFácil SaaS Platform</div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-10 space-y-8 overflow-y-auto">
        
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Painel Administrativo</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              {adminTab === 'dashboard' && 'Visão Geral do Ecossistema'}
              {adminTab === 'leads' && 'Gestão de Leads & Oportunidades'}
              {adminTab === 'stores' && 'Rede de Lojas Credenciadas'}
              {adminTab === 'regions' && 'Distribuição Geográfica no Brasil'}
              {adminTab === 'financial' && 'Métricas Financeiras SaaS (MRR & ARR)'}
              {adminTab === 'settings' && 'Configurações do Sistema'}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistema Operacional</span>
            </span>
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {adminTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* 6 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Leads</span>
                  <div className="p-2 bg-blue-50 text-brand-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{totalLeadsCount} leads</div>
                <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Cadastrados no sistema</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Lojas Credenciadas</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{stores.length} unidades</div>
                <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600">
                  <span>Rede Smarth House</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Lojas Ativas</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{activeStoresCount} ativas</div>
                <div className="text-xs text-slate-500 font-medium">Recebendo orçamentos</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio Estimado</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">{formatCurrency(avgTicket)}</div>
                <div className="text-xs text-slate-500 font-medium">Por projeto simulação</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Taxa de Conversão</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900">25.0%</div>
                <div className="text-xs text-emerald-600 font-bold">Vendas vs Leads</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Receita Mensal (MRR)</span>
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-brand-600">{formatCurrency(totalMRR)}</div>
                <div className="text-xs text-slate-500 font-medium">Planos de assinaturas das lojas</div>
              </div>

            </div>

            {/* Interactive Brazil Map Component */}
            <BrazilMap />

            {/* Leads Table Preview */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Últimos Leads Cadastrados</h3>
                <button
                  onClick={() => setAdminTab('leads')}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700"
                >
                  Ver Todos os Leads &rarr;
                </button>
              </div>
              <LeadsTable />
            </div>

          </div>
        )}

        {/* LEADS TAB */}
        {adminTab === 'leads' && <LeadsTable />}

        {/* STORES TAB */}
        {adminTab === 'stores' && <StoresManager />}

        {/* REGIONS TAB */}
        {adminTab === 'regions' && <BrazilMap />}

        {/* FINANCIAL TAB */}
        {adminTab === 'financial' && <FinancialView />}

        {/* SETTINGS TAB */}
        {adminTab === 'settings' && <SettingsView />}

      </main>

    </div>
  );
};
