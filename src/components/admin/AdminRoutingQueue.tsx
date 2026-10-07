import React, { useState } from 'react';
import { 
  MapPin, 
  Store, 
  Users, 
  ArrowRight,
  PauseCircle,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminRoutingQueue: React.FC = () => {
  const { stores, leads } = useApp();
  
  // Extrair cidades únicas das lojas ativas
  const regions = Array.from(new Set(stores.map(s => s.city))).filter(Boolean).sort();
  const [selectedRegion, setSelectedRegion] = useState<string>(regions[0] || '');
  
  // Filtra lojas da cidade selecionada
  const storesInRegion = stores.filter(s => s.city === selectedRegion);
  
  // Filtra leads da região (simulação baseada nas cidades das lojas ou leads atribuídos)
  const regionLeads = leads.filter(l => 
    storesInRegion.some(store => store.id === l.assignedStoreId)
  );

  // Lógica de Fila: Quem tem menos leads é o próximo
  // Em um sistema real, isso viria do backend garantindo a ordem.
  // Aqui vamos simular que a loja com MENOS leads na região é a próxima da fila.
  const storesWithCount = storesInRegion.map(store => {
    const leadCount = regionLeads.filter(l => l.assignedStoreId === store.id).length;
    return { ...store, leadCount };
  }).sort((a, b) => {
    // Se a loja estiver inativa ou pendente, vai pro final ou não recebe
    if (a.status !== 'Ativa') return 1;
    if (b.status !== 'Ativa') return -1;
    // Caso contrário, quem tem menos leads é o próximo
    return a.leadCount - b.leadCount;
  });

  const nextStoreInLine = storesWithCount.find(s => s.status === 'Ativa');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Region Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            Roteamento por Cidade
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Selecione a cidade para visualizar a fila de distribuição e quem receberá o próximo lead.
          </p>
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-brand-600 bg-slate-50 outline-none w-full sm:w-72"
        >
          {regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {storesInRegion.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Nenhuma loja nesta região</h3>
          <p className="text-slate-500 mt-1">Adicione lojas a esta região para iniciar o roteamento de leads.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Próximo da Fila Spotlight */}
          {nextStoreInLine && (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10">
                <Users className="w-64 h-64 -mt-10 -mr-10" />
              </div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-widest mb-3 border border-white/20">
                    🎯 Próximo da Fila
                  </div>
                  <h3 className="text-3xl font-black">{nextStoreInLine.name}</h3>
                  <p className="text-emerald-100 font-medium mt-1 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Receberá o próximo Lead B2C de {selectedRegion}
                  </p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[140px]">
                  <div className="text-sm font-bold text-emerald-100 uppercase tracking-wide">Leads na Região</div>
                  <div className="text-4xl font-black mt-1">{nextStoreInLine.leadCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Fila Completa */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Ordem da Fila de Distribuição</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {storesWithCount.map((store, index) => {
                const isNext = store.id === nextStoreInLine?.id;
                const isPaused = store.status !== 'Ativa';

                return (
                  <div 
                    key={store.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                      isNext 
                        ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-400' 
                        : isPaused
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Posição na Fila */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                        isNext ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-extrabold text-base ${isNext ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {store.name}
                          </h4>
                          {isPaused && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded border border-rose-200">
                              Pausada
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {store.city} • Contato: {store.responsibleName || 'Não informado'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 sm:mt-0">
                      
                      <div className="text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leads Recebidos</div>
                        <div className="text-lg font-black text-slate-700">{store.leadCount}</div>
                      </div>

                      <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                      <button 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                          isPaused
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        onClick={() => alert(`Funcionalidade de ${isPaused ? 'Reativar' : 'Pausar'} será conectada ao backend.`)}
                      >
                        {isPaused ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" /> Reativar Fila
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" /> Pausar Fila
                          </>
                        )}
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
