import React from 'react';
import { X, Printer, Download, CheckCircle2, Phone, Mail, MapPin, Sparkles, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ADDITIONAL_ITEMS, DOOR_TYPE_OPTIONS, ENVIRONMENTS, FINISHES, FURNITURE_MODULES, HARDWARE_OPTIONS, LAYOUT_OPTIONS } from '../../data/mockData';

interface ProposalPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProposalPdfModal: React.FC<ProposalPdfModalProps> = ({ isOpen, onClose }) => {
  const { simulator } = useApp();

  if (!isOpen) return null;

  const env = ENVIRONMENTS.find((e) => e.id === simulator.environmentId) || ENVIRONMENTS[0];
  const finish = FINISHES.find((f) => f.id === simulator.finishId) || FINISHES[0];
  const hardware = HARDWARE_OPTIONS.find((h) => h.id === simulator.hardwareId) || HARDWARE_OPTIONS[0];
  const layout = LAYOUT_OPTIONS.find((l) => l.id === simulator.layoutTypeId) || LAYOUT_OPTIONS[0];
  const doorType = DOOR_TYPE_OPTIONS.find((d) => d.id === simulator.doorTypeId) || DOOR_TYPE_OPTIONS[0];
  const selectedModules = FURNITURE_MODULES.filter((m) => (simulator.selectedFurnitureModuleIds || []).includes(m.id));

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

  const areaM2 = (simulator.dimensions.length * simulator.dimensions.height).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-brand-600 text-white text-xs font-bold rounded-lg uppercase">
              Orçamento Preliminar
            </span>
            <span className="text-xs text-slate-400">PDF / Impressão</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Proposal Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 space-y-8 bg-white print:p-0 print:overflow-visible text-slate-800">
          
          {/* Document Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-4">
              <img
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=160&q=80"
                alt="PlanejaFácil Logo"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">PLANEJAFÁCIL</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Plataforma Integrada de Móveis Sob Medida
                </p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs font-mono font-bold text-slate-400">PROPOSTA PRELIMINAR</div>
              <div className="text-sm font-black text-brand-600">#PF-{Math.floor(100000 + Math.random() * 900000)}</div>
              <div className="text-xs text-slate-500 font-medium">{proposalDate}</div>
            </div>
          </div>

          {/* Client & Project Info Row */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Local da Instalação</div>
              <div className="font-extrabold text-slate-900 text-sm">{simulator.location.city} - {simulator.location.state}</div>
              <div className="text-slate-500 font-mono">CEP: {simulator.location.cep}</div>
            </div>

            <div className="space-y-1 text-right">
              <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Especificação do Ambiente</div>
              <div className="font-extrabold text-brand-600 text-sm">{env.title}</div>
              <div className="text-slate-500 font-bold">{areaM2} m² de área calculada</div>
            </div>
          </div>

          {/* Detailed Item Specification Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Detalhamento de Materiais & Configurações
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Componente</th>
                    <th className="p-3.5">Especificação Selecionada</th>
                    <th className="p-3.5 text-right">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-3.5 font-bold">Ambiente</td>
                    <td className="p-3.5">{env.title} ({env.subtitle})</td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Ambiente</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Módulos & Peças (Cortecloud)</td>
                    <td className="p-3.5 font-medium">
                      {simulator.placedModules && simulator.placedModules.length > 0
                        ? simulator.placedModules.map((m) => `${m.title} (${m.widthMm}mm)`).join(' • ')
                        : selectedModules.map((m) => m.title).join(', ')}
                    </td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Modulação Técnica</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Layout / Formato</td>
                    <td className="p-3.5">{layout.title} — {layout.subtitle}</td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Disposição no Espaço</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Abertura de Portas</td>
                    <td className="p-3.5">{doorType.title} — {doorType.description}</td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Portas & Puxadores</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Dimensões Estimadas</td>
                    <td className="p-3.5 font-medium">
                      {simulator.dimensions.length}m (comp) x {simulator.dimensions.height}m (pé-direito) x {simulator.dimensions.width}m (prof) — <span className="font-bold text-brand-600">{areaM2} m²</span>
                    </td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Volume / M²</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Padrão de Acabamento</td>
                    <td className="p-3.5">{finish.title} — {finish.description}</td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Revestimento MDF</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Nível de Ferragens</td>
                    <td className="p-3.5">{hardware.title} (Marca: {hardware.brand}) — {hardware.description}</td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Corrediças & Dobradiças</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">Itens Opcionais</td>
                    <td className="p-3.5">
                      {simulator.additionalItemIds.length === 0 ? (
                        <span className="text-slate-400 italic">Sem adicionais</span>
                      ) : (
                        simulator.additionalItemIds
                          .map((id) => ADDITIONAL_ITEMS.find((item) => item.id === id)?.title)
                          .filter(Boolean)
                          .join(', ')
                      )}
                    </td>
                    <td className="p-3.5 text-right text-slate-500 font-mono">Acessórios Extras</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Investment Range Highlight */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Faixa de Investimento Média Regional</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
                {formatCurrency(simulator.calculatedRange.min)} a {formatCurrency(simulator.calculatedRange.max)}
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400 max-w-xs leading-tight">
              *Valores de referência para marcenarias credenciadas na região de {simulator.location.city}.
            </div>
          </div>

          {/* Disclaimers & Signatures */}
          <div className="border-t border-slate-200 pt-6 text-[11px] text-slate-500 space-y-4">
            <p className="leading-relaxed">
              <strong>Nota Legal:</strong> Esta proposta constitui uma estimativa técnica preliminar gerada pelo algoritmo da plataforma <strong>PlanejaFácil</strong>. O orçamento definitivo e detalhamento em 3D executivo serão validados após a medição no local realizada por um projetista da loja credenciada.
            </p>

            <div className="flex justify-between items-center pt-4 text-xs font-bold text-slate-700">
              <span>PlanejaFácil — Plataforma de Móveis Sob Medida</span>
              <span>www.planejafacil.com.br</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
