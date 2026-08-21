import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ShieldCheck, 
  Store, 
  Zap,
  Calculator,
  Compass,
  FileCheck,
  Building2
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
      alt: 'Cozinha Planejada Sob Medida',
    },
    {
      id: 'closet',
      image: '/hero_closet.png',
      alt: 'Closet Casal Sob Medida',
    },
    {
      id: 'living',
      image: '/hero_living.png',
      alt: 'Home Theater e Painel Sob Medida',
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
      a: 'Nossa plataforma considera as dimensões do seu espaço, os módulos escolhidos, o padrão de acabamento (MDF, Madeirado, Laca) e o nível de ferragens, aplicando a média de preços praticada por lojas e marcenarias credenciadas da sua região.'
    },
    {
      q: 'A simulação é realmente gratuita?',
      a: 'Sim, a simulação é 100% gratuita e não exige cadastro prévio para visualizar o orçamento estimado.'
    },
    {
      q: 'Como funciona o envio do orçamento para as lojas?',
      a: 'Após simular, você pode optar por enviar a especificação do seu projeto para lojas parceiras credenciadas da sua cidade para receber um atendimento personalizado e agendar uma visita.'
    },
    {
      q: 'Sou lojista ou marceneiro, como posso receber estes projetos?',
      a: 'Lojas físicas e marcenarias estruturadas podem assinar um de nossos planos (Gold, Platinum ou Diamond) para receber os projetos dos clientes da sua região diretamente no painel B2B.'
    }
  ];

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen font-sans">
      
      {/* HERO SECTION - CLEAN & PROFESSIONAL DESIGN */}
      <section className="pt-10 sm:pt-16 pb-16 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Direct Title & CTA */}
          <div className="lg:col-span-7 space-y-6">
            
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Descubra quanto custa seu <span className="text-emerald-600">móvel planejado</span>.
            </h1>

            <p className="text-base sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
              Simule o orçamento do seu projeto em menos de 2 minutos e receba a estimativa de lojas e marcenarias parceiras da sua região.
            </p>

            {/* Direct Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setConsumerTab('simulator')}
                className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-3 group"
              >
                <Zap className="w-5 h-5 fill-white" />
                <span>Simular Orçamento Agora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="pt-6 flex items-center space-x-6 text-xs font-semibold text-slate-500 border-t border-slate-200/80">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sem necessidade de cadastro</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tabela regional atualizada</span>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Room Image Slideshow (No Text Overlays or Badges) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 h-80 sm:h-[420px] w-full">
              {heroSlides.map((slide, index) => {
                const isActive = index === currentSlideIndex;
                return (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}

              {/* Clean Navigation Dots */}
              <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-2 bg-slate-900/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlideIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-500 hover:bg-slate-300'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* SECTION: COMO FUNCIONA */}
      <section id="como-funciona" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Como funciona o PlanejaFácil
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Um processo simples e direto para ajudar você a planejar seu ambiente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Escolha o Ambiente</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Selecione o cômodo desejado: Cozinha, Dormitório, Closet, Home Theater ou Banheiro.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Informe as Medidas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Insira o tamanho das paredes e escolha os móveis desejados (balcões, armários, aéreos).
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Veja o Orçamento</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visualise na hora a faixa estimada de valor calculada com base em marceneiros da sua região.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900">Receba Propostas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se desejar, solicite o contato de uma loja parceira credenciada para finalizar seu projeto.
              </p>
            </div>

          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => setConsumerTab('simulator')}
              className="px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Iniciar Simulação
            </button>
          </div>

        </div>
      </section>


      {/* SECTION: PLANOS B2B PARA LOJAS PARCEIRAS */}
      <section id="lojas-parceiras" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Planos para Lojas e Marcenarias Parceiras
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Receba solicitações de orçamentos e projetos de clientes da sua cidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PLANO GOLD */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plano Gold</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">R$ 490 <span className="text-xs text-slate-500 font-normal">/mês</span></div>
                <div className="text-xs text-emerald-700 font-semibold mt-1">Até 30 solicitações de clientes/mês</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>1 Cidade principal</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Notificações por WhatsApp</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Painel de gestão de leads</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Quero Me Cadastrar
            </button>
          </div>

          {/* PLANO PLATINUM */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl flex flex-col justify-between space-y-6 border border-slate-800">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Plano Platinum</span>
                <div className="text-3xl font-extrabold text-white mt-1">R$ 990 <span className="text-xs text-slate-400 font-normal">/mês</span></div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Até 80 solicitações de clientes/mês</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Fila prioritária de envio</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Região metropolitana (até 10 cidades)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Envio de projeto em PDF e medidas</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Selo de Loja Credenciada</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Quero Me Cadastrar
            </button>
          </div>

          {/* PLANO DIAMOND */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plano Diamond</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">R$ 1.990 <span className="text-xs text-slate-500 font-normal">/mês</span></div>
                <div className="text-xs text-emerald-700 font-semibold mt-1">Solicitações ilimitadas / Exclusividade</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Prioridade total na região</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Múltiplas filiais ou estado inteiro</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Integração com CRM / WhatsApp API</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-600" /><span>Gerente de conta dedicado</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Quero Me Cadastrar
            </button>
          </div>

        </div>

      </section>


      {/* SECTION: FAQ ACCORDION */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200/80 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between space-x-4 focus:outline-none"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
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
