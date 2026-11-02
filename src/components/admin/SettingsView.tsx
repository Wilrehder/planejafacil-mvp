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
  MapPin
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { baseSquareMeterPrice, cityM2Prices, setBaseSquareMeterPrice } = useApp();
  const [activeTab, setActiveTab] = useState<'precificacao' | 'perfil' | 'usuarios' | 'logo' | 'integracoes'>('precificacao');
  const [tempPrice, setTempPrice] = useState<number>(baseSquareMeterPrice);
  const [tempCityPrices, setTempCityPrices] = useState<Record<string, number>>(cityM2Prices || {});
  const [newCityName, setNewCityName] = useState('');
  const [newCityPrice, setNewCityPrice] = useState<number>(1400);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

      <div className="p-6 sm:p-8 max-w-3xl">
        
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

        {activeTab === 'perfil' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Perfil da Empresa</h3>
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  defaultValue="contato@planejafacil.com.br"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CNPJ</label>
                <input
                  type="text"
                  defaultValue="48.123.456/0001-90"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <button className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs uppercase tracking-wider shadow-blue-glow">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="space-y-5 text-left">
            <h3 className="text-lg font-bold text-slate-900">Gestão de Equipe & Permissões</h3>
            <div className="space-y-3">
              {[
                { name: 'Gabriel Torres (Admin)', role: 'Super Admin', email: 'gabriel@planejafacil.com.br' },
                { name: 'Juliana Paes', role: 'Gerente Comercial', email: 'juliana@planejafacil.com.br' },
                { name: 'Lucas Amaral', role: 'Suporte Lojistas', email: 'lucas@planejafacil.com.br' },
              ].map((u) => (
                <div key={u.email} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-200">
                    {u.role}
                  </span>
                </div>
              ))}
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
