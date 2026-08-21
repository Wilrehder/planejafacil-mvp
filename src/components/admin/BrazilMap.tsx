import React, { useState } from 'react';
import { Building2, MapPin, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BrazilMap: React.FC = () => {
  const { leads, stores } = useApp();
  const [selectedStateCode, setSelectedStateCode] = useState<string>('SP');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const regionsList = [
    { stateCode: 'SP', name: 'São Paulo' },
    { stateCode: 'RJ', name: 'Rio de Janeiro' },
    { stateCode: 'PR', name: 'Paraná' },
    { stateCode: 'MG', name: 'Minas Gerais' },
    { stateCode: 'SC', name: 'Santa Catarina' },
  ];

  // Dynamic calculations for SP (where our Smarth House stores are located)
  const getRegionMetrics = (stCode: string) => {
    const matchingLeads = leads.filter((l) => l.state === stCode || (stCode === 'SP' && (!l.state || l.state === 'SP')));
    const matchingStores = stores.filter((s) => s.state === stCode || (stCode === 'SP' && (!s.state || s.state === 'SP')));
    const totalVol = matchingLeads.reduce((acc, l) => acc + (l.estimatedMin + l.estimatedMax) / 2, 0);

    return {
      leadsCount: matchingLeads.length,
      storesCount: matchingStores.length,
      totalVolume: totalVol,
    };
  };

  const currentMetrics = getRegionMetrics(selectedStateCode);
  const currentRegionObj = regionsList.find((r) => r.stateCode === selectedStateCode) || regionsList[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Distribuição de Leads por Região</span>
          </h3>
          <p className="text-xs text-slate-500">Acompanhe as métricas integradas em tempo real com as lojas credenciadas.</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-500">Total no Sistema:</span>
          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {leads.length} Leads Qualificados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Interactive Selector */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-6 rounded-2xl space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Selecione a Região:</span>
            <span className="text-emerald-400 font-normal">● {stores.length} Unidades Credenciadas</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {regionsList.map((reg) => {
              const isSelected = reg.stateCode === selectedStateCode;
              const metrics = getRegionMetrics(reg.stateCode);

              return (
                <button
                  key={reg.stateCode}
                  onClick={() => setSelectedStateCode(reg.stateCode)}
                  className={`p-3 rounded-xl text-center transition-all border flex flex-col justify-between h-22 ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="font-extrabold text-xl">{reg.stateCode}</div>
                  <div className="text-[10px] truncate">{reg.name}</div>
                  <div className="text-[11px] font-bold text-emerald-300">{metrics.leadsCount} leads</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Region Metrics */}
        <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Região Selecionada</span>
              <h4 className="text-xl font-extrabold text-slate-900">{currentRegionObj.name} ({currentRegionObj.stateCode})</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs">
              {currentRegionObj.stateCode}
            </div>
          </div>

          <div className="space-y-3">
            
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Leads Cadastrados</div>
                  <div className="text-base font-extrabold text-slate-900">{currentMetrics.leadsCount} clientes</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Lojas Credenciadas</div>
                  <div className="text-base font-extrabold text-slate-900">{currentMetrics.storesCount} unidades ativas</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Volume Estimado em Projetos</div>
                  <div className="text-base font-extrabold text-slate-900">{formatCurrency(currentMetrics.totalVolume)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
