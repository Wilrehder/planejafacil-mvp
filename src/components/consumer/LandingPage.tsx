import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  ChevronDown, 
  HelpCircle, 
  ShieldCheck, 
  Sparkles, 
  Store, 
  Zap,
  Maximize2,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LandingPage: React.FC = () => {
  const { setConsumerTab, setIsStoreModalOpen } = useApp();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const heroSlides = [
    {
      id: 'cozinha',
      image: '/hero_kitchen.png',
      tag: 'Cozinha Gourmet',
      title: 'Cozinha Gourmet sob medida em Laca & Madeirado',
      dims: '4.5m x 2.7m',
      material: 'MDF Madeirado & Ilha de Quartzo',
    },
    {
      id: 'closet',
      image: '/hero_closet.png',
      tag: 'Closet Suíte Master',
      title: 'Closet Casal com Portas de Vidro & Fita LED',
      dims: '3.8m x 2.8m',
      material: 'MDF Madeirado & Iluminação LED',
    },
    {
      id: 'living',
      image: '/hero_living.png',
      tag: 'Home Theater',
      title: 'Painel de TV Ripado com Balcão Suspenso',
      dims: '5.2m x 2.7m',
      material: 'Painel Ripado & Acabamento Matt',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const faqItems = [
    {
      q: 'Como é calculada a estimativa de preço?',
      a: 'Nossa inteligência considera as medidas do ambiente, a complexidade do projeto, o padrão do acabamento (ex: MDF, Madeirado, Laca), o nível das ferragens e os adicionais como fita de LED ou vidro, aplicando a média atualizada da sua região.'
    },
    {
      q: 'A simulação é realmente gratuita e sem compromisso?',
      a: 'Sim! Você pode realizar quantas simulações desejar gratuitamente. A estimativa é exibida na hora na sua tela. Você só envia seus dados se decidir receber o projeto 3D de uma loja parceira.'
    },
    {
      q: 'Quanto tempo demora para uma loja parceira entrar em contato?',
      a: 'Assim que você solicita o orçamento detalhado, seu projeto é encaminhado para o painel da loja parceira credenciada mais próxima. Geralmente o especialista entra em contato em menos de 24 horas úteis.'
    },
    {
      q: 'Vocês realizam a fabricação dos móveis diretamente?',
      a: 'O PlanejaFácil é uma tecnologia parceira que conecta consumidores interessados em móveis sob medida com lojas de fábrica credenciadas que possuem showroom físico, garantia e equipe de montagem própria.'
    }
  ];

  return (
    <div className="bg-[#FAF8F5] text-slate-900 min-h-screen font-sans selection:bg-brand-600 selection:text-white space-y-24 sm:space-y-32 pb-24">
      
      {/* HERO SECTION - ARCHITECTURAL EDITORIAL DESIGN */}
      <section className="relative pt-8 sm:pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Minimalist Typography & Main CTA */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-200/60 border border-slate-300/60 text-slate-700 text-xs font-semibold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>Simulação Inteligente & Sob Medida</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-normal tracking-tight text-slate-950 font-serif-editorial leading-[1.1]">
              Design com propósito.<br />
              <span className="italic font-light text-slate-700">Eleve o valor do seu espaço.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
              Descubra em menos de 2 minutos a estimativa real de custo para o seu projeto de marcenaria planejada e conecte-se com lojas físicas credenciadas na sua região.
            </p>

            {/* Action CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setConsumerTab('simulator')}
                className="px-9 py-4 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-emerald-glow flex items-center justify-center space-x-3 group"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Simular Orçamento Agora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs text-slate-500 font-medium py-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sem necessidade de cadastro prévio</span>
              </div>
            </div>

            {/* Clean Minimalist Stats Row (Inspiration Style) */}
            <div className="pt-8 border-t border-slate-200/80 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl sm:text-3xl font-light font-serif-editorial text-slate-900">100%</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Grátis & Transparente</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-light font-serif-editorial text-slate-900">2 min</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Estimativa Instantânea</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-light font-serif-editorial text-slate-900">+50</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Lojas Credenciadas</div>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Architectural Showcase (No People) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Minimalist Card Container */}
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800">
                
                {/* Slideshow Image */}
                <div className="relative h-80 sm:h-[420px] w-full overflow-hidden select-none">
                  {heroSlides.map((slide, index) => {
                    const isActive = index === currentSlideIndex;
                    return (
                      <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                          isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                      >
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover transform scale-100 hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                        
                        {/* Clean Tag */}
                        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-slate-700/60 flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{slide.tag}</span>
                        </div>

                        {/* Room Info */}
                        <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{slide.material}</div>
                          <div className="text-lg sm:text-xl font-bold font-serif-editorial text-white">{slide.title}</div>
                          <div className="flex items-center space-x-2 pt-1 text-xs text-slate-300">
                            <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px]">{slide.dims}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Carousel Dots */}
                  <div className="absolute bottom-4 right-6 z-20 flex items-center space-x-2 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800">
                    {heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentSlideIndex ? 'w-6 bg-emerald-400' : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Minimalist Card Footer */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 font-medium">
                    Projetos reais de lojas parceiras credenciadas
                  </div>
                  <button
                    onClick={() => setConsumerTab('simulator')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>Testar Agora</span>
                    <span>&rarr;</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>


      {/* SECTION 01: SOBRE A PLATAFORMA & PROPOSTA */}
      <section id="sobre" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-4 space-y-2">
            <div className="text-4xl sm:text-5xl font-light font-serif-editorial text-slate-400">01</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Sobre a Plataforma</div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-normal font-serif-editorial text-slate-950 leading-tight">
              Design com inteligência. Orçamentos sem surpresas.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              O PlanejaFácil foi desenvolvido para simplificar a jornada de quem deseja mobiliar sua casa. Unimos tecnologia intuitiva de simulação a tabelas regionais atualizadas de marcenaria sob medida, conectando você diretamente com os melhores fabricantes e showrooms da sua cidade.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                <div className="text-sm font-bold text-slate-900">Transparência em Acabamentos</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Entenda exatamente como cada escolha de MDF, Lacas, Vidros Reflecta e Ferragens impacta o custo final.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-2">
                <div className="text-sm font-bold text-slate-900">Lojas com Showroom Físico</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conexão apenas com marcenarias credenciadas que possuem contrato, garantia e fábrica estruturada.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* SECTION 02: COMO FUNCIONA (4 STEPS) */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200/80 pt-16 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
            <div className="lg:col-span-4 space-y-2">
              <div className="text-4xl sm:text-5xl font-light font-serif-editorial text-slate-400">02</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Como Funciona</div>
            </div>

            <div className="lg:col-span-8">
              <h2 className="text-2xl sm:text-3xl font-normal font-serif-editorial text-slate-900">
                Uma jornada fluida em 4 passos simples.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
              <div className="text-2xl font-serif-editorial text-slate-400">01</div>
              <h3 className="text-base font-bold text-slate-900">Escolha o Ambiente</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Selecione o cômodo desejado (Cozinha, Dormitório, Closet, Home Theater, Banheiro ou Escritório).
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
              <div className="text-2xl font-serif-editorial text-slate-400">02</div>
              <h3 className="text-base font-bold text-slate-900">Personalize Módulos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adicione balcões, aéreos, torres de eletros, escolha acabamentos e ajuste as dimensões do ambiente.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
              <div className="text-2xl font-serif-editorial text-slate-400">03</div>
              <h3 className="text-base font-bold text-slate-900">Veja o Orçamento</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                O sistema calcula na hora a estimativa com base na tabela regional média de marcenarias parceiras.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 space-y-4">
              <div className="text-2xl font-serif-editorial text-slate-400">04</div>
              <h3 className="text-base font-bold text-slate-900">Receba a Proposta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Baixe o PDF técnico detalhado ou solicite atendimento de uma loja credenciada da sua cidade.
              </p>
            </div>

          </div>

          <div className="pt-4 text-center">
            <button
              onClick={() => setConsumerTab('simulator')}
              className="px-9 py-4 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              Iniciar Minha Simulação
            </button>
          </div>

        </div>
      </section>


      {/* SECTION 03: PLANOS B2B PARA LOJAS PARCEIRAS & MARCENARIAS */}
      <section id="lojas-parceiras" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200/80 pt-16 space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-baseline">
            <div className="lg:col-span-4 space-y-2">
              <div className="text-4xl sm:text-5xl font-light font-serif-editorial text-slate-400">03</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Rede Credenciada</div>
            </div>

            <div className="lg:col-span-8">
              <h2 className="text-2xl sm:text-3xl font-normal font-serif-editorial text-slate-900">
                Planos de Assinatura para Lojas & Marcenarias Parceiras.
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Receba projetos prontos com especificações técnicas e Leads altamente qualificados da sua cidade.
              </p>
            </div>
          </div>

          {/* Clean B2B Plan Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PLANO GOLD */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Starter</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-700">Gold</span>
                </div>
                <div>
                  <div className="text-3xl font-serif-editorial font-bold text-slate-900">R$ 490 <span className="text-xs font-sans text-slate-500 font-normal">/mês</span></div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1">Até 30 Leads Qualificados/mês</div>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>1 Cidade Principal + 2 Vizinhos</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Alertas instantâneos por WhatsApp</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Proposta Técnica em PDF</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Painel B2B do Lojista</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase transition-colors"
              >
                Credenciar no Gold
              </button>
            </div>

            {/* PLANO PLATINUM (RECOMENDADO) */}
            <div className="p-8 rounded-3xl bg-slate-950 text-white shadow-xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-full">
                Mais Vendido
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pro</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Platinum</span>
                </div>
                <div>
                  <div className="text-3xl font-serif-editorial font-bold text-white">R$ 990 <span className="text-xs font-sans text-slate-400 font-normal">/mês</span></div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1">Até 80 Leads Qualificados/mês</div>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Fila Prioritária de Leads</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Região Metropolitana (até 10 Cidades)</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>CRM B2B com Funil de Vendas</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Projeto 3D Renderizado + Medidas</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Selo "Loja Parceira Verificada"</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow-emerald-glow transition-all"
              >
                Credenciar no Platinum
              </button>
            </div>

            {/* PLANO DIAMOND */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enterprise</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-700">Diamond</span>
                </div>
                <div>
                  <div className="text-3xl font-serif-editorial font-bold text-slate-900">R$ 1.990 <span className="text-xs font-sans text-slate-500 font-normal">/mês</span></div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1">Leads ILIMITADOS / Exclusividade</div>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Prioridade Absoluta de Envio</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Estado Inteiro ou Múltiplas Filiais</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Integração via API / Webhooks CRM</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Plano de Corte Técnico (Cortecloud)</span></li>
                  <li className="flex items-start space-x-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /><span>Gerente de Contas Dedicado</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase transition-colors"
              >
                Credenciar no Diamond
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* SECTION 04: FAQ SANFONA EDITORIAL */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="border-t border-slate-200/80 pt-16 space-y-10">
          
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-light font-serif-editorial text-slate-400">04</div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Perguntas Frequentes</div>
            <h2 className="text-2xl sm:text-3xl font-normal font-serif-editorial text-slate-900">
              Tire suas dúvidas antes de começar.
            </h2>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between space-x-4 focus:outline-none"
                  >
                    <span className="font-bold text-slate-900 text-base">
                      {item.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 animate-in fade-in duration-200">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

    </div>
  );
};
