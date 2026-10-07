import React, { useState } from 'react';
import { 
  FolderCheck, 
  Search, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Ruler, 
  Wrench, 
  ShieldCheck, 
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStage, StoreOrder } from '../../types';

interface MerchantERPProps {
  merchantPlan: 'Basic' | 'Pro';
}

const STAGE_LABELS: Record<OrderStage, { label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  medicao: { label: '1. Medição Técnica', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: Ruler },
  projeto_executivo: { label: '2. Projeto Executivo', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: FileText },
  montagem: { label: '3. Montagem na Obra', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Wrench },
  vistoria: { label: '4. Vistoria & Aceite', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', icon: ShieldCheck },
  concluido: { label: '5. Pedido Concluído', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
};

export const MerchantERP: React.FC<MerchantERPProps> = ({ merchantPlan }) => {
  const { orders, setSelectedOrderForFolder } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('todos');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.environment.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === 'todos' || order.currentStage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const totalContractVolume = orders.reduce((acc, curr) => acc + curr.totalValue, 0);
  const activeOrdersCount = orders.filter((o) => o.currentStage !== 'concluido').length;

  if (merchantPlan === 'Basic') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-3xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
          Recurso Exclusivo do Plano Pro
        </span>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          Módulo ERP Pós-Venda Operacional
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto mb-6">
          Ao fechar uma venda no CRM, promova o cliente automaticamente para um <strong>Pedido de Produção (#PED-XXXX)</strong>. Gerencie medição técnica, projetos 3D, plano de corte, montagem e vistoria final com pasta digital e linha do tempo de auditoria.
        </p>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left max-w-md mx-auto mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Trilha de Auditoria com Usuário, Horário e Ação
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Avanço Automático de Etapa por Anexo de Documentos
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pasta Digital de Documentos (Contrato, Medição, 3D, Aceite)
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Alterne a chave do <strong>Plano Pro ⭐ (R$ 219,90/mês)</strong> no topo da tela para testar o ERP operacional.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER DE MÉTRICAS OPERACIONAIS DO ERP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Pedidos em Andamento (Pós-Venda)
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {activeOrdersCount} Pedidos
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <FolderCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Volume em Produção/Montagem
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              R$ {totalContractVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Modo de Operação
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Progressão Automática por Eventos
            </span>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA DE PEDIDOS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* BUSCA */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por Pedido (#PED-XXXX), nome do cliente ou ambiente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* FILTRO POR ETAPA */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStageFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              stageFilter === 'todos'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todos os Pedidos
          </button>
          {Object.entries(STAGE_LABELS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setStageFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                stageFilter === key
                  ? `${item.bg} ${item.text} font-bold ring-2 ring-blue-400`
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

      </div>

      {/* TABELA DE PEDIDOS OPERACIONAIS DO ERP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Pedido / Cliente</th>
                <th className="py-3.5 px-4">Ambiente</th>
                <th className="py-3.5 px-4 text-center">Etapa Atual do Pedido</th>
                <th className="py-3.5 px-4 text-right">Valor Contratado</th>
                <th className="py-3.5 px-4 text-center">Última Atualização</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const stageInfo = STAGE_LABELS[order.currentStage];
                  const IconComp = stageInfo.icon;
                  const lastAudit = order.timeline?.[0];

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* PEDIDO & CLIENTE */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                            {order.id}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 block text-sm">
                              {order.clientName}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {order.city} / {order.state} • {order.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AMBIENTE */}
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs inline-block">
                          {order.environment}
                        </span>
                      </td>

                      {/* ETAPA ATUAL */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stageInfo.bg} ${stageInfo.text}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          {stageInfo.label}
                        </span>
                      </td>

                      {/* VALOR CONTRATADO */}
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* ÚLTIMA ATUALIZAÇÃO */}
                      <td className="py-4 px-4 text-center">
                        {lastAudit ? (
                          <div className="text-left inline-block max-w-[180px] truncate">
                            <span className="text-[11px] font-semibold text-slate-700 block truncate">
                              {lastAudit.user} ({lastAudit.userRole})
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {new Date(lastAudit.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sem registro</span>
                        )}
                      </td>

                      {/* AÇÃO: ABRIR PASTA DO PEDIDO */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrderForFolder(order)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <FolderCheck className="w-3.5 h-3.5" />
                          Abrir Pasta
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                    Nenhum pedido encontrado no filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
