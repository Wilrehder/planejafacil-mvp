import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Box, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Cpu, 
  FileText, 
  Grid, 
  Layers, 
  MapPin, 
  Maximize2, 
  MessageSquare, 
  Plus, 
  Printer, 
  Ruler, 
  Sliders, 
  Sparkles, 
  Wrench, 
  Zap 
} from 'lucide-react';
import { ADDITIONAL_ITEMS, CORTECLOUD_MODULE_TEMPLATES, DOOR_TYPE_OPTIONS, ENVIRONMENTS, FINISHES, FURNITURE_MODULES, HARDWARE_OPTIONS, LAYOUT_OPTIONS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { CabinetPreview3D } from './CabinetPreview3D';
import { ProposalPdfModal } from './ProposalPdfModal';

export const SimulatorWizard: React.FC = () => {
  const { 
    simulator, 
    updateSimulator, 
    setModuleDimension,
    addPlacedModule,
    removePlacedModule,
    updatePlacedModuleWidth,
    calculateEstimate, 
    setIsLeadCaptureOpen, 
    setConsumerTab 
  } = useApp();
  
  // Local state for calculation loading simulation on Step 8
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcMessageIndex, setCalcMessageIndex] = useState(0);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activeWallTab, setActiveWallTab] = useState<'wallA' | 'wallB' | 'wallC'>('wallB');

  const calcMessages = [
    'Analisando dimensões e volume m² de cada parede...',
    'Consultando tabela de marcenarias parceiras por região...',
    'Calculando especificações de módulos, acabamento e ferragens...',
    'Gerando faixa estimada em tempo real com precisão por parede...'
  ];

  const handleNextStep = () => {
    if (simulator.step < 8) {
      const nextStep = simulator.step + 1;
      updateSimulator({ step: nextStep });

      if (nextStep === 8) {
        triggerCalculationAnimation();
      }
    }
  };

  const handlePrevStep = () => {
    if (simulator.step > 1) {
      updateSimulator({ step: simulator.step - 1 });
    } else {
      setConsumerTab('landing');
    }
  };

  const triggerCalculationAnimation = () => {
    setIsCalculating(true);
    setCalcMessageIndex(0);
    calculateEstimate();

    const interval = setInterval(() => {
      setCalcMessageIndex((prev) => {
        if (prev < calcMessages.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 600);

    setTimeout(() => {
      setIsCalculating(false);
    }, 2500);
  };

  const handleSelectEnvironment = (envId: string) => {
    const availableModules = FURNITURE_MODULES.filter((m) => m.environmentId === envId).map((m) => m.id);
    updateSimulator({ 
      environmentId: envId, 
      selectedFurnitureModuleIds: availableModules,
      step: 2 
    });
  };

  const toggleFurnitureModule = (moduleId: string) => {
    const currentMods = simulator.selectedFurnitureModuleIds || [];
    const exists = currentMods.includes(moduleId);
    if (exists) {
      if (currentMods.length > 1) {
        updateSimulator({
          selectedFurnitureModuleIds: currentMods.filter((id) => id !== moduleId),
        });
      }
    } else {
      updateSimulator({
        selectedFurnitureModuleIds: [...currentMods, moduleId],
      });
    }
  };

  const toggleAdditionalItem = (itemId: string) => {
    const exists = simulator.additionalItemIds.includes(itemId);
    if (exists) {
      updateSimulator({
        additionalItemIds: simulator.additionalItemIds.filter((id) => id !== itemId),
      });
    } else {
      updateSimulator({
        additionalItemIds: [...simulator.additionalItemIds, itemId],
      });
    }
  };

  const selectedEnv = ENVIRONMENTS.find((e) => e.id === simulator.environmentId) || ENVIRONMENTS[0];
  const selectedFinish = FINISHES.find((f) => f.id === simulator.finishId) || FINISHES[0];
  const selectedHardware = HARDWARE_OPTIONS.find((h) => h.id === simulator.hardwareId) || HARDWARE_OPTIONS[0];
  const selectedLayout = LAYOUT_OPTIONS.find((l) => l.id === simulator.layoutTypeId) || LAYOUT_OPTIONS[0];
  const selectedDoorType = DOOR_TYPE_OPTIONS.find((d) => d.id === simulator.doorTypeId) || DOOR_TYPE_OPTIONS[0];
  
  const envModules = FURNITURE_MODULES.filter((m) => m.environmentId === simulator.environmentId);
  const cortecloudTemplates = CORTECLOUD_MODULE_TEMPLATES.filter((t) => t.environmentId === simulator.environmentId || t.environmentId === 'cozinha');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const whatsappShareText = encodeURIComponent(
    `Olá! Realizei uma simulação de móveis sob medida no PlanejaFácil para meu ambiente ${selectedEnv.title} (${(simulator.dimensions.length * simulator.dimensions.height).toFixed(1)}m²). Faixa estimada: ${formatCurrency(simulator.calculatedRange.min)} - ${formatCurrency(simulator.calculatedRange.max)}. Gostaria de mais informações!`
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Top Header & Progress Indicator */}
      <div className="mb-8 space-y-4">
        
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevStep}
            className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors py-1 px-3 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{simulator.step === 1 ? 'Voltar para Início' : 'Passo Anterior'}</span>
          </button>

          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <span className="text-brand-600 font-extrabold">Passo {simulator.step}</span>
            <span>de 8</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-600 via-blue-500 to-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(simulator.step / 8) * 100}%` }}
          />
        </div>

      </div>


      {/* STEP 1: QUAL AMBIENTE DESEJA PLANEJAR? */}
      {simulator.step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Qual ambiente deseja planejar?</h2>
            <p className="text-sm text-slate-500">Selecione o espaço para iniciar sua simulação personalizada.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ENVIRONMENTS.map((env) => {
              const isSelected = simulator.environmentId === env.id;
              return (
                <div
                  key={env.id}
                  onClick={() => handleSelectEnvironment(env.id)}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border bg-white shadow-sm hover:shadow-card-hover hover:-translate-y-1 ${
                    isSelected ? 'ring-2 ring-brand-600 border-brand-600' : 'border-slate-200'
                  }`}
                >
                  <div className="h-40 w-full overflow-hidden relative">
                    <img
                      src={env.image}
                      alt={env.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 text-base">{env.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{env.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* STEP 2: MÓDULOS DO MÓVEL, LAYOUT E PORTAS (FLUXO LIMPO & DIRETO) */}
      {simulator.step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Quais móveis e módulos você precisa no seu projeto?</h2>
            <p className="text-sm text-slate-500">Selecione as peças desejadas e veja o projeto 3D se montar em tempo real ao lado.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Options Side (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Sub-section 1: Escolha das Peças e Módulos */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                  <Box className="w-5 h-5 text-brand-600" />
                  <span>1. Selecione os Módulos do Móvel para {selectedEnv.title}:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {envModules.map((mod) => {
                    const isChecked = (simulator.selectedFurnitureModuleIds || []).includes(mod.id);
                    const currentDim = simulator.moduleCustomDimensions?.[mod.id] || 1.2;

                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleFurnitureModule(mod.id)}
                        className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
                          isChecked
                            ? 'bg-brand-50/70 border-brand-600 shadow-sm ring-1 ring-brand-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                              isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{mod.title}</h4>
                            <p className="text-[11px] text-slate-500 leading-tight">{mod.description}</p>
                          </div>
                        </div>

                        {/* Inline Measurement Input Badge when module is selected */}
                        {isChecked && (
                          <div
                            className="mt-3 pt-2.5 border-t border-brand-200/80 flex items-center justify-between animate-in fade-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                              <Ruler className="w-3.5 h-3.5 text-brand-600" />
                              <span>Medida desta peça:</span>
                            </span>
                            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 focus-within:border-brand-600 rounded-xl px-2.5 py-1 shadow-inner">
                              <input
                                type="number"
                                min="0.3"
                                max="6.0"
                                step="0.1"
                                value={currentDim}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 1.0;
                                  setModuleDimension(mod.id, val);
                                }}
                                className="w-12 text-xs font-extrabold text-brand-600 outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500">m</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-section 2: Layout e Disposição no Espaço */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                  <Grid className="w-5 h-5 text-brand-600" />
                  <span>2. Formato / Disposição do Móvel no Ambiente:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LAYOUT_OPTIONS.map((layout) => {
                    const isSelected = simulator.layoutTypeId === layout.id;
                    return (
                      <div
                        key={layout.id}
                        onClick={() => updateSimulator({ layoutTypeId: layout.id })}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 space-y-1 ${
                          isSelected
                            ? 'bg-brand-50 border-brand-600 ring-2 ring-brand-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{layout.title}</div>
                        <p className="text-[11px] text-slate-500 leading-tight">{layout.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-section 3: Estilo de Abertura das Portas */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                  <Sliders className="w-5 h-5 text-brand-600" />
                  <span>3. Estilo e Abertura das Portas / Puxadores:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DOOR_TYPE_OPTIONS.map((door) => {
                    const isSelected = simulator.doorTypeId === door.id;
                    return (
                      <div
                        key={door.id}
                        onClick={() => updateSimulator({ doorTypeId: door.id })}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 space-y-1 ${
                          isSelected
                            ? 'bg-brand-50 border-brand-600 ring-2 ring-brand-600'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{door.title}</div>
                        <p className="text-[11px] text-slate-500 leading-tight">{door.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Live 3D Preview Sticky Column (5 cols) */}
            <div className="lg:col-span-5 sticky top-6">
              <CabinetPreview3D
                environmentId={simulator.environmentId}
                selectedFurnitureModuleIds={simulator.selectedFurnitureModuleIds}
                layoutTypeId={simulator.layoutTypeId}
                doorTypeId={simulator.doorTypeId}
                dimensions={simulator.dimensions}
                finishId={simulator.finishId}
                hardwareId={simulator.hardwareId}
                additionalItemIds={simulator.additionalItemIds}
              />
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2 shadow-blue-glow transition-all"
            >
              <span>Avançar para Medidas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 3: INFORME AS MEDIDAS (SIMPLES, DIRETO & INTUITIVO) */}
      {simulator.step === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Informe as medidas aproximadas</h2>
            <p className="text-sm text-slate-500">Utilize os sliders para definir o comprimento da parede, a altura até o teto e a profundidade dos armários.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Controls Side (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              
              {/* Live Area feedback badge */}
              <div className="bg-brand-50 border border-brand-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-brand-600 text-white rounded-xl">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Área Calculada ({selectedLayout.title})</div>
                    <div className="text-lg font-bold text-slate-900">{selectedEnv.title}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-brand-600">
                    {(simulator.dimensions.length * simulator.dimensions.height).toFixed(1)} m²
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">Área total estimada</div>
                </div>
              </div>

              {/* Slider 1: Comprimento da Parede Principal */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <Ruler className="w-4 h-4 text-brand-600" />
                    <span>1. Comprimento da Parede Principal:</span>
                  </div>
                  <span className="text-brand-600 text-base font-extrabold">{simulator.dimensions.length} metros</span>
                </div>
                <p className="text-xs text-slate-500">
                  Extensão horizontal da parede onde os armários serão instalados.
                </p>
                <input
                  type="range"
                  min="1.5"
                  max="10.0"
                  step="0.1"
                  value={simulator.dimensions.length}
                  onChange={(e) =>
                    updateSimulator({
                      dimensions: { ...simulator.dimensions, length: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                  <span>1.5m (Pequeno)</span>
                  <span>5.0m (Médio)</span>
                  <span>10.0m (Amplo / Gourmet)</span>
                </div>
              </div>

              {/* Slider 2: Altura do Piso ao Teto (Pé-Direito) */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <Ruler className="w-4 h-4 text-brand-600" />
                    <span>2. Altura do Piso ao Teto (Pé-Direito):</span>
                  </div>
                  <span className="text-brand-600 text-base font-extrabold">{simulator.dimensions.height} metros</span>
                </div>
                <p className="text-xs text-slate-500">
                  Distância do piso acabado até o teto (ou gesso).
                </p>
                <input
                  type="range"
                  min="2.2"
                  max="3.5"
                  step="0.1"
                  value={simulator.dimensions.height}
                  onChange={(e) =>
                    updateSimulator({
                      dimensions: { ...simulator.dimensions, height: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                  <span>2.2m (Baixo)</span>
                  <span>2.7m (Padrão Apartamento)</span>
                  <span>3.5m (Pé Direito Alto)</span>
                </div>
              </div>

              {/* Slider 3: Profundidade Interna dos Armários */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                  <div className="flex items-center space-x-1.5">
                    <Ruler className="w-4 h-4 text-brand-600" />
                    <span>3. Profundidade dos Armários (Recuo):</span>
                  </div>
                  <span className="text-brand-600 text-base font-extrabold">{simulator.dimensions.width} metros</span>
                </div>
                <p className="text-xs text-slate-500">
                  Profundidade padrão dos balcões (ex: 60cm para pia e 35cm para aéreos).
                </p>
                <input
                  type="range"
                  min="0.4"
                  max="6.0"
                  step="0.1"
                  value={simulator.dimensions.width}
                  onChange={(e) =>
                    updateSimulator({
                      dimensions: { ...simulator.dimensions, width: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                  <span>0.4m (Compacto)</span>
                  <span>0.6m (Padrão Marcenaria)</span>
                  <span>6.0m (Profundidade Máxima)</span>
                </div>
              </div>

            </div>

            {/* 3D Visual Preview Side (5 cols) */}
            <div className="lg:col-span-5 sticky top-6">
              <CabinetPreview3D
                environmentId={simulator.environmentId}
                selectedFurnitureModuleIds={simulator.selectedFurnitureModuleIds}
                layoutTypeId={simulator.layoutTypeId}
                doorTypeId={simulator.doorTypeId}
                dimensions={simulator.dimensions}
                finishId={simulator.finishId}
                hardwareId={simulator.hardwareId}
                additionalItemIds={simulator.additionalItemIds}
              />
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2 shadow-blue-glow transition-all"
            >
              <span>Avançar para Acabamentos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 4: ESCOLHA O PADRÃO DE ACABAMENTO */}
      {simulator.step === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Escolha o padrão de acabamento</h2>
            <p className="text-sm text-slate-500">O tipo de material reveste os painéis e define o visual final do móvel.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Options grid (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FINISHES.map((finish) => {
                const isSelected = simulator.finishId === finish.id;
                return (
                  <div
                    key={finish.id}
                    onClick={() => updateSimulator({ finishId: finish.id })}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 border bg-white shadow-sm hover:shadow-card-hover relative ${
                      isSelected ? 'ring-2 ring-brand-600 border-brand-600 bg-brand-50/20' : 'border-slate-200'
                    }`}
                  >
                    {finish.tag && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-100 text-brand-700 uppercase tracking-wider">
                        {finish.tag}
                      </span>
                    )}
                    <div className="flex items-start space-x-3">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 text-base">{finish.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{finish.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3D Preview (5 cols) */}
            <div className="lg:col-span-5">
              <CabinetPreview3D
                environmentId={simulator.environmentId}
                selectedFurnitureModuleIds={simulator.selectedFurnitureModuleIds}
                layoutTypeId={simulator.layoutTypeId}
                doorTypeId={simulator.doorTypeId}
                dimensions={simulator.dimensions}
                finishId={simulator.finishId}
                hardwareId={simulator.hardwareId}
                additionalItemIds={simulator.additionalItemIds}
              />
            </div>

          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2 shadow-blue-glow transition-all"
            >
              <span>Avançar para Ferragens</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 5: FERRAGENS */}
      {simulator.step === 5 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Escolha o nível das ferragens</h2>
            <p className="text-sm text-slate-500">As ferragens definem o conforto de abertura e a durabilidade dos módulos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HARDWARE_OPTIONS.map((hw) => {
              const isSelected = simulator.hardwareId === hw.id;
              return (
                <div
                  key={hw.id}
                  onClick={() => updateSimulator({ hardwareId: hw.id })}
                  className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border bg-white shadow-sm hover:shadow-card-hover flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-brand-600 border-brand-600 bg-brand-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Wrench className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-1 bg-slate-100 rounded text-slate-600">
                        {hw.brand}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{hw.title}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{hw.description}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-brand-600">
                    <span>{isSelected ? '✓ Selecionado' : 'Clique para selecionar'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2 shadow-blue-glow transition-all"
            >
              <span>Avançar para Itens Adicionais</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 6: ITENS ADICIONAIS */}
      {simulator.step === 6 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Itens Adicionais</h2>
            <p className="text-sm text-slate-500">Marque os opcionais que você gostaria de incluir no seu projeto.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADDITIONAL_ITEMS.map((item) => {
              const isChecked = simulator.additionalItemIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleAdditionalItem(item.id)}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-start space-x-4 ${
                    isChecked
                      ? 'bg-brand-50/50 border-brand-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextStep}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center space-x-2 shadow-blue-glow transition-all"
            >
              <span>Avançar para Localização</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 7: LOCALIZAÇÃO & RESUMO COMPLETO DA SIMULAÇÃO */}
      {simulator.step === 7 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Localização e Resumo Completo</h2>
            <p className="text-sm text-slate-500">Informe sua cidade e confira as especificações detalhadas do móvel antes de gerar a estimativa.</p>
          </div>

          {/* Form Localização */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Onde será instalado o projeto?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">CEP</label>
                <input
                  type="text"
                  value={simulator.location.cep}
                  onChange={(e) =>
                    updateSimulator({
                      location: { ...simulator.location, cep: e.target.value },
                    })
                  }
                  placeholder="00000-000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Cidade</label>
                <input
                  type="text"
                  value={simulator.location.city}
                  onChange={(e) =>
                    updateSimulator({
                      location: { ...simulator.location, city: e.target.value },
                    })
                  }
                  placeholder="Ex: São Paulo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-brand-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Estado (UF)</label>
                <select
                  value={simulator.location.state}
                  onChange={(e) =>
                    updateSimulator({
                      location: { ...simulator.location, state: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:ring-2 focus:ring-brand-600"
                >
                  <option value="SP">São Paulo (SP)</option>
                  <option value="RJ">Rio de Janeiro (RJ)</option>
                  <option value="PR">Paraná (PR)</option>
                  <option value="SC">Santa Catarina (SC)</option>
                  <option value="RS">Rio Grande do Sul (RS)</option>
                  <option value="MG">Minas Gerais (MG)</option>
                  <option value="BA">Bahia (BA)</option>
                  <option value="DF">Distrito Federal (DF)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100">
              
              {/* Header section */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">Projeto de Móveis Sob Medida</span>
                  <h3 className="text-2xl font-extrabold">{selectedEnv.title}</h3>
                </div>
                <span className="px-3 py-1 bg-brand-600 text-white text-xs font-bold rounded-full">
                  {simulator.location.city} - {simulator.location.state}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="p-6 space-y-4 text-sm">
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Layout do Móvel:</span>
                  <span className="font-bold text-slate-900">{selectedLayout.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Medidas Estimadas:</span>
                  <span className="font-bold text-slate-900">
                    {simulator.dimensions.length}m (comp) x {simulator.dimensions.height}m (alt) —{' '}
                    <span className="text-brand-600">{(simulator.dimensions.length * simulator.dimensions.height).toFixed(1)} m²</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-2">Peças e Módulos Incluídos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(simulator.selectedFurnitureModuleIds || []).map((modId) => {
                      const mod = envModules.find((m) => m.id === modId);
                      return (
                        <span key={modId} className="px-2.5 py-1 bg-brand-50 text-brand-800 text-xs font-bold rounded-md border border-brand-200">
                          ✓ {mod?.title}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Estilo das Portas:</span>
                  <span className="font-bold text-slate-900">{selectedDoorType.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Acabamento:</span>
                  <span className="font-bold text-slate-900">{selectedFinish.title}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Ferragens:</span>
                  <span className="font-bold text-slate-900">{selectedHardware.title} ({selectedHardware.brand})</span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-2">Itens Adicionais Incluídos:</span>
                  {simulator.additionalItemIds.length === 0 ? (
                    <span className="text-slate-400 italic text-xs">Nenhum adicional selecionado</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {simulator.additionalItemIds.map((itemId) => {
                        const item = ADDITIONAL_ITEMS.find((i) => i.id === itemId);
                        return (
                          <span key={itemId} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                            + {item?.title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom calculation button */}
              <div className="p-6 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => updateSimulator({ step: 1 })}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 underline"
                >
                  Alterar Escolhas
                </button>

                <button
                  onClick={handleNextStep}
                  className="px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm uppercase tracking-wider flex items-center space-x-2 shadow-blue-glow hover:scale-[1.02] transition-all"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>CALCULAR ESTIMATIVA</span>
                </button>
              </div>

            </div>

            {/* 3D Preview (5 cols) */}
            <div className="md:col-span-5">
              <CabinetPreview3D
                environmentId={simulator.environmentId}
                selectedFurnitureModuleIds={simulator.selectedFurnitureModuleIds}
                layoutTypeId={simulator.layoutTypeId}
                doorTypeId={simulator.doorTypeId}
                dimensions={simulator.dimensions}
                finishId={simulator.finishId}
                hardwareId={simulator.hardwareId}
                additionalItemIds={simulator.additionalItemIds}
                compact
              />
            </div>

          </div>
        </div>
      )}


      {/* STEP 8: RESULTADO & ANIMAÇÃO DE CÁLCULO */}
      {simulator.step === 8 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto text-center">
          
          {/* Skeleton calculation loading state */}
          {isCalculating ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl space-y-8 my-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto animate-bounce">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-extrabold text-slate-900">Calculando investimento estimado...</h3>
                <p className="text-sm text-brand-600 font-bold animate-pulse">
                  {calcMessages[calcMessageIndex]}
                </p>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-brand-600 h-full animate-pulse rounded-full w-3/4 transition-all duration-700" />
              </div>
            </div>
          ) : (
            
            /* RESULT DISPLAY CARD */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden text-left space-y-0">
              
              {/* Header banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950 text-white p-8 space-y-3 relative overflow-hidden">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Estimativa Concluída com Sucesso</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Com base nas especificações detalhadas do seu móvel, estimamos o investimento entre:
                </h2>
              </div>

              {/* High-impact Price Range Badge */}
              <div className="p-8 bg-slate-50 border-y border-slate-200/70 text-center space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Faixa de Investimento Estimada</div>
                
                <div className="flex items-center justify-center space-x-4 flex-wrap">
                  <span className="text-3xl sm:text-5xl font-black text-brand-600 tracking-tight">
                    {formatCurrency(simulator.calculatedRange.min)}
                  </span>
                  <span className="text-xl sm:text-3xl font-semibold text-slate-400">e</span>
                  <span className="text-3xl sm:text-5xl font-black text-brand-600 tracking-tight">
                    {formatCurrency(simulator.calculatedRange.max)}
                  </span>
                </div>

                <div className="inline-flex items-center space-x-1.5 text-xs text-slate-500 pt-1">
                  <span>Estimativa para</span>
                  <strong className="text-slate-800">{selectedEnv.title} ({selectedLayout.title})</strong>
                  <span>em</span>
                  <strong className="text-slate-800">{simulator.location.city} - {simulator.location.state}</strong>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="p-6 sm:p-8 bg-white space-y-6">
                
                <CabinetPreview3D
                  environmentId={simulator.environmentId}
                  selectedFurnitureModuleIds={simulator.selectedFurnitureModuleIds}
                  layoutTypeId={simulator.layoutTypeId}
                  doorTypeId={simulator.doorTypeId}
                  dimensions={simulator.dimensions}
                  finishId={simulator.finishId}
                  hardwareId={simulator.hardwareId}
                  additionalItemIds={simulator.additionalItemIds}
                  compact
                />

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  "Esta é uma estimativa calculada com base nas especificações de módulos, layout ({selectedLayout.title}), acabamentos e ferragens fornecidas. O valor final poderá variar conforme medição no local realizada pela loja parceira."
                </div>

                {/* Secondary Actions (Print PDF & WhatsApp Share) */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
                  >
                    <FileText className="w-4 h-4 text-brand-600" />
                    <span>Baixar Proposta em PDF</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${whatsappShareText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Compartilhar no WhatsApp</span>
                  </a>
                </div>

                {/* Main Action Button */}
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setIsLeadCaptureOpen(true)}
                    className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-action-600 hover:bg-action-700 text-white font-extrabold text-base tracking-wider uppercase transition-all duration-300 shadow-emerald-glow hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center space-x-3 mx-auto"
                  >
                    <Sparkles className="w-5 h-5 fill-white" />
                    <span>SOLICITAR ORÇAMENTO DETALHADO</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    Receba o projeto em 3D e atendimento com uma loja parceira credenciada
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* PDF Modal */}
      <ProposalPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />

    </div>
  );
};
