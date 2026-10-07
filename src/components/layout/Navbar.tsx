import React, { useState } from 'react';
import { 
  ChevronDown, 
  ShieldCheck, 
  Store, 
  UserCheck 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';
import type { Role } from '../../types';

export const Navbar: React.FC = () => {
  const { role, setRole, setConsumerTab, consumerTab } = useApp();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setIsRoleDropdownOpen(false);
    if (newRole === 'consumer') {
      setConsumerTab('landing');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20">
          
          {/* Official Brand Logo matching Reference */}
          <div className="flex items-center space-x-2 cursor-pointer py-1" onClick={() => handleRoleChange('consumer')}>
            <Logo variant="light" size="md" />
          </div>

          {/* Navigation Links for Consumer View (Desktop) */}
          {role === 'consumer' && (
            <nav className="hidden lg:flex items-center space-x-8">
              <button
                onClick={() => setConsumerTab('landing')}
                className={`text-sm font-bold transition-colors duration-200 ${
                  consumerTab === 'landing' ? 'text-[#1B2B48] border-b-2 border-[#439346] pb-1' : 'text-slate-600 hover:text-[#1B2B48]'
                }`}
              >
                Início
              </button>
              <button
                onClick={() => setConsumerTab('simulator')}
                className={`text-sm font-bold transition-colors duration-200 ${
                  consumerTab === 'simulator' ? 'text-[#1B2B48] border-b-2 border-[#439346] pb-1' : 'text-slate-600 hover:text-[#1B2B48]'
                }`}
              >
                Simulador
              </button>
              <a href="#como-funciona" className="text-sm font-semibold text-slate-600 hover:text-[#1B2B48] transition-colors">
                Como Funciona
              </a>
              <a href="#faq" className="text-sm font-semibold text-slate-600 hover:text-[#1B2B48] transition-colors">
                Dúvidas
              </a>
            </nav>
          )}

          {/* Right Section: Role Switcher & Action CTA */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Interactive Role Switcher Dropdown (Investor Demo Feature) */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 border border-slate-200 text-[10px] sm:text-xs font-semibold text-slate-700 transition-all shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-[#439346] animate-pulse"></span>
                <span className="hidden sm:inline">Modo:</span>
                <span className="text-[#1B2B48] font-bold">
                  {role === 'consumer' && '👤 Consumidor'}
                  {role === 'merchant' && '🏬 Lojista'}
                  {role === 'admin' && '🛡️ Admin'}
                </span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Alternar Perfis (Demonstração)
                  </div>
                  
                  <button
                    onClick={() => handleRoleChange('consumer')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs text-left font-medium transition-colors ${
                      role === 'consumer' ? 'bg-[#EBF7EC] text-[#1B2B48] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-[#439346]">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Consumidor (PWA)</div>
                      <div className="text-[10px] text-slate-400">Landing & Simulador Móvel</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoleChange('merchant')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs text-left font-medium transition-colors ${
                      role === 'merchant' ? 'bg-[#EBF7EC] text-[#1B2B48] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Lojista Parceiro</div>
                      <div className="text-[10px] text-slate-400">Portal de Leads e WhatsApp</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoleChange('admin')}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs text-left font-medium transition-colors ${
                      role === 'admin' ? 'bg-[#EBF7EC] text-[#1B2B48] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">Administrador SaaS</div>
                      <div className="text-[10px] text-slate-400">Dashboard & Mapa do Brasil</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Consumer CTA Button (Clean Green) */}
            {role === 'consumer' && (
              <button
                onClick={() => setConsumerTab('simulator')}
                className="flex items-center justify-center px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-extrabold text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-300 shadow-md active:scale-95"
              >
                <span>Faça seu Orçamento</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
