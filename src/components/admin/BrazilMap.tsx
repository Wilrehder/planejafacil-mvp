import React, { useState } from 'react';
import { Building2, MapPin, TrendingUp, Users } from 'lucide-react';
import { REGIONS_DATA } from '../../data/mockData';
import { RegionStat } from '../../types';

export const BrazilMap: React.FC = () => {
  const [selectedState, setSelectedState] = useState<RegionStat>(REGIONS_DATA[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            <span>Mapa de Distribuição de Leads por Região</span>
          </h3>
          <p className="text-xs text-slate-500">Selecione um estado para visualizar as métricas e lojas ativas na região.</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-500">Total Brasil:</span>
          <span className="font-extrabold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
            1.911 Leads Ativos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Interactive State Selector Grid / Map Graphic */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Selecione a Região</span>
            <span className="text-emerald-400 font-normal">🟢 Cobertura em Tempo Real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {REGIONS_DATA.map((region) => {
              const isSelected = selectedState.stateCode === region.stateCode;
              return (
                <button
                  key={region.stateCode}
                  onClick={() => setSelectedState(region)}
                  className={`p-3 rounded-xl text-center transition-all duration-200 border flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-brand-600 border-brand-400 text-white shadow-blue-glow scale-105'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="font-extrabold text-xl">{region.stateCode}</div>
                  <div className="text-[10px] truncate">{region.name}</div>
                  <div className="text-[11px] font-bold text-emerald-400">{region.leadsCount} leads</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Region Metrics Card */}
        <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">Região Selecionada</span>
              <h4 className="text-2xl font-black text-slate-900">{selectedState.name} ({selectedState.stateCode})</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
              {selectedState.stateCode}
            </div>
          </div>

          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-brand-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Leads Gerados</div>
                  <div className="text-lg font-bold text-slate-900">{selectedState.leadsCount} clientes</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+18% m/m</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Lojas Credenciadas</div>
                  <div className="text-lg font-bold text-slate-900">{selectedState.storesCount} lojas ativas</div>
                </div>
              </div>
              <span className="text-xs text-slate-500">100% ativas</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Volume de Projetos</div>
                  <div className="text-base font-bold text-slate-900">{formatCurrency(selectedState.totalVolume)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
