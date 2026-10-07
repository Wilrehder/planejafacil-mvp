import React, { useState } from 'react';
import { Building2, Plus, Search, ShieldCheck, X, Check, Award, Zap, Phone, Mail, MapPin, Edit, Sparkles, Filter, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { STORE_PLANS } from '../../data/mockData';
import { Store } from '../../types';

export const StoresManager: React.FC = () => {
  const { stores, addStore, isStoreModalOpen, setIsStoreModalOpen, leads, storeApplications, updateStoreApplicationStatus } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'stores_list' | 'applications' | 'plans_info'>('stores_list');
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const [formStore, setFormStore] = useState({
    name: '',
    cnpj: '',
    responsibleName: '',
    city: '',
    state: 'SP',
    plan: 'Pro' as 'Basic' | 'Pro',
    regionServed: '',
    status: 'Ativa' as 'Ativa' | 'Pendente' | 'Inativa',
    phone: '',
    whatsapp: '',
    email: '',
  });

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.regionServed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.responsibleName && s.responsibleName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlan = selectedPlanFilter === 'todos' || s.plan === selectedPlanFilter;
    const matchesStatus = selectedStatusFilter === 'todos' || s.status === selectedStatusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingStore(null);
    setFormStore({
      name: '',
      cnpj: '',
      responsibleName: '',
      city: '',
      state: 'SP',
      plan: 'Platinum',
      regionServed: '',
      status: 'Ativa',
      phone: '',
      whatsapp: '',
      email: '',
    });
    setIsStoreModalOpen(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setEditingStore(store);
    setFormStore({
      name: store.name,
      cnpj: store.cnpj || '',
      responsibleName: store.responsibleName || '',
      city: store.city,
      state: store.state,
      plan: store.plan,
      regionServed: store.regionServed,
      status: store.status,
      phone: store.phone,
      whatsapp: store.whatsapp || '',
      email: store.email,
    });
    setIsStoreModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monthlyRev = formStore.plan === 'Pro' ? 219.90 : 119.90;
    
    if (editingStore) {
      // Edit existing store in array
      const storeIdx = stores.findIndex((s) => s.id === editingStore.id);
      if (storeIdx !== -1) {
        stores[storeIdx] = {
          ...editingStore,
          ...formStore,
          monthlyRevenue: monthlyRev,
        };
      }
    } else {
      // Add new store
      addStore({
        ...formStore,
        monthlyRevenue: monthlyRev,
        contractDate: new Date().toISOString().split('T')[0],
      });
    }

    setIsStoreModalOpen(false);
  };

  const selectedPlanDetails = STORE_PLANS.find((p) => p.id === formStore.plan) || STORE_PLANS[1];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Upper Navigation Tabs: Lista de Lojas vs Tabela de Planos SaaS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Gerenciamento de Lojas Parceiras & Planos B2B</h2>
          <p className="text-xs text-slate-500">Credencie marcenarias e lojas de móveis planejados, atribua planos SaaS e monitore o fluxo de leads por região.</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stores_list')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'stores_list' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Lojas Credenciadas ({stores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'applications' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4 text-emerald-600" />
            <span>Solicitações de Parceria ({storeApplications.length})</span>
            {storeApplications.filter(a => a.status === 'nova').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('plans_info')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'plans_info' ? 'bg-white text-brand-600 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Planos SaaS & Benefícios B2B</span>
          </button>
        </div>
      </div>

      {/* PLAN DISCRIMINATION OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STORE_PLANS.map((plan) => {
          const isSelectedInList = selectedPlanFilter === plan.id;
          const countOnPlan = stores.filter((s) => s.plan === plan.id).length;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanFilter(selectedPlanFilter === plan.id ? 'todos' : plan.id)}
              className={`p-6 rounded-3xl cursor-pointer border transition-all duration-300 relative flex flex-col justify-between ${
                isSelectedInList
                  ? 'bg-slate-900 text-white border-slate-800 shadow-2xl ring-2 ring-[#439346]'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 right-6 px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-full shadow-sm">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    plan.id === 'Pro'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {plan.id}
                  </span>
                  <span className={`text-xs font-bold ${isSelectedInList ? 'text-slate-400' : 'text-slate-500'}`}>
                    {countOnPlan} {countOnPlan === 1 ? 'Loja Ativa' : 'Lojas Ativas'}
                  </span>
                </div>

                <div>
                  <h3 className={`text-lg font-black ${isSelectedInList ? 'text-white' : 'text-slate-900'}`}>{plan.title}</h3>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black text-[#439346]">R$ {plan.priceMonthly}</span>
                    <span className={`text-xs font-semibold ${isSelectedInList ? 'text-slate-400' : 'text-slate-500'}`}>/ mês + R$ 50/lead</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100/10">
                  <div className={`text-xs font-bold flex items-center space-x-1.5 ${isSelectedInList ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    <Zap className="w-3.5 h-3.5" />
                    <span>R$ 50,00 por lead recebido</span>
                  </div>
                  <div className={`text-[11px] font-medium ${isSelectedInList ? 'text-slate-300' : 'text-slate-600'}`}>
                    📍 Cobertura: {plan.regionCoverage}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100/10">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${isSelectedInList ? 'text-slate-400' : 'text-slate-500'}`}>Recursos Descriminados:</div>
                  <ul className="space-y-1.5">
                    {plan.features.map((feat: string, idx: number) => (
                      <li key={idx} className={`text-xs flex items-start space-x-2 ${isSelectedInList ? 'text-slate-200' : 'text-slate-700'}`}>
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100/10 text-center">
                <span className={`text-xs font-bold underline ${isSelectedInList ? 'text-brand-400' : 'text-brand-600'}`}>
                  {isSelectedInList ? 'Filtrando por este plano (Clique para limpar)' : 'Filtrar lojas deste plano'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TAB CONTENT 1: STORES TABLE & MANAGER */}
      {activeTab === 'stores_list' && (
        <div className="space-y-6">
          
          {/* Controls Bar: Search & Filters & Add Button */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="relative flex-1 w-full max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome da loja, cidade, responsável ou região..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              
              {/* Filter Plan */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="todos">Todos os Planos</option>
                <option value="Gold">Plano Gold (R$ 490/mês)</option>
                <option value="Platinum">Plano Platinum (R$ 990/mês)</option>
                <option value="Diamond">Plano Diamond (R$ 1.990/mês)</option>
              </select>

              {/* Filter Status */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="todos">Todos os Status</option>
                <option value="Ativa">Ativas</option>
                <option value="Pendente">Pendentes de Aprovação</option>
                <option value="Inativa">Inativas</option>
              </select>

              {/* Add Store Button */}
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-emerald-glow flex items-center space-x-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Credenciar Nova Loja</span>
              </button>
            </div>

          </div>

          {/* Stores Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Loja Parceira & Responsável</th>
                    <th className="py-4 px-6">Cidade / Região Coberta</th>
                    <th className="py-4 px-6">Plano SaaS & Mensalidade</th>
                    <th className="py-4 px-6">Leads Recebidos</th>
                    <th className="py-4 px-6">Status da Parceria</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Nenhuma loja encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((store) => (
                      <tr key={store.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Store Name & Contact */}
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-extrabold border border-brand-200/60 shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-900">{store.name}</div>
                              {store.responsibleName && (
                                <div className="text-xs text-slate-600 font-semibold">Contato: {store.responsibleName}</div>
                              )}
                              <div className="text-[11px] text-slate-400 font-normal flex items-center space-x-2 mt-0.5">
                                <span>{store.email}</span>
                                <span>•</span>
                                <span>{store.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* City / State & Region */}
                        <td className="py-4 px-6 font-semibold">
                          <div className="text-slate-900 font-bold">{store.city} - <strong>{store.state}</strong></div>
                          <div className="text-[11px] text-slate-500 font-normal">{store.regionServed}</div>
                        </td>

                        {/* Plan Badge & Monthly Price */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex flex-col items-start space-y-1">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              store.plan === 'Diamond'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : store.plan === 'Platinum'
                                ? 'bg-blue-100 text-brand-700 border-brand-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                              {store.plan}
                            </span>
                            <span className="text-[11px] font-extrabold text-emerald-700">
                              R$ {store.monthlyRevenue || (store.plan === 'Diamond' ? 1990 : store.plan === 'Platinum' ? 990 : 490)} / mês
                            </span>
                          </div>
                        </td>

                        {/* Leads Count */}
                        <td className="py-4 px-6 whitespace-nowrap font-extrabold text-slate-900">
                          {(() => {
                            const dynamicCount = leads.filter((l) => l.assignedStoreId === store.id || l.assignedStoreName === store.name || (l.city && l.city.toLowerCase().includes(store.city.toLowerCase()))).length;
                            return (
                              <>
                                <span className="text-sm text-emerald-700">{dynamicCount}</span> <span className="text-slate-500 font-medium">leads recebidos</span>
                              </>
                            );
                          })()}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full border ${
                            store.status === 'Ativa'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : store.status === 'Pendente'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            ● {store.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(store)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 font-bold text-xs border border-slate-200 transition-all flex items-center space-x-1.5 ml-auto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar Plano</span>
                          </button>
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

      {/* TAB CONTENT: STORE APPLICATIONS (LEADS B2B) */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Solicitações de Parceria Recebidas</h3>
            <p className="text-xs text-slate-500">Lojas físicas e marcenarias interessadas em fazer parte da rede credenciada do PlanejaFácil.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Loja / Marcenaria & Contato</th>
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
                            {app.desiredPlan || 'Platinum'}
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
                            <span>Chamar no WhatsApp</span>
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

      {/* TAB CONTENT 2: DETAILED PLAN FEATURES MATRIX */}
      {activeTab === 'plans_info' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl font-black text-slate-900">Matriz de Benefícios dos Planos B2B PlanejaFácil</h3>
            <p className="text-sm text-slate-500">Confira o que cada nível de assinatura entrega para marcenarias e lojas de móveis planejados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {STORE_PLANS.map((plan) => (
              <div key={plan.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-900 text-lg">{plan.title}</h4>
                  <span className="text-lg font-black text-brand-600">R$ {plan.priceMonthly}/mês</span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                  <div className="text-xs font-bold text-slate-900">Capacidade de Leads:</div>
                  <div className="text-xs text-brand-600 font-extrabold">{plan.leadsCap}</div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recursos Incluídos:</div>
                  <ul className="space-y-2">
                    {plan.features.map((feat: string, i: number) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT STORE MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 my-8">
            
            <button
              onClick={() => setIsStoreModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left">
              <h3 className="text-xl font-black text-slate-900">
                {editingStore ? `Editar Plano & Cadastro — ${editingStore.name}` : 'Credenciar Nova Loja Parceira'}
              </h3>
              <p className="text-xs text-slate-500">
                Preencha os dados comerciais da loja e selecione o plano de assinatura SaaS B2B.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 text-left">
              
              {/* Row 1: Store Name & CNPJ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Fantasia da Loja *</label>
                  <input
                    type="text"
                    required
                    value={formStore.name}
                    onChange={(e) => setFormStore({ ...formStore, name: e.target.value })}
                    placeholder="Ex: Dell Anno Moema"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Razão Social / CNPJ</label>
                  <input
                    type="text"
                    value={formStore.cnpj}
                    onChange={(e) => setFormStore({ ...formStore, cnpj: e.target.value })}
                    placeholder="Ex: 12.345.678/0001-90"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              {/* Row 2: Responsible Person & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Gerente / Responsável</label>
                  <input
                    type="text"
                    value={formStore.responsibleName}
                    onChange={(e) => setFormStore({ ...formStore, responsibleName: e.target.value })}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp Comercial (para Leads) *</label>
                  <input
                    type="text"
                    required
                    value={formStore.phone}
                    onChange={(e) => setFormStore({ ...formStore, phone: e.target.value, whatsapp: e.target.value })}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
              </div>

              {/* Row 3: City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cidade Principal *</label>
                  <input
                    type="text"
                    required
                    value={formStore.city}
                    onChange={(e) => setFormStore({ ...formStore, city: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">UF *</label>
                  <select
                    value={formStore.state}
                    onChange={(e) => setFormStore({ ...formStore, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
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

              {/* Row 4: Region Served */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Região de Atendimento / Bairros *</label>
                <input
                  type="text"
                  required
                  value={formStore.regionServed}
                  onChange={(e) => setFormStore({ ...formStore, regionServed: e.target.value })}
                  placeholder="Ex: São Paulo - Zona Sul, Zona Oeste e Alphaville"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              {/* Row 5: PLAN SELECTION WITH REALTIME BENEFIT PREVIEW */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-900 uppercase">Escolha o Plano de Assinatura SaaS *</label>
                
                <div className="grid grid-cols-2 gap-3">
                  {STORE_PLANS.map((plan) => {
                    const isSelected = formStore.plan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setFormStore({ ...formStore, plan: plan.id })}
                        className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-center space-y-1 ${
                          isSelected
                            ? 'bg-emerald-50 border-[#439346] ring-2 ring-[#439346]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-extrabold text-slate-900 text-xs">{plan.title}</div>
                        <div className="text-sm font-black text-[#439346]">R$ {plan.priceMonthly}/mês</div>
                        <div className="text-[10px] text-slate-500 font-medium">+ R$ 50,00 por lead recebido</div>
                      </div>
                    );
                  })}
                </div>

                {/* Plan Feature Discrimination Card Preview */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Benefícios Descriminados do {selectedPlanDetails.title}:</span>
                    <span className="text-emerald-700 font-extrabold">R$ {selectedPlanDetails.priceMonthly} / mês</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                    {selectedPlanDetails.features.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Row 6: Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status da Parceria *</label>
                <select
                  value={formStore.status}
                  onChange={(e) => setFormStore({ ...formStore, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
                >
                  <option value="Ativa">Ativa (Recebendo Leads)</option>
                  <option value="Pendente">Pendente de Aprovação</option>
                  <option value="Inativa">Inativa (Bloqueada)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-emerald-glow transition-all"
                >
                  {editingStore ? 'Salvar Alterações do Plano' : 'Ativar e Credenciar Loja'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
