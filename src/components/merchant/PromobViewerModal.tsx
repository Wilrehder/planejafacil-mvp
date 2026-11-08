import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  DollarSign, 
  Building2, 
  Layers, 
  User, 
  Phone, 
  Mail, 
  Code, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Armchair,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { parsePromobXML, PromobProjectData } from '../../lib/promobParser';
import { CommercialProposal } from '../../types';

interface PromobViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentName: string;
  attachmentUrl?: string;
  commercialProposal?: CommercialProposal;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  environmentName?: string;
  rawXmlContent?: string;
}

export const PromobViewerModal: React.FC<PromobViewerModalProps> = ({
  isOpen,
  onClose,
  attachmentName,
  attachmentUrl,
  commercialProposal,
  clientName: propClientName,
  clientPhone: propClientPhone,
  clientEmail: propClientEmail,
  environmentName: propEnvironmentName,
  rawXmlContent: initialRawXmlContent,
}) => {
  const { currentUser } = useApp();
  const isOwner = !currentUser?.role || currentUser?.role === 'store_owner' || currentUser?.role === 'platform_admin';

  const [loading, setLoading] = useState(false);
  const [rawXml, setRawXml] = useState<string>(initialRawXmlContent || '');
  const [parsedData, setParsedData] = useState<PromobProjectData | null>(null);
  const [showRawXml, setShowRawXml] = useState(false);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val || 0);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialRawXmlContent) {
      try {
        const data = parsePromobXML(initialRawXmlContent);
        setParsedData(data);
      } catch (err) {
        console.warn('Falha ao analisar initialRawXmlContent:', err);
      }
      return;
    }

    if (attachmentUrl && (!rawXml || rawXml.length === 0)) {
      setLoading(true);
      fetch(attachmentUrl)
        .then((res) => res.text())
        .then((text) => {
          setRawXml(text);
          if (text.includes('<CUSTOMERSDATA>') || text.includes('<BUDGET') || text.includes('<TOTALPRICES')) {
            const data = parsePromobXML(text);
            setParsedData(data);
          }
        })
        .catch((err) => {
          console.warn('Não foi possível carregar XML diretamente via URL:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, attachmentUrl, initialRawXmlContent]);

  if (!isOpen) return null;

  const clientName = parsedData?.clientName || propClientName || 'Cliente';
  const clientPhone = parsedData?.clientPhone || propClientPhone || '';
  const clientEmail = parsedData?.clientEmail || propClientEmail || '';
  const projectName = parsedData?.projectName || commercialProposal?.promobProjectName || propEnvironmentName || 'Projeto Sob Medida';
  const budgetValue = parsedData?.budgetValue || commercialProposal?.promobValue || 0;
  const factoryCost = parsedData?.factoryOrderCost || commercialProposal?.promobCost || 0;
  const tablePrice = parsedData?.tablePrice || budgetValue;
  const itemsCount = parsedData?.itemsCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">Visualizador da Proposta Promob</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  Estruturado
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-md">
                {attachmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                download={attachmentName}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
                title="Baixar arquivo XML original"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Baixar XML</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Card Projeto & Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Dados do Projeto Promob</span>
              </span>
              <div className="font-extrabold text-base text-slate-900">{projectName}</div>
              <div className="flex items-center space-x-2 text-xs text-slate-600">
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                  {itemsCount > 0 ? `${itemsCount} módulos/itens` : 'Projeto sob medida'}
                </span>
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>XML Válido</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cliente Identificado no XML</span>
              </span>
              <div className="font-extrabold text-base text-slate-900 truncate">{clientName}</div>
              <div className="text-xs text-slate-600 space-y-1">
                {clientPhone && (
                  <div className="flex items-center space-x-1 text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{clientPhone}</span>
                  </div>
                )}
                {clientEmail && (
                  <div className="flex items-center space-x-1 text-slate-600 truncate">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{clientEmail}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards Financeiros Promob (Tabela vs Orçado vs Custo Fábrica) */}
          <div>
            <div className="text-xs font-black uppercase text-slate-500 mb-2.5">
              Valores da Engenharia Promob
            </div>
            
            {isOwner ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tabela de Venda Promob</span>
                  <div className="text-xl font-black text-slate-900">{formatBRL(tablePrice)}</div>
                  <span className="text-[10px] text-slate-500 font-medium">Preço base de tabela</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-600">Custo de Fábrica (Order)</span>
                  <div className="text-xl font-black text-amber-900">{formatBRL(factoryCost)}</div>
                  <span className="text-[10px] text-amber-700 font-medium">Pedido direto na fábrica</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Margem Bruta Promob</span>
                  <div className="text-xl font-black text-emerald-900">{formatBRL(budgetValue - factoryCost)}</div>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {budgetValue > 0 ? (((budgetValue - factoryCost) / budgetValue) * 100).toFixed(1) : 0}% de margem
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Preço de Venda do Projeto Promob</span>
                  <div className="text-2xl font-black text-slate-900">{formatBRL(budgetValue)}</div>
                  <span className="text-[11px] text-slate-500">Valor oficial para orçamentação ao cliente</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1.5 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aprovado</span>
                </div>
              </div>
            )}
          </div>

          {/* Composição Comercial Consolidada Vinculada */}
          {commercialProposal && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Proposta Comercial Consolidada do Pedido
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                  {commercialProposal.paymentMethodLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Promob</span>
                  <span className="font-extrabold text-sm text-white">{formatBRL(commercialProposal.promobValue)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Convencionais</span>
                  <span className="font-extrabold text-sm text-amber-300">
                    +{formatBRL(commercialProposal.conventionalTotal || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Desconto</span>
                  <span className="font-extrabold text-sm text-blue-300">
                    {commercialProposal.discountPct > 0 ? `-${commercialProposal.discountPct}%` : 'R$ 0,00'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total do Pedido</span>
                  <span className="font-black text-base text-emerald-400">{formatBRL(commercialProposal.finalOrderTotal)}</span>
                </div>
              </div>

              {commercialProposal.conventionalItems && commercialProposal.conventionalItems.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Móveis Convencionais Agregados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {commercialProposal.conventionalItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                        <span className="truncate">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-amber-300">{formatBRL(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visualizador Opcional de Código XML Bruto (Gaveta Retrátil) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRawXml(!showRawXml)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-slate-500" />
                <span>Inspecionar Código XML Bruto ({attachmentName})</span>
              </div>
              {showRawXml ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawXml && (
              <div className="p-4 bg-slate-950 text-slate-200 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed select-all">
                {rawXml ? (
                  <pre className="whitespace-pre-wrap">{rawXml}</pre>
                ) : (
                  <div className="text-slate-500 italic">
                    {loading ? 'Carregando conteúdo XML...' : 'Conteúdo XML não carregado diretamente ou indisponível.'}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Proposta Promob integrada ao fluxo comercial da loja.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Fechar Visualizador
          </button>
        </div>

      </div>
    </div>
  );
};

