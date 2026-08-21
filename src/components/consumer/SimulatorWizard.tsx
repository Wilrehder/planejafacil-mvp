import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Bath, 
  Bed, 
  Box, 
  Briefcase, 
  Check, 
  ChefHat, 
  ChevronRight, 
  Flame, 
  Laptop, 
  Plus, 
  Printer, 
  Ruler, 
  ShieldCheck, 
  Shirt, 
  Sofa, 
  Trash2, 
  Tv, 
  WashingMachine, 
  Zap 
} from 'lucide-react';
import { 
  ENVIRONMENT_CATALOG, 
  ENVIRONMENT_SPECIFIC_ITEMS_MAP, 
  FINISH_OPTIONS_CATALOG, 
  GENERAL_WALL_FURNITURE, 
  PURCHASE_TIMELINES_CATALOG, 
  QUALITY_TIERS 
} from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { ConfiguredEnvironment, EnvironmentTypeId, FinishTypeId, PurchaseTimelineId, QualityTierId, WallId } from '../../types';
import { ProposalPdfModal } from './ProposalPdfModal';

export const SimulatorWizard: React.FC = () => {
  const { 
    simulator, 
    updateSimulator, 
    addEnvironment, 
    updateEnvironment, 
    removeEnvironment, 
    updateEnvironmentWall, 
    calculateEstimate, 
    addLead,
    setConsumerTab 
  } = useApp();

  const [activeWallId, setActiveWallId] = useState<WallId>('wallA');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [newEnvTypeId, setNewEnvTypeId] = useState<EnvironmentTypeId>('cozinha');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvArea, setNewEnvArea] = useState(12);
  const [newEnvWallCount, setNewEnvWallCount] = useState<1 | 2 | 3 | 4>(3);

  const currentEditingEnv = simulator.environments.find((e) => e.id === simulator.currentEditingEnvId) || simulator.environments[0];

  // Helper for environment icons
  const renderEnvIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'ChefHat': return <ChefHat className={className} />;
      case 'Sofa': return <Sofa className={className} />;
      case 'Bed': return <Bed className={className} />;
      case 'Shirt': return <Shirt className={className} />;
      case 'Laptop': return <Laptop className={className} />;
      case 'Bath': return <Bath className={className} />;
      case 'WashingMachine': return <WashingMachine className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Tv': return <Tv className={className} />;
      default: return <Box className={className} />;
    }
  };

  const handleStartAddingEnv = (typeId: EnvironmentTypeId) => {
    const catalogItem = ENVIRONMENT_CATALOG.find((e) => e.id === typeId);
    const countSameType = simulator.environments.filter((e) => e.typeId === typeId).length;
    const defaultName = countSameType > 0 ? `${catalogItem?.title || 'Ambiente'} ${countSameType + 1}` : (catalogItem?.title || 'Ambiente');
    
    setNewEnvTypeId(typeId);
    setNewEnvName(defaultName);
    setNewEnvArea(12);
    setNewEnvWallCount(3);
    updateSimulator({ step: 2 });
  };

  const handleSaveEnvInfo = () => {
    const createdEnv = addEnvironment(newEnvTypeId, newEnvName, newEnvArea, newEnvWallCount);
    setActiveWallId('wallA');
    updateSimulator({ currentEditingEnvId: createdEnv.id, step: 3 });
  };

  const handleNextFromStep3 = () => {
    // Salva e avança para a lista de ambientes ou finalização
    updateSimulator({ step: 1 });
  };

  const handleGoToFinalization = () => {
    calculateEstimate();
    updateSimulator({ step: 4 });
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    calculateEstimate();
    
    const envSummaryStr = simulator.environments.map((e) => `${e.name} (${e.areaM2}m²)`).join(', ');

    addLead({
      name: simulator.clientInfo.name || 'Cliente Simulação',
      phone: simulator.clientInfo.phone || '(11) 99999-9999',
      whatsapp: simulator.clientInfo.phone || '(11) 99999-9999',
      email: simulator.clientInfo.email || 'cliente@email.com',
      city: simulator.clientInfo.city || 'São Paulo',
      state: simulator.clientInfo.state || 'SP',
      cep: simulator.clientInfo.cep || '04538-133',
      environment: envSummaryStr,
      qualityTier: QUALITY_TIERS.find((q) => q.id === simulator.qualityTierId)?.title,
      finishPattern: FINISH_OPTIONS_CATALOG.find((f) => f.id === simulator.finishTypeId)?.title,
      purchaseTimeline: PURCHASE_TIMELINES_CATALOG.find((p) => p.id === simulator.purchaseTimelineId)?.title,
      environmentsData: simulator.environments,
      estimatedMin: simulator.calculatedRange.min,
      estimatedMax: simulator.calculatedRange.max,
    });

    updateSimulator({ step: 5 });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Top Navigation Bar */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => {
            if (simulator.step > 1) {
              updateSimulator({ step: simulator.step - 1 });
            } else {
              setConsumerTab('landing');
            }
          }}
          className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{simulator.step === 1 ? 'Voltar para Início' : 'Voltar'}</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          <span className="text-emerald-600">Etapa {simulator.step}</span> de 5
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${(simulator.step / 5) * 100}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: ESCOLHA DO AMBIENTE OU LISTA DE AMBIENTES CADASTRADOS */}
      {/* ========================================================================= */}
      {simulator.step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {simulator.environments.length > 0 ? 'Seus Ambientes Configurados' : 'Qual ambiente você deseja mobiliar?'}
            </h2>
            <p className="text-sm text-slate-600">
              {simulator.environments.length > 0
                ? 'Você pode adicionar outros cômodos ou avançar para finalizar o orçamento.'
                : 'Selecione um cômodo para começar a configurar os móveis.'}
            </p>
          </div>

          {/* Configured Environments List Summary */}
          {simulator.environments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ambientes no Projeto ({simulator.environments.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {simulator.environments.map((env) => {
                  const envCatalog = ENVIRONMENT_CATALOG.find((e) => e.id === env.typeId);
                  const totalMeters = env.walls.reduce((acc, w) => acc + w.length, 0);

                  return (
                    <div
                      key={env.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          {renderEnvIcon(envCatalog?.iconName || 'Box', 'w-5 h-5')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{env.name}</div>
                          <div className="text-xs text-slate-500">
                            {env.areaM2}m² • {env.wallCount} {env.wallCount === 1 ? 'parede' : 'paredes'} ({totalMeters.toFixed(1)}m)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            updateSimulator({ currentEditingEnvId: env.id, step: 3 });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeEnvironment(env.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remover ambiente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Deseja adicionar mais um cômodo ao projeto?
                </div>
                <button
                  onClick={handleGoToFinalization}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                >
                  <span>Avançar para Etapa Final</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Environment Catalog Selection Grid */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {simulator.environments.length > 0 ? 'Adicionar Outro Ambiente:' : 'Selecione o Ambiente:'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {ENVIRONMENT_CATALOG.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleStartAddingEnv(item.id as EnvironmentTypeId)}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 hover:shadow-md transition-all text-left flex flex-col justify-between space-y-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                    {renderEnvIcon(item.iconName, 'w-5 h-5')}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: INFORMAÇÕES DO AMBIENTE (NOME, ÁREA M², QTD PAREDES) */}
      {/* ========================================================================= */}
      {simulator.step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Informações do Ambiente
            </h2>
            <p className="text-sm text-slate-600">
              Defina o nome e o tamanho aproximado para calcularmos os móveis.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-w-2xl mx-auto shadow-sm">
            
            {/* Nome do Ambiente */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nome do Ambiente
              </label>
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="ex.: Cozinha Principal, Quarto Casal"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 font-semibold text-sm outline-none"
              />
            </div>

            {/* Área Aproximada m² */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Área Aproximada do Cômodo
                </label>
                <span className="text-emerald-700 font-extrabold text-sm">{newEnvArea} m²</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                step="1"
                value={newEnvArea}
                onChange={(e) => setNewEnvArea(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Compacto (4m²)</span>
                <span>Médio (15m²)</span>
                <span>Grande (60m²)</span>
              </div>
            </div>

            {/* Quantas paredes receberão móveis */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quantas paredes receberão móveis planejados?
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNewEnvWallCount(count as 1 | 2 | 3 | 4)}
                    className={`py-3.5 px-4 rounded-xl font-bold text-sm border transition-all ${
                      newEnvWallCount === count
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {count} {count === 1 ? 'Parede' : 'Paredes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSaveEnvInfo}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <span>Configurar Paredes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: CONFIGURAÇÃO DAS PAREDES DO AMBIENTE ATUAL */}
      {/* ========================================================================= */}
      {simulator.step === 3 && currentEditingEnv && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Configuração das Paredes — {currentEditingEnv.name}
            </h2>
            <p className="text-sm text-slate-600">
              Informe o comprimento de cada parede e marque os móveis desejados.
            </p>
          </div>

          {/* Wall Tabs Bar (Parede A, Parede B, Parede C...) */}
          <div className="flex items-center justify-center space-x-2 border-b border-slate-200 pb-4">
            {currentEditingEnv.walls.map((wall) => {
              const isActive = wall.id === activeWallId;
              return (
                <button
                  key={wall.id}
                  onClick={() => setActiveWallId(wall.id)}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {wall.label} ({wall.length}m)
                </button>
              );
            })}
          </div>

          {/* Current Active Wall Config Card */}
          {(() => {
            const currentWall = currentEditingEnv.walls.find((w) => w.id === activeWallId) || currentEditingEnv.walls[0];
            const specificItemsList = ENVIRONMENT_SPECIFIC_ITEMS_MAP[currentEditingEnv.typeId] || ENVIRONMENT_SPECIFIC_ITEMS_MAP['outro'];

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-sm">
                
                {/* Comprimento da Parede */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Comprimento da {currentWall.label} (em metros)
                    </label>
                    <span className="text-emerald-700 font-extrabold text-base">{currentWall.length} metros</span>
                  </div>
                  
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={currentWall.length}
                    onChange={(e) => {
                      updateEnvironmentWall(currentEditingEnv.id, currentWall.id, { length: Number(e.target.value) });
                    }}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                    <span>1.0m (Pequeno)</span>
                    <span>5.0m (Médio)</span>
                    <span>10.0m (Grande)</span>
                  </div>
                </div>

                {/* Móveis Gerais para esta Parede */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Móveis nesta parede:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GENERAL_WALL_FURNITURE.map((furn) => {
                      const isSelected = currentWall.selectedFurnitureTypes.includes(furn.id);
                      return (
                        <button
                          key={furn.id}
                          type="button"
                          onClick={() => {
                            const current = currentWall.selectedFurnitureTypes || [];
                            const next = isSelected ? current.filter((id) => id !== furn.id) : [...current, furn.id];
                            updateEnvironmentWall(currentEditingEnv.id, currentWall.id, { selectedFurnitureTypes: next });
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{furn.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">{furn.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Itens Específicos do Ambiente */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Itens Específicos para {currentEditingEnv.name}:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {specificItemsList.map((item) => {
                      const isSelected = currentWall.selectedSpecificItems.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const current = currentWall.selectedSpecificItems || [];
                            const next = isSelected ? current.filter((id) => id !== item.id) : [...current, item.id];
                            updateEnvironmentWall(currentEditingEnv.id, currentWall.id, { selectedSpecificItems: next });
                          }}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs text-left font-semibold transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{item.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save and Continue Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Navegue entre as abas das paredes para configurar todas.
                  </div>

                  <button
                    type="button"
                    onClick={handleNextFromStep3}
                    className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
                  >
                    <span>Salvar Ambiente & Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: PADRÃO DE QUALIDADE, ACABAMENTO, PRAZO & DADOS DO CLIENTE */}
      {/* ========================================================================= */}
      {simulator.step === 4 && (
        <form onSubmit={handleSubmitLead} className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Opções Finais do Projeto
            </h2>
            <p className="text-sm text-slate-600">
              Selecione o padrão desejado para gerarmos a estimativa precisa.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-sm">
            
            {/* Padrão Desejado */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Padrão de Qualidade Desejado
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUALITY_TIERS.map((tier) => {
                  const isSelected = simulator.qualityTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => updateSimulator({ qualityTierId: tier.id as QualityTierId })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{tier.title}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{tier.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acabamento */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Acabamento Preferido
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {FINISH_OPTIONS_CATALOG.map((finish) => {
                  const isSelected = simulator.finishTypeId === finish.id;
                  return (
                    <button
                      key={finish.id}
                      type="button"
                      onClick={() => updateSimulator({ finishTypeId: finish.id as FinishTypeId })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{finish.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prazo da Compra */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Prazo Previsto para a Compra
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PURCHASE_TIMELINES_CATALOG.map((time) => {
                  const isSelected = simulator.purchaseTimelineId === time.id;
                  return (
                    <button
                      key={time.id}
                      type="button"
                      onClick={() => updateSimulator({ purchaseTimelineId: time.id as PurchaseTimelineId })}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {time.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dados do Cliente para envio */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Seus Dados para Ver o Orçamento Estimado
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Seu Nome Completo"
                  value={simulator.clientInfo.name}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, name: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                />

                <input
                  type="tel"
                  required
                  placeholder="Seu Telefone / WhatsApp"
                  value={simulator.clientInfo.phone}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, phone: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                />

                <input
                  type="email"
                  required
                  placeholder="Seu E-mail"
                  value={simulator.clientInfo.email}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, email: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="CEP"
                    value={simulator.clientInfo.cep}
                    onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, cep: e.target.value } })}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  />

                  <input
                    type="text"
                    required
                    placeholder="Sua Cidade"
                    value={simulator.clientInfo.city}
                    onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, city: e.target.value } })}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>Gerar Orçamento Estimado</span>
              </button>
            </div>

          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 5: RESULTADO FINAL & DOWNLOAD DA PROPOSTA / WHATSAPP */}
      {/* ========================================================================= */}
      {simulator.step === 5 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Orçamento Estimado do Seu Projeto
            </h2>
            <p className="text-sm text-slate-600">
              Calculado com base na média regional de lojas parceiras credenciadas.
            </p>
          </div>

          {/* Big Result Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center border border-slate-800">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Estimativa Total ({simulator.environments.length} {simulator.environments.length === 1 ? 'Ambiente' : 'Ambientes'})
            </div>

            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              {formatCurrency(simulator.calculatedRange.min)} <span className="text-slate-500 font-normal text-2xl">a</span> {formatCurrency(simulator.calculatedRange.max)}
            </div>

            <div className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Valor estimado considerando padrão <strong className="text-white">{QUALITY_TIERS.find((q) => q.id === simulator.qualityTierId)?.title}</strong> e acabamento <strong className="text-white">{FINISH_OPTIONS_CATALOG.find((f) => f.id === simulator.finishTypeId)?.title}</strong>.
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Baixar Proposta Técnica em PDF</span>
              </button>

              <button
                onClick={() => {
                  alert('Seu projeto foi enviado com sucesso para a loja parceira da sua região! Um consultor entrará em contato.');
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <span>Solicitar Contato da Loja Parceira</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detailed Environment Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Detalhamento dos Ambientes
            </h3>

            <div className="space-y-4">
              {simulator.environments.map((env) => (
                <div key={env.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{env.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{env.areaM2}m²</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    {env.walls.map((w) => (
                      <div key={w.id} className="flex justify-between text-[11px] text-slate-500">
                        <span>{w.label} ({w.length}m):</span>
                        <span className="font-mono text-slate-700">
                          {w.selectedFurnitureTypes.length} móveis • {w.selectedSpecificItems.length} itens específicos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* PDF Modal Component */}
      {isPdfModalOpen && (
        <ProposalPdfModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} />
      )}

    </div>
  );
};
