import React, { useState } from 'react';
import { CheckCircle2, Phone, Mail, MapPin, User, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ENVIRONMENTS, FINISHES, HARDWARE_OPTIONS, LAYOUT_OPTIONS, DOOR_TYPE_OPTIONS, FURNITURE_MODULES } from '../../data/mockData';

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
    name: 'Ana Carolina Mendes',
    phone: '(11) 99123-4567',
    whatsapp: '(11) 99123-4567',
    email: 'ana.mendes@email.com',
    city: simulator.location.city || 'São Paulo',
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  if (!isLeadCaptureOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const env = ENVIRONMENTS.find((ev) => ev.id === simulator.environmentId) || ENVIRONMENTS[0];
    const finish = FINISHES.find((f) => f.id === simulator.finishId) || FINISHES[0];
    const hardware = HARDWARE_OPTIONS.find((h) => h.id === simulator.hardwareId) || HARDWARE_OPTIONS[0];
    const layout = LAYOUT_OPTIONS.find((l) => l.id === simulator.layoutTypeId) || LAYOUT_OPTIONS[0];
    const doorType = DOOR_TYPE_OPTIONS.find((d) => d.id === simulator.doorTypeId) || DOOR_TYPE_OPTIONS[0];
    const selectedMods = FURNITURE_MODULES.filter((m) => (simulator.selectedFurnitureModuleIds || []).includes(m.id)).map((m) => m.title);

    const newLead = addLead({
      name: formData.name,
      phone: formData.phone,
      whatsapp: formData.whatsapp.replace(/\D/g, ''),
      email: formData.email,
      city: formData.city,
      state: simulator.location.state || 'SP',
      cep: simulator.location.cep || '04538-133',
      environment: env.title,
      furnitureModules: selectedMods,
      layoutType: layout.title,
      doorType: doorType.title,
      dimensions: {
        length: simulator.dimensions.length,
        height: simulator.dimensions.height,
        width: simulator.dimensions.width,
        areaM2: simulator.dimensions.length * simulator.dimensions.height,
      },
      finishPattern: finish.title,
      hardwareLevel: hardware.title,
      additionalItems: simulator.additionalItemIds,
      estimatedMin: simulator.calculatedRange.min,
      estimatedMax: simulator.calculatedRange.max,
    });

    setCreatedLeadId(newLead.id);
    setIsSuccess(true);
    triggerConfetti();
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
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Solicitação de Orçamento Sem Compromisso</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Receba seu orçamento detalhado
              </h3>
              <p className="text-xs text-slate-500">
                Preencha seus dados para encaminharmos o projeto 3D à loja parceira credenciada da sua região.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Ana Carolina Mendes"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cidade / Região</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Sua Cidade"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Main Green Action Button requested */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-action-600 hover:bg-action-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-300 shadow-emerald-glow hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>QUERO RECEBER MEU ORÇAMENTO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        ) : (
          
          /* SUCCESS STATE */
          <div className="p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-action-600 flex items-center justify-center mx-auto shadow-emerald-glow">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900">Solicitação Enviada!</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                "Obrigado! Sua solicitação foi enviada para uma loja parceira da sua região. Em breve um especialista entrará em contato."
              </p>
            </div>

            {/* Investor demo shortcut info */}
            <div className="p-4 bg-brand-50 rounded-2xl border border-brand-200 text-xs text-brand-900 space-y-2 text-left">
              <div className="font-bold flex items-center space-x-1">
                <span>💡 Demonstração Interativa em Tempo Real:</span>
              </div>
              <p className="text-brand-700">
                Seu lead (<strong className="text-slate-900">#{createdLeadId}</strong>) foi adicionado ao sistema! Clique no botão abaixo para alternar para o <strong>Painel do Lojista</strong> e ver este pedido em tempo real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleGoToMerchantDemo}
                className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-blue-glow"
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
    </div>
  );
};
