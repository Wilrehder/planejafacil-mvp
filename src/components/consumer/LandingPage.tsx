import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  Clock, 
  HelpCircle, 
  Percent, 
  ShieldCheck, 
  Sparkles, 
  Store, 
  Zap 
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
      tag: 'Cozinha Gourmet de Luxo',
      title: 'Cozinha Gourmet sob medida em Laca & Madeirado',
      dims: '4.5m x 2.7m',
      material: 'MDF Madeirado & Ilha de Quartzo',
    },
    {
      id: 'closet',
      image: '/hero_closet.png',
      tag: 'Closet Casal com Vidro Reflecta',
      title: 'Closet Suíte com Portas de Vidro & Fita LED',
      dims: '3.8m x 2.8m',
      material: 'MDF Madeirado & Iluminação LED',
    },
    {
      id: 'living',
      image: '/hero_living.png',
      tag: 'Home Theater & Painel Ripado',
      title: 'Painel de TV Ripado com Balcão Suspenso',
      dims: '5.2m x 2.7m',
      material: 'Painel Ripado & Acabamento Matt',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
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
    <div className="space-y-16 sm:space-y-24 pb-28 sm:pb-20">
      
      {/* HERO SECTION - MOBILE PWA & DESKTOP PC OPTIMIZED */}
      <section className="relative pt-4 sm:pt-16 pb-8 sm:pb-12 overflow-hidden">
        
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[400px] bg-brand-400/15 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Text & CTA */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
              
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Simulação Transparente & Sob Medida</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.18] sm:leading-[1.15] tracking-tight">
                Descubra quanto pode custar seu móvel planejado em <span className="gradient-text">menos de 2 minutos.</span>
              </h1>

              <p className="text-base sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl">
                Receba gratuitamente uma estimativa inteligente baseada no seu projeto e, caso deseje, solicite um orçamento detalhado com uma loja parceira da sua região.
              </p>

              {/* Main Action CTA Button (Emerald Green requested) */}
              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setConsumerTab('simulator')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-action-600 hover:bg-action-700 active:scale-98 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase transition-all duration-300 shadow-emerald-glow hover:shadow-2xl flex items-center justify-center space-x-3 group"
                >
                  <Zap className="w-5 h-5 fill-white" />
                  <span>SIMULAR AGORA</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs text-slate-500 font-medium py-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Sem necessidade de cadastro prévio</span>
                </div>
              </div>

              {/* Verified Feature Highlights (No fake reviews) */}
              <div className="pt-6 border-t border-slate-200/60 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm text-center sm:text-left">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">100% Grátis</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Sem custo de uso</div>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm text-center sm:text-left">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">Tabela Regional</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Marcenarias locais</div>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm text-center sm:text-left">
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">Lojas Físicas</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">Credenciadas</div>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Card with Animated Furniture Slideshow (No People) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Decorative Blur Backing */}
                <div className="absolute -inset-2 bg-gradient-to-r from-brand-600 to-emerald-500 rounded-3xl blur-xl opacity-20 transform hover:scale-105 transition-transform" />

                {/* Main Visual Card */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800">
                  
                  {/* Rotating Image Container */}
                  <div className="relative h-72 sm:h-96 w-full overflow-hidden select-none">
                    {heroSlides.map((slide, index) => {
                      const isActive = index === currentSlideIndex;
                      return (
                        <div
                          key={slide.id}
                          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                            isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                          }`}
                        >
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover transform scale-100 hover:scale-105 transition-transform duration-1000"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                          
                          {/* Live Calculation Tag */}
                          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white border border-slate-700/80 shadow-md flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-emerald-400">{slide.tag}</span>
                          </div>

                          {/* Room Details Overlay */}
                          <div className="absolute bottom-6 left-5 right-5 text-white space-y-1">
                            <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Projeto Exemplo • {slide.material}</div>
                            <div className="text-lg sm:text-xl font-extrabold text-white drop-shadow">{slide.title}</div>
                            <div className="flex items-center space-x-2 pt-1">
                              <span className="text-xs sm:text-sm font-bold text-emerald-400">Estimativa Transparente</span>
                              <span className="text-[10px] bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-slate-200 font-mono">{slide.dims}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Interactive Carousel Indicators (Dots) */}
                    <div className="absolute bottom-2 right-5 z-20 flex items-center space-x-1.5 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800">
                      {heroSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentSlideIndex ? 'w-5 bg-brand-500' : 'w-2 bg-slate-600 hover:bg-slate-400'
                          }`}
                          aria-label={`Slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Card Footer Bar */}
                  <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-t border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-white">Calculadora Inteligente Ativa</div>
                        <div className="text-slate-400 text-[11px]">Fotos reais de projetos entregues</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConsumerTab('simulator')}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 flex items-center space-x-1"
                    >
                      <span>Testar Agora</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* SECTION: COMO FUNCIONA */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider">
            Simplicidade & Transparência
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Como funciona o PlanejaFácil?
          </h2>
          <p className="text-slate-600 text-sm sm:text-lg">
            Um processo transparente pensado para economizar seu tempo e garantir a melhor experiência.
          </p>
        </div>

        {/* 4 Steps Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-card-hover transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-base flex items-center justify-center shadow-blue-glow">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Faça a simulação.</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Escolha o ambiente, informe as medidas aproximadas, o padrão de acabamento e os adicionais.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-card-hover transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-base flex items-center justify-center shadow-blue-glow">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Receba uma estimativa.</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema calcula na hora a faixa de preço estimada para o seu projeto de forma transparente.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-card-hover transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-base flex items-center justify-center shadow-blue-glow">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Solicite um orçamento.</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Caso deseje, envie seu projeto para apresentação detalhada em 3D por uma loja física parceira.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-card-hover transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-action-600 text-white font-black text-base flex items-center justify-center shadow-emerald-glow">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">Loja entra em contato.</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Uma loja parceira qualificada da sua região entra em contato para alinhar detalhes e agendar atendimento.
            </p>
          </div>

        </div>

      </section>


      {/* SECTION: BENEFÍCIOS */}
      <section id="beneficios" className="bg-slate-900 text-white py-16 sm:py-20 rounded-3xl mx-3 sm:mx-8 px-5 sm:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Vantagens da Plataforma
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Desenvolvido para entregar clareza e facilidade antes da tomada de decisão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Economia de Tempo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tenha uma noção precisa de investimento em menos de 2 minutos, sem necessidade de deslocamento inicial.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Transparência de Valores</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Entenda como cada escolha de acabamento e ferragem influencia o orçamento final do seu projeto.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Lojas Credenciadas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conexão direta apenas com lojas físicas estruturadas, com fábrica, garantia e equipe de montagem.
              </p>
            </div>

          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => setConsumerTab('simulator')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-action-600 hover:bg-action-700 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-emerald-glow"
            >
              Começar Simulação
            </button>
          </div>

        </div>
      </section>

      {/* SECTION: PLANOS B2B PARA LOJAS PARCEIRAS E MARCENARIAS */}
      <section id="lojas-parceiras" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold uppercase tracking-wider">
              <Store className="w-4 h-4 text-brand-400" />
              <span>Rede Credenciada PlanejaFácil</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black">Planos de Assinatura para Lojas & Marcenarias</h2>
            <p className="text-sm sm:text-base text-slate-400">
              Receba projetos prontos com especificações técnicas e Leads altamente qualificados da sua região direto no seu WhatsApp Comercial.
            </p>
          </div>

          {/* Grid de 3 Planos B2B com Recursos Descriminados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PLANO GOLD */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase">Plano Gold</span>
                  <span className="text-xs text-slate-400 font-bold">Starter</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">R$ 490 <span className="text-xs text-slate-400 font-normal">/mês</span></div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">Até 30 Leads Qualificados/mês</div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>1 Cidade Principal + 2 Vizinhos</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Alertas instantâneos por WhatsApp</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Recebimento da Proposta Técnica PDF</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Painel B2B Básico do Lojista</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase transition-colors"
              >
                Credenciar no Plano Gold
              </button>
            </div>

            {/* PLANO PLATINUM (RECOMENDADO) */}
            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-brand-500 shadow-2xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-full shadow-md">
                Mais Vendido / Recomendado
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 font-extrabold text-[10px] uppercase">Plano Platinum</span>
                  <span className="text-xs text-brand-400 font-bold">Pro</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">R$ 990 <span className="text-xs text-slate-400 font-normal">/mês</span></div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">Até 80 Leads Qualificados/mês</div>
                </div>
                <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-slate-800">
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Fila Prioritária de Envio na Região</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Região Metropolitana (até 10 Cidades)</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Painel B2B com CRM e Funil de Vendas</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Projeto 3D Renderizado + Medidas</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Selo "Loja Parceira Verificada"</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs uppercase shadow-blue-glow transition-all"
              >
                Credenciar no Plano Platinum
              </button>
            </div>

            {/* PLANO DIAMOND */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-[10px] uppercase">Plano Diamond</span>
                  <span className="text-xs text-purple-400 font-bold">Enterprise</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-white">R$ 1.990 <span className="text-xs text-slate-400 font-normal">/mês</span></div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">Leads ILIMITADOS / Exclusividade</div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Prioridade Absoluta na Fila de Leads</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Estado Inteiro ou Múltiplas Filiais</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Integração via API e Webhooks (CRM/ERP)</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Plano de Corte Técnico (Cortecloud)</span></li>
                  <li className="flex items-start space-x-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><span>Gerente de Contas B2B Dedicado</span></li>
                </ul>
              </div>
              <button
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase transition-colors"
              >
                Credenciar no Plano Diamond
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* SECTION: FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Perguntas Frequentes</h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between space-x-4 focus:outline-none"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
