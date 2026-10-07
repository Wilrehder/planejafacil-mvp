import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Check, 
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LandingPage: React.FC = () => {
  const { setConsumerTab } = useApp();
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

  return (
    <div className="bg-[#F4F6F9] text-slate-900 min-h-screen font-sans pb-16">
      
      {/* ========================================================================= */}
      {/* HERO SECTION - MOBILE FIRST & HARMONIOUS DESIGN */}
      {/* ========================================================================= */}
      <section className="relative bg-[#1B2B48] text-white pt-6 sm:pt-10 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-xl overflow-hidden">
        
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B2B48] via-[#1B2B48] to-[#142036] opacity-90 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto space-y-6 sm:space-y-8 text-center">
          
          {/* Headline matching exact reference text */}
          <div className="space-y-2.5 sm:space-y-3 pt-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-snug sm:leading-[1.15]">
              Faça seu orçamento em minutos
            </h1>
            <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto font-medium leading-relaxed">
              Escolha seu ambiente, defina o tamanho e descubra o valor estimado instantaneamente.
            </p>
          </div>

          {/* Room Image Showcase Card */}
          <div className="max-w-2xl mx-auto pt-1">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 sm:border-4 border-white/20 bg-slate-900 h-52 sm:h-80 w-full group">
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
              <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-1.5 sm:h-2 rounded-full transition-all ${
                      idx === currentSlideIndex ? 'w-4 sm:w-5 bg-[#439346]' : 'w-1.5 sm:w-2 bg-slate-500 hover:bg-slate-300'
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
              className="w-full py-4 px-6 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase transition-all shadow-xl shadow-[#439346]/25 flex items-center justify-center space-x-2 group"
            >
              <span>Faça seu Orçamento</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION: COMO FUNCIONA O PLANEJAFÁCIL */}
      {/* ========================================================================= */}
      <section id="como-funciona" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3 mb-10 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-extrabold text-[#1B2B48] tracking-tight">
            Como funciona o PlanejaFácil
          </h2>
          <p className="text-slate-600 text-xs sm:text-base font-medium">
            Um processo simples e transparente para planejar o orçamento do seu imóvel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-extrabold text-base sm:text-lg">
              1
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1B2B48]">Escolha o Ambiente</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Selecione o cômodo desejado: Cozinha, Dormitório, Closet, Home Theater ou Banheiro.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-extrabold text-base sm:text-lg">
              2
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1B2B48]">Informe as Medidas</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Insira o tamanho das paredes e escolha os móveis desejados (balcões, armários, aéreos).
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-extrabold text-base sm:text-lg">
              3
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1B2B48]">Veja o Orçamento</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Visualise na hora a faixa estimada de valor calculada com base em marceneiros da sua região.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#EBF7EC] text-[#439346] flex items-center justify-center font-extrabold text-base sm:text-lg">
              4
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1B2B48]">Receba Propostas</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Se desejar, solicite o contato de uma loja parceira credenciada para finalizar seu projeto.
            </p>
          </div>

        </div>

        <div className="mt-8 sm:mt-10 text-center">
          <button
            onClick={() => setConsumerTab('simulator')}
            className="px-8 py-3.5 rounded-xl bg-[#1B2B48] hover:bg-[#121E34] text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            Faça seu Orçamento
          </button>
        </div>

      </section>

    </div>
  );
};
