import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  X, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Power, 
  PowerOff, 
  Users, 
  KeyRound, 
  Trash2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STORE_PLANS } from '../../data/mockData';
import { Store } from '../../types';
import { saveStoreAndSubscription, setStoreSuspension } from '../../lib/financialService';
import { provisionStoreAndUser } from '../../lib/authService';
import { lookupCep } from '../../lib/cepService';
import { StoreUsersModal } from './StoreUsersModal';

export const StoresManager: React.FC = () => {
  const { 
    stores, 
    refreshStores, 
    deleteStore, 
    isStoreModalOpen, 
    setIsStoreModalOpen, 
    storeApplications, 
    updateStoreApplicationStatus 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [onlyMultiStoreFilter, setOnlyMultiStoreFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<'stores_list' | 'applications'>('stores_list');
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);
  const [suspendingStoreId, setSuspendingStoreId] = useState<string | null>(null);

  // Modal de Gestão de Usuários da Loja
  const [selectedStoreForUsers, setSelectedStoreForUsers] = useState<{ id: string; name: string; city: string } | null>(null);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [cepSearchLoading, setCepSearchLoading] = useState(false);
  const [cepLookupSuccess, setCepLookupSuccess] = useState<string | null>(null);

  const [formStore, setFormStore] = useState({
    name: '',
    cnpj: '',
    cep: '',
    responsibleName: '',
    city: '',
    cityIbgeCode: '',
    state: 'SP',
    plan: 'Pro' as 'Basic' | 'Pro',
    regionServed: '',
    status: 'Ativa' as 'Ativa' | 'Pendente' | 'Inativa',
    phone: '',
    whatsapp: '',
    email: '',
    contractedPrice: 219.90,
    billingDueDay: 10,
    routingEnabled: true,
    ownerEmail: '',
    tempPassword: 'PlanejaFacil2026!',
    mustChangePassword: true,
  });

  // Mapeamento de grupos Multi-Loja (mesmo e-mail de gestor ou mesmo responsável)
  const managerGroups = useMemo(() => {
    const map = new Map<string, Store[]>();
    stores.forEach((s) => {
      const key = (s.email || '').trim().toLowerCase();
      if (!key) return;
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    });
    return map;
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.regionServed.toLowerCase().includes(q) ||
        (s.responsibleName && s.responsibleName.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q);

      const matchesPlan = selectedPlanFilter === 'todos' || s.plan === selectedPlanFilter;
      const matchesStatus = selectedStatusFilter === 'todos' || s.status === selectedStatusFilter;

      const emailKey = (s.email || '').trim().toLowerCase();
      const groupCount = emailKey ? managerGroups.get(emailKey)?.length || 0 : 0;
      const matchesMulti = !onlyMultiStoreFilter || groupCount > 1;

      return matchesSearch && matchesPlan && matchesStatus && matchesMulti;
    });
  }, [stores, searchQuery, selectedPlanFilter, selectedStatusFilter, onlyMultiStoreFilter, managerGroups]);

  const handleOpenAddModal = () => {
    setEditingStore(null);
    setCepLookupSuccess(null);
    setModalError(null);
    setFormStore({
      name: '',
      cnpj: '',
      cep: '',
      responsibleName: '',
      city: '',
      cityIbgeCode: '',
      state: 'SP',
      plan: 'Pro',
      regionServed: '',
      status: 'Ativa',
      phone: '',
      whatsapp: '',
      email: '',
      contractedPrice: 219.90,
      billingDueDay: 10,
      routingEnabled: true,
      ownerEmail: '',
      tempPassword: 'PlanejaFacil2026!',
      mustChangePassword: true,
    });
    setIsStoreModalOpen(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setEditingStore(store);
    setCepLookupSuccess(null);
    setModalError(null);
    setFormStore({
      name: store.name,
      cnpj: store.cnpj || '',
      cep: '',
      responsibleName: store.responsibleName || '',
      city: store.city,
      cityIbgeCode: '',
      state: store.state,
      plan: store.plan,
      regionServed: store.regionServed,
      status: store.status,
      phone: store.phone,
      whatsapp: store.whatsapp || '',
      email: store.email,
      contractedPrice: store.monthlyRevenue || (store.plan === 'Pro' ? 219.90 : 119.90),
      billingDueDay: store.billingDueDay || 10,
      routingEnabled: store.routingEnabled ?? (store.status === 'Ativa'),
      ownerEmail: store.email || '',
      tempPassword: 'PlanejaFacil2026!',
      mustChangePassword: false,
    });
    setIsStoreModalOpen(true);
  };

  const handleStoreCepBlur = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepSearchLoading(true);
    setCepLookupSuccess(null);
    try {
      const res = await lookupCep(cleanCep);
      if (res.success && res.city && res.state) {
        setFormStore((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
          cityIbgeCode: res.ibgeCode || prev.cityIbgeCode,
          regionServed: prev.regionServed || `${res.city} e Região (${res.state})`,
        }));
        setCepLookupSuccess(`Localização identificada: ${res.city} - ${res.state}`);
      }
    } catch {
      // Ignora falha silenciosa
    } finally {
      setCepSearchLoading(false);
    }
  };

  const handleToggleSuspension = async (store: Store) => {
    const isCurrentlySuspended = store.status === 'Inativa';
    setFeedbackBanner(null);
    setSuspendingStoreId(store.id);

    try {
      const res = await setStoreSuspension(
        store.id,
        !isCurrentlySuspended,
        isCurrentlySuspended ? 'Reativação comercial pelo administrador' : 'Suspensão administrativa'
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao alterar status da loja.');
      }

      await refreshStores();
      setFeedbackBanner({
        type: 'success',
        text: isCurrentlySuspended 
          ? `Loja "${store.name}" reativada com sucesso! Ela voltou para o rodízio de leads.` 
          : `Loja "${store.name}" suspensa do rodízio. Novos leads não serão encaminhados a ela.`,
      });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao atualizar status da loja no banco de dados.',
      });
    } finally {
      setSuspendingStoreId(null);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a loja "${store.name}" e todos os seus dados vinculados?`)) {
      return;
    }
    setFeedbackBanner(null);
    try {
      await deleteStore(store.id);
      await refreshStores();
      setFeedbackBanner({
        type: 'success',
        text: `Loja "${store.name}" excluída com sucesso.`,
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        text: err?.message || 'Erro ao excluir loja no banco de dados.',
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formStore.name.trim()) {
      setModalError('Informe o Nome Fantasia da loja.');
      return;
    }
    if (!formStore.phone.trim()) {
      setModalError('Informe o WhatsApp Comercial para recebimento dos leads.');
      return;
    }
    if (!formStore.city.trim()) {
      setModalError('Informe a Cidade Principal da loja.');
      return;
    }
    if (!formStore.regionServed.trim()) {
      setModalError('Informe a Região de Atendimento ou bairros atendidos.');
      return;
    }

    if (!editingStore) {
      if (!formStore.ownerEmail.trim()) {
        setModalError('Informe o E-mail de Login do responsável pela loja.');
        return;
      }
      if (!formStore.tempPassword.trim()) {
        setModalError('Defina a Senha Inicial Provisória de acesso do lojista.');
        return;
      }
    }

    setIsSubmittingStore(true);
    setFeedbackBanner(null);

    const rawPrice = String(formStore.contractedPrice).replace(',', '.');
    const parsedPrice = parseFloat(rawPrice);
    const monthlyRev = !isNaN(parsedPrice) && parsedPrice > 0 
      ? parsedPrice 
      : (formStore.plan === 'Pro' ? 219.90 : 119.90);

    try {
      if (editingStore) {
        await saveStoreAndSubscription({
          storeId: editingStore.id,
          name: formStore.name.trim(),
          cnpj: formStore.cnpj.trim(),
          cityName: formStore.city.trim(),
          stateUf: formStore.state,
          planTier: formStore.plan.toLowerCase() as 'basic' | 'pro',
          contractedPrice: monthlyRev,
          billingDueDay: Number(formStore.billingDueDay) || 10,
          phone: formStore.phone.trim(),
          email: formStore.email.trim() || formStore.ownerEmail.trim(),
          responsibleName: formStore.responsibleName.trim(),
          isRoutingEnabled: formStore.routingEnabled && formStore.status === 'Ativa',
        });
        await refreshStores();
        setFeedbackBanner({
          type: 'success',
          text: `Loja "${formStore.name}" atualizada com sucesso!`,
        });
      } else {
        await provisionStoreAndUser({
          name: formStore.name.trim(),
          cnpj: formStore.cnpj.trim(),
          responsibleName: formStore.responsibleName.trim() || formStore.name.trim(),
          cityIbgeCode: formStore.cityIbgeCode || undefined,
          cityName: formStore.city.trim(),
          stateUf: formStore.state,
          phone: formStore.phone.trim(),
          whatsapp: formStore.whatsapp.trim() || formStore.phone.trim(),
          email: formStore.email.trim() || formStore.ownerEmail.trim(),
          planTier: formStore.plan.toLowerCase() as any,
          contractedPrice: monthlyRev,
          billingDueDay: Number(formStore.billingDueDay) || 10,
          isRoutingEnabled: formStore.routingEnabled && formStore.status === 'Ativa',
          ownerEmail: formStore.ownerEmail.trim(),
          ownerName: formStore.responsibleName.trim() || formStore.name.trim(),
          tempPassword: formStore.tempPassword.trim() || 'PlanejaFacil2026!',
          mustChangePassword: formStore.mustChangePassword ?? true,
        });
        await refreshStores();
        setFeedbackBanner({
          type: 'success',
          text: `Loja "${formStore.name}" e acesso do gerente (${formStore.ownerEmail}) cadastrados com sucesso!`,
        });
      }
      setIsStoreModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar no PostgreSQL:', err);
      const msg = err?.message || 'Erro ao salvar loja no banco de dados.';
      setModalError(msg);
      setFeedbackBanner({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsSubmittingStore(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header com Título & Botão no Canto Superior Direito */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Gerenciamento de Lojas Parceiras
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Credencie lojas, atribua planos SaaS, gerencie limites de acessos da equipe e monitore a entrega de leads por região.
          </p>
        </div>

        {/* Botão Cadastrar Nova Loja no Canto Superior Direito */}
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-emerald-glow flex items-center justify-center space-x-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar Nova Loja</span>
        </button>
      </div>

      {/* Navegação entre Lojas Credenciadas e Solicitações de Parceria */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('stores_list')}
          className={`pb-3 px-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'stores_list'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Lojas Credenciadas ({stores.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>Solicitações de Parceria ({storeApplications.length})</span>
          {storeApplications.filter(a => a.status === 'nova').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {feedbackBanner && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          feedbackBanner.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackBanner.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedbackBanner.text}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ABA 1: LISTA & GERENCIAMENTO DE LOJAS */}
      {activeTab === 'stores_list' && (
        <div className="space-y-5">
          
          {/* Barra de Filtros e Busca */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por loja, cidade, gerente ou e-mail..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              
              {/* Filtro de Plano */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="todos">Todos os Planos</option>
                <option value="Basic">Plano Básico (1 Acesso)</option>
                <option value="Pro">Plano Pro (Até 3 Acessos)</option>
              </select>

              {/* Filtro de Status */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="todos">Todos os Status</option>
                <option value="Ativa">Ativas (Recebendo)</option>
                <option value="Pendente">Pendentes</option>
                <option value="Inativa">Inativas / Suspensas</option>
              </select>

              {/* Toggle de Redes Multi-Loja */}
              <button
                type="button"
                onClick={() => setOnlyMultiStoreFilter(!onlyMultiStoreFilter)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center space-x-1.5 cursor-pointer ${
                  onlyMultiStoreFilter
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Filtrar gerentes que possuem mais de 1 loja cadastrada"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Lojas</span>
              </button>

            </div>

          </div>

          {/* Tabela de Lojas Credenciadas */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Loja & Gerente Responsável</th>
                    <th className="py-4 px-6">Cidade / Região</th>
                    <th className="py-4 px-6">Plano SaaS & Limite de Acesso</th>
                    <th className="py-4 px-6">Leads Recebidos</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                        Nenhuma loja encontrada para os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((store) => {
                      const emailKey = (store.email || '').trim().toLowerCase();
                      const multiStoreCount = emailKey ? managerGroups.get(emailKey)?.length || 0 : 0;
                      const isMultiStore = multiStoreCount > 1;

                      return (
                        <tr key={store.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Nome da Loja & Gerente */}
                          <td className="py-4 px-6 font-bold text-slate-900">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-extrabold border border-brand-200/60 shrink-0">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-extrabold text-slate-900">{store.name}</span>
                                  {isMultiStore && (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200"
                                      title={`Este mesmo gestor (${store.email}) administra ${multiStoreCount} lojas na rede`}
                                    >
                                      Grupo ({multiStoreCount} lojas)
                                    </span>
                                  )}
                                </div>
                                {store.responsibleName && (
                                  <div className="text-xs text-slate-600 font-semibold mt-0.5">
                                    Gerente: {store.responsibleName}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-400 font-normal flex items-center space-x-2 mt-0.5">
                                  <span>{store.email}</span>
                                  <span>•</span>
                                  <span>{store.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cidade & Região */}
                          <td className="py-4 px-6 font-semibold">
                            <div className="text-slate-900 font-bold">{store.city} - <strong>{store.state}</strong></div>
                            <div className="text-[11px] text-slate-500 font-normal">{store.regionServed}</div>
                          </td>

                          {/* Plano SaaS & Cota de Usuários */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex flex-col items-start space-y-1">
                              <div className="flex items-center space-x-1.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  store.plan === 'Pro'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {store.plan === 'Pro' ? 'Plano Pro' : 'Plano Básico'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  {store.plan === 'Pro' ? '👥 Até 3 Acessos' : '👤 1 Acesso'}
                                </span>
                              </div>
                              <span className="text-xs font-black text-emerald-700">
                                R$ {store.monthlyRevenue || (store.plan === 'Pro' ? 219.90 : 119.90)} / mês
                              </span>
                            </div>
                          </td>

                          {/* Leads Recebidos */}
                          <td className="py-4 px-6 whitespace-nowrap font-extrabold text-slate-900">
                            <span className="text-sm text-emerald-700">{store.leadsCount || 0}</span> <span className="text-slate-500 font-medium">leads</span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                                store.status === 'Ativa'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : store.status === 'Pendente'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                ● {store.status}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {store.status === 'Ativa' ? '✓ Na Fila de Leads' : '⏸ Pausada do Rodízio'}
                              </span>
                            </div>
                          </td>

                          {/* Ações */}
                          <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                            {/* Gerenciar Acessos da Loja */}
                            <button
                              onClick={() => {
                                setSelectedStoreForUsers({ id: store.id, name: store.name, city: store.city });
                                setIsUsersModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                              title="Gerenciar usuários (Gerente, Vendedor, Montador) e limites de acesso"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Acessos</span>
                            </button>

                            {/* Editar Loja */}
                            <button
                              onClick={() => handleOpenEditModal(store)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 font-bold text-xs border border-slate-200 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                              title="Editar dados cadastrais e plano da loja"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            {/* Suspender / Reativar */}
                            <button
                              disabled={suspendingStoreId === store.id}
                              onClick={() => handleToggleSuspension(store)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                                store.status === 'Inativa'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-xs'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title={store.status === 'Inativa' ? 'Reativar Loja na Fila de Leads' : 'Suspender Loja da Fila de Leads'}
                            >
                              {suspendingStoreId === store.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                              ) : store.status === 'Inativa' ? (
                                <Power className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              <span>{store.status === 'Inativa' ? 'Reativar' : 'Suspender'}</span>
                            </button>

                            {/* Excluir Loja */}
                            <button
                              onClick={() => handleDeleteStore(store)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Excluir Loja Permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: SOLICITAÇÕES DE PARCERIA RECEBIDAS */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Solicitações de Parceria Recebidas</h3>
            <p className="text-xs text-slate-500">Marcenarias e lojas físicas interessadas em ingressar no PlanejaFácil.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Loja & Contato</th>
                    <th className="py-4 px-6">Cidade / UF</th>
                    <th className="py-4 px-6">Plano de Interesse</th>
                    <th className="py-4 px-6">Observações</th>
                    <th className="py-4 px-6">Status do Contato</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {storeApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Nenhuma solicitação de parceria recebida até o momento.
                      </td>
                    </tr>
                  ) : (
                    storeApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="text-sm font-extrabold text-slate-900">{app.storeName}</div>
                          <div className="text-xs text-slate-600 font-semibold">Resp: {app.contactName}</div>
                          <div className="text-[11px] text-slate-400 font-normal flex items-center space-x-2 mt-0.5">
                            <span>{app.phone}</span>
                            <span>•</span>
                            <span>{app.email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-semibold">
                          <div className="text-slate-900 font-bold">{app.city} - <strong>{app.state}</strong></div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(app.createdAt).toLocaleDateString('pt-BR')} às {new Date(app.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-brand-50 text-brand-700 border border-brand-200">
                            {app.desiredPlan || 'Pro'}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-600 max-w-xs leading-relaxed">
                          {app.notes || 'Sem observações adicionais.'}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <select
                            value={app.status}
                            onChange={(e) => updateStoreApplicationStatus(app.id, e.target.value as any)}
                            className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full border bg-white outline-none cursor-pointer ${
                              app.status === 'nova'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : app.status === 'em_contato'
                                ? 'bg-blue-50 text-brand-700 border-brand-200'
                                : app.status === 'aprovada'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <option value="nova">● Nova Solicitação</option>
                            <option value="em_contato">● Em Contato</option>
                            <option value="aprovada">● Aprovada / Credenciada</option>
                            <option value="recusada">● Recusada / Arquivada</option>
                          </select>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <a
                            href={`https://wa.me/55${app.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(app.contactName)},%20sou%20o%20administrador%20do%20PlanejaFácil.%20Recebi%20sua%20solicitação%20de%20parceria!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all inline-flex items-center space-x-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO E EDIÇÃO DE LOJA REESTRUTURADO EM 3 BLOCOS LIMPOS */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Header Fixo */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="space-y-0.5 text-left pr-4">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {editingStore ? `Editar Loja — ${editingStore.name}` : 'Cadastrar Nova Loja Parceira'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os dados cadastrais, responsável e configure o plano de assinatura SaaS.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form noValidate onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden text-left">
              
              {/* Corpo com Rolagem Limpa */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
                {/* BLOCO 1: DADOS CADASTRAIS DA LOJA */}
                <div className="space-y-4">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">1</span>
                    <span>Dados Cadastrais da Loja</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome Fantasia *</label>
                      <input
                        type="text"
                        required
                        value={formStore.name}
                        onChange={(e) => setFormStore({ ...formStore, name: e.target.value })}
                        placeholder="Ex: Marcenaria Bella Arte"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">CNPJ / Razão Social</label>
                      <input
                        type="text"
                        value={formStore.cnpj}
                        onChange={(e) => setFormStore({ ...formStore, cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>
                  </div>

                  {/* CEP & Cidade / UF */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">CEP</label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={9}
                          value={formStore.cep}
                          onChange={(e) => setFormStore({ ...formStore, cep: e.target.value })}
                          onBlur={(e) => handleStoreCepBlur(e.target.value)}
                          placeholder="00000-000"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                        />
                        {cepSearchLoading && (
                          <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin absolute right-3 top-3" />
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Cidade Principal *</label>
                      <input
                        type="text"
                        required
                        value={formStore.city}
                        onChange={(e) => setFormStore({ ...formStore, city: e.target.value })}
                        placeholder="Ex: São Paulo"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">UF *</label>
                      <select
                        value={formStore.state}
                        onChange={(e) => setFormStore({ ...formStore, state: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
                      >
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="PR">PR</option>
                        <option value="SC">SC</option>
                        <option value="RS">RS</option>
                        <option value="MG">MG</option>
                        <option value="BA">BA</option>
                        <option value="DF">DF</option>
                      </select>
                    </div>
                  </div>

                  {cepLookupSuccess && (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{cepLookupSuccess}</span>
                    </div>
                  )}

                  {/* Região de Atendimento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Região de Atendimento / Bairros *</label>
                    <input
                      type="text"
                      required
                      value={formStore.regionServed}
                      onChange={(e) => setFormStore({ ...formStore, regionServed: e.target.value })}
                      placeholder="Ex: São Paulo - Zona Sul, Zona Oeste e Alphaville"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                  </div>
                </div>

                {/* BLOCO 2: GERENTE & CONTATO */}
                <div className="space-y-4 pt-2">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">2</span>
                    <span>Gerente & Contato Principal</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome do Gerente / Responsável *</label>
                      <input
                        type="text"
                        required
                        value={formStore.responsibleName}
                        onChange={(e) => setFormStore({ ...formStore, responsibleName: e.target.value })}
                        placeholder="Ex: Carlos Oliveira"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">WhatsApp Comercial *</label>
                      <input
                        type="text"
                        required
                        value={formStore.phone}
                        onChange={(e) => setFormStore({ ...formStore, phone: e.target.value, whatsapp: e.target.value })}
                        placeholder="(11) 98765-4321"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>
                  </div>

                  {!editingStore && (
                    <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-purple-900 uppercase">
                        <KeyRound className="w-4 h-4 text-purple-600" />
                        <span>Acesso Inicial do Gerente</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">E-mail de Login *</label>
                          <input
                            type="email"
                            required
                            value={formStore.ownerEmail}
                            onChange={(e) => setFormStore({ ...formStore, ownerEmail: e.target.value })}
                            placeholder="gerente@loja.com"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Senha Inicial Provisória *</label>
                          <input
                            type="text"
                            required
                            value={formStore.tempPassword}
                            onChange={(e) => setFormStore({ ...formStore, tempPassword: e.target.value })}
                            placeholder="PlanejaFacil2026!"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                          />
                        </div>
                      </div>

                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer pt-0.5">
                        <input
                          type="checkbox"
                          checked={formStore.mustChangePassword}
                          onChange={(e) => setFormStore({ ...formStore, mustChangePassword: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <span>Exigir alteração de senha no primeiro acesso</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* BLOCO 3: PLANO SAAS & FATURAMENTO */}
                <div className="space-y-4 pt-2">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">3</span>
                    <span>Plano SaaS & Faturamento</span>
                  </div>

                  {/* Seleção do Plano */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormStore({
                        ...formStore,
                        plan: 'Basic',
                        contractedPrice: 119.90,
                      })}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-center space-y-1 ${
                        formStore.plan === 'Basic'
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                      }`}
                    >
                      <div className="font-extrabold text-xs">Plano Básico</div>
                      <div className={`text-base font-black ${formStore.plan === 'Basic' ? 'text-emerald-400' : 'text-slate-900'}`}>
                        R$ 119,90 / mês
                      </div>
                      <div className={`text-[11px] font-bold ${formStore.plan === 'Basic' ? 'text-slate-300' : 'text-slate-500'}`}>
                        1 Acesso (Gerente / Dono)
                      </div>
                    </div>

                    <div
                      onClick={() => setFormStore({
                        ...formStore,
                        plan: 'Pro',
                        contractedPrice: 219.90,
                      })}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-center space-y-1 relative ${
                        formStore.plan === 'Pro'
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600 text-emerald-950'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center justify-center gap-1">
                        <span>Plano Pro</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-600 text-white font-extrabold rounded-full uppercase">Top</span>
                      </div>
                      <div className="text-base font-black text-emerald-700">
                        R$ 219,90 / mês
                      </div>
                      <div className="text-[11px] font-bold text-slate-600">
                        Até 3 Acessos (Dono, Vendedor, Montador)
                      </div>
                    </div>
                  </div>

                  {/* Preço Contratado, Dia do Vencimento e Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mensalidade (R$) *</label>
                      <input
                        type="text"
                        required
                        value={formStore.contractedPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          setFormStore({ ...formStore, contractedPrice: val as any });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Dia do Vencimento *</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        required
                        value={formStore.billingDueDay}
                        onChange={(e) => setFormStore({ ...formStore, billingDueDay: parseInt(e.target.value) || 10 })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Status da Parceria *</label>
                      <select
                        value={formStore.status}
                        onChange={(e) => setFormStore({ ...formStore, status: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
                      >
                        <option value="Ativa">Ativa (Recebendo)</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Inativa">Inativa (Suspensa)</option>
                      </select>
                    </div>
                  </div>

                  {/* Roteamento Automático de Leads */}
                  <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formStore.routingEnabled}
                      onChange={(e) => setFormStore({ ...formStore, routingEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Participar do Roteamento Automático de Leads qualificados da região
                    </span>
                  </label>
                </div>

              </div>

              {/* Footer Fixo */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
                {modalError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{modalError}</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled={isSubmittingStore}
                    onClick={() => setIsStoreModalOpen(false)}
                    className="w-1/3 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStore}
                    className="w-2/3 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-emerald-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingStore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando Loja...</span>
                      </>
                    ) : (
                      <span>{editingStore ? 'Salvar Alterações' : 'Cadastrar Loja'}</span>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE USUÁRIOS E LIMITES POR LOJA */}
      {selectedStoreForUsers && (
        <StoreUsersModal
          isOpen={isUsersModalOpen}
          onClose={() => {
            setIsUsersModalOpen(false);
            setSelectedStoreForUsers(null);
          }}
          store={selectedStoreForUsers}
        />
      )}

    </div>
  );
};
