import React, { useRef } from 'react';
import { 
  FileText, 
  X, 
  CheckCircle2, 
  Clock, 
  Printer, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  DollarSign, 
  User, 
  Award 
} from 'lucide-react';
import { Store } from '../../types';
import { generateB2BContractText } from '../../lib/contractService';

interface StoreContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store | null;
  onSignNow?: () => void;
  canSign?: boolean;
}

export const StoreContractModal: React.FC<StoreContractModalProps> = ({
  isOpen,
  onClose,
  store,
  onSignNow,
  canSign = false
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !store) return null;

  const isSigned = !!store.contractSignedAt;

  const contractBody = store.contractTermsText || generateB2BContractText({
    storeName: store.name,
    cnpj: store.cnpj,
    responsibleName: store.responsibleName,
    email: store.email,
    phone: store.phone,
    city: store.city,
    state: store.state,
    plan: store.plan,
    monthlyPrice: Number(store.monthlyRevenue || (store.plan === 'Pro' ? 219.90 : 119.90)),
    leadPrice: 18.00,
    billingDueDay: store.billingDueDay || 10,
    hasRetentionClause: !!store.hasRetentionClause,
    retentionMonths: store.retentionMonths || 6,
    extraUserPrice: 39.90
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedSignedDate = store.contractSignedAt
    ? new Date(store.contractSignedAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-6 text-left max-h-[92vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none print:p-4">
        
        {/* Close Button (Hidden in Print) */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:hidden">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4" />
              <span>Instrumento Jurídico B2B</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Contrato de Adesão — {store.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Termos comerciais e licenciamento de software com auditoria de assinatura digital.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            {canSign && !isSigned && onSignNow && (
              <button
                onClick={onSignNow}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Award className="w-4 h-4" />
                <span>Assinar Digitalmente Agora</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Status Stamp Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          isSigned 
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
            : 'bg-amber-50/80 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSigned ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {isSigned ? <ShieldCheck className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase">
                  {isSigned ? 'Contrato Assinado Digitalmente' : 'Aguardando Assinatura Digital do Gerente'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  isSigned ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {isSigned ? 'Válido' : 'Pendente'}
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isSigned 
                  ? `Assinado por ${store.contractSignedByName || store.responsibleName || 'Responsável'} em ${formattedSignedDate} • IP: ${store.contractSignatureIp || 'Registrado'}`
                  : 'Apresentado automaticamente para leitura e assinatura eletrônica no primeiro login do gerente.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Permanência Mínima</span>
            <span className="text-xs font-black">
              {store.hasRetentionClause 
                ? `Sim (${store.retentionMonths || 6} Meses de Fidelidade)` 
                : 'Não (Sem Fidelidade / Cancelamento Livre)'}
            </span>
          </div>
        </div>

        {/* Printable Contract Body */}
        <div 
          ref={printRef}
          className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed space-y-4 font-sans select-text print:bg-white print:border-none print:p-0"
        >
          <div className="border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span>PLANEJAFÁCIL TECNOLOGIA</span>
              <span>TERMO DE ADESÃO B2B</span>
            </div>
          </div>

          <div className="whitespace-pre-line text-xs font-normal leading-relaxed text-slate-800 font-mono">
            {contractBody}
          </div>

          {/* Assinatura / Carimbo Digital */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300">
            {isSigned ? (
              <div className="p-4 rounded-xl bg-white border border-emerald-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Certificado de Assinatura Eletrônica (MP 2.200-2/2001 & Lei 14.063/2020)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div><strong>Signatário:</strong> {store.contractSignedByName || store.responsibleName}</div>
                  <div><strong>CPF:</strong> {store.contractSignedByCpf ? store.contractSignedByCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Cadastrado'}</div>
                  <div><strong>Data/Hora do Registro:</strong> {formattedSignedDate}</div>
                  <div><strong>IP de Auditoria:</strong> {store.contractSignatureIp || 'Registrado via Web'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold">
                [ Documento aguardando confirmação e assinatura digital do lojista ]
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 print:hidden">
          <span>Este documento digital possui validade jurídica em todo o território nacional.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
