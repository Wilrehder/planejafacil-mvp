import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Eye, 
  Search, 
  Store as StoreIcon, 
  ChevronDown,
  Calendar,
  Plus,
  Kanban,
  Table as TableIcon,
  MessageCircle,
  Sparkles,
  Lock,
  X,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus } from '../../types';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { MerchantERP } from './MerchantERP';
import { MerchantAnalytics } from './MerchantAnalytics';
import { OrderFolderModal } from './OrderFolderModal';
import { Wrench, Activity } from 'lucide-react';

export const MerchantDashboard: React.FC = () => {
  const { 
    leads, 
    setSelectedLeadForDetail, 
    stores, 
    updateLeadStatus, 
    addLead,
    merchantTab,
    setMerchantTab,
    selectedOrderForFolder,
    setSelectedOrderForFolder
  } = useApp();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'store-mogi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'analytics'>('table');
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'plataforma' | 'externo'>('todos');

  // Modal States
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: 'SP',
    environment: 'Cozinha & Dormitório',
    source: 'instagram' as 'instagram' | 'google' | 'indicacao' | 'balcao',
    estimatedMin: 15000,
    estimatedMax: 22000,
  });

  // Currently selected partner store unit
  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // State override for test mode plan toggle
  const [simulatedPlanOverride, setSimulatedPlanOverride] = useState<'Basic' | 'Pro' | null>(null);
  const activePlan = simulatedPlanOverride || currentStore.plan;
  const isProPlan = activePlan === 'Pro';

  // Filter leads assigned to this unit
  const storeLeads = leads.filter(
    (l) => l.assignedStoreId === currentStore.id || l.city.toLowerCase().includes(currentStore.city.toLowerCase()) || leads.length <= 6
  );

  // Time and Financial calculations
  const platformLeadsCount = storeLeads.filter(l => !l.isExternal && l.source !== 'instagram' && l.source !== 'google' && l.source !== 'indicacao' && l.source !== 'balcao').length;
  const payPerLeadCostTotal = platformLeadsCount * 50;

  const now = new Date();
  const leadsThisMonthCount = storeLeads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const convertidosCount = storeLeads.filter((l) => l.status === 'convertido').length;

  // Filtered Leads based on search, status and source
  const filteredLeads = storeLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.environment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = activeStatusTab === 'todos' || lead.status === activeStatusTab;

    const isExt = lead.isExternal || lead.source === 'instagram' || lead.source === 'google' || lead.source === 'indicacao' || lead.source === 'balcao';
    const matchesSource = sourceFilter === 'todos' || (sourceFilter === 'plataforma' && !isExt) || (sourceFilter === 'externo' && isExt);

    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleOpenAddLead = () => {
    if (!isProPlan) {
      setIsUpgradeModalOpen(true);
    } else {
      setIsAddLeadModalOpen(true);
    }
  };

  const handleCreateExternalLead = (e: React.FormEvent) => {
    e.preventDefault();
    addLead({
      name: newLeadForm.name,
      phone: newLeadForm.phone,
      whatsapp: newLeadForm.phone,
      email: newLeadForm.email || 'cliente@externo.com',
      city: newLeadForm.city || currentStore.city,
      state: newLeadForm.state,
      cep: '00000-000',
      environment: newLeadForm.environment,
      estimatedMin: Number(newLeadForm.estimatedMin),
      estimatedMax: Number(newLeadForm.estimatedMax),
      assignedStoreId: currentStore.id,
      assignedStoreName: currentStore.name,
      status: 'novo',
      source: newLeadForm.source,
      isExternal: true,
    });
    setIsAddLeadModalOpen(false);
    setNewLeadForm({
      name: '',
      phone: '',
      email: '',
      city: '',
      state: 'SP',
      environment: 'Cozinha & Dormitório',
      source: 'instagram',
      estimatedMin: 15000,
      estimatedMax: 22000,
    });
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Cliente', 'Telefone', 'Cidade', 'Ambiente', 'Origem', 'Min Estimado (R$)', 'Max Estimado (R$)', 'Status', 'Data'];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.city}"`,
      `"${l.environment}"`,
      `"${l.source || 'Plataforma'}"`,
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

  const openWhatsApp = (phone: string, clientName: string, envName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`Olá ${clientName}, tudo bem? Sou da loja ${currentStore.name}. Vi sua simulação de móveis para ${envName} e gostaria de apresentar uma condição especial para o seu projeto!`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const KANBAN_STAGES: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'novo', label: 'Novos Leads', color: 'border-blue-500 bg-blue-50/50' },
    { id: 'em_atendimento', label: 'Em Atendimento', color: 'border-amber-500 bg-amber-50/50' },
    { id: 'orcado', label: 'Orçados', color: 'border-purple-500 bg-purple-50/50' },
    { id: 'convertido', label: 'Vendas Fechadas', color: 'border-emerald-500 bg-emerald-50/50' },
    { id: 'perdido', label: 'Perdidos', color: 'border-slate-300 bg-slate-100/50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 space-y-6 font-sans">
      


      {/* SELETOR PRINCIPAL DE MÓDULO: CRM vs ERP e Controles Globais */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto">
          <button
            onClick={() => setMerchantTab('dashboard')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              merchantTab !== 'erp'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Kanban className="w-4 h-4 text-blue-400" />
            CRM — Gestão de Leads
          </button>
          <button
            onClick={() => setMerchantTab('erp')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              merchantTab === 'erp'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Wrench className="w-4 h-4 text-emerald-400" />
            ERP — Pós-Venda & Pedidos Operacionais
            {isProPlan && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">
                Pro ⭐
              </span>
            )}
          </button>
        </div>

        {/* Action Controls & Plan Toggle (Modo Teste) */}
        <div className="flex flex-wrap items-center gap-3 pr-2 shrink-0">
          
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 px-2 hidden sm:inline">Simular Plano:</span>
            <button
              onClick={() => {
                setSimulatedPlanOverride('Basic');
                setViewMode('table');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                !isProPlan 
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Básico
            </button>
            <button
              onClick={() => {
                setSimulatedPlanOverride('Pro');
                setViewMode('kanban');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                isProPlan 
                  ? 'bg-[#439346] text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pro ⭐
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3.5 pr-8 rounded-xl focus:outline-none focus:border-[#439346] cursor-pointer"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id} className="bg-white text-slate-800 py-1">
                  {store.name} ({store.plan})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

        </div>

      </div>

      {merchantTab === 'erp' ? (
        <MerchantERP merchantPlan={activePlan} />
      ) : (
        <div className="space-y-6">
      {/* Cards Minimalistas de Desempenho e Faturamento de Performance (Pay-Per-Lead) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leads Recebidos no Mês</div>
            <div className="text-2xl font-black text-[#1B2B48] mt-1">{leadsThisMonthCount} clientes</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">● Mês vigente</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consumo Performance (Pay-Per-Lead)</div>
            <div className="text-2xl font-black text-[#439346] mt-1">{formatCurrency(payPerLeadCostTotal)}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{platformLeadsCount} leads x R$ 50,00</div>
          </div>
          <div className="p-3 bg-emerald-50 text-[#439346] rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendas Fechadas</div>
            <div className="text-2xl font-black text-[#1B2B48] mt-1">{convertidosCount} contratos</div>
            <div className="text-xs text-emerald-700 font-bold mt-0.5">● CRM Ativo</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main CRM Toolbar & Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, telefone ou ambiente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#439346]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          {/* Controls & Mode Selector */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={handleOpenAddLead}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 transition-all shadow-sm ${
                isProPlan 
                  ? 'bg-[#439346] hover:bg-[#387F3B] text-white' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
              title={isProPlan ? "Cadastrar novo lead" : "Recurso do Plano Pro"}
            >
              {isProPlan ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <span>+ Novo Lead Externo</span>
            </button>

            {/* View Switcher: Table vs Kanban (Plano Pro unlock) */}
            {isProPlan ? (
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm flex items-center space-x-1.5 transition-colors ${
                  viewMode === 'analytics' ? 'opacity-50 pointer-events-none' : 'bg-white text-[#1B2B48] border-slate-200 hover:bg-slate-50'
                }`}
                title="Alternar Modo de Visualização"
              >
                {viewMode === 'table' || viewMode === 'analytics' ? (
                  <>
                    <Kanban className="w-3.5 h-3.5 text-[#439346]" />
                    <span>Modo Kanban</span>
                  </>
                ) : (
                  <>
                    <TableIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Modo Tabela</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1"
                title="Desbloquear CRM Kanban no Plano Pro"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Desbloquear Kanban</span>
              </button>
            )}

            {/* Analytics Button (Pro) */}
            {isProPlan && (
              <button
                onClick={() => setViewMode(viewMode === 'analytics' ? 'table' : 'analytics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
                  viewMode === 'analytics' 
                    ? 'bg-slate-900 text-white border-slate-800' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <Activity className={`w-3.5 h-3.5 ${viewMode === 'analytics' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <span>{viewMode === 'analytics' ? 'Voltar ao CRM' : 'Analytics Pro'}</span>
              </button>
            )}

            {/* Source Filter Dropdown (Pro) */}
            {isProPlan && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl border-none focus:outline-none cursor-pointer"
              >
                <option value="todos">Origem: Todos</option>
                <option value="plataforma">Da Plataforma</option>
                <option value="externo">Leads Externos</option>
              </select>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>

          </div>

        </div>

        {viewMode !== 'analytics' && (
          <>
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'novo', label: 'Novos' },
                { id: 'em_atendimento', label: 'Em Atendimento' },
                { id: 'orcado', label: 'Orçados' },
                { id: 'convertido', label: 'Vendas Fechadas' },
                { id: 'perdido', label: 'Perdidos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatusTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeStatusTab === tab.id
                      ? 'bg-[#1B2B48] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VISÃO 3: ANALYTICS PRO */}
        {/* ========================================================================= */}
        {viewMode === 'analytics' && (
          <div className="pt-2">
            <MerchantAnalytics />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISÃO 1: TABELA MINIMALISTA */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Contato</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Ambiente</th>
                  <th className="py-3 px-4">Estimativa (R$)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLeads.map((lead) => {
                  const isExt = lead.isExternal || lead.source === 'instagram' || lead.source === 'google' || lead.source === 'indicacao' || lead.source === 'balcao';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{lead.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{lead.phone} • {lead.city}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isExt ? 'bg-[#EBF7EC] text-[#439346]' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {lead.source ? lead.source.toUpperCase() : 'PLATAFORMA'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 truncate block max-w-xs">{lead.environment}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-[#439346]">
                        {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer bg-white border-slate-300"
                        >
                          <option value="novo">● Novo Lead</option>
                          <option value="em_atendimento">● Em Atendimento</option>
                          <option value="orcado">● Orçado</option>
                          <option value="convertido">● Venda Fechada</option>
                          <option value="perdido">● Perdido</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => openWhatsApp(lead.phone, lead.name, lead.environment)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#439346] hover:bg-[#387F3B] text-white font-bold text-xs inline-flex items-center space-x-1 transition-colors shadow-sm"
                          title="Chamar no WhatsApp com mensagem pronta"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Whats</span>
                        </button>

                        <button
                          onClick={() => setSelectedLeadForDetail(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1B2B48] hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Projeto</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISÃO 2: QUADRO KANBAN (PLANO PRO) */}
        {/* ========================================================================= */}
        {viewMode === 'kanban' && isProPlan && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 overflow-x-auto min-w-[900px]">
            {KANBAN_STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.status === stage.id);

              return (
                <div key={stage.id} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 space-y-3 flex flex-col justify-start min-h-[450px]">
                  
                  {/* Header Coluna */}
                  <div className={`p-2.5 rounded-xl border-l-4 font-black text-xs text-[#1B2B48] flex justify-between items-center bg-white shadow-sm ${stage.color}`}>
                    <span>{stage.label}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards de Lead na Coluna */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {stageLeads.map((lead) => (
                      <div 
                        key={lead.id} 
                        onClick={() => setSelectedLeadForDetail(lead)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-xs text-[#1B2B48]">{lead.name}</h4>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {lead.source || 'Plataforma'}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-slate-600 line-clamp-1">
                          {lead.environment}
                        </p>

                        <div className="text-xs font-black text-[#439346]">
                          {formatCurrency(lead.estimatedMin)}
                        </div>

                        {/* Fast Select Status in Kanban Card */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => {
                              const targetStatus = e.target.value as LeadStatus;
                              if ((targetStatus === 'orcado' || targetStatus === 'convertido' || targetStatus === 'perdido') && !lead.attachmentName) {
                                setSelectedLeadForDetail(lead);
                                return;
                              }
                              updateLeadStatus(lead.id, targetStatus);
                            }}
                            className="text-[10px] font-bold border border-slate-200 rounded px-1.5 py-1 bg-slate-50 text-slate-700 focus:outline-none"
                          >
                            <option value="novo">Mover: Novo</option>
                            <option value="em_atendimento">Mover: Atendimento</option>
                            <option value="orcado">Mover: Orçado</option>
                            <option value="convertido">Mover: Venda Fechada</option>
                            <option value="perdido">Mover: Perdido</option>
                          </select>

                          <button
                            onClick={() => openWhatsApp(lead.phone, lead.name, lead.environment)}
                            className="p-1 rounded bg-[#439346] text-white hover:bg-[#387F3B]"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRAR LEAD EXTERNO (EXCLUSIVO PLANO PRO) */}
      {/* ========================================================================= */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#1B2B48]">Cadastrar Lead Externo (CRM Pro)</h3>
              <button onClick={() => setIsAddLeadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExternalLead} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">Origem do Lead</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346] bg-white cursor-pointer font-bold"
                  >
                    <option value="instagram">Instagram / Facebook</option>
                    <option value="balcao">Balcão / Presencial</option>
                    <option value="indicacao">Indicação Arquiteto</option>
                    <option value="google">Google Ads / Busca</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase">Ambientes Desejados *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.environment}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, environment: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">Orçamento Mínimo (R$)</label>
                  <input
                    type="number"
                    value={newLeadForm.estimatedMin}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedMin: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">Orçamento Máximo (R$)</label>
                  <input
                    type="number"
                    value={newLeadForm.estimatedMax}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedMax: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-[#439346]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold uppercase tracking-wider transition-all shadow-md"
                >
                  Salvar Lead no CRM
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AVISO DE UPGRADE PLANO PRO */}
      {/* ========================================================================= */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-slate-100">
            
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#1B2B48]">Recurso do Plano Pro</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Sua loja parceira está no <strong>Plano Básico (R$ 119,90/mês)</strong>. A gestão de <strong>Leads Externos</strong> e a visão <strong>Kanban por Funil</strong> estão disponíveis exclusivamente no <strong>Plano Pro (R$ 219,90/mês)</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs font-semibold text-slate-700">
              <div className="font-bold text-[#1B2B48]">Vantagens do Plano Pro:</div>
              <div>✓ Cadastre clientes do Instagram, balcão e indicações</div>
              <div>✓ CRM Kanban completo para acelerar suas vendas</div>
              <div>✓ Filtros avançados por canal de entrada</div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold uppercase text-xs tracking-wider transition-all shadow-md"
              >
                Fazer Upgrade para Plano Pro (R$ 219,90)
              </button>

              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Continuar no Plano Básico
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Drawer Details */}
      <LeadDetailDrawer />

      {/* Modal Pasta do Pedido ERP */}
      {selectedOrderForFolder && (
        <OrderFolderModal
          order={selectedOrderForFolder}
          onClose={() => setSelectedOrderForFolder(null)}
        />
      )}

    </div>
  );
};
