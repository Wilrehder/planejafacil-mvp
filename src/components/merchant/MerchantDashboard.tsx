import React, { useState, useEffect, useRef } from 'react';
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
  DollarSign,
  RefreshCw,
  Armchair
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus, Lead } from '../../types';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { MerchantERP } from './MerchantERP';
import { MerchantAnalytics } from './MerchantAnalytics';
import { OrderFolderModal } from './OrderFolderModal';
import { MerchantFinancialModal } from './MerchantFinancialModal';
import { MerchantMetaIntegration } from './MerchantMetaIntegration';
import { AssemblerMobileView } from './AssemblerMobileView';
import { SignContractModal } from './SignContractModal';
import { StoreContractModal } from '../admin/StoreContractModal';
import { ConventionalFurnitureView } from './ConventionalFurnitureView';
import { MerchantSettingsView } from './MerchantSettingsView';
import { Wrench, Activity, Users, Package, BarChart2, CreditCard, Share2, FileText, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { switchDevelopmentStoreSession } from '../../lib/authService';

const STORE_ID_TO_TENANT_UUID: Record<string, string> = {
  'store-mogi': 'b1010000-0000-0000-0000-000000000001',
  'store-suzano': '202bb2d5-00d4-426b-a72a-aacfe776977a',
  'store-guarulhos': 'b1030000-0000-0000-0000-000000000003',
  'store-sjc': 'b1040000-0000-0000-0000-000000000004',
  'store-arujah': 'b1050000-0000-0000-0000-000000000005',
  'store-sorocaba': 'b1060000-0000-0000-0000-000000000006',
};

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
    setSelectedOrderForFolder,
    currentUser,
    orders,
    refreshStores
  } = useApp();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    currentUser?.tenantId || currentUser?.storeId || stores[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'plataforma' | 'externo'>('todos');
  const [kanbanView, setKanbanView] = useState<'pipeline' | 'resultados'>('pipeline');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal States
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isViewContractModalOpen, setIsViewContractModalOpen] = useState(false);
  const [isSignContractModalOpen, setIsSignContractModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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

  // Sincronizar tenant da loja logada
  useEffect(() => {
    if (currentUser?.tenantId && selectedStoreId !== currentUser.tenantId) {
      setSelectedStoreId(currentUser.tenantId);
    } else if (!selectedStoreId && stores.length > 0) {
      setSelectedStoreId(stores[0].id);
    }
  }, [currentUser?.tenantId, stores]);

  // Loja parceira autenticada (garante isolamento do lojista com base na sua conta)
  const fallbackStore = {
    id: currentUser?.tenantId || '',
    name: currentUser?.fullName || 'Minha Loja Parceira',
    city: 'São Paulo',
    state: 'SP',
    plan: 'Pro' as const,
    regionServed: 'SP',
    leadsCount: 0,
    status: 'Ativa' as const,
    phone: '',
    email: currentUser?.email || '',
  };
  
  // Identifica todas as lojas pertencentes ao mesmo proprietário
  const userEmail = currentUser?.email?.toLowerCase().trim();
  const ownedStores = stores.filter((s) => {
    if (currentUser?.tenantId && s.id === currentUser.tenantId) return true;
    if (userEmail && s.email && s.email.toLowerCase().trim() === userEmail) return true;
    return false;
  });
  const isMultiStoreOwner = ownedStores.length > 1;

  const currentStore = 
    stores.find((s) => s.id === selectedStoreId) ||
    stores.find((s) => (currentUser?.tenantId && s.id === currentUser.tenantId) || (currentUser?.storeId && s.id === currentUser.storeId)) ||
    ownedStores[0] ||
    stores[0] || 
    fallbackStore;

  // Plano real oficial da loja (sem sobreposição manual)
  const activePlan = currentStore.plan;
  const isProPlan = activePlan === 'Pro';

  const isStoreOwner = !currentUser?.role || currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';
  const isStoreAssembler = currentUser?.role === 'store_assembler';

  useEffect(() => {
    if (isStoreOwner && currentStore && currentStore.id && !currentStore.contractSignedAt) {
      setIsSignContractModalOpen(true);
    }
  }, [currentStore?.contractSignedAt, isStoreOwner, currentStore?.id]);

  const [realDbLeads, setRealDbLeads] = useState<Lead[]>([]);
  const [loadingRealLeads, setLoadingRealLeads] = useState<boolean>(false);

  // Autenticação correspondente à loja selecionada para garantir isolamento Multi-Tenant
  const syncStoreAuthAndFetch = async () => {
    const activeTenantId = selectedStoreId === 'all'
      ? 'all'
      : (selectedStoreId || currentUser?.tenantId || currentStore.id);

    if (!activeTenantId) {
      setRealDbLeads([]);
      return;
    }

    setLoadingRealLeads(true);
    setServerError(null);

    try {
      if (!currentUser && selectedStoreId !== 'all') {
        await switchDevelopmentStoreSession(selectedStoreId);
      }

      const res = await supabase.rpc('get_store_leads', {
        p_tenant_id: activeTenantId,
      });

      if (!res.error && res.data && res.data.success && Array.isArray(res.data.leads)) {
        const mapped = res.data.leads.map((l: any) => ({
          ...l,
          assignedStoreId: l.assignedStoreId || activeTenantId,
          assignedStoreName: l.assignedStoreName || currentStore.name,
          environmentsData: l.environmentsData || [],
          notesList: l.notesList || [],
        }));

        // Deduplica leads por assignmentId ou id para prevenir cartões fantasmas ou duplicatas no CRM Kanban
        const seenIds = new Set<string>();
        const uniqueLeads: Lead[] = [];
        for (const l of mapped) {
          const key = l.assignmentId || l.id;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            uniqueLeads.push(l);
          }
        }
        setRealDbLeads(uniqueLeads);
      } else {
        setRealDbLeads([]);
      }
    } catch (err: any) {
      console.warn('Erro ao consultar leads da loja no PostgreSQL:', err);
    } finally {
      setLoadingRealLeads(false);
    }
  };

  useEffect(() => {
    syncStoreAuthAndFetch();
  }, [selectedStoreId, currentUser?.tenantId]);

  const handleStageChange = async (lead: Lead, targetStatus: LeadStatus) => {
    setServerError(null);
    if ((targetStatus === 'orcado' || targetStatus === 'convertido' || targetStatus === 'perdido') && !lead.attachmentName) {
      setServerError(`⚠️ Ação Obrigatória: Para mover para "${targetStatus === 'orcado' ? 'Orçado' : targetStatus}", anexe o projeto ou arquivo do Promob.`);
      setSelectedLeadForDetail(lead);
      return;
    }

    const assignmentId = lead.assignmentId || lead.id;

    // Atualização otimista imediata no Kanban para resposta instantânea na interface
    setRealDbLeads((prev) =>
      prev.map((l) => (l.id === lead.id || (lead.assignmentId && l.assignmentId === lead.assignmentId) ? { ...l, status: targetStatus } : l))
    );

    try {
      const { data, error } = await supabase.rpc('update_lead_stage', {
        p_assignment_id: assignmentId,
        p_new_status: targetStatus,
      });

      if (error || !data?.success) {
        const msg = error?.message || data?.error || 'Erro ao atualizar estágio do lead no servidor.';
        setServerError(msg);
        // Em caso de erro, reverte recarregando os dados oficiais do servidor
        await syncStoreAuthAndFetch();
        return;
      }

      if (targetStatus === 'convertido') {
        await supabase.rpc('convert_lead_to_order', {
          p_assignment_id: assignmentId,
        });
      }

      updateLeadStatus(lead.id, targetStatus);
      await syncStoreAuthAndFetch();
    } catch (err: any) {
      setServerError(err?.message || 'Erro inesperado.');
      await syncStoreAuthAndFetch();
    }
  };

  // Leads reais da loja autenticada no PostgreSQL
  const storeLeads = realDbLeads;

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

    const matchesStatus = viewMode === 'kanban' 
      ? true 
      : (activeStatusTab === 'todos' || lead.status === activeStatusTab);

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

  const handleCreateExternalLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validação estrita de plano no frontend e backend
    if (!isProPlan) {
      setIsAddLeadModalOpen(false);
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_external_lead', {
        p_name: newLeadForm.name,
        p_phone: newLeadForm.phone,
        p_environment: newLeadForm.environment,
        p_source: newLeadForm.source,
        p_city: newLeadForm.city || currentStore.city,
        p_state_uf: newLeadForm.state || 'SP',
        p_estimated_min: Number(newLeadForm.estimatedMin),
        p_estimated_max: Number(newLeadForm.estimatedMax),
        p_email: newLeadForm.email || null,
      });

      if (error || !data?.success) {
        const errMsg = error?.message || data?.error || 'Erro ao cadastrar lead no servidor.';
        setServerError(errMsg);
        if (errMsg.includes('Plano Pro')) {
          setIsAddLeadModalOpen(false);
          setIsUpgradeModalOpen(true);
        }
        return;
      }

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

      await syncStoreAuthAndFetch();
    } catch (err: any) {
      setServerError(err?.message || 'Falha ao conectar com o banco.');
    }
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

  const ACTIVE_PIPELINE_STAGES: { id: LeadStatus; label: string; color: string; badgeColor: string }[] = [
    { id: 'novo', label: 'Novos Leads', color: 'border-blue-500 bg-blue-50/60', badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'em_atendimento', label: 'Em Atendimento', color: 'border-amber-500 bg-amber-50/60', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'orcado', label: 'Orçados', color: 'border-purple-500 bg-purple-50/60', badgeColor: 'bg-purple-100 text-purple-800' },
  ];

  const RESULTS_STAGES: { id: LeadStatus; label: string; color: string; badgeColor: string }[] = [
    { id: 'convertido', label: 'Vendas Fechadas', color: 'border-emerald-500 bg-emerald-50/60', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'perdido', label: 'Perdidos', color: 'border-slate-400 bg-slate-100/60', badgeColor: 'bg-slate-200 text-slate-700' },
  ];

  const currentKanbanStages = kanbanView === 'pipeline' ? ACTIVE_PIPELINE_STAGES : RESULTS_STAGES;

  // SE FOR MONTADOR: Carregar direto a Interface 100% Mobile
  if (isStoreAssembler) {
    return <AssemblerMobileView orders={orders} onRefreshOrders={syncStoreAuthAndFetch} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 space-y-6 font-sans">
      


      {/* SELETOR PRINCIPAL DE MÓDULO: NAVEGAÇÃO REFINADA E PROFISSIONAL */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* NAVEGAÇÃO DOS MÓDULOS */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 1. CRM */}
          <button
            onClick={() => {
              setMerchantTab('dashboard');
              setIsMoreMenuOpen(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              merchantTab === 'dashboard' || (!['erp', 'analytics', 'meta', 'moveis_convencionais', 'settings'].includes(merchantTab))
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>CRM</span>
          </button>

          {/* 2. ERP */}
          <button
            onClick={() => {
              setMerchantTab('erp');
              setIsMoreMenuOpen(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              merchantTab === 'erp'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-500" />
            <span>ERP</span>
          </button>

          {/* 3. MÓVEIS CONVENCIONAIS */}
          <button
            onClick={() => {
              setMerchantTab('moveis_convencionais');
              setIsMoreMenuOpen(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              merchantTab === 'moveis_convencionais'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Armchair className="w-3.5 h-3.5 text-amber-500" />
            <span>Móveis Convencionais</span>
          </button>

          {/* 4. ANALYTICS */}
          <button
            onClick={() => {
              setMerchantTab('analytics');
              setIsMoreMenuOpen(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              merchantTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
            <span>Analytics</span>
          </button>

          {/* 5. MENU "MAIS" (MÓDULOS SECUNDÁRIOS E CONFIGURAÇÕES) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                ['meta', 'settings'].includes(merchantTab)
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : isMoreMenuOpen
                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80'
              }`}
            >
              <span>Mais</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl w-60 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setMerchantTab('meta');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    merchantTab === 'meta' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Share2 className="w-4 h-4 text-pink-600" />
                  <span>Meta Omni-Channel</span>
                </button>

                <button
                  onClick={() => {
                    setMerchantTab('settings');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    merchantTab === 'settings' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>Configurações & Taxas</span>
                </button>

                {isStoreOwner && (
                  <>
                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setIsFinancialModalOpen(true);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Faturas B2B</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsViewContractModalOpen(true);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>{currentStore.contractSignedAt ? 'Meu Contrato B2B ✓' : 'Assinar Contrato B2B ⚠️'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* IDENTIFICAÇÃO DA LOJA E ATUALIZAÇÃO */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isMultiStoreOwner ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-600" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase text-slate-400">Unidade:</span>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                >
                  <option value="all">Todas as Unidades (Consolidado)</option>
                  {ownedStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-2">
              <StoreIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-slate-900">{currentStore.name}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                isProPlan 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {isProPlan ? 'Pro ⭐' : 'Básico'}
              </span>
            </div>
          )}

          <button
            onClick={syncStoreAuthAndFetch}
            disabled={loadingRealLeads}
            title="Sincronizar dados em tempo real"
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRealLeads ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

      </div>

      {merchantTab === 'meta' ? (
        <MerchantMetaIntegration
          storeId={selectedStoreId}
          storeName={currentStore.name}
          storePlan={activePlan}
        />
      ) : merchantTab === 'settings' ? (
        <MerchantSettingsView
          tenantId={
            selectedStoreId === 'all'
              ? (currentUser?.tenantId || currentStore.id)
              : (STORE_ID_TO_TENANT_UUID[selectedStoreId] || selectedStoreId || currentStore.id)
          }
        />
      ) : merchantTab === 'moveis_convencionais' ? (
        <ConventionalFurnitureView
          tenantId={
            selectedStoreId === 'all'
              ? (currentUser?.tenantId || currentStore.id)
              : (STORE_ID_TO_TENANT_UUID[selectedStoreId] || selectedStoreId || currentStore.id)
          }
        />
      ) : merchantTab === 'erp' ? (
        <MerchantERP merchantPlan={activePlan} storeId={selectedStoreId} />
      ) : merchantTab === 'analytics' ? (
        isProPlan ? <MerchantAnalytics storeId={selectedStoreId === 'all' ? 'all' : (currentUser?.tenantId || currentStore.id)} /> : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-3xl mx-auto my-8 shadow-sm">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Lock className="w-8 h-8" />
            </div>
            
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
              Recurso Exclusivo do Plano Pro
            </span>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              Dashboard de Analytics Avançado
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto mb-6">
              O módulo de Analytics exige o <strong>Plano Pro</strong> para acessar inteligência de vendas, ticket médio, comparativo mês a mês e indicadores do ERP operacional.
            </p>
          </div>
        )
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
        
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center justify-between animate-in fade-in">
            <span>⚠️ {serverError}</span>
            <button onClick={() => setServerError(null)} className="text-red-400 hover:text-red-700 font-black ml-2">✕</button>
          </div>
        )}

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
              <span>Novo Lead Externo</span>
            </button>

            {/* View Switcher: Table vs Kanban (Plano Pro unlock) */}
            {isProPlan ? (
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'kanban' : 'table')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#1B2B48] border border-slate-200 shadow-sm flex items-center space-x-1.5 hover:bg-slate-50 transition-colors"
                title="Alternar Modo de Visualização"
              >
                {viewMode === 'table' ? (
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

        {/* Status Filter Tabs (Apenas no Modo Tabela) */}
        {viewMode === 'table' && (
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
                          onChange={(e) => handleStageChange(lead, e.target.value as LeadStatus)}
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
        {/* VISÃO 2: QUADRO KANBAN (PLANO PRO) COM DUAS VISUALIZAÇÕES */}
        {/* ========================================================================= */}
        {viewMode === 'kanban' && isProPlan && (
          <div className="space-y-4 pt-2">
            
            {/* SELETOR DE VISUALIZAÇÃO: PIPELINE ATIVO VS RESULTADOS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
              <div className="inline-flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setKanbanView('pipeline')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    kanbanView === 'pipeline'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pipeline Ativo</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    kanbanView === 'pipeline' ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {filteredLeads.filter((l) => ['novo', 'em_atendimento', 'orcado'].includes(l.status)).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setKanbanView('resultados')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    kanbanView === 'resultados'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resultados</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    kanbanView === 'resultados' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {filteredLeads.filter((l) => ['convertido', 'perdido'].includes(l.status)).length}
                  </span>
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-medium px-2">
                {kanbanView === 'pipeline'
                  ? 'Foco nas negociações ativas (Novos Leads, Em Atendimento e Orçados)'
                  : 'Desfecho das negociações (Vendas Fechadas e Perdidos)'}
              </span>
            </div>

            {/* COLUNAS KANBAN */}
            <div className={`grid grid-cols-1 ${kanbanView === 'pipeline' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              {currentKanbanStages.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.status === stage.id);

                return (
                  <div key={stage.id} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 space-y-3 flex flex-col justify-start min-h-[460px]">
                    
                    {/* Header Coluna */}
                    <div className={`p-2.5 rounded-xl border-l-4 font-black text-xs text-slate-800 flex justify-between items-center bg-white shadow-2xs ${stage.color}`}>
                      <span>{stage.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${stage.badgeColor}`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Cards de Lead na Coluna */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {stageLeads.length > 0 ? (
                        stageLeads.map((lead) => (
                          <div 
                            key={lead.assignmentId || lead.id} 
                            onClick={() => setSelectedLeadForDetail(lead)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer space-y-2.5 group"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-xs text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                  {lead.name}
                                </h4>
                                <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                                  {lead.environment}
                                </p>
                              </div>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                lead.source && lead.source !== 'plataforma'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {lead.source || 'Plataforma'}
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between pt-0.5">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Estimado</span>
                                <span className="text-sm font-black text-emerald-700">
                                  {formatCurrency(lead.estimatedMin)}
                                </span>
                              </div>
                              {lead.city && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {lead.city}
                                </span>
                              )}
                            </div>

                            {/* Ações do Card */}
                            <div 
                              className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                value={lead.status}
                                onChange={(e) => {
                                  const targetStatus = e.target.value as LeadStatus;
                                  handleStageChange(lead, targetStatus);
                                }}
                                className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 focus:outline-none cursor-pointer flex-1"
                              >
                                <option value="novo">Mover: Novo</option>
                                <option value="em_atendimento">Mover: Atendimento</option>
                                <option value="orcado">Mover: Orçado</option>
                                <option value="convertido">Mover: Venda Fechada</option>
                                <option value="perdido">Mover: Perdido</option>
                              </select>

                              <button
                                onClick={() => openWhatsApp(lead.phone, lead.name, lead.environment)}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shrink-0"
                                title="Iniciar conversa no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-center p-3">
                          <p className="text-xs text-slate-400 italic">Nenhum lead nesta etapa</p>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

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
      <LeadDetailDrawer onLeadUpdated={syncStoreAuthAndFetch} />

      {/* Modal Pasta do Pedido ERP */}
      {selectedOrderForFolder && (
        <OrderFolderModal
          order={selectedOrderForFolder}
          onClose={() => setSelectedOrderForFolder(null)}
        />
      )}

      {/* Modal Portal Financeiro da Loja */}
      <MerchantFinancialModal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        tenantId={STORE_ID_TO_TENANT_UUID[selectedStoreId] || selectedStoreId}
        storeName={currentStore.name}
      />

      {/* Modal de Consulta do Contrato B2B pelo Gerente */}
      {currentStore && (
        <StoreContractModal
          isOpen={isViewContractModalOpen}
          onClose={() => setIsViewContractModalOpen(false)}
          store={currentStore}
          canSign={!currentStore.contractSignedAt}
          onSignNow={() => {
            setIsViewContractModalOpen(false);
            setIsSignContractModalOpen(true);
          }}
        />
      )}

      {/* Modal Obrigatório de Assinatura Digital no 1º Acesso */}
      {currentStore && (
        <SignContractModal
          isOpen={isSignContractModalOpen}
          store={currentStore}
          onSignedSuccess={async () => {
            setIsSignContractModalOpen(false);
            await refreshStores();
            await syncStoreAuthAndFetch();
          }}
        />
      )}

    </div>
  );
};
