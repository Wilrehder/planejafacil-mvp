import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FINISH_OPTIONS_CATALOG, QUALITY_TIERS } from '../../data/mockData';
import { Logo } from '../common/Logo';

interface ProposalPdfModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const ProposalPdfModal: React.FC<ProposalPdfModalProps> = ({ isOpen = true, onClose }) => {
  const { simulator } = useApp();

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const proposalDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const qualityTier = QUALITY_TIERS.find((q) => q.id === simulator.qualityTierId)?.title || 'Intermediário';
  const finishPattern = FINISH_OPTIONS_CATALOG.find((f) => f.id === simulator.finishTypeId)?.title || 'Madeirado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="p-4 bg-[#1B2B48] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-[#439346] text-white text-xs font-bold rounded-lg uppercase">
              Proposta Técnica Preliminar
            </span>
            <span className="text-xs text-slate-300 font-medium">PlanejaFácil PDF</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#439346] hover:bg-[#387F3B] text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121E34] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Proposal Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 space-y-8 bg-white print:p-0 print:overflow-visible text-slate-800">
          
          {/* Header Document */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-4">
              <Logo variant="light" size="md" />
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs font-bold text-[#439346] uppercase tracking-widest">
                Especificação de Projeto
              </div>
              <div className="text-xs text-slate-500 font-medium">Data: {proposalDate}</div>
              <div className="text-[10px] text-slate-400 font-mono">Ref: #{Date.now().toString().slice(-6)}</div>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Cliente:</span>
              <span className="font-bold text-[#1B2B48]">{simulator.clientInfo.name || 'Cliente Simulação'}</span>
              <div className="text-slate-600">{simulator.clientInfo.city} - CEP: {simulator.clientInfo.cep}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Especificações Globais:</span>
              <span className="font-semibold text-slate-800">Padrão {qualityTier} • Acabamento {finishPattern}</span>
              <div className="text-slate-600">Contato: {simulator.clientInfo.phone || '(11) 99999-9999'}</div>
            </div>
          </div>

          {/* Environments Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#1B2B48] uppercase tracking-wider border-b border-slate-200 pb-2">
              Resumo dos Ambientes Cadastrados ({simulator.environments.length})
            </h4>

            <div className="space-y-4">
              {simulator.environments.map((env) => (
                <div key={env.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-[#1B2B48] text-sm">{env.name}</span>
                    <span className="text-xs font-semibold text-[#439346] bg-[#EBF7EC] px-2 py-0.5 rounded">
                      Área: {env.areaM2} m² • {env.wallCount} Paredes
                    </span>
                  </div>

                  <div className="space-y-2">
                    {env.walls.map((w) => (
                      <div key={w.id} className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{w.label} — Comprimento: {w.length}m</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Móveis:</strong> {w.selectedFurnitureTypes.length > 0 ? w.selectedFurnitureTypes.join(', ') : 'Nenhum'}
                        </div>
                        {w.selectedSpecificItems.length > 0 && (
                          <div className="text-[11px] text-slate-600">
                            <strong>Itens Específicos:</strong> {w.selectedSpecificItems.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Range Box */}
          <div className="p-6 rounded-2xl bg-[#1B2B48] text-white flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#439346] uppercase tracking-widest">Faixa Estimada de Orçamento</div>
              <div className="text-xs text-slate-400">Calculada com base na média regional de lojas credenciadas</div>
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(simulator.calculatedRange.min)} - {formatCurrency(simulator.calculatedRange.max)}
            </div>
          </div>

          {/* Footer Notes */}
          <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-4 text-center leading-relaxed">
            * Este documento é uma estimativa preliminar baseada nas informações fornecidas pelo cliente no PlanejaFácil. O valor final será confirmado após a medição no local por um projetista da loja credenciada responsável.
          </div>

        </div>

      </div>
    </div>
  );
};
