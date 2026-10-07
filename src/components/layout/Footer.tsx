import React, { useState } from 'react';
import { Building2, Check, Send, Star, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  const { setConsumerTab, addStoreApplication, triggerConfetti } = useApp();

  // Modal State for Partner Store Application Form
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  
  const [partnerForm, setPartnerForm] = useState({
    storeName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    state: 'SP',
    desiredPlan: 'Platinum' as 'Gold' | 'Platinum' | 'Diamond',
    notes: '',
  });

  const handlePartnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStoreApplication(partnerForm);
    setSubmittedSuccess(true);
    triggerConfetti();
    setTimeout(() => {
      setSubmittedSuccess(false);
      setIsPartnerModalOpen(false);
      setPartnerForm({
        storeName: '',
        contactName: '',
        phone: '',
        email: '',
        city: '',
        state: 'SP',
        desiredPlan: 'Platinum',
        notes: '',
      });
    }, 2800);
  };

  return (
    <footer className="bg-[#121E34] text-slate-300 border-t border-slate-800 pt-12 sm:pt-16 pb-24 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Footer Grid - 3 Columns Clean Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 pb-10 border-b border-slate-800">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Logo variant="dark" size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              A plataforma inteligente que conecta você às melhores lojas e marcenarias sob medida com estimativa de preço transparente em minutos.
            </p>
          </div>

          {/* Column 2: Quick Navigation (Clean without FAQ) */}
          <div className="md:pl-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3.5">Navegação</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-slate-400">
              <li>
                <button onClick={() => { setConsumerTab('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">
                  Página Inicial
                </button>
              </li>
              <li>
                <button onClick={() => { setConsumerTab('simulator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">
                  Faça seu Orçamento
                </button>
              </li>
              <li>
                <a href="#como-funciona" className="hover:text-white transition-colors">
                  Como Funciona?
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Partner Store Invitation with Interactive Contact Modal Trigger */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Para Lojas & Marcenarias</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Sua loja quer receber solicitações de orçamentos de clientes qualificados da sua região?
            </p>

            <button
              onClick={() => setIsPartnerModalOpen(true)}
              className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-brand-900/40 via-slate-800 to-slate-800 border border-brand-500/40 hover:border-brand-500/80 transition-all duration-300 group shadow-md hover:shadow-lg active:scale-98"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-extrabold text-brand-300 group-hover:text-white transition-colors">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Seja uma Loja Parceira</span>
                </div>
                <Send className="w-3.5 h-3.5 text-brand-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                Clique aqui para cadastrar seu interesse e receber solicitações no painel.
              </p>
            </button>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-3 sm:space-y-0">
          <div>
            © {new Date().getFullYear()} PlanejaFácil. Todos os direitos reservados.
          </div>
          <div className="flex items-center space-x-6 font-medium">
            <a href="#" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Privacidade</a>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: FORMULÁRIO DE SEJA UMA LOJA PARCEIRA */}
      {/* ========================================================================= */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 my-auto text-slate-900">
            
            <button
              onClick={() => setIsPartnerModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submittedSuccess ? (
              <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-[#EBF7EC] text-[#439346] rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-xl font-extrabold text-[#1B2B48]">Solicitação Enviada com Sucesso!</h3>
                <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto leading-relaxed">
                  Obrigado pelo seu interesse! Nossa equipe entrará em contato em breve.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-left">
                  <h3 className="text-xl font-black text-[#1B2B48]">Seja uma Loja Parceira</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Preencha os dados abaixo para que nossa equipe entre em contato com sua loja.
                  </p>
                </div>

                <form onSubmit={handlePartnerSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Loja *</label>
                    <input
                      type="text"
                      required
                      value={partnerForm.storeName}
                      onChange={(e) => setPartnerForm({ ...partnerForm, storeName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Contato *</label>
                    <input
                      type="text"
                      required
                      value={partnerForm.contactName}
                      onChange={(e) => setPartnerForm({ ...partnerForm, contactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={partnerForm.email}
                        onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cidade *</label>
                      <input
                        type="text"
                        required
                        value={partnerForm.city}
                        onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado *</label>
                      <select
                        value={partnerForm.state}
                        onChange={(e) => setPartnerForm({ ...partnerForm, state: e.target.value })}
                        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:border-[#439346] bg-white"
                      >
                        <option value="SP">SP</option>
                        <option value="RJ">RJ</option>
                        <option value="MG">MG</option>
                        <option value="PR">PR</option>
                        <option value="SC">SC</option>
                        <option value="RS">RS</option>
                        <option value="BA">BA</option>
                        <option value="DF">DF</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] active:scale-98 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar Solicitação de Parceria</span>
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </footer>
  );
};
