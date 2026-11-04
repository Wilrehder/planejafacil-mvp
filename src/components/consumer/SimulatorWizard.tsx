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
import { lookupCep } from '../../lib/cepService';
import { submitSimulationAndLead, SimulationSubmissionResult } from '../../lib/simulationService';
import { AlertCircle, MapPin, Mail, ShieldCheck, X, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
    removeEnvironment,
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

  // Loading & Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<{
    valid: boolean;
    city?: string;
    state?: string;
    error?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SimulationSubmissionResult | null>(null);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Preenchimento automático caso o usuário já esteja autenticado via Google/Apple
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const userEmail = user.email || '';
        if (userEmail || metaName) {
          updateSimulator({
            clientInfo: {
              ...simulator.clientInfo,
              name: simulator.clientInfo.name || metaName,
              email: simulator.clientInfo.email || userEmail,
            }
          });
        }
      }
    });
  }, []);

  const handleOAuthQuickFill = async (provider: 'google' | 'apple') => {
    try {
      setOauthLoading(provider);
      setSocialNotice(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.warn(`OAuth ${provider} info:`, error.message);
        setSocialNotice(`O login com ${provider === 'google' ? 'Google' : 'Apple'} precisa ser ativado no painel Supabase. Você pode preencher os campos abaixo diretamente.`);
        return;
      }

      if (data?.url) {
        // Abre em janela popup para não perder o formulário do cliente caso a conta não esteja ativa
        const popup = window.open(data.url, `${provider}_auth`, 'width=520,height=650,left=200,top=100');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = data.url;
        }
      }
    } catch (err: any) {
      console.warn(`OAuth ${provider} error:`, err);
      setSocialNotice(`Não foi possível conectar com ${provider === 'google' ? 'Google' : 'Apple'}. Por favor, preencha manualmente.`);
    } finally {
      setOauthLoading(null);
    }
  };

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

  const handleSaveCurrentEnvironment = () => {
    // Adiciona o ambiente atual na lista de ambientes do simulador
    const createdEnv = addEnvironment(selectedEnvTypeId, newEnvName, newEnvArea, newEnvWallCount, newEnvCeilingHeight);
    
    // Se for o primeiro ambiente, substitui os ambientes iniciais pela lista contendo este novo
    const isFirstCustomEnv = simulator.environments.length === 1 && simulator.environments[0].id === 'env-cozinha-1';
    const updatedEnvironments = isFirstCustomEnv 
      ? [createdEnv] 
      : [...simulator.environments, createdEnv];

    updateSimulator({ 
      environments: updatedEnvironments, 
      currentEditingEnvId: createdEnv.id 
    });
  };

  const handleAddAnotherEnvironment = () => {
    handleSaveCurrentEnvironment();
    // Volta para o passo 1 para escolher o próximo cômodo
    goToStep(1);
  };

  const handleProceedToContact = () => {
    handleSaveCurrentEnvironment();
    calculateEstimate();
    goToStep(3);
  };

  const handleRemoveEnvironment = (envId: string) => {
    removeEnvironment(envId);
  };

  const handleCepChange = async (rawVal: string) => {
    updateSimulator({ clientInfo: { ...simulator.clientInfo, cep: rawVal } });
    const digitsOnly = rawVal.replace(/\D/g, '');
    if (digitsOnly.length === 8) {
      setCepLoading(true);
      setCepStatus(null);
      const res = await lookupCep(digitsOnly);
      setCepLoading(false);
      if (res.success && res.city && res.state) {
        setCepStatus({ valid: true, city: res.city, state: res.state });
        updateSimulator({
          clientInfo: {
            ...simulator.clientInfo,
            cep: rawVal,
            city: res.city,
            state: res.state,
          },
        });
      } else {
        setCepStatus({ valid: false, error: res.error || 'CEP não localizado.' });
      }
    } else {
      setCepStatus(null);
    }
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!acceptedTerms) {
      setSubmitError('É obrigatório concordar com os Termos de Privacidade e Contato para prosseguir.');
      return;
    }

    const cleanCep = simulator.clientInfo.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setSubmitError('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }

    if (!activeEnvironments || activeEnvironments.length === 0) {
      setSubmitError('Adicione pelo menos um cômodo ao seu projeto.');
      return;
    }

    // Inicia a animação de carregamento visual
    setIsLoading(true);
    setLoadingStepIndex(0);

    const envsPayload = activeEnvironments.map((env) => ({
      typeId: env.typeId,
      name: env.name,
      areaM2: env.areaM2,
      ceilingHeight: env.ceilingHeight || 2.7,
      wallCount: env.wallCount,
    }));

    try {
      const result = await submitSimulationAndLead({
        clientInfo: {
          name: simulator.clientInfo.name,
          phone: simulator.clientInfo.phone,
          cep: simulator.clientInfo.cep,
          email: simulator.clientInfo.email,
        },
        environments: envsPayload,
      });

      if (!result.success) {
        setIsLoading(false);
        setSubmitError(result.error || 'Falha ao processar orçamento no servidor. Tente novamente.');
        return;
      }

      setSubmissionResult(result);

      if (result.leadId) {
        supabase
          .from('leads')
          .update({
            accepted_privacy_terms: true,
            privacy_terms_timestamp: new Date().toISOString()
          })
          .eq('id', result.leadId)
          .then();
      }

      updateSimulator({
        calculatedRange: {
          min: result.budgetMin,
          max: result.budgetMax,
        },
        clientInfo: {
          ...simulator.clientInfo,
          city: result.city,
          state: result.state,
        },
      });

      // Sincroniza localmente com o AppContext para navegação em tempo real
      addLead({
        id: result.leadId,
        assignmentId: (result as any).assignmentId,
        name: simulator.clientInfo.name || 'Cliente Orçamento',
        phone: simulator.clientInfo.phone || '(11) 99999-9999',
        whatsapp: simulator.clientInfo.phone || '(11) 99999-9999',
        email: simulator.clientInfo.email || 'cliente@email.com',
        city: result.city,
        state: result.state,
        cep: simulator.clientInfo.cep,
        environment: activeEnvironments.map((env) => `${env.name} (${env.areaM2}m²)`).join(', '),
        qualityTier: 'Intermediário',
        finishPattern: 'MDF Padrão',
        purchaseTimeline: 'Imediato',
        environmentsData: simulator.environments,
        estimatedMin: result.budgetMin,
        estimatedMax: result.budgetMax,
        assignedStoreId: result.assignedStoreId || '',
        assignedStoreName: result.assignedStoreName || 'Fila sem Cobertura',
        status: 'novo',
      });
    } catch (err: any) {
      setIsLoading(false);
      setSubmitError(err?.message || 'Erro inesperado ao conectar com o servidor.');
    }
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
          }, 600);
          return prev;
        }
      });
    }, 700);

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

  const activeEnvironments = simulator.environments.filter(e => e.id !== 'env-cozinha-1' || simulator.environments.length === 1);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-10 font-sans pb-32 sm:pb-10">
      
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

        <div className="text-center hidden sm:block">
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

      {/* Summary of Added Environments */}
      {simulator.environments.length > 0 && simulator.environments[0].id !== 'env-cozinha-1' && (
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#439346]" />
            <span className="text-xs font-extrabold text-[#1B2B48]">
              Ambientes adicionados ({simulator.environments.length}):
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {simulator.environments.map((env) => (
              <span key={env.id} className="inline-flex items-center space-x-1.5 bg-[#EBF7EC] text-[#439346] text-xs font-bold px-3 py-1 rounded-xl">
                <span>{env.name} ({env.areaM2}m²)</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
              Qual cômodo você deseja planejar{simulator.environments.length > 1 || (simulator.environments.length === 1 && simulator.environments[0].id !== 'env-cozinha-1') ? ' a seguir' : ''}?
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

                  <div className="p-3 sm:p-4 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#439346] border-[#439346] text-white'
                            : 'border-slate-300 bg-slate-50 group-hover:border-[#439346]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="font-extrabold text-[#1B2B48] text-xs sm:text-sm group-hover:text-[#439346] transition-colors leading-tight">
                        {item.title} Planejada
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40 sm:relative sm:border-0 sm:shadow-none sm:p-0 sm:bg-transparent">
            <div className="max-w-3xl mx-auto">
              <button
                onClick={() => handleSelectCategoryAndProceed(selectedEnvTypeId)}
                className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-95 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider transition-all shadow-lg shadow-[#439346]/25 flex items-center justify-center space-x-2"
              >
                <span>Avançar para Medidas</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
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
              Medidas do Cômodo: <span className="text-[#439346]">{newEnvName}</span>
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

            {/* Botões de Ação: Adicionar outro ou Gerar orçamento */}
            <div className="pt-6 sm:pt-6 border-t border-slate-100 space-y-3 pb-24 sm:pb-0">
              <p className="text-center text-xs font-extrabold text-[#1B2B48] hidden sm:block">
                Deseja incluir mais um cômodo no mesmo orçamento?
              </p>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40 sm:relative sm:border-0 sm:shadow-none sm:p-0 sm:bg-transparent grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddAnotherEnvironment}
                  className="w-full py-3.5 sm:py-4 rounded-xl border-2 border-[#439346] text-[#439346] hover:bg-[#EBF7EC] active:scale-95 font-extrabold text-[11px] sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>+ Adicionar Cômodo</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToContact}
                  className="w-full py-3.5 sm:py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white active:scale-95 font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/20"
                >
                  <span>Calcular Estimativa</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
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
            
            {submitError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Preenchimento Rápido com Google ou Apple */}
            <div className="space-y-3 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-center space-x-2">
                <span className="h-px bg-slate-200 flex-1"></span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Preenchimento Rápido
                </span>
                <span className="h-px bg-slate-200 flex-1"></span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthQuickFill('google')}
                  disabled={Boolean(oauthLoading)}
                  className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-bold text-xs shadow-sm hover:shadow"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#439346]" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthQuickFill('apple')}
                  disabled={Boolean(oauthLoading)}
                  className="flex items-center justify-center space-x-2 px-3 py-3 rounded-xl border border-slate-900 bg-slate-900 hover:bg-black active:scale-95 transition-all text-white font-bold text-xs shadow-sm hover:shadow"
                >
                  {oauthLoading === 'apple' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.83-11.96-14.39-7.39-11.39-13.12-24.78-17.18-40.17-4.06-15.39-6.09-29.35-6.09-41.87 0-14.67 3.52-27.18 10.56-37.52 7.04-10.34 16.27-15.58 27.69-15.72 5.01 0 10.58 1.45 16.71 4.35 6.13 2.91 10.3 4.41 12.51 4.5 1.74 0 6.02-1.52 12.83-4.56 6.81-3.04 12.28-4.45 16.4-4.24 13.06.65 23.33 5.43 30.82 14.34-11.75 7.18-17.41 16.97-16.97 29.38.43 9.79 4.23 18.06 11.4 24.81 7.18 6.74 15.67 10.55 25.46 11.42-2.17 6.53-4.78 13.05-7.82 19.56zm-31.5-104.93c.11-7.83 3.04-15.22 8.78-22.18 5.74-6.96 12.63-11.42 20.67-13.39.22 1.09.33 2.18.33 3.26 0 7.83-3.15 15.55-9.45 23.16-6.3 7.61-13.69 12.07-22.18 13.39-.43-1.41-.65-2.82-.65-4.24z"/>
                    </svg>
                  )}
                  <span>Apple</span>
                </button>
              </div>

              {socialNotice && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-700 text-center animate-in fade-in">
                  {socialNotice}
                </div>
              )}

              <div className="flex items-center justify-center space-x-2 pt-1">
                <span className="h-px bg-slate-200 flex-1"></span>
                <span className="text-[11px] font-semibold text-slate-400">
                  ou preencha os campos
                </span>
                <span className="h-px bg-slate-200 flex-1"></span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5">
                  Seu Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={simulator.clientInfo.name}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, name: e.target.value } })}
                  placeholder="Ex: Ana Maria Silva"
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
                  value={simulator.clientInfo.phone}
                  onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, phone: e.target.value } })}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Seu E-mail</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional - para receber cópia)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={simulator.clientInfo.email || ''}
                    onChange={(e) => updateSimulator({ clientInfo: { ...simulator.clientInfo, email: e.target.value } })}
                    placeholder="Ex: seuemail@exemplo.com"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase tracking-wider mb-1.5">
                  Seu CEP (para identificar lojas da sua região)
                </label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  value={simulator.clientInfo.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={(e) => handleCepChange(e.target.value)}
                  placeholder="Ex: 08674-000"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#1B2B48] outline-none focus:border-[#439346]"
                />

                {/* Feedback dinâmico de localização por CEP */}
                <div className="mt-2 min-h-[22px]">
                  {cepLoading && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#439346]" />
                      <span>Consultando localidade nos serviços oficiais...</span>
                    </div>
                  )}
                  {cepStatus?.valid && (
                    <div className="inline-flex items-center space-x-1.5 text-xs text-[#439346] font-bold bg-[#EBF7EC] px-3 py-1 rounded-xl border border-[#439346]/20">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Região identificada: {cepStatus.city}, {cepStatus.state}</span>
                    </div>
                  )}
                  {cepStatus?.error && (
                    <div className="inline-flex items-center space-x-1.5 text-xs text-red-600 font-bold bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{cepStatus.error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checkbox de Aceite dos Termos de Privacidade e Contato (LGPD) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 text-left space-y-2">
              <label className="flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-[#439346] border-slate-300 focus:ring-[#439346] cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  Declaro que li e concordo com os{' '}
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-[#439346] font-extrabold underline hover:text-[#387F3B] cursor-pointer"
                  >
                    Termos de Privacidade & Contato
                  </button>
                  , e autorizo expressamente que uma loja credenciada da minha região entre em contato comigo via WhatsApp ou ligação para apresentar este orçamento detalhado.
                </span>
              </label>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40 sm:relative sm:border-0 sm:shadow-none sm:p-0 sm:bg-transparent">
              <div className="max-w-xl mx-auto">
                <button
                  type="submit"
                  disabled={isLoading || !acceptedTerms}
                  className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#439346]/25"
                >
                  <span>{isLoading ? 'Calculando Orçamento...' : 'Ver Orçamento Estimado'}</span>
                  <ArrowRight className="w-5 h-5 shrink-0" />
                </button>
              </div>
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
              Calculado oficialmente com base na precificação por m² de móveis planejados.
            </p>
          </div>

          <div className="bg-[#1B2B48] text-white rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center border border-[#283D64]">
            
            {/* Status do Roteamento Comercial */}
            {submissionResult && (
              <div className="max-w-lg mx-auto">
                {submissionResult.distributionStatus === 'atribuido' ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-1">
                    <div className="flex items-center justify-between text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Loja Parceira Atribuída
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Ref: #{submissionResult.simulationId.slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-slate-200">
                      Sua solicitação em <strong>{submissionResult.city}/{submissionResult.state}</strong> foi enviada para:{' '}
                      <strong className="text-emerald-300">{submissionResult.assignedStoreName || 'Loja Credenciada'}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-left space-y-1">
                    <div className="flex items-center justify-between text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        Fila de Expansão Regional
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Ref: #{submissionResult.simulationId.slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-slate-200">
                      Orçamento registrado com sucesso para <strong>{submissionResult.city}/{submissionResult.state}</strong>. Nossos consultores credenciados entrarão em contato.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs font-bold bg-[#EBF7EC] text-[#439346] w-fit mx-auto px-4 py-1.5 rounded-full">
              Estimativa Multi-Ambientes ({simulator.environments.length} {simulator.environments.length === 1 ? 'Cômodo' : 'Cômodos'})
            </div>

            <div className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatCurrency(simulator.calculatedRange.min)} <span className="text-slate-400 font-normal text-2xl">a</span> {formatCurrency(simulator.calculatedRange.max)}
            </div>

            {/* List of included environments */}
            <div className="bg-white/10 rounded-2xl p-4 max-w-lg mx-auto text-left space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cômodos Incluídos no Orçamento:</div>
              <div className="space-y-1.5">
                {simulator.environments.map((env) => (
                  <div key={env.id} className="flex justify-between items-center text-xs font-semibold text-white border-b border-white/10 pb-1 last:border-0 last:pb-0">
                    <span>{env.name}</span>
                    <span className="text-emerald-400 font-extrabold">{env.areaM2}m² • {env.wallCount} {env.wallCount === 1 ? 'parede' : 'paredes'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed font-medium">
              Valor estimado considerando o m² total de móveis projetados nos seus espaços.
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

      {/* Modal de Termos de Privacidade e Contato (LGPD) */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#439346]" />
                <h3 className="text-base font-extrabold text-[#1B2B48]">
                  Termos de Privacidade & Contato (LGPD)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-900 font-semibold flex items-start gap-2">
                <Lock className="w-4 h-4 text-[#439346] shrink-0 mt-0.5" />
                <span>
                  Seus dados estão protegidos conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
                </span>
              </div>

              <div>
                <h4 className="font-bold text-[#1B2B48] text-xs uppercase tracking-wider mb-1">
                  1. Finalidade do Cadastro
                </h4>
                <p>
                  As informações fornecidas (Nome, Telefone/WhatsApp, E-mail e CEP) serão utilizadas <strong>exclusivamente</strong> para calcular a estimativa do seu projeto 3D e conectar você a uma loja parceira credenciada e homologada da sua região.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1B2B48] text-xs uppercase tracking-wider mb-1">
                  2. Autorização de Contato Comercial
                </h4>
                <p>
                  Ao prosseguir, você autoriza que a loja de móveis planejados credenciada entre em contato via WhatsApp ou telefone para apresentar a proposta técnica oficial, tirar dúvidas e, se você desejar, realizar a medição no local.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1B2B48] text-xs uppercase tracking-wider mb-1">
                  3. Segurança e Sigilo
                </h4>
                <p>
                  Não vendemos, não alugamos e não compartilhamos seus dados com terceiros não autorizados ou empresas de telemarketing. Seus dados são enviados apenas para a loja parceira responsável pelo atendimento da sua localidade.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1B2B48] text-xs uppercase tracking-wider mb-1">
                  4. Seus Direitos
                </h4>
                <p>
                  Você pode, a qualquer momento, solicitar a atualização, retificação ou exclusão definitiva dos seus dados de contato dos nossos registros.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setIsPrivacyModalOpen(false);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Entendi e Concordo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
