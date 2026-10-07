import React from 'react';
import { 
  DollarSign, 
  MapPin, 
  Store, 
  Radar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminTab } from '../../types';
import { FinancialView } from './FinancialView';
import { LeadsTable } from './LeadsTable';
import { StoresManager } from './StoresManager';
import { AdminRoutingQueue } from './AdminRoutingQueue';

export const AdminDashboard: React.FC = () => {
  const { adminTab, setAdminTab } = useApp();

  const menuItems: { id: AdminTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'routing', label: 'Fila de Distribuição', icon: MapPin },
    { id: 'stores', label: 'Lojas Parceiras', icon: Store },
    { id: 'radar', label: 'Leads Recebidos', icon: Radar },
  ];

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div className="space-y-8">
          
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-blue-glow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="font-semibold text-slate-300">Central do SaaS</div>
          <div>PlanejaFácil Motor de Distribuição</div>
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-10 space-y-8 overflow-y-auto">
        
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Controle de Operações</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              {adminTab === 'finance' && 'Financeiro'}
              {adminTab === 'routing' && 'Fila de Distribuição de Leads'}
              {adminTab === 'stores' && 'Gestão de Lojas Parceiras'}
              {adminTab === 'radar' && 'Auditoria de Leads'}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Distribuição Ativa</span>
            </span>
          </div>
        </div>

        {/* FINANCIAL TAB */}
        {adminTab === 'finance' && <FinancialView />}

        {/* ROUTING TAB */}
        {adminTab === 'routing' && <AdminRoutingQueue />}

        {/* STORES TAB */}
        {adminTab === 'stores' && <StoresManager />}

        {/* RADAR TAB */}
        {adminTab === 'radar' && <LeadsTable />}

      </main>

    </div>
  );
};
