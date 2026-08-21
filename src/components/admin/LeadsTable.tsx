import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Eye, 
  Filter, 
  Search, 
  SlidersHorizontal 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Lead, LeadStatus } from '../../types';

export const LeadsTable: React.FC = () => {
  const { leads, setSelectedLeadForDetail } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.environment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.assignedStoreName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Cliente', 'Email', 'Telefone', 'Cidade', 'Estado', 'Ambiente', 'Acabamento', 'Min Estimado (R$)', 'Max Estimado (R$)', 'Loja Responsável', 'Status', 'Data'];
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
      `"${l.assignedStoreName}"`,
      l.status,
      new Date(l.createdAt).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_planejafacil_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'novo':
        return <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-blue-50 text-brand-700 border border-brand-200">Novo</span>;
      case 'em_atendimento':
        return <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-amber-50 text-amber-700 border border-amber-200">Em Atendimento</span>;
      case 'orcado':
        return <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-purple-50 text-purple-700 border border-purple-200">Orçado</span>;
      case 'convertido':
        return <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Venda Realizada</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-extrabold uppercase rounded-full bg-slate-100 text-slate-600">Pendente</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      
      {/* Filters Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por cliente, cidade, ambiente ou loja..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        {/* Status Filter & CSV Export buttons */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center space-x-1.5 transition-colors"
            title="Exportar dados filtrados em planilha CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:block" />
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'novo', label: 'Novos' },
            { id: 'em_atendimento', label: 'Em Atendimento' },
            { id: 'orcado', label: 'Orçados' },
            { id: 'convertido', label: 'Convertidos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
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
            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-4 px-6">Cliente</th>
              <th className="py-4 px-6">Cidade / UF</th>
              <th className="py-4 px-6">Ambiente</th>
              <th className="py-4 px-6">Valor Estimado</th>
              <th className="py-4 px-6">Loja Responsável</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                  Nenhum lead encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Cliente */}
                  <td className="py-4 px-6 font-bold text-slate-900">
                    <div>{lead.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{lead.email}</div>
                  </td>

                  {/* Cidade / UF */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {lead.city} - <strong className="text-slate-900">{lead.state}</strong>
                  </td>

                  {/* Ambiente */}
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-900">{lead.environment}</span>
                    <div className="text-[10px] text-slate-400">{lead.finishPattern}</div>
                  </td>

                  {/* Valor Estimado */}
                  <td className="py-4 px-6 whitespace-nowrap font-bold text-brand-600">
                    {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                  </td>

                  {/* Loja Responsável */}
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {lead.assignedStoreName}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLeadForDetail(lead)}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs inline-flex items-center space-x-1.5 transition-colors border border-brand-200/60"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
        <div>
          Mostrando {paginatedLeads.length} de {filteredLeads.length} registros
        </div>

        <div className="flex items-center space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
