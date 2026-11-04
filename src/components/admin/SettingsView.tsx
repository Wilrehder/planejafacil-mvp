import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DollarSign, 
  MessageSquare, 
  Palette, 
  ShieldCheck, 
  User,
  Check,
  Plus,
  Trash2,
  MapPin,
  Loader2,
  Award,
  Sparkles,
  Layers,
  Users,
  ShieldAlert,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { fetchSaaSPlansConfig, saveSaaSPlansConfig } from '../../lib/financialService';
import { PlanModulesConfig } from '../../types';

export const SettingsView: React.FC = () => {
  const { baseSquareMeterPrice, cityM2Prices, setBaseSquareMeterPrice } = useApp();
  const [activeTab, setActiveTab] = useState<'precificacao' | 'planos' | 'perfil' | 'usuarios' | 'logo' | 'integracoes'>('precificacao');
  const [tempPrice, setTempPrice] = useState<number>(baseSquareMeterPrice);
  const [tempCityPrices, setTempCityPrices] = useState<Record<string, number>>(cityM2Prices || {});
  const [newCityName, setNewCityName] = useState('');
  const [newCityPrice, setNewCityPrice] = useState<number>(1400);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [realUsers, setRealUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Estados dos Planos SaaS B2B
  const [saasPlans, setSaasPlans] = useState<{
    basicPrice: number;
    proPrice: number;
    leadPrice: number;
    basicModules: PlanModulesConfig;
    proModules: PlanModulesConfig;
  }>({
    basicPrice: 119.90,
    proPrice: 219.90,
    leadPrice: 50.00,
    basicModules: {
      crm: true,
      simulator: true,
      meta: false,
      erp: false,
      digital_folder: false,
      promob: false,
    },
    proModules: {
      crm: true,
      simulator: true,
      meta: true,
      erp: true,
      digital_folder: true,
      promob: true,
    },
  });
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansSavedSuccess, setPlansSavedSuccess] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  useEffect(() => {
    loadSaaSPlans();
  }, []);

  const loadSaaSPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetchSaaSPlansConfig();
      if (res.success && res.plans && res.plans.length > 0) {
        const basic = res.plans.find((p: any) => p.planTier === 'basic');
        const pro = res.plans.find((p: any) => p.planTier === 'pro');
        if (basic && pro) {
          setSaasPlans({
            basicPrice: basic.monthlyPrice,
            proPrice: pro.monthlyPrice,
            leadPrice: basic.leadPrice || 50,
            basicModules: basic.modules || {
              crm: true,
              simulator: true,
              meta: false,
              erp: false,
              digital_folder: false,
              promob: false,
            },
            proModules: pro.modules || {
              crm: true,
              simulator: true,
              meta: true,
              erp: true,
              digital_folder: true,
              promob: true,
            },
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar planos:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSaveSaaSPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlans(true);
    setPlansError(null);
    setPlansSavedSuccess(false);

    const res = await saveSaaSPlansConfig({
      basicPrice: Number(saasPlans.basicPrice),
      proPrice: Number(saasPlans.proPrice),
      leadPrice: Number(saasPlans.leadPrice),
      basicModules: saasPlans.basicModules,
      proModules: saasPlans.proModules,
    });

    setSavingPlans(false);

    if (res.success) {
      setPlansSavedSuccess(true);
      setTimeout(() => setPlansSavedSuccess(false), 4000);
      await loadSaaSPlans();
    } else {
      setPlansError(res.error || 'Erro ao salvar configuração dos planos.');
    }
  };

  useEffect(() => {
    setLoadingUsers(true);
    supabase
      .from('users')
      .select('id, full_name, email, role')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRealUsers(
            data.map(u => ({
              id: u.id,
              name: u.full_name || u.email.split('@')[0],
              email: u.email,
              role: u.role === 'platform_admin' ? 'Super Admin (SaaS)' : u.role === 'store_owner' ? 'Lojista Parceiro' : 'Consultor'
            }))
          );
        }
        setLoadingUsers(false);
      });
  }, []);

  useEffect(() => {
    setTempPrice(baseSquareMeterPrice);
  }, [baseSquareMeterPrice]);

  useEffect(() => {
    setTempCityPrices(cityM2Prices || {});
  }, [cityM2Prices]);

  const handleAddCity = () => {
    const trimmed = newCityName.trim();
    if (!trimmed || newCityPrice <= 0) return;
    setTempCityPrices(prev => ({
      ...prev,
      [trimmed]: Number(newCityPrice)
    }));
    setNewCityName('');
    setNewCityPrice(tempPrice || 1400);
  };

  const handleRemoveCity = (city: string) => {
    setTempCityPrices(prev => {
      const copy = { ...prev };
      delete copy[city];
      return copy;
    });
  };

  const handleCityPriceChange = (city: string, price: number) => {
    setTempCityPrices(prev => ({
      ...prev,
      [city]: price
    }));
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    await setBaseSquareMeterPrice(Number(tempPrice), tempCityPrices);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      
      {/* Navigation Sub-tabs */}
      <div className="border-b border-slate-200 px-6 pt-4 flex space-x-6 overflow-x-auto">
        {[
          { id: 'precificacao', label: 'Precificação do m²', icon: DollarSign },
          { id: 'planos', label: 'Planos SaaS & Acessos', icon: Award },
          { id: 'perfil', label: 'Perfil da Empresa', icon: User },
          { id: 'usuarios', label: 'Usuários & Permissões', icon: ShieldCheck },
          { id: 'logo', label: 'Logotipo Oficial', icon: Palette },
          { id: 'integracoes', label: 'Integrações & WhatsApp', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-xs font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-8 max-w-4xl">
        
        {/* PRECIFICAÇÃO TAB */}
        {activeTab === 'precificacao' && (
          <form onSubmit={handleSavePrice} className="space-y-6 text-left">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Configuração de Precificação (m² do MDF)</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Defina o valor base por metro quadrado (m²) de marcenaria em MDF e configure pesos específicos por município.
              </p>
            </div>

            {/* Preço Geral Base */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Valor do Metro Quadrado Base Geral (R$)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-3 text-sm font-extrabold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="50"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-base font-extrabold text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-medium">
                  Valor padrão da plataforma: <strong className="text-slate-700">R$ {baseSquareMeterPrice.toLocaleString('pt-BR')}/m²</strong> (utilizado em cidades sem peso específico configurado).
                </div>
              </div>

              {/* Tabela de Pesos por Cidade */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      Preço do m² Diferenciado por Cidade
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cidades listadas abaixo usarão o valor definido em vez do valor base geral.
                    </p>
                  </div>
                </div>

                {/* Adicionar Nova Cidade */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Nome da cidade (ex: São Paulo, Suzano, Mogi das Cruzes)"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-brand-600"
                  />
                  <div className="relative w-36">
                    <span className="absolute left-3 top-2 text-xs font-extrabold text-slate-400">R$</span>
                    <input
                      type="number"
                      placeholder="Valor m²"
                      min="100"
                      step="50"
                      value={newCityPrice}
                      onChange={(e) => setNewCityPrice(Number(e.target.value))}
                      className="w-full pl-9 pr-2 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-brand-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCity}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Cidade</span>
                  </button>
                </div>

                {/* Lista de Cidades Configuradas */}
                {Object.keys(tempCityPrices).length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(tempCityPrices).map(([city, price]) => (
                      <div
                        key={city}
                        className="bg-white p-2.5 px-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-extrabold text-slate-800">{city}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1.5 text-[11px] font-extrabold text-slate-400">R$</span>
                            <input
                              type="number"
                              min="100"
                              step="50"
                              value={price}
                              onChange={(e) => handleCityPriceChange(city, Number(e.target.value))}
                              className="w-full pl-8 pr-2 py-1 rounded border border-slate-200 text-xs font-extrabold text-[#439346] outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCity(city)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Remover valor desta cidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white/60 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                    Nenhuma cidade com peso individual. Todas as regiões utilizarão o preço padrão de R$ {tempPrice}/m².
                  </div>
                )}
              </div>

              {/* Simulação em Tempo Real no Admin */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-900">Exemplo de Cálculo para um Cômodo de 12m² (3 Paredes):</div>
                <div className="text-slate-600 font-medium">
                  Projeção estimada de marcenaria: <strong>~20.3 m²</strong>
                </div>
                <div className="text-[#439346] font-extrabold">
                  Faixa Geral: R$ {Math.round((20.3 * tempPrice * 0.88) / 100) * 100} a R$ {Math.round((20.3 * tempPrice * 1.15) / 100) * 100}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider shadow-blue-glow transition-all active:scale-95 cursor-pointer"
              >
                Salvar Precificação da Plataforma
              </button>

              {savedSuccess && (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <Check className="w-4 h-4" />
                  <span>Precificação atualizada com sucesso!</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* PLANOS SAAS & ACESSOS TAB */}
        {activeTab === 'planos' && (
          <form onSubmit={handleSaveSaaSPlans} className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-brand-600" />
                  <span>Configuração dos Planos de Assinatura & Acessos B2B</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Defina os valores das mensalidades, a taxa por lead e controle quais módulos do sistema são liberados em cada plano.
                </p>
              </div>

              {loadingPlans && (
                <div className="flex items-center space-x-2 text-xs font-bold text-brand-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando dados vigentes...</span>
                </div>
              )}
            </div>

            {/* Taxa de Lead Unificada */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Taxa Padrão por Lead Enviado (R$)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Valor cobrado na fatura mensal por cada lead qualificado roteado à loja credenciada.
                </p>
              </div>

              <div className="relative w-44 shrink-0">
                <span className="absolute left-4 top-2.5 text-sm font-extrabold text-slate-400">R$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={saasPlans.leadPrice}
                  onChange={(e) => setSaasPlans(prev => ({ ...prev, leadPrice: Number(e.target.value) }))}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 outline-none focus:border-brand-600 bg-white"
                />
              </div>
            </div>

            {/* Grid dos Dois Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* PLANO BÁSICO */}
              <div className="p-6 rounded-3xl border-2 border-slate-200 bg-white shadow-xs space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        Plano Básico
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-2">Plano Básico</h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mensalidade</span>
                      <div className="relative w-32 inline-block">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={saasPlans.basicPrice}
                          onChange={(e) => setSaasPlans(prev => ({ ...prev, basicPrice: Number(e.target.value) }))}
                          className="w-full pl-9 pr-2 py-1.5 rounded-lg border border-slate-300 text-sm font-black text-slate-900 outline-none focus:border-brand-600 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limite de Usuários */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-2.5">
                    <Users className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">1 Acesso por Loja</div>
                      <div className="text-[11px] text-slate-500 font-medium">Restrito ao Gerente / Proprietário da loja</div>
                    </div>
                  </div>

                  {/* Seleção de Módulos */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Módulos do Sistema Liberados:
                    </div>

                    {[
                      { key: 'crm', label: 'CRM de Oportunidades & Funil Kanban', desc: 'Gestão de etapas comerciais e leads' },
                      { key: 'simulator', label: 'Simulador 3D de Ambientes & Cálculo m²', desc: 'Orçamentação preliminar de cômodos' },
                      { key: 'meta', label: 'Tráfego Pago & Meta Ads Exclusivo', desc: 'Captação oficial no Instagram/Facebook' },
                      { key: 'erp', label: 'ERP de Produção & Fases do Pedido', desc: 'Medição, corte, montagem e pós-venda' },
                      { key: 'digital_folder', label: 'Pasta Digital de Documentos', desc: 'Upload de contratos, projetos e termos' },
                      { key: 'promob', label: 'Integração Promob & Arquivos 3D', desc: 'Importação de projetos de fábrica' },
                    ].map((mod) => {
                      const isChecked = Boolean((saasPlans.basicModules as any)[mod.key]);
                      return (
                        <label
                          key={mod.key}
                          className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-slate-50 border-slate-300'
                              : 'bg-white border-dashed border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSaasPlans(prev => ({
                                ...prev,
                                basicModules: {
                                  ...prev.basicModules,
                                  [mod.key]: checked,
                                },
                              }));
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">{mod.label}</span>
                            <span className="text-[11px] text-slate-500">{mod.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PLANO PRO */}
              <div className="p-6 rounded-3xl border-2 border-emerald-500 bg-white shadow-sm space-y-5 flex flex-col justify-between relative">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Plano Pro (Recomendado)
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-2">Plano Pro</h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mensalidade</span>
                      <div className="relative w-32 inline-block">
                        <span className="absolute left-3 top-2 text-xs font-bold text-emerald-600">R$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={saasPlans.proPrice}
                          onChange={(e) => setSaasPlans(prev => ({ ...prev, proPrice: Number(e.target.value) }))}
                          className="w-full pl-9 pr-2 py-1.5 rounded-lg border border-emerald-300 text-sm font-black text-emerald-700 outline-none focus:border-emerald-600 bg-emerald-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Limite de Usuários */}
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center space-x-2.5">
                    <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-emerald-900">Até 3 Acessos por Loja</div>
                      <div className="text-[11px] text-emerald-700 font-medium">1 Gerente, 1 Vendedor e 1 Montador</div>
                    </div>
                  </div>

                  {/* Seleção de Módulos */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Módulos do Sistema Liberados:
                    </div>

                    {[
                      { key: 'crm', label: 'CRM de Oportunidades & Funil Kanban', desc: 'Gestão de etapas comerciais e leads' },
                      { key: 'simulator', label: 'Simulador 3D de Ambientes & Cálculo m²', desc: 'Orçamentação preliminar de cômodos' },
                      { key: 'meta', label: 'Tráfego Pago & Meta Ads Exclusivo', desc: 'Captação oficial no Instagram/Facebook' },
                      { key: 'erp', label: 'ERP de Produção & Fases do Pedido', desc: 'Medição, corte, montagem e pós-venda' },
                      { key: 'digital_folder', label: 'Pasta Digital de Documentos', desc: 'Upload de contratos, projetos e termos' },
                      { key: 'promob', label: 'Integração Promob & Arquivos 3D', desc: 'Importação de projetos de fábrica' },
                    ].map((mod) => {
                      const isChecked = Boolean((saasPlans.proModules as any)[mod.key]);
                      return (
                        <label
                          key={mod.key}
                          className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50/40 border-emerald-300'
                              : 'bg-white border-dashed border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSaasPlans(prev => ({
                                ...prev,
                                proModules: {
                                  ...prev.proModules,
                                  [mod.key]: checked,
                                },
                              }));
                            }}
                            className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">{mod.label}</span>
                            <span className="text-[11px] text-slate-500">{mod.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Aviso de Auditoria e Versionamento Temporal */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start space-x-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-extrabold text-blue-900">
                  Versionamento e Proteção de Histórico Contábil
                </div>
                <div className="text-blue-800 text-[11px] leading-relaxed">
                  As alterações de preços e módulos entram em vigor imediatamente para os novos ciclos de faturamento. Faturas de meses anteriores, registros fechados e comprovantes Pix emitidos no passado permanecem <strong>100% inalterados e congelados</strong> com os valores históricos originais.
                </div>
              </div>
            </div>

            {plansError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{plansError}</span>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-2">
              <button
                type="submit"
                disabled={savingPlans}
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider shadow-blue-glow transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
              >
                {savingPlans ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Planos...</span>
                  </>
                ) : (
                  <span>Salvar Configuração dos Planos</span>
                )}
              </button>

              {plansSavedSuccess && (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>Configuração dos planos atualizada com versionamento auditado!</span>
                </div>
              )}
            </div>
          </form>
        )}

        {activeTab === 'perfil' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Perfil da Plataforma</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Comercial</label>
                <input
                  type="text"
                  defaultValue="PlanejaFácil - Móveis Sob Medida"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Central do SaaS</label>
                <input
                  type="email"
                  defaultValue="wrehdervalle@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Domínio Oficial</label>
                <input
                  type="text"
                  defaultValue="www.useplanejafacil.com"
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="space-y-5 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Gestão de Equipe & Usuários Reais</h3>
                <p className="text-xs text-slate-500">Contas oficiais cadastradas no PostgreSQL do Supabase.</p>
              </div>
              {loadingUsers && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
            </div>

            <div className="space-y-3">
              {realUsers.length > 0 ? (
                realUsers.map((u) => (
                  <div key={u.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between bg-white shadow-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    </div>
                    <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-200">
                      {u.role}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                  Nenhum usuário adicional cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logo' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Logotipo Oficial Ativo</h3>
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="PlanejaFácil Logo Oficial" 
                  className="h-20 w-auto object-contain mx-auto"
                />
              </div>
              <div className="text-xs font-bold text-slate-700">PlanejaFácil - Móveis Sob Medida</div>
              <p className="text-[11px] text-slate-500">Logotipo oficial configurado como padrão da plataforma.</p>
            </div>
          </div>
        )}

        {activeTab === 'integracoes' && (
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Integrações Oficiais do SaaS</h3>
              <p className="text-xs text-slate-500">APIs configuradas para roteamento, notificações e captura omni-channel.</p>
            </div>

            <div className="space-y-4">
              {/* Meta Business App Oficial */}
              <div className="p-5 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-[#1B2B48] to-[#0A192F] text-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-md">
                      M
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-sm flex items-center gap-2">
                        <span>Meta for Developers (Instagram, Facebook & WhatsApp)</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                          App Configurado
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">
                        App ID: 1113302228332124 • Planeja Fácil
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Domínio Registrado</span>
                    <div className="font-mono text-emerald-400 font-bold">useplanejafacil.com</div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Canal dos Lojistas</span>
                    <div className="text-slate-200 font-bold">Exclusivo Plano Pro (Sem Custo por Lead)</div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Business API */}
              <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl font-bold">WA</div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">WhatsApp Business API</div>
                    <div className="text-xs text-slate-400">Encaminhamento automático de leads aos parceiros.</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                  ● Conectado
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
