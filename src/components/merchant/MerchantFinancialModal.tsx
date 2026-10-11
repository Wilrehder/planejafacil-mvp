import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  RefreshCw,
  QrCode,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { fetchStoreFinancialOverview } from '../../lib/financialService';
import { StoreFinancialOverview } from '../../types';

interface MerchantFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  storeName: string;
}

export const MerchantFinancialModal: React.FC<MerchantFinancialModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  storeName,
}) => {
  const [overview, setOverview] = useState<StoreFinancialOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadFinancialData = async () => {
    setLoading(true);
    const res = await fetchStoreFinancialOverview(tenantId);
    if (res.success && res.overview) {
      setOverview(res.overview);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadFinancialData();
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header do Portal Financeiro */}
        <div className="px-6 py-5 bg-[#1B2B48] text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-black text-white">Portal Financeiro da Loja</h2>
              <p className="text-xs text-slate-300 font-medium">{storeName} • Faturamento SaaS PlanejaFácil</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFinancialData}
              disabled={loading}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">

          {/* Cards de Resumo da Assinatura */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plano SaaS Ativo</span>
              <div className="text-xl font-black text-slate-900 flex items-center gap-2">
                Plano {overview?.subscription?.plan_tier === 'pro' ? 'Pro ⭐' : 'Básico'}
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {overview?.subscription?.status || 'Ativo'}
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-bold">
                {formatCurrency(overview?.subscription?.monthly_price || 119.90)} /mês
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leads Entregues no Mês</span>
              <div className="text-xl font-black text-slate-900">
                {overview?.billableLeads?.count || 0} leads faturáveis
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {formatCurrency(overview?.billableLeads?.amount || 0)} (R$ 50,00 por lead)
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Próximo Vencimento</span>
              <div className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                {overview?.subscription?.next_billing_date 
                  ? new Date(overview.subscription.next_billing_date).toLocaleDateString('pt-BR')
                  : 'Dia 10 do mês'}
              </div>
              <p className="text-xs text-slate-500 font-medium">Consolidação mensal</p>
            </div>

          </div>

          {/* Banner de Orientações de Pagamento Externo */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-black">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Instruções para Pagamento da Mensalidade e Leads</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              O PlanejaFácil não realiza intermediação ou débito automático. O pagamento das faturas da plataforma é efetuado diretamente ao titular do SaaS por <strong>Pix ou transferência bancária</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-bold text-emerald-800">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                Chave Pix Oficial: financeiro@planejafacil.com.br
              </span>
              <span className="text-slate-500 font-normal">
                Após transferir, o administrador confere e registra o comprovante abaixo.
              </span>
            </div>
          </div>

          {/* Histórico de Faturas da Loja */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Histórico de Faturas & Quitações Registradas
              </h3>
              <span className="text-xs text-slate-400 font-bold">
                {overview?.invoices?.length || 0} competência(s)
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
                Consultando registros no banco de dados...
              </div>
            ) : !overview?.invoices || overview.invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                Nenhuma fatura emitida para esta loja ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {overview.invoices.map((inv) => {
                  const balance = inv.balanceDue ?? (inv.totalDue - (inv.amountPaid || 0));
                  const isPaid = inv.status === 'paid' || balance <= 0;
                  const isPartial = inv.status === 'partially_paid' || ((inv.amountPaid || 0) > 0 && !isPaid);

                  return (
                    <div
                      key={inv.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{inv.invoiceNumber}</span>
                            <span className="text-xs font-bold text-slate-500">({inv.competenceMonth})</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-blue-100 text-blue-800'
                                : inv.status === 'overdue' || inv.status === 'past_due'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isPaid ? 'Pago' : isPartial ? 'Parcialmente Pago' : inv.status === 'overdue' ? 'Vencido' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Vencimento: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Devido</span>
                            <span className="text-sm font-extrabold text-slate-900">{formatCurrency(inv.totalDue)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Valor Pago</span>
                            <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(inv.amountPaid || 0)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-amber-600 font-bold uppercase block">Saldo Pendente</span>
                            <span className={`text-base font-black ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {formatCurrency(balance > 0 ? balance : 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Itens da fatura */}
                      {inv.items && inv.items.length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discriminação de Valores</span>
                          {inv.items.map((itm) => (
                            <div key={itm.id} className="flex justify-between items-center text-slate-700 font-medium">
                              <span>{itm.description}</span>
                              <span className="font-bold text-slate-900">{formatCurrency(itm.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recibos de Pagamento Manual Registrados */}
                      {inv.payments && inv.payments.length > 0 ? (
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2 text-xs">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Comprovantes de Recebimento Registrados pela Administração
                          </span>
                          <div className="space-y-1.5">
                            {inv.payments.map((rec) => (
                              <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-700 bg-white p-2 rounded-lg border border-emerald-100 gap-1">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900">
                                    {formatCurrency(rec.amountPaid || rec.amount || 0)} via {rec.paymentMethod.toUpperCase()}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Data: {new Date(rec.paymentDate).toLocaleDateString('pt-BR')} {rec.externalReference ? `• Ref: ${rec.externalReference}` : ''}
                                  </div>
                                </div>
                                {rec.notes && (
                                  <div className="text-[11px] text-slate-500 italic max-w-xs truncate">
                                    "{rec.notes}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-medium italic">
                          Nenhum recebimento registrado para esta fatura até o momento.
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Segurança e Auditoria Multi-Tenant</p>
              <p className="text-slate-600 mt-0.5 font-medium">
                O lojista possui acesso de leitura às suas faturas e histórico. Alterações de plano, precificação contratada ou quitações financeiras são de gestão exclusiva do administrador do SaaS.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
