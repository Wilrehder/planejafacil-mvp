import React from 'react';
import { Home, Zap, Store, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const { role, consumerTab, setConsumerTab } = useApp();

  if (role !== 'consumer') return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-2 px-4 shadow-2xl transition-all">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Home */}
        <button
          onClick={() => {
            setConsumerTab('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl transition-all ${
            consumerTab === 'landing' ? 'text-brand-600 font-extrabold' : 'text-slate-500 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${consumerTab === 'landing' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Início</span>
        </button>

        {/* Simulator (Highlighted Green CTA Pill) */}
        <button
          onClick={() => {
            setConsumerTab('simulator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center space-y-1 py-1 px-4 rounded-2xl transition-all ${
            consumerTab === 'simulator'
              ? 'bg-action-600 text-white font-extrabold shadow-emerald-glow scale-105'
              : 'text-action-600 bg-action-50 border border-action-200 font-bold'
          }`}
        >
          <Zap className="w-5 h-5 fill-current" />
          <span className="text-[10px] tracking-tight">Simular</span>
        </button>

        {/* Lojas / Como funciona */}
        <a
          href="#como-funciona"
          onClick={() => {
            if (consumerTab !== 'landing') setConsumerTab('landing');
          }}
          className="flex flex-col items-center space-y-1 py-1 px-3 rounded-xl text-slate-500 font-medium hover:text-slate-900 transition-colors"
        >
          <Store className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] tracking-tight">Processo</span>
        </a>

        {/* Dúvidas / FAQ */}
        <a
          href="#faq"
          onClick={() => {
            if (consumerTab !== 'landing') setConsumerTab('landing');
          }}
          className="flex flex-col items-center space-y-1 py-1 px-3 rounded-xl text-slate-500 font-medium hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[10px] tracking-tight">Dúvidas</span>
        </a>

      </div>
    </div>
  );
};
