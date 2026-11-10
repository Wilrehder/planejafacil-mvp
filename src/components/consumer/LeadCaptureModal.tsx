import React, { useState, useEffect } from 'react';
import { CheckCircle2, Phone, Mail, MapPin, User, X, ArrowRight, ShieldCheck, Loader2, Lock, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ENVIRONMENTS, FINISHES, HARDWARE_OPTIONS, LAYOUT_OPTIONS, DOOR_TYPE_OPTIONS, FURNITURE_MODULES } from '../../data/mockData';
import { supabase } from '../../lib/supabase';

import { submitSimulationAndLead } from '../../lib/simulationService';
import { formatPhone, isValidPhone } from '../../lib/formatters';

export const LeadCaptureModal: React.FC = () => {
  const {
    isLeadCaptureOpen,
    setIsLeadCaptureOpen,
    simulator,
    addLead,
    triggerConfetti,
    setRole,
    setMerchantTab,
  } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: simulator.clientInfo?.city || '',
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const userEmail = user.email || '';
        setFormData(prev => ({
          ...prev,
          name: prev.name || metaName,
          email: prev.email || userEmail,
        }));
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
        setSocialNotice(`Integração com ${provider === 'google' ? 'Google' : 'Apple'} em fase de configuração. Preencha os campos abaixo.`);
        return;
      }
      if (data?.url) {
        const popup = window.open(data.url, `${provider}_auth`, 'width=520,height=650,left=200,top=100');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = data.url;
        }
      }
    } catch {
      setSocialNotice(`Não foi possível conectar com ${provider === 'google' ? 'Google' : 'Apple'}.`);
    } finally {
      setOauthLoading(null);
    }
  };

  if (!isLeadCaptureOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setErrorMessage('É obrigatório concordar com os Termos de Privacidade e Contato para prosseguir.');
      return;
    }

    if (!isValidPhone(formData.whatsapp)) {
      setErrorMessage('Informe um WhatsApp válido com DDD (10 ou 11 dígitos).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const envSummaryStr = simulator.environments.map((env) => `${env.name} (${env.areaM2}m²)`).join(', ');

    try {
      const activeEnvs = simulator.environments.length > 0 ? simulator.environments : [{
        id: 'env-1',
        typeId: 'cozinha',
        name: 'Cozinha Planejada',
        areaM2: 12,
        wallCount: 3 as 1 | 2 | 3 | 4,
        ceilingHeight: 2.7,
        walls: []
      }];

      const res = await submitSimulationAndLead({
        clientInfo: {
          name: formData.name,
          phone: formData.phone,
          cep: simulator.clientInfo.cep || '04538-133',
          email: formData.email,
        },
        environments: activeEnvs.map(e => ({
          typeId: e.typeId,
          name: e.name,
          areaM2: e.areaM2,
          ceilingHeight: e.ceilingHeight || 2.7,
          wallCount: e.wallCount as 1 | 2 | 3 | 4,
        }))
      });

      const newLead = addLead({
        id: res.leadId,
        assignmentId: res.assignmentId,
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp.replace(/\D/g, ''),
        email: formData.email,
        city: res.city || formData.city,
        state: res.state || simulator.clientInfo.state || 'SP',
        cep: simulator.clientInfo.cep || '04538-133',
        environment: envSummaryStr || 'Cozinha Principal',
        environmentsData: simulator.environments,
        estimatedMin: res.budgetMin || simulator.calculatedRange.min,
        estimatedMax: res.budgetMax || simulator.calculatedRange.max,
        assignedStoreName: res.assignedStoreName,
        assignedStoreId: res.assignedStoreId,
      });

      if (res.leadId) {
        supabase
          .from('leads')
          .update({
            accepted_privacy_terms: true,
            privacy_terms_timestamp: new Date().toISOString()
          })
          .eq('id', res.leadId)
          .then();
      }

      setCreatedLeadId(newLead.id);
      setIsSuccess(true);
      triggerConfetti();
    } catch (err: any) {
      console.warn('Fallback para lead local:', err);
      const newLead = addLead({
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp.replace(/\D/g, ''),
        email: formData.email,
        city: formData.city,
        state: simulator.clientInfo.state || 'SP',
        cep: simulator.clientInfo.cep || '04538-133',
        environment: envSummaryStr || 'Cozinha Principal',
        environmentsData: simulator.environments,
        estimatedMin: simulator.calculatedRange.min,
        estimatedMax: simulator.calculatedRange.max,
      });

      setCreatedLeadId(newLead.id);
      setIsSuccess(true);
      triggerConfetti();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsLeadCaptureOpen(false);
    setIsSuccess(false);
  };

  const handleGoToMerchantDemo = () => {
    handleClose();
    setRole('merchant');
    setMerchantTab('leads');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          
          /* FORM STATE */
          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="space-y-2 text-left">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#EBF7EC] text-[#439346] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Solicitação de Orçamento Sem Compromisso</span>
              </div>
              <h3 className="text-2xl font-black text-[#1B2B48] tracking-tight">
                Receba seu orçamento detalhado
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Preencha seus dados para encaminharmos o projeto 3D à loja parceira credenciada da sua região.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase mb-1">Nome Completo</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#439346]"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1B2B48] uppercase mb-1">Telefone</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#439346]"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2B48] uppercase mb-1">WhatsApp</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 font-mono font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#439346]"
                    />
                    <Phone className="w-4 h-4 text-[#439346] absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase mb-1">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#439346]"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B48] uppercase mb-1">Cidade / Região</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#439346]"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Checkbox de Aceite dos Termos de Privacidade e Contato (LGPD) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left">
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
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
                    , autorizando que uma loja credenciada da minha região entre em contato comigo via WhatsApp ou ligação para apresentar este orçamento.
                  </span>
                </label>
              </div>

              {/* Main Green Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !acceptedTerms}
                  className="w-full py-4 rounded-xl bg-[#439346] hover:bg-[#387F3B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-300 shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{isSubmitting ? 'ENVIANDO...' : 'QUERO RECEBER MEU ORÇAMENTO'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        ) : (
          
          /* SUCCESS STATE */
          <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#EBF7EC] text-[#439346] flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-[#1B2B48]">Solicitação Enviada!</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                "Obrigado! Sua solicitação foi enviada para uma loja parceira da sua região. Em breve um especialista entrará em contato."
              </p>
            </div>

            {/* Investor demo shortcut info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
              <div className="font-bold flex items-center space-x-1 text-[#1B2B48]">
                <span>💡 Demonstração Interativa em Tempo Real:</span>
              </div>
              <p className="text-slate-600 font-medium">
                Seu lead (<strong className="text-[#1B2B48]">#{createdLeadId}</strong>) foi adicionado ao sistema! Clique no botão abaixo para alternar para o <strong>Painel do Lojista</strong> e ver este pedido em tempo real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleGoToMerchantDemo}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1B2B48] hover:bg-[#121E34] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
              >
                Ver no Painel do Lojista &rarr;
              </button>
              <button
                onClick={handleClose}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Termos de Privacidade e Contato (LGPD) */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in text-left">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
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
                  As informações fornecidas (Nome, Telefone/WhatsApp, E-mail e Cidade) serão utilizadas <strong>exclusivamente</strong> para encaminhar o seu projeto de móveis a uma loja parceira credenciada e homologada da sua região.
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
                  Não vendemos, não alugamos e não compartilhamos seus dados com terceiros não autorizados ou empresas de telemarketing.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#1B2B48] text-xs uppercase tracking-wider mb-1">
                  4. Seus Direitos
                </h4>
                <p>
                  Você pode, a qualquer momento, solicitar a atualização, retificação ou exclusão definitiva dos seus dados dos nossos registros.
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
