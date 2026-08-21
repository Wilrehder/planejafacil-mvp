import React from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Phone, 
  User, 
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white">
                Ref. #{lead.id}
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
              Alterar Status da Negociação
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusChange('novo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'novo'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Novo Lead
              </button>

              <button
                onClick={() => handleStatusChange('em_atendimento')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'em_atendimento'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Em Atendimento
              </button>

              <button
                onClick={() => handleStatusChange('orcado')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'orcado'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Orçado
              </button>

              <button
                onClick={() => handleStatusChange('convertido')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  lead.status === 'convertido'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Venda Realizada
              </button>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Informações de Contato do Consumidor</span>
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Telefone:</span>
                <a
                  href={`tel:${lead.phone}`}
                  className="font-bold text-emerald-700 hover:underline flex items-center space-x-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lead.phone}</span>
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">E-mail:</span>
                <a href={`mailto:${lead.email}`} className="font-bold text-slate-900 hover:underline flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.email}</span>
                </a>
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
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Especificações do Projeto Solicitado</span>
            </h3>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Ambientes:</span>
                <span className="font-extrabold text-slate-900 text-sm">{lead.environment}</span>
              </div>

              {lead.environmentsData && lead.environmentsData.length > 0 && (
                <div className="pb-3 border-b border-slate-100 space-y-2">
                  <span className="text-slate-500 font-semibold block">Detalhamento dos Cômodos:</span>
                  <div className="space-y-2">
                    {lead.environmentsData.map((env, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                        <div className="font-bold text-slate-900 flex justify-between">
                          <span>{env.name}</span>
                          <span className="text-emerald-700 font-mono">{env.areaM2} m² • {env.wallCount} Paredes</span>
                        </div>
                        {env.walls.map((w) => (
                          <div key={w.id} className="text-slate-600 text-[10px]">
                            {w.label} ({w.length}m): {w.selectedFurnitureTypes.length} móveis, {w.selectedSpecificItems.length} itens específicos
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lead.qualityTier && (
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Padrão de Qualidade:</span>
                  <span className="font-bold text-slate-900">{lead.qualityTier}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Padrão de Acabamento:</span>
                <span className="font-bold text-slate-900">{lead.finishPattern || 'Padrão Madeirado'}</span>
              </div>

            </div>
          </div>

          {/* Investment Range Highlight */}
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
              Estimativa Calculada pelo Simulador
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={`tel:${lead.phone}`}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            <Phone className="w-4 h-4" />
            <span>Ligar para {lead.phone}</span>
          </a>
        </div>

      </div>
    </div>
  );
};
