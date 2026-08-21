import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  MessageSquare, 
  Search, 
  Store as StoreIcon, 
  UserCheck, 
  Users,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus, Store } from '../../types';
import { LeadDetailDrawer } from './LeadDetailDrawer';

export const MerchantDashboard: React.FC = () => {
  const { leads, setSelectedLeadForDetail, stores } = useApp();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'store-mogi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos');

  // Currently selected partner store unit
  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // Filter leads assigned to this unit (or matches store city/state for demonstration)
  const storeLeads = leads.filter(
    (l) => l.assignedStoreId === currentStore.id || l.city.toLowerCase().includes(currentStore.city.toLowerCase()) || leads.length <= 6
  );

  const novoleadsCount = storeLeads.filter((l) => l.status === 'novo').length;
  const emAtendimentoCount = storeLeads.filter((l) => l.status === 'em_atendimento').length;
  const orcadosCount = storeLeads.filter((l) => l.status === 'orcado').length;
  const convertidosCount = storeLeads.filter((l) => l.status === 'convertido').length;

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

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'novo':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-blue-50 text-emerald-700 border border-emerald-200">● Novo</span>;
      case 'em_atendimento':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-amber-50 text-amber-700 border border-amber-200">● Em Atendimento</span>;
      case 'orcado':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-purple-50 text-purple-700 border border-purple-200">● Orçado</span>;
      case 'convertido':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">● Venda Realizada</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-slate-100 text-slate-600">Pendente</span>;
    }
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div
          onClick={() => setActiveTab('novo')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-600 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Novos Leads</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{novoleadsCount} novos</div>
          <div className="text-xs text-slate-500 font-medium">Aguardando 1º contato</div>
        </div>

        <div
          onClick={() => setActiveTab('em_atendimento')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-600 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Em Atendimento</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{emAtendimentoCount} em contato</div>
          <div className="text-xs text-slate-500 font-medium">Elaboração de projeto 3D</div>
        </div>

        <div
          onClick={() => setActiveTab('orcado')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-600 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Orçados</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{orcadosCount} propostas</div>
          <div className="text-xs text-slate-500 font-medium">Aguardando fechamento</div>
        </div>

        <div
          onClick={() => setActiveTab('convertido')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-600 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Vendas Realizadas</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{convertidosCount} fechados</div>
          <div className="text-xs text-slate-500 font-medium">Contratos assinados</div>
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
                <th className="py-3.5 px-5">Cliente</th>
                <th className="py-3.5 px-5">Cidade / UF</th>
                <th className="py-3.5 px-5">Ambientes do Projeto</th>
                <th className="py-3.5 px-5">Valor Estimado</th>
                <th className="py-3.5 px-5">Data</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLeads.map((lead) => {
                const whatsappMessage = encodeURIComponent(
                  `Olá ${lead.name}! Sou consultor da ${currentStore.name}. Recebi sua solicitação de orçamento no PlanejaFácil para: ${lead.environment}. Podemos agendar uma apresentação do projeto 3D?`
                );
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="py-4 px-5 font-bold text-slate-900">
                      <div>{lead.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{lead.phone}</div>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap font-semibold">
                      {lead.city} - <strong className="text-slate-900">{lead.state}</strong>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900 max-w-xs block truncate">{lead.environment}</span>
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap font-extrabold text-emerald-600">
                      {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      {getStatusBadge(lead.status)}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap space-x-2">
                      <a
                        href={`https://wa.me/${lead.whatsapp}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1.5 border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => setSelectedLeadForDetail(lead)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center space-x-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Projeto</span>
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Drawer Details */}
      <LeadDetailDrawer />

    </div>
  );
};
