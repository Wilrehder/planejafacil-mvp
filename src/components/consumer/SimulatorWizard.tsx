import React, { useEffect, useState } from 'react';
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
  Tv, 
  WashingMachine, 
  Check,
  Loader2,
  Sparkles,
  Calculator,
  Building,
  CheckCircle2
} from 'lucide-react';
import { ENVIRONMENT_CATALOG } from '../../data/mockData';
import { useApp } from '../../context/AppContext';
import { EnvironmentTypeId } from '../../types';
import { ProposalPdfModal } from './ProposalPdfModal';

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

const LOADING_MESSAGES = [
  { text: 'Analisando dimensões e pé-direito...', icon: Calculator, progress: 25 },
  { text: 'Calculando a área de marcenaria em m²...', icon: Sparkles, progress: 55 },
  { text: 'Consultando médias de lojas parceiras da sua região...', icon: Building, progress: 85 },
  { text: 'Gerando seu orçamento estimado...', icon: CheckCircle2, progress: 100 },
];

export const SimulatorWizard: React.FC = () => {
  const { 
    simulator, 
    updateSimulator, 
    addEnvironment, 
    calculateEstimate, 
    addLead,
    resetSimulator,
    setConsumerTab 
  } = useApp();

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedEnvTypeId, setSelectedEnvTypeId] = useState<EnvironmentTypeId>('cozinha');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvArea, setNewEnvArea] = useState(12);
  const [newEnvCeilingHeight, setNewEnvCeilingHeight] = useState(2.7);
  const [newEnvWallCount, setNewEnvWallCount] = useState<1 | 2 | 3 | 4>(3);

  // Loading Screen State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const goToStep = (nextStep: number) => {
    updateSimulator({ step: nextStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetWizard = () => {
    setIsLoading(false);
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
    setNewEnvName(catalogItem?.title || 'Ambiente');
    setNewEnvArea(12);
    setNewEnvCeilingHeight(2.7);
    setNewEnvWallCount(3);
    goToStep(2);
  };

  const handleCalculateAndProceedToContact = () => {
    const createdEnv = addEnvironment(selectedEnvTypeId, newEnvName, newEnvArea, newEnvWallCount, newEnvCeilingHeight);
    updateSimulator({ environments: [createdEnv], currentEditingEnvId: createdEnv.id });
    calculateEstimate();
    goToStep(3);
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    calculateEstimate();

    const envSummaryStr = `${newEnvName || 'Ambiente'} (${newEnvArea}m², ${newEnvWallCount} paredes, Pé-direito ${newEnvCeilingHeight}m)`;

    addLead({
      name: simulator.clientInfo.name || 'Cliente Orçamento',
      phone: simulator.clientInfo.phone || '(11) 99999-9999',
      whatsapp: simulator.clientInfo.phone || '(11) 99999-9999',
      email: simulator.clientInfo.email || 'cliente@email.com',
      city: simulator.clientInfo.city || 'São Paulo',
      state: 'SP',
      cep: simulator.clientInfo.cep || '01310-100',
      environment: envSummaryStr,
      qualityTier: 'Intermediário',
      finishPattern: 'MDF Padrão',
      purchaseTimeline: 'Imediato',
      environmentsData: simulator.environments,
      estimatedMin: simulator.calculatedRange.min,
      estimatedMax: simulator.calculatedRange.max,
    });

    // Inicia a animação de carregamento clean
    setIsLoading(true);
    setLoadingStepIndex(0);
  };

  // Efeito para alternar as mensagens de carregamento de forma fluida
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev < LOADING_MESSAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
            goToStep(4);
          }, 800);
          return prev;
        }
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isLoading]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Se estiver no estado de carregamento, renderiza a tela limpa e elegante
  if (isLoading) {
    const currentMsg = LOADING_MESSAGES[loadingStepIndex];
    const IconComp = currentMsg.icon;

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center font-sans space-y-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xl space-y-8">
          
          {/* Animated Icon Badge */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-[#EBF7EC] rounded-3xl animate-ping opacity-25" />
            <div className="relative w-20 h-20 bg-[#EBF7EC] text-[#439346] rounded-3xl flex items-center justify-center shadow-inner">
              <IconComp className="w-9 h-9 stroke-[2.2] animate-bounce" />
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-[#1B2B48] transition-all duration-300">
              {currentMsg.text}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Aguarde alguns segundos enquanto preparamos seu cálculo personalizado...
            </p>
          </div>

          {/* Clean Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div 
                className="bg-[#439346] h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${currentMsg.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>Processando</span>
              <span className="text-[#439346] font-extrabold">{currentMsg.progress}%</span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="pt-2 flex justify-center items-center space-x-2">
            {LOADING_MESSAGES.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === loadingStepIndex 
                    ? 'w-6 bg-[#439346]' 
                    : idx < loadingStepIndex 
                      ? 'w-2 bg-[#439346]/40' 
                      : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 font-sans">
      
      {/* Top Header Bar */}
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
          <div className="text-xs font-extrabold text-[#1B2B48]">Faça seu Orçamento em Minutos</div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetWizard}
            className="text-xs font-bold text-slate-400 hover:text-red-600 flex items-center space-x-1 transition-colors"
            title="Reiniciar orçamento"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          <div className="text-[11px] font-bold text-[#439346] bg-[#EBF7EC] px-2.5 py-1 rounded-full">
            Etapa {simulator.step} de 4
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-[#439346] h-full transition-all duration-300 rounded-full"
          style={{ width: `${(simulator.step / 4) * 100}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: SELEÇÃO DO CÔMODO */}
      {/* ========================================================================= */}
      {simulator.step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-[#1B2B48] tracking-tight">
              Faça seu Orçamento
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              Qual cômodo você deseja planejar?
            </p>
          </div>

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
                  <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                    <img
                      src={bgImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <div className="absolute top-3 left-3 p-2 rounded-xl bg-white/90 backdrop-blur-md text-[#1B2B48] shadow">
                      {renderEnvIcon(item.iconName, 'w-4 h-4')}
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-[#439346] text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
                  </div>
                </div>
              );
            })}
          </div>

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
      {/* ETAPA 2: MEDIDAS SIMPLIFICADAS (PÉ DIREITO, ÁREA M² E PAREDES) */}
      {/* ========================================================================= */}
      {simulator.step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Medidas do Cômodo
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Responda às 3 perguntas simples abaixo para calcularmos seu orçamento por m²
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-8 max-w-2xl mx-auto shadow-md">
            
            {/* 1. Pé-direito */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                  1. Tamanho do Pé-direito (Altura do Teto)
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
                <span>Alto (4.0m)</span>
              </div>
            </div>

            {/* 2. Área m² */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                  2. Área Aproximada do Cômodo (m²)
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
                <span>Pequeno (4m²)</span>
                <span>Médio (15m²)</span>
                <span>Grande (60m²)</span>
              </div>
            </div>

            {/* 3. Quantas paredes vai móvel */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider">
                3. Em quantas paredes vai móvel planejado?
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
                onClick={handleCalculateAndProceedToContact}
                className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/20"
              >
                <span>Calcular Estimativa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: DADOS DE CONTATO SIMPLIFICADOS */}
      {/* ========================================================================= */}
      {simulator.step === 3 && (
        <form onSubmit={handleSubmitLead} className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Seus Dados para Exibir o Orçamento
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Informe seu nome, WhatsApp e CEP para visualizar sua estimativa detalhada.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-6 max-w-xl mx-auto shadow-md">
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5">
                  Seu Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex.: Maria Silva"
                  value={simulator.clientInfo.name}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, name: e.target.value } })}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5">
                  Seu Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="ex.: (11) 99999-9999"
                  value={simulator.clientInfo.phone}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, phone: e.target.value } })}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5">
                  Seu CEP (para identificar lojas da sua região)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex.: 01310-100"
                  value={simulator.clientInfo.cep}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, cep: e.target.value } })}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/25"
              >
                <span>Ver Orçamento Estimado</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: RESULTADO DO ORÇAMENTO */}
      {/* ========================================================================= */}
      {simulator.step === 4 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48]">
              Orçamento Estimado do Seu Projeto
            </h2>
            <p className="text-sm font-medium text-slate-600">
              Calculado com base na projeção por m² de móveis planejados.
            </p>
          </div>

          <div className="bg-[#1B2B48] text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center border border-[#283D64]">
            <div className="text-xs font-bold bg-[#EBF7EC] text-[#439346] w-fit mx-auto px-4 py-1.5 rounded-full">
              Estimativa por m² ({newEnvArea}m² • {newEnvWallCount} Paredes)
            </div>

            <div className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatCurrency(simulator.calculatedRange.min)} <span className="text-slate-400 font-normal text-2xl">a</span> {formatCurrency(simulator.calculatedRange.max)}
            </div>

            <div className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed font-medium">
              Valor estimado para <strong className="text-white">{ENVIRONMENT_CATALOG.find(e => e.id === selectedEnvTypeId)?.title || 'Ambiente'} Planejada</strong> considerando o m² de móveis projetados no seu espaço.
            </div>

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
