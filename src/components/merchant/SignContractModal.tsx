import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Award, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  User, 
  Building2,
  Calendar,
  Lock
} from 'lucide-react';
import { Store } from '../../types';
import { generateB2BContractText, signStoreContractRemote } from '../../lib/contractService';

interface SignContractModalProps {
  isOpen: boolean;
  store: Store;
  onSignedSuccess: () => void;
}

export const SignContractModal: React.FC<SignContractModalProps> = ({
  isOpen,
  store,
  onSignedSuccess
}) => {
  const [signerName, setSignerName] = useState(store.responsibleName || '');
  const [signerCpf, setSignerCpf] = useState(store.cnpj || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const contractText = generateB2BContractText({
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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    setSignerCpf(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setErrorMessage('Por favor, informe seu Nome Completo para a assinatura eletrônica.');
      return;
    }
    const cleanCpf = signerCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage('Você deve concordar com os termos contratuais para prosseguir.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await signStoreContractRemote(
      store.id,
      signerName.trim(),
      cleanCpf,
      contractText
    );

    setIsSubmitting(false);

    if (res.success) {
      onSignedSuccess();
    } else {
      setErrorMessage(res.error || 'Erro ao registrar assinatura eletrônica.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 p-6 sm:p-8 space-y-5 my-6 text-left max-h-[92vh] overflow-y-auto">
        
        {/* Header de Primeiro Acesso */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2 text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Primeiro Acesso — Formalização do Contrato B2B</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Termo de Adesão & Licenciamento — {store.name}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Para ter acesso à plataforma, leads qualificados e ferramentas de gestão, leia os termos comerciais e assine digitalmente abaixo.
          </p>
        </div>

        {/* Resumo Comercial em Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Plano</span>
            <span className="font-black text-slate-900 text-sm">Plano {store.plan}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Mensalidade</span>
            <span className="font-black text-emerald-700 text-sm">
              R$ {Number(store.monthlyRevenue || (store.plan === 'Pro' ? 219.90 : 119.90)).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Vencimento</span>
            <span className="font-black text-slate-900 text-sm">Todo dia {store.billingDueDay || 10}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Permanência</span>
            <span className="font-black text-slate-900 text-sm">
              {store.hasRetentionClause ? `${store.retentionMonths || 6} Meses` : 'Sem Fidelidade'}
            </span>
          </div>
        </div>

        {/* Corpo do Contrato para Leitura */}
        <div className="space-y-2">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Íntegra do Instrumento Contratual:
          </span>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-line shadow-inner">
            {contractText}
          </div>
        </div>

        {/* Formulário de Assinatura Eletrônica */}
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-black text-emerald-950 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Assinatura Eletrônica Qualificada (Lei 14.063/2020)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Nome Completo do Responsável Legal *</label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">CPF do Signatário *</label>
              <input
                type="text"
                required
                value={signerCpf}
                onChange={handleCpfChange}
                maxLength={14}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <label className="flex items-start space-x-3 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
            <input
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="leading-snug">
              Declaro que li e concordo integralmente com todas as cláusulas deste contrato de licenciamento SaaS e distribuição de leads da plataforma PlanejaFácil.
            </span>
          </label>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !acceptedTerms}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando e Registrando Assinatura...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Assinar Digitalmente e Acessar o Portal</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

