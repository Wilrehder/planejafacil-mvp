import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Bath, 
  Bed, 
  Box, 
  ChefHat, 
  Flame, 
  Laptop, 
  Printer, 
  RotateCcw, 
  Shirt, 
  Sofa, 
  Trash2, 
  Tv, 
  WashingMachine, 
  Zap,
  Check
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
import { EnvironmentTypeId, FinishTypeId, PurchaseTimelineId, QualityTierId, WallId } from '../../types';
import { ProposalPdfModal } from './ProposalPdfModal';

// High-quality imagery mapping matching Reference Screen 3
const ENV_IMAGE_MAP: Record<string, string> = {
  cozinha: '/hero_kitchen.png',
  quarto: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
  closet: '/hero_closet.png',
  sala: '/hero_living.png',
  office: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  banheiro: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  lavanderia: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80',
  gourmet: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  painel: '/hero_living.png',
  outro: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
};

export const SimulatorWizard: React.FC = () => {
  const { 
    simulator, 
    updateSimulator, 
    addEnvironment, 
    removeEnvironment, 
    updateEnvironmentWall, 
    calculateEstimate, 
    addLead,
    resetSimulator,
    setConsumerTab 
  } = useApp();

  const [activeWallId, setActiveWallId] = useState<WallId>('wallA');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedEnvTypeId, setSelectedEnvTypeId] = useState<EnvironmentTypeId>('cozinha');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvArea, setNewEnvArea] = useState(12);
  const [newEnvCeilingHeight, setNewEnvCeilingHeight] = useState(2.7);
  const [newEnvWallCount, setNewEnvWallCount] = useState<1 | 2 | 3 | 4>(3);

  const currentEditingEnv = simulator.environments.find((e) => e.id === simulator.currentEditingEnvId) || simulator.environments[0];

  const goToStep = (nextStep: number) => {
    updateSimulator({ step: nextStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetWizard = () => {
    resetSimulator();
    goToStep(1);
  };

  const renderEnvIcon = (iconName: string, className: string = 'w-5 h-5') => {
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

  const handleSelectCategoryAndProceed = (typeId: EnvironmentTypeId) => {
    setSelectedEnvTypeId(typeId);
    const catalogItem = ENVIRONMENT_CATALOG.find((e) => e.id === typeId);
    const countSameType = simulator.environments.filter((e) => e.typeId === typeId).length;
    const defaultName = countSameType > 0 ? `${catalogItem?.title || 'Ambiente'} ${countSameType + 1}` : (catalogItem?.title || 'Ambiente');
    
    setNewEnvName(defaultName);
    setNewEnvArea(12);
    setNewEnvCeilingHeight(2.7);
    setNewEnvWallCount(3);
    goToStep(2);
  };

  const handleSaveEnvInfo = () => {
    const createdEnv = addEnvironment(selectedEnvTypeId, newEnvName, newEnvArea, newEnvWallCount, newEnvCeilingHeight);
    setActiveWallId('wallA');
    updateSimulator({ currentEditingEnvId: createdEnv.id });
    goToStep(3);
  };

  const handleNextFromStep3 = () => {
    goToStep(1);
  };

  const handleGoToFinalization = () => {
    calculateEstimate();
    goToStep(4);
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

    goToStep(5);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 font-sans">
      
      {/* Top Header Bar matching Reference Screen 3 */}
      <div className="mb-6 flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-sm">
        <button
          onClick={() => {
            if (simulator.step > 1) {
              goToStep(simulator.step - 1);
            } else {
              setConsumerTab('landing');
            }
          }}
          className="flex items-center space-x-2 text-xs font-bold text-[#1B2B48] hover:text-[#439346] transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{simulator.step === 1 ? 'Início' : 'Voltar'}</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-extrabold text-[#1B2B48]">Monte seu Projeto</div>
        </div>

        <div className="flex items-center space-x-3">
          {simulator.environments.length > 0 && (
            <button
              onClick={handleResetWizard}
              className="text-xs font-bold text-slate-400 hover:text-red-600 flex items-center space-x-1 transition-colors"
              title="Limpar todos os dados e reiniciar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          )}

          <div className="text-[11px] font-bold text-[#439346] bg-[#EBF7EC] px-2.5 py-1 rounded-full">
            Etapa {simulator.step} de 5
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-[#439346] h-full transition-all duration-300 rounded-full"
          style={{ width: `${(simulator.step / 5) * 100}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: MATCHING REFERENCE SCREEN 3 (MONTE SEU PROJETO + CARDS DE AMBIENTE) */}
      {/* ========================================================================= */}
      {simulator.step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Headline matching Reference Screen 3 */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-[#1B2B48] tracking-tight">
              Monte seu Projeto!
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              Escolha seu tipo de ambiente
            </p>
          </div>

          {/* Configured Environments Banner (if user already added 1+) */}
          {simulator.environments.length > 0 && (
            <div className="bg-white rounded-2xl border border border-slate-200/90 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                  Ambientes no Projeto ({simulator.environments.length})
                </h3>
                <button
                  onClick={handleGoToFinalization}
                  className="px-4 py-2 rounded-xl bg-[#439346] text-white font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm hover:bg-[#387F3B]"
                >
                  <span>Avançar para Estimativa</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {simulator.environments.map((env) => {
                  const envCatalog = ENVIRONMENT_CATALOG.find((e) => e.id === env.typeId);

                  return (
                    <div
                      key={env.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-[#F4F6F9] flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-[#EBF7EC] text-[#439346] flex items-center justify-center shrink-0">
                          {renderEnvIcon(envCatalog?.iconName || 'Box', 'w-4 h-4')}
                        </div>
                        <div>
                          <div className="font-bold text-[#1B2B48] text-xs">{env.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {env.areaM2}m² • {env.wallCount} paredes
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            updateSimulator({ currentEditingEnvId: env.id });
                            goToStep(3);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeEnvironment(env.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vertical Environment Card Grid (Matching Reference Image Screen 3 Card Design) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ENVIRONMENT_CATALOG.map((item) => {
                const isSelected = selectedEnvTypeId === item.id;
                const bgImage = ENV_IMAGE_MAP[item.id] || ENV_IMAGE_MAP['outro'];

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEnvTypeId(item.id as EnvironmentTypeId)}
                    className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 bg-white ${
                      isSelected
                        ? 'border-[#439346] shadow-xl ring-2 ring-[#439346]/20 transform scale-[1.01]'
                        : 'border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {/* Top Image Box */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                      <img
                        src={bgImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Category Icon Badge */}
                      <div className="absolute top-3 left-3 p-2 rounded-xl bg-white/90 backdrop-blur-md text-[#1B2B48] shadow">
                        {renderEnvIcon(item.iconName, 'w-4 h-4')}
                      </div>

                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-[#439346] text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Bottom White Label Box (Reference Screen 3 Style with Check Badge) */}
                    <div className="p-4 bg-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {/* Reference Screen 3 Check Box Badge */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-[#439346] border-[#439346] text-white'
                              : 'border-slate-300 bg-slate-50 group-hover:border-[#439346]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="font-extrabold text-[#1B2B48] text-sm group-hover:text-[#439346] transition-colors">
                          {item.title} Planejada
                        </span>
                      </div>
                      
                      <span className="text-[11px] font-semibold text-slate-400 line-clamp-1">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Action Button matching Reference Screen 3 "Avançar" */}
          <div className="pt-4 sticky bottom-4 z-20">
            <button
              onClick={() => handleSelectCategoryAndProceed(selectedEnvTypeId)}
              className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-extrabold text-base uppercase tracking-wider transition-all shadow-xl shadow-[#439346]/30 flex items-center justify-center space-x-2"
            >
              <span>Avançar</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: INFORMAÇÕES DO AMBIENTE */}
      {/* ========================================================================= */}
      {simulator.step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Informações do Ambiente
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Defina o nome, pé-direito e tamanho aproximado para calcularmos os móveis.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-6 max-w-2xl mx-auto shadow-md">
            
            {/* Nome do Ambiente */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                Nome do Ambiente
              </label>
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="ex.: Cozinha Principal, Quarto Casal"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 text-[#1B2B48] font-semibold text-sm outline-none"
              />
            </div>

            {/* Pé-direito */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                  Pé-direito (Altura do Teto)
                </label>
                <span className="text-[#439346] font-extrabold text-sm">{newEnvCeilingHeight}m</span>
              </div>
              <input
                type="range"
                min="2.4"
                max="4.0"
                step="0.1"
                value={newEnvCeilingHeight}
                onChange={(e) => setNewEnvCeilingHeight(Number(e.target.value))}
                className="w-full accent-[#439346]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Padrão (2.4m)</span>
                <span>Médio (2.7m)</span>
                <span>Pé-direito Duplo (4.0m)</span>
              </div>
            </div>

            {/* Área m² */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                  Área Aproximada do Cômodo
                </label>
                <span className="text-[#439346] font-extrabold text-sm">{newEnvArea} m²</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                step="1"
                value={newEnvArea}
                onChange={(e) => setNewEnvArea(Number(e.target.value))}
                className="w-full accent-[#439346]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>Compacto (4m²)</span>
                <span>Médio (15m²)</span>
                <span>Grande (60m²)</span>
              </div>
            </div>

            {/* Quantas paredes receberão móveis */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                Quantas paredes receberão móveis planejados?
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNewEnvWallCount(count as 1 | 2 | 3 | 4)}
                    className={`py-3.5 px-4 rounded-xl font-extrabold text-sm border transition-all ${
                      newEnvWallCount === count
                        ? 'bg-[#439346] text-white border-[#439346] shadow-md'
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
                className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/20"
              >
                <span>Configurar Paredes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: CONFIGURAÇÃO DAS PAREDES */}
      {/* ========================================================================= */}
      {simulator.step === 3 && currentEditingEnv && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Configuração das Paredes — {currentEditingEnv.name}
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Informe o comprimento de cada parede e marque os móveis desejados.
            </p>
          </div>

          {/* Wall Tabs Bar */}
          <div className="flex items-center justify-center space-x-2 border-b border-slate-200 pb-4">
            {currentEditingEnv.walls.map((wall) => {
              const isActive = wall.id === activeWallId;
              return (
                <button
                  key={wall.id}
                  onClick={() => setActiveWallId(wall.id)}
                  className={`px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all ${
                    isActive
                      ? 'bg-[#1B2B48] text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {wall.label} ({wall.length}m)
                </button>
              );
            })}
          </div>

          {/* Active Wall Config Card */}
          {(() => {
            const currentWall = currentEditingEnv.walls.find((w) => w.id === activeWallId) || currentEditingEnv.walls[0];
            const specificItemsList = ENVIRONMENT_SPECIFIC_ITEMS_MAP[currentEditingEnv.typeId] || ENVIRONMENT_SPECIFIC_ITEMS_MAP['outro'];

            return (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-8 shadow-md">
                
                {/* Comprimento */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                      Comprimento da {currentWall.label} (em metros)
                    </label>
                    <span className="text-[#439346] font-extrabold text-base">{currentWall.length} metros</span>
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
                    className="w-full accent-[#439346]"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                    <span>1.0m (Pequeno)</span>
                    <span>5.0m (Médio)</span>
                    <span>10.0m (Grande)</span>
                  </div>
                </div>

                {/* Móveis Gerais */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                    Móveis nesta parede:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GENERAL_WALL_FURNITURE.map((furn) => {
                      const isSelected = (currentWall.selectedFurnitureTypes || []).includes(furn.id);
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
                              ? 'bg-[#EBF7EC] border-[#439346] text-[#1B2B48] font-bold shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{furn.title}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#439346] shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">{furn.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Itens Específicos */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                    Itens Específicos para {currentEditingEnv.name}:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {specificItemsList.map((item) => {
                      const isSelected = (currentWall.selectedSpecificItems || []).includes(item.id);
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
                              ? 'bg-[#1B2B48] text-white border-[#1B2B48] shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{item.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#439346] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save and Continue Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-medium">
                    Alterne entre as abas das paredes para configurar tudo.
                  </div>

                  <button
                    type="button"
                    onClick={handleNextFromStep3}
                    className="px-8 py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-md"
                  >
                    <span>Salvar & Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: OPÇÕES FINAIS & FORMULÁRIO DO CLIENTE */}
      {/* ========================================================================= */}
      {simulator.step === 4 && (
        <form onSubmit={handleSubmitLead} className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Opções Finais do Projeto
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Selecione o padrão desejado para gerarmos a estimativa precisa.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-8 shadow-md">
            
            {/* Padrão Desejado */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
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
                          ? 'bg-[#EBF7EC] border-[#439346] text-[#1B2B48] shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{tier.title}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#439346] shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{tier.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acabamento */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
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
                          ? 'bg-[#1B2B48] text-white border-[#1B2B48]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{finish.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#439346] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prazo */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
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
                      className={`p-3 rounded-xl border text-xs font-extrabold text-center transition-all ${
                        isSelected
                          ? 'bg-[#439346] text-white border-[#439346]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {time.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form de Contato */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                Seus Dados para Ver o Orçamento Estimado
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Seu Nome Completo"
                  value={simulator.clientInfo.name}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, name: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />

                <input
                  type="tel"
                  required
                  placeholder="Seu Telefone / WhatsApp"
                  value={simulator.clientInfo.phone}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, phone: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />

                <input
                  type="email"
                  required
                  placeholder="Seu E-mail"
                  value={simulator.clientInfo.email}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, email: e.target.value } })}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="CEP"
                    value={simulator.clientInfo.cep}
                    onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, cep: e.target.value } })}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                  />

                  <input
                    type="text"
                    required
                    placeholder="Sua Cidade"
                    value={simulator.clientInfo.city}
                    onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, city: e.target.value } })}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/25"
              >
                <span>Gerar Orçamento Estimado</span>
              </button>
            </div>

          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 5: RESULTADO FINAL */}
      {/* ========================================================================= */}
      {simulator.step === 5 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Orçamento Estimado do Seu Projeto
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Calculado com base na média regional de lojas parceiras credenciadas.
            </p>
          </div>

          {/* Result Card */}
          <div className="bg-[#1B2B48] text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center border border-[#283D64]">
            <div className="text-xs font-bold text-[#439346] uppercase tracking-widest bg-[#EBF7EC] text-[#439346] w-fit mx-auto px-4 py-1.5 rounded-full">
              Estimativa Total ({simulator.environments.length} {simulator.environments.length === 1 ? 'Ambiente' : 'Ambientes'})
            </div>

            <div className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatCurrency(simulator.calculatedRange.min)} <span className="text-slate-400 font-normal text-2xl">a</span> {formatCurrency(simulator.calculatedRange.max)}
            </div>

            <div className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed font-medium">
              Valor estimado considerando padrão <strong className="text-white">{QUALITY_TIERS.find((q) => q.id === simulator.qualityTierId)?.title}</strong> e acabamento <strong className="text-white">{FINISH_OPTIONS_CATALOG.find((f) => f.id === simulator.finishTypeId)?.title}</strong>.
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-[#1B2B48] hover:bg-slate-100 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md"
              >
                <Printer className="w-4 h-4 text-[#1B2B48]" />
                <span>Baixar Proposta Técnica em PDF</span>
              </button>

              <button
                onClick={() => setConsumerTab('landing')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md"
              >
                <span>Concluir</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* PDF Modal */}
      {isPdfModalOpen && (
        <ProposalPdfModal onClose={() => setIsPdfModalOpen(false)} />
      )}

    </div>
  );
};
