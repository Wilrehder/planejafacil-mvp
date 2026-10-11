import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  Store, 
  Users, 
  ArrowRight,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminLeadOverview {
  id: string;
  name: string;
  phone: string;
  city_name: string;
  state_uf: string;
  environment_summary: string;
  estimated_min: number;
  estimated_max: number;
  distribution_status: string;
  created_at: string;
  assigned_at: string | null;
  assignment_reason: string | null;
  assigned_store_name: string | null;
  assigned_store_id: string | null;
}

interface AdminStoreOverview {
  id: string;
  name: string;
  city_name: string;
  state_uf: string;
  status: string;
  is_routing_enabled: boolean;
  leads_count_cache: number;
  last_assigned_at: string | null;
  plan_tier: string;
}

export const AdminRoutingQueue: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [uncoveredCount, setUncoveredCount] = useState(0);
  const [stores, setStores] = useState<AdminStoreOverview[]>([]);
  const [recentLeads, setRecentLeads] = useState<AdminLeadOverview[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('Suzano');
  const [activeTab, setActiveTab] = useState<'fila' | 'leads'>('fila');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_routing_overview');
      if (!error && data && data.success) {
        setTotalLeads(data.total_leads || 0);
        setAssignedCount(data.assigned_count || 0);
        setUncoveredCount(data.uncovered_count || 0);
        setStores(data.stores || []);
        setRecentLeads(data.recent_leads || []);

        const cities = Array.from(new Set((data.stores || []).map((s: AdminStoreOverview) => s.city_name))) as string[];
        if (cities.length > 0 && !cities.includes(selectedRegion)) {
          setSelectedRegion(cities[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao consultar fila de roteamento no PostgreSQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const regions = Array.from(new Set(stores.map(s => s.city_name))).filter(Boolean).sort() as string[];
  const storesInRegion = stores.filter(s => s.city_name === selectedRegion);

  // Ordenação Round Robin do PostgreSQL: last_assigned_at ASC NULLS FIRST
  const sortedStores = [...storesInRegion].sort((a, b) => {
    if (!a.is_routing_enabled || a.status !== 'ativa') return 1;
    if (!b.is_routing_enabled || b.status !== 'ativa') return -1;
    if (!a.last_assigned_at && b.last_assigned_at) return -1;
    if (a.last_assigned_at && !b.last_assigned_at) return 1;
    if (!a.last_assigned_at && !b.last_assigned_at) return 0;
    return new Date(a.last_assigned_at!).getTime() - new Date(b.last_assigned_at!).getTime();
  });

  const nextStoreInLine = sortedStores.find(s => s.status === 'ativa' && s.is_routing_enabled);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner de Integração Real Fase 2 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PostgreSQL Live & Stored Procedures
            </span>
            <span className="text-xs text-slate-400 font-medium font-mono">Fase 2 Operacional</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mt-2">
            <MapPin className="w-5 h-5 text-[#439346]" />
            Distribuição Inteligente & Fila Geográfica de Leads
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Prioridade 1 (Mesma Cidade) → Prioridade 2 (Cobertura Regional) → Prioridade 3 (Fila Sem Cobertura).
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition-all self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#439346]' : ''}`} />
          <span>Atualizar Dados Reais</span>
        </button>
      </div>

      {/* KPI Cards Reais do Banco de Dados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Leads Gerados</div>
          <div className="text-3xl font-black text-[#1B2B48] mt-1">{totalLeads}</div>
          <div className="text-xs text-slate-500 mt-1">Persistidos na tabela PostgreSQL <code className="font-mono text-[11px]">leads</code></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Leads Atribuídos a Parceiros</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{assignedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Distribuídos via Round Robin por localidade</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Leads Sem Cobertura (Prioridade 3)</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{uncoveredCount}</div>
          <div className="text-xs text-slate-500 mt-1">Aguardando expansão ou atribuição manual</div>
        </div>
      </div>

      {/* Navegação entre Visão de Fila e Tabela de Leads */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('fila')}
          className={`pb-3 transition-colors ${
            activeTab === 'fila'
              ? 'text-[#439346] border-b-2 border-[#439346]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Fila Geográfica por Município
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'text-[#439346] border-b-2 border-[#439346]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <span>Histórico Real de Leads ({recentLeads.length})</span>
          {uncoveredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
              {uncoveredCount} sem cobertura
            </span>
          )}
        </button>
      </div>

      {activeTab === 'fila' && (
        <div className="space-y-6">
          {/* Region Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Selecione o Município</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visualize a ordem circular de atendimento configurada para esta cidade.</p>
            </div>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-[#439346] bg-slate-50 outline-none w-full sm:w-72 text-sm"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {storesInRegion.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Nenhuma loja cadastrada nesta cidade</h3>
              <p className="text-slate-500 mt-1">Leads gerados nesta localidade serão direcionados para a fila de Cobertura Regional ou Sem Cobertura.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Próximo da Fila Spotlight */}
              {nextStoreInLine && (
                <div className="bg-gradient-to-r from-emerald-600 to-[#1B2B48] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-widest mb-3 border border-white/20">
                        🎯 Próximo da Fila Circular (Round Robin)
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black">{nextStoreInLine.name}</h3>
                      <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-1 flex items-center gap-2">
                        <Store className="w-4 h-4 shrink-0" />
                        Receberá o próximo Lead B2C de {selectedRegion}
                      </p>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[150px]">
                      <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wide">Leads na Conta</div>
                      <div className="text-3xl font-black mt-1">{nextStoreInLine.leads_count_cache}</div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {nextStoreInLine.last_assigned_at 
                          ? `Último: ${new Date(nextStoreInLine.last_assigned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                          : 'Ainda não recebeu'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ordem da Fila Completa */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Ordem do Rodízio Circular ({storesInRegion.length} lojas elegíveis)
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {sortedStores.map((store, index) => {
                    const isNext = store.id === nextStoreInLine?.id;
                    const isPaused = !store.is_routing_enabled || store.status !== 'ativa';

                    return (
                      <div 
                        key={store.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                          isNext 
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' 
                            : isPaused
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
                            isNext ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}º
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-extrabold text-sm sm:text-base ${isNext ? 'text-emerald-900' : 'text-slate-900'}`}>
                                {store.name}
                              </h4>
                              {isPaused && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded">
                                  Pausada
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">
                                Plano {store.plan_tier}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              {store.city_name} • Última Atribuição: {store.last_assigned_at ? new Date(store.last_assigned_at).toLocaleString('pt-BR') : 'Nunca'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mt-4 sm:mt-0">
                          <div className="text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Leads</div>
                            <div className="text-base font-black text-slate-700">{store.leads_count_cache}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Aba de Histórico Real de Leads */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Leads Gravados no PostgreSQL</h3>
              <p className="text-xs text-slate-500">Últimos registros persistidos e roteados pelo sistema.</p>
            </div>
            <div className="text-xs font-bold text-slate-400">Exibindo {recentLeads.length} leads</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Cidade</th>
                  <th className="p-3.5">Orçamento</th>
                  <th className="p-3.5">Status Roteamento</th>
                  <th className="p-3.5">Loja Atribuída</th>
                  <th className="p-3.5">Regra Geográfica</th>
                  <th className="p-3.5">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentLeads.map((lead) => {
                  const isAssigned = lead.distribution_status === 'atribuido';
                  const isUncovered = lead.distribution_status === 'sem_cobertura';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{lead.phone}</div>
                      </td>
                      <td className="p-3.5 font-semibold">
                        {lead.city_name} / {lead.state_uf}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatCurrency(lead.estimated_min)} - {formatCurrency(lead.estimated_max)}
                      </td>
                      <td className="p-3.5">
                        {isAssigned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Atribuído
                          </span>
                        )}
                        {isUncovered && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold">
                            <AlertCircle className="w-3 h-3" /> Sem Cobertura
                          </span>
                        )}
                        {!isAssigned && !isUncovered && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold">
                            <Clock className="w-3 h-3" /> {lead.distribution_status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {lead.assigned_store_name || <span className="text-slate-400 italic">Nenhuma (Fila Admin)</span>}
                      </td>
                      <td className="p-3.5">
                        {lead.assignment_reason === 'same_city_round_robin' && (
                          <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            P1: Mesma Cidade
                          </span>
                        )}
                        {lead.assignment_reason === 'nearby_coverage_fallback' && (
                          <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                            P2: Cobertura Regional
                          </span>
                        )}
                        {isUncovered && (
                          <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            P3: Sem Cobertura
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                        {new Date(lead.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
