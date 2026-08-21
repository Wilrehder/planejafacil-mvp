import React from 'react';
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Mail, 
  MapPin, 
  Maximize2, 
  MessageSquare, 
  Phone, 
  Ruler, 
  ShieldCheck, 
  User, 
  Wrench, 
  X 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus } from '../../types';

export const LeadDetailDrawer: React.FC = () => {
  const { selectedLeadForDetail, setSelectedLeadForDetail, updateLeadStatus } = useApp();

  if (!selectedLeadForDetail) return null;

  const lead = selectedLeadForDetail;

  const handleStatusChange = (status: LeadStatus) => {
    updateLeadStatus(lead.id, status);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const whatsappMessage = encodeURIComponent(
    `Olá ${lead.name}! Sou especialista da loja parceira Planeja Fácil. Recebi sua solicitação de orçamento para a ${lead.environment} (${lead.dimensions.areaM2.toFixed(1)}m²). Podemos agendar uma apresentação do projeto 3D?`
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-600 text-white">
                Proposta #{lead.id}
              </span>
              <span className="text-xs text-slate-400 font-mono">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">{lead.name}</h2>
          </div>

          <button
            onClick={() => setSelectedLeadForDetail(null)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* Status Changer Toolbar */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atualizar Status da Negociação
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusChange('em_atendimento')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'em_atendimento'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Marcar como Recebido
              </button>

              <button
                onClick={() => handleStatusChange('orcado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'orcado'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Marcar como Orçado
              </button>

              <button
                onClick={() => handleStatusChange('convertido')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'convertido'
                    ? 'bg-action-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Marcar como Venda Realizada
              </button>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-600" />
              <span>Informações de Contato do Consumidor</span>
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Telefone / WhatsApp:</span>
                <a
                  href={`https://wa.me/${lead.whatsapp}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-600 hover:underline flex items-center space-x-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lead.phone}</span>
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-bold text-slate-900">{lead.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cidade / UF:</span>
                <span className="font-bold text-slate-900">{lead.city} - {lead.state} (CEP {lead.cep})</span>
              </div>
            </div>
          </div>

          {/* Project Specifications Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>Especificações do Projeto Solicitado</span>
            </h3>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Ambiente:</span>
                <span className="font-extrabold text-slate-900 text-sm">{lead.environment}</span>
              </div>

              {lead.layoutType && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Formato/Layout:</span>
                  <span className="font-bold text-slate-900">{lead.layoutType}</span>
                </div>
              )}

              {lead.furnitureModules && lead.furnitureModules.length > 0 && (
                <div className="pb-3 border-b border-slate-100 space-y-1">
                  <span className="text-slate-500 font-semibold block">Módulos & Peças Escolhidas:</span>
                  <div className="flex flex-wrap gap-1">
                    {lead.furnitureModules.map((mod: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-brand-50 text-brand-700 font-bold text-[11px] rounded border border-brand-200">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {lead.doorType && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Tipo de Abertura / Portas:</span>
                  <span className="font-bold text-slate-900">{lead.doorType}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Medidas Estimadas:</span>
                <span className="font-bold text-slate-900">
                  {lead.dimensions.length}m (comp) x {lead.dimensions.height}m (alt) x {lead.dimensions.width}m (larg) —{' '}
                  <strong className="text-brand-600">{lead.dimensions.areaM2.toFixed(1)} m²</strong>
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Padrão de Acabamento:</span>
                <span className="font-bold text-slate-900">{lead.finishPattern}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Ferragens Desejadas:</span>
                <span className="font-bold text-slate-900">{lead.hardwareLevel}</span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-2">Itens Adicionais Selecionados:</span>
                {lead.additionalItems.length === 0 ? (
                  <span className="text-slate-400 italic">Nenhum opcional selecionado</span>
                ) : (
                  <div className="space-y-1">
                    {lead.additionalItems.map((item, i) => (
                      <div key={i} className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Investment Range Highlight */}
          <div className="p-5 rounded-2xl bg-brand-50 border border-brand-200 space-y-1">
            <div className="text-[10px] font-bold text-brand-700 uppercase tracking-widest">
              Estimativa Calculada pelo Simulador
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={`https://wa.me/${lead.whatsapp}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 rounded-xl bg-action-600 hover:bg-action-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-emerald-glow transition-all"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Abrir Conversa no WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
};
