import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  Search, 
  Store as StoreIcon, 
  UserCheck, 
  Users,
  ChevronDown,
  Calendar,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus, Store } from '../../types';
import { LeadDetailDrawer } from './LeadDetailDrawer';

export const MerchantDashboard: React.FC = () => {
  const { leads, setSelectedLeadForDetail, stores, updateLeadStatus } = useApp();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'store-mogi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos');

  // Currently selected partner store unit
  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // Filter leads assigned to this unit
  const storeLeads = leads.filter(
    (l) => l.assignedStoreId === currentStore.id || l.city.toLowerCase().includes(currentStore.city.toLowerCase()) || leads.length <= 6
  );

  // Time-based calculations for store overview
  const totalLeadsCount = storeLeads.length;
  
  const now = new Date();
  const leadsThisMonth = storeLeads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const leadsThisWeek = storeLeads.filter((l) => {
    const d = new Date(l.createdAt);
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  }).length;

  const convertidosCount = storeLeads.filter((l) => l.status === 'convertido').length;
  const conversionRate = totalLeadsCount > 0 ? ((convertidosCount / totalLeadsCount) * 100).toFixed(1) : '0.0';

  const filteredLeads = storeLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.environment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = activeTab === 'todos' || lead.status === activeTab;

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Cliente', 'Email', 'Telefone', 'Cidade', 'Estado', 'Ambiente', 'Acabamento', 'Min Estimado (R$)', 'Max Estimado (R$)', 'Status', 'Data'];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${l.name}"`,
      `"${l.email}"`,
      `"${l.phone}"`,
      `"${l.city}"`,
      `"${l.state}"`,
      `"${l.environment}"`,
      `"${l.finishPattern || ''}"`,
      l.estimatedMin,
      l.estimatedMax,
      l.status,
      new Date(l.createdAt).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_${currentStore.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 space-y-8 font-sans">
      
      {/* Top Header Card with Interactive Unit Selector (Modo Teste) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Painel do Lojista Parceiro</div>
            <h1 className="text-2xl font-extrabold text-white">{currentStore.name}</h1>
            <p className="text-xs text-emerald-400 mt-0.5 font-medium">{currentStore.regionServed} • Cidade: {currentStore.city}</p>
          </div>
        </div>

        {/* Interactive Store Unit Switcher */}
        <div className="space-y-1 w-full md:w-auto">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Alternar Unidade da Smarth House (Modo Teste):
          </label>
          
          <div className="relative">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full md:w-72 appearance-none bg-slate-800 border border-slate-700 text-white text-xs font-bold py-2.5 px-3.5 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id} className="bg-slate-900 text-white py-1">
                  {store.name} ({store.city})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Complete Metric Cards Requested by User */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total de Leads */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Leads</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalLeadsCount} leads</div>
          <div className="text-xs text-slate-500 font-medium">Acumulado total da unidade</div>
        </div>

        {/* Leads Este Mês */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Leads Este Mês</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{leadsThisMonth} novos este mês</div>
          <div className="text-xs text-emerald-700 font-bold">● Mês vigente</div>
        </div>

        {/* Leads Esta Semana */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Leads Esta Semana</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{leadsThisWeek} nesta semana</div>
          <div className="text-xs text-amber-700 font-bold">Últimos 7 dias</div>
        </div>

        {/* Vendas & Conversão */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Vendas & Conversão</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{convertidosCount} fechados</div>
          <div className="text-xs text-emerald-700 font-bold">Taxa de conversão: {conversionRate}%</div>
        </div>

      </div>

      {/* Main Opportunities Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, ambiente ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {[
              { id: 'todos', label: 'Todos' },
              { id: 'novo', label: 'Novos' },
              { id: 'em_atendimento', label: 'Em Atendimento' },
              { id: 'orcado', label: 'Orçados' },
              { id: 'convertido', label: 'Vendas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5">Cliente & Contato</th>
                <th className="py-3.5 px-5">Cidade / UF</th>
                <th className="py-3.5 px-5">Ambientes do Projeto</th>
                <th className="py-3.5 px-5">Valor Estimado</th>
                <th className="py-3.5 px-5">Data</th>
                <th className="py-3.5 px-5">Alterar Status Manualmente</th>
                <th className="py-3.5 px-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  <td className="py-4 px-5 font-bold text-slate-900">
                    <div>{lead.name}</div>
                    <div className="text-[11px] text-slate-500 font-normal">{lead.phone} • {lead.email}</div>
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap font-semibold">
                    {lead.city} - <strong className="text-slate-900">{lead.state}</strong>
                  </td>

                  <td className="py-4 px-5">
                    <span className="font-bold text-slate-900 max-w-xs block truncate">{lead.environment}</span>
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap font-extrabold text-emerald-700">
                    {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </td>

                  {/* Manual Inline Status Switcher Dropdown */}
                  <td className="py-4 px-5 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border outline-none cursor-pointer transition-colors ${
                        lead.status === 'novo'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : lead.status === 'em_atendimento'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : lead.status === 'orcado'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : lead.status === 'convertido'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="novo">● Novo Lead</option>
                      <option value="em_atendimento">● Em Atendimento</option>
                      <option value="orcado">● Orçado</option>
                      <option value="convertido">● Venda Realizada</option>
                      <option value="perdido">● Perdido</option>
                    </select>
                  </td>

                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLeadForDetail(lead)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Projeto</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Drawer Details */}
      <LeadDetailDrawer />

    </div>
  );
};
