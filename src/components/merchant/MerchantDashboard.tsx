import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  MessageSquare, 
  Phone, 
  Search, 
  Sparkles, 
  Store, 
  UserCheck, 
  Users 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Lead, LeadStatus } from '../../types';
import { LeadDetailDrawer } from './LeadDetailDrawer';

export const MerchantDashboard: React.FC = () => {
  const { leads, setSelectedLeadForDetail, stores } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos');

  // Simulated current store context (e.g. Dell Anno Jardins)
  const currentStore = stores[0];

  // Filter leads assigned to this partner store (or all mock leads for demo purposes)
  const storeLeads = leads;

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
      `"${l.finishPattern}"`,
      l.estimatedMin,
      l.estimatedMax,
      l.status,
      new Date(l.createdAt).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_lojista_${new Date().toISOString().slice(0, 10)}.csv`);
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
        return <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-blue-50 text-brand-700 border border-brand-200">● Novo</span>;
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
    <div className="min-h-screen bg-surface-bg p-4 sm:p-8 space-y-8">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-blue-glow shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Loja Parceira Credenciada
              </span>
              <span className="text-xs text-slate-400">Plano Diamond</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{currentStore.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Região: {currentStore.regionServed}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 text-xs">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <div className="font-bold text-white">Encaminhamento Prioritário</div>
            <div className="text-slate-400">Recebimento automático via WhatsApp</div>
          </div>
        </div>
      </div>

      {/* KPI Cards Requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Novos Leads */}
        <div
          onClick={() => setActiveTab('novo')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-card-hover transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Novos Leads</span>
            <div className="p-2 bg-blue-50 text-brand-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{novoleadsCount} novos</div>
          <div className="text-xs text-brand-600 font-bold">Aguardando 1º contato</div>
        </div>

        {/* Card 2: Em Atendimento */}
        <div
          onClick={() => setActiveTab('em_atendimento')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-card-hover transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Em Atendimento</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{emAtendimentoCount} em contato</div>
          <div className="text-xs text-amber-600 font-bold">Projetos em elaboration 3D</div>
        </div>

        {/* Card 3: Orçados */}
        <div
          onClick={() => setActiveTab('orcado')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-card-hover transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Orçados</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{orcadosCount} propostas</div>
          <div className="text-xs text-purple-600 font-bold">Aguardando fechamento</div>
        </div>

        {/* Card 4: Convertidos */}
        <div
          onClick={() => setActiveTab('convertido')}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-card-hover transition-all space-y-3"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Convertidos</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{convertidosCount} fechados</div>
          <div className="text-xs text-emerald-600 font-bold">Vendas realizadas</div>
        </div>

      </div>

      {/* Main Opportunities Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        
        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, ambiente ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center space-x-1.5 transition-colors"
              title="Exportar dados da loja em CSV"
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
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
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Cidade / UF</th>
                <th className="py-4 px-6">Ambiente</th>
                <th className="py-4 px-6">Valor Estimado</th>
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLeads.map((lead) => {
                const whatsappMessage = encodeURIComponent(
                  `Olá ${lead.name}! Sou especialista da loja parceira. Vi sua solicitação para a ${lead.environment} no Planeja Fácil. Podemos conversar?`
                );
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div>{lead.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{lead.phone}</div>
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap font-semibold">
                      {lead.city} - <strong className="text-slate-900">{lead.state}</strong>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900">{lead.environment}</span>
                      {lead.dimensions && <div className="text-[10px] text-slate-400">{lead.dimensions.areaM2.toFixed(1)} m²</div>}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap font-bold text-emerald-600">
                      {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap">
                      {getStatusBadge(lead.status)}
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/${lead.whatsapp}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center space-x-1.5 border border-emerald-200 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Visualizar Projeto Button */}
                      <button
                        onClick={() => setSelectedLeadForDetail(lead)}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs inline-flex items-center space-x-1.5 border border-brand-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar Projeto</span>
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Drawer */}
      <LeadDetailDrawer />

    </div>
  );
};
