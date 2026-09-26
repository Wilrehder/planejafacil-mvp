import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  const { setConsumerTab } = useApp();

  return (
    <footer className="bg-[#121E34] text-slate-300 border-t border-slate-800 pt-12 sm:pt-16 pb-24 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 pb-10 border-b border-slate-800">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <Logo variant="dark" size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              A plataforma inteligente que conecta você às melhores lojas de móveis sob medida da sua região com estimativa de preço transparente.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 w-fit">
              <ShieldCheck className="w-4 h-4 text-[#439346]" />
              <span>Plataforma Segura & Verificada</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Navegação</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button onClick={() => setConsumerTab('landing')} className="hover:text-white transition-colors">
                  Página Inicial
                </button>
              </li>
              <li>
                <button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">
                  Simulador de Orçamento
                </button>
              </li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#beneficios" className="hover:text-white transition-colors">Vantagens</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a></li>
            </ul>
          </div>

          {/* Popular Environments */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Ambientes</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">Cozinha Planejada</button></li>
              <li><button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">Dormitórios & Suítes</button></li>
              <li><button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">Closets Sob Medida</button></li>
              <li><button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">Home Office</button></li>
              <li><button onClick={() => setConsumerTab('simulator')} className="hover:text-white transition-colors">Áreas Gourmet & Varandas</button></li>
            </ul>
          </div>

          {/* Partner Store Invitation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Para Lojas Parceiras</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sua loja quer receber solicitações de orçamentos de clientes qualificados da sua região?
            </p>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-900/40 to-slate-800 border border-brand-500/30">
              <div className="flex items-center space-x-2 text-xs font-bold text-brand-300 mb-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Seja uma Loja Parceira</span>
              </div>
              <p className="text-[11px] text-slate-400">Receba solicitações exclusivas no seu painel.</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-3 sm:space-y-0">
          <div>
            © {new Date().getFullYear()} PlanejaFácil. Todos os direitos reservados.
          </div>
          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Privacidade</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
