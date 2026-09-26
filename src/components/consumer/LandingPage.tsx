import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ShieldCheck, 
  Zap,
  ChefHat,
  Shirt,
  Laptop,
  Sofa,
  Bath
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';

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

  const quickCategories = [
    { title: 'Cozinha', icon: ChefHat, tag: 'Popular' },
    { title: 'Guarda-Roupa', icon: Shirt, tag: 'Dormitório' },
    { title: 'Home Office', icon: Laptop, tag: 'Trabalho' },
    { title: 'Sala de Estar', icon: Sofa, tag: 'Painel TV' },
    { title: 'Banheiro', icon: Bath, tag: 'Suíte' },
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
    <div className="bg-[#F4F6F9] text-slate-900 min-h-screen font-sans pb-12">
      
      {/* ========================================================================= */}
      {/* HERO SECTION MATCHING REFERENCE SCREEN 2 (NAVY BANNER + SIMULE SEU PLANEJADO) */}
      {/* ========================================================================= */}
      <section className="relative bg-[#1B2B48] text-white pt-6 pb-20 px-4 sm:px-6 lg:px-8 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B2B48] via-[#1B2B48] to-[#142036] opacity-90 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto space-y-8 text-center pt-2 sm:pt-6">
          
          {/* Top Logo Container matching reference header */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
              <Logo variant="dark" size="md" />
            </div>
          </div>

          {/* Headline matching exact reference text */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Simule seu Planejado<br />em Minutos!
            </h1>
            <p className="text-sm sm:text-lg text-slate-300 max-w-xl mx-auto font-medium">
              Escolha seu ambiente, defina o tamanho e descubra o valor estimado instantaneamente.
            </p>
          </div>

          {/* Quick Environment Selector Cards Bar (Screen 2 reference style) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2 max-w-3xl mx-auto">
            {quickCategories.map((cat, idx) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setConsumerTab('simulator')}
                  className="bg-white/90 hover:bg-white text-[#1B2B48] p-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center space-y-2 group border border-white/20"
                >
                  <div className="p-2.5 rounded-xl bg-[#EBF7EC] text-[#439346] group-hover:scale-110 transition-transform">
                    <IconComp className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-bold text-[#1B2B48] group-hover:text-[#439346] transition-colors leading-tight">
                    {cat.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Room Image Showcase Card */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-slate-900 h-64 sm:h-80 w-full group">
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

              {/* Navigation Dots */}
              <div className="absolute bottom-3 right-3 z-10 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlideIndex ? 'w-5 bg-[#439346]' : 'w-2 bg-slate-500 hover:bg-slate-300'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Button (Reference exact green CTA: Faça seu Orçamento) */}
          <div className="pt-2 max-w-md mx-auto">
            <button
              onClick={() => setConsumerTab('simulator')}
              className="w-full py-4 px-8 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-black text-base sm:text-lg tracking-wide uppercase transition-all shadow-xl shadow-[#439346]/30 flex items-center justify-center space-x-3 group"
            >
              <Zap className="w-5 h-5 fill-white" />
              <span>Faça seu Orçamento</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-4 flex items-center justify-center space-x-6 text-xs font-semibold text-slate-300">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#439346]" />
                <span>100% Gratuito</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-[#439346]" />
                <span>Sem Necessidade de Cadastro</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: COMO FUNCIONA O PLANEJAFÁCIL */}
      {/* ========================================================================= */}
      <section id="como-funciona" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48] tracking-tight">
            Como funciona o PlanejaFácil
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Um processo simples e transparente para planejar o orçamento do seu imóvel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-black text-lg">
              1
            </div>
            <h3 className="text-base font-bold text-[#1B2B48]">Escolha o Ambiente</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Selecione o cômodo desejado: Cozinha, Dormitório, Closet, Home Theater ou Banheiro.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-black text-lg">
              2
            </div>
            <h3 className="text-base font-bold text-[#1B2B48]">Informe as Medidas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Insira o tamanho das paredes e escolha os móveis desejados (balcões, armários, aéreos).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-black text-lg">
              3
            </div>
            <h3 className="text-base font-bold text-[#1B2B48]">Veja o Orçamento</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visualise na hora a faixa estimada de valor calculada com base em marceneiros da sua região.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-black text-lg">
              4
            </div>
            <h3 className="text-base font-bold text-[#1B2B48]">Receba Propostas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se desejar, solicite o contato de uma loja parceira credenciada para finalizar seu projeto.
            </p>
          </div>

        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => setConsumerTab('simulator')}
            className="px-8 py-3.5 rounded-xl bg-[#1B2B48] hover:bg-[#121E34] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md"
          >
            Iniciar Simulação
          </button>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION: PLANOS B2B PARA LOJAS PARCEIRAS */}
      {/* ========================================================================= */}
      <section id="lojas-parceiras" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48] tracking-tight">
            Planos para Lojas e Marcenarias Parceiras
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Receba solicitações de orçamentos e projetos de clientes qualificados da sua cidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PLANO GOLD */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plano Gold</span>
                <div className="text-3xl font-extrabold text-[#1B2B48] mt-1">R$ 490 <span className="text-xs text-slate-500 font-normal">/mês</span></div>
                <div className="text-xs text-[#439346] font-semibold mt-1">Até 30 solicitações de clientes/mês</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>1 Cidade principal</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Notificações por WhatsApp</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Painel de gestão de leads</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1B2B48] font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Quero Me Cadastrar
            </button>
          </div>

          {/* PLANO PLATINUM */}
          <div className="p-6 rounded-2xl bg-[#1B2B48] text-white shadow-xl flex flex-col justify-between space-y-6 border border-[#283D64] relative">
            <div className="absolute -top-3 right-6 bg-[#439346] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow">
              Mais Popular
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#439346] uppercase tracking-wider">Plano Platinum</span>
                <div className="text-3xl font-extrabold text-white mt-1">R$ 990 <span className="text-xs text-slate-400 font-normal">/mês</span></div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Até 80 solicitações de clientes/mês</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-white/10">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Fila prioritária de envio</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Região metropolitana (até 10 cidades)</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Envio de projeto em PDF e medidas</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Selo de Loja Credenciada</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
            >
              Quero Me Cadastrar
            </button>
          </div>

          {/* PLANO DIAMOND */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plano Diamond</span>
                <div className="text-3xl font-extrabold text-[#1B2B48] mt-1">R$ 1.990 <span className="text-xs text-slate-500 font-normal">/mês</span></div>
                <div className="text-xs text-[#439346] font-semibold mt-1">Solicitações ilimitadas / Exclusividade</div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-4 border-t border-slate-100">
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Prioridade total na região</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Múltiplas filiais ou estado inteiro</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Integração com CRM / WhatsApp API</span></li>
                <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#439346]" /><span>Gerente de conta dedicado</span></li>
              </ul>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1B2B48] font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Quero Me Cadastrar
            </button>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION: FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B48] tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between space-x-4 focus:outline-none"
                >
                  <span className="font-bold text-[#1B2B48] text-sm sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#439346]' : ''}`} />
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
