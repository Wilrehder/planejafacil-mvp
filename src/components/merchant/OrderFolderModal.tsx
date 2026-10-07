import React, { useState } from 'react';
import { 
  X, Ruler, FileCheck, Wrench, CheckCircle2, Upload, FileText, Clock, ShieldCheck, Sparkles, Check, Package
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStage, StoreOrder } from '../../types';

interface OrderFolderModalProps {
  order: StoreOrder;
  onClose: () => void;
}

const STAGES: { key: OrderStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'medicao', label: '1. Medição', icon: Ruler },
  { key: 'projeto_aprovacao', label: '2. Projeto & Aprovação', icon: FileCheck },
  { key: 'producao', label: '3. Produção', icon: Package },
  { key: 'montagem', label: '4. Montagem', icon: Wrench },
  { key: 'entrega_aceite', label: '5. Entrega / Aceite', icon: ShieldCheck },
  { key: 'concluido', label: '6. Concluído', icon: CheckCircle2 },
];

export const OrderFolderModal: React.FC<OrderFolderModalProps> = ({ order, onClose }) => {
  const { updateOrder } = useApp();

  const [medicaoFileName, setMedicaoFileName] = useState(order.medicaoFile || '');
  
  const [projectFileName, setProjectFileName] = useState(order.projectFile || '');
  const [clientApprovedProject, setClientApprovedProject] = useState(order.projectApproved || false);
  
  const [producaoFileName, setProducaoFileName] = useState(order.producaoFile || '');
  
  const [montagemFotoName, setMontagemFotoName] = useState(order.montagemFoto || '');
  
  const [aceiteFileName, setAceiteFileName] = useState(order.aceiteFile || '');
  const [clientConfirmedAceite, setClientConfirmedAceite] = useState(order.clientConfirmedAceite || false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStageIndex = (stageKey: OrderStage) => {
    return STAGES.findIndex((s) => s.key === stageKey);
  };

  const currentIndex = getStageIndex(order.currentStage);

  const handleSaveMedicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicaoFileName) {
      alert('Por favor, anexe a Ficha de Medição ou foto contendo as medidas.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        { medicaoFile: medicaoFileName, medicaoDone: true },
        `Medição concluída. Arquivo anexado: ${medicaoFileName}`,
        'Operacional',
        'Usuário ERP'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveProjeto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFileName) {
      alert('Por favor, anexe pelo menos um arquivo de projeto.');
      return;
    }
    if (!clientApprovedProject) {
      alert('Você deve confirmar que o cliente aprovou o projeto.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        { projectFile: projectFileName, projectApproved: true },
        `Projeto anexado e aprovação confirmada. Arquivo: ${projectFileName}`,
        'Operacional',
        'Usuário ERP'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveProducao = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        { producaoFile: producaoFileName, producaoDone: true },
        `Produção concluída.${producaoFileName ? ' Documentos anexados: ' + producaoFileName : ''}`,
        'Operacional',
        'Usuário ERP'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveMontagem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!montagemFotoName) {
      alert('Por favor, anexe pelo menos uma foto da montagem finalizada.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        { montagemFoto: montagemFotoName, montagemDone: true },
        `Montagem concluída. Fotos anexadas: ${montagemFotoName}`,
        'Operacional',
        'Usuário ERP'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveAceite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceiteFileName && !clientConfirmedAceite) {
      alert('Por favor, anexe o Termo em PDF ou realize a confirmação no sistema.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        { aceiteFile: aceiteFileName, clientConfirmedAceite: clientConfirmedAceite },
        `Recebimento e Aceite confirmados pelo cliente.`,
        'Operacional',
        'Usuário ERP'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const renderFileRow = (label: string, filename?: string, fallbackText: string = '—') => (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${filename ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
      <div className="truncate pr-2">
        <span className="text-[11px] font-semibold uppercase text-slate-400 block">{label}</span>
        <span className={`text-xs font-medium truncate block ${filename ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {filename || fallbackText}
        </span>
      </div>
      {filename ? (
        <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      ) : (
        <span className="text-xs text-slate-400 font-medium shrink-0">-</span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-blue-600 text-white font-mono text-sm px-2.5 py-0.5 rounded-md font-bold tracking-wide">
                {order.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {order.environment}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {order.clientName}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {order.address} • Tel: {order.phone}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-xs text-slate-400 block uppercase font-medium">Valor Total</span>
              <span className="text-xl font-bold text-emerald-400">
                R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TIMELINE DE ESTÁGIOS DO PEDIDO */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between relative">
            {STAGES.map((s, idx) => {
              const IconComp = s.icon;
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={s.key} className="flex-1 flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <IconComp className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium text-center ${
                      isCurrent
                        ? 'text-blue-700 font-bold'
                        : isCompleted
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CORPO DO MODAL (2 COLUNAS) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* COLUNA ESQUERDA: FORMULÁRIO E DOCUMENTOS DA ETAPA */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* PASTA DIGITAL DO PEDIDO */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Pasta Digital do Pedido
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {renderFileRow('1. Contrato', order.contractFile, 'contrato_venda.pdf')}
                {renderFileRow('2. Medição', order.medicaoFile)}
                {renderFileRow('3. Projeto', order.projectFile)}
                {renderFileRow('4. Documentos de Produção', order.producaoFile)}
                {renderFileRow('5. Fotos da Montagem', order.montagemFoto)}
                {renderFileRow('6. Aceite', order.aceiteFile || (order.clientConfirmedAceite ? '(Confirmação via Sistema)' : undefined))}
              </div>
            </div>

            {/* FORMULÁRIO DA ETAPA ATUAL */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Ação Requerida: {STAGES[currentIndex]?.label}
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Preencha as informações essenciais para avançar o status do pedido.
              </p>

              {/* ETAPA 1: MEDIÇÃO */}
              {order.currentStage === 'medicao' && (
                <form onSubmit={handleSaveMedicao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Medição (Ficha/PDF/Foto) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: medicao_cliente.pdf"
                        value={medicaoFileName}
                        onChange={(e) => setMedicaoFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setMedicaoFileName(`medicao_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Medição Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 2: PROJETO & APROVAÇÃO */}
              {order.currentStage === 'projeto_aprovacao' && (
                <form onSubmit={handleSaveProjeto} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Projeto (PDF/Render/Imagens) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: projeto_final.pdf"
                        value={projectFileName}
                        onChange={(e) => setProjectFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setProjectFileName(`projeto_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="client-approval"
                      checked={clientApprovedProject}
                      onChange={(e) => setClientApprovedProject(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="client-approval" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Cliente aprovou o projeto
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Confirmar Aprovação do Projeto →'}
                  </button>
                </form>
              )}

              {/* ETAPA 3: PRODUÇÃO */}
              {order.currentStage === 'producao' && (
                <form onSubmit={handleSaveProducao} className="space-y-4">
                  <p className="text-sm text-slate-700 bg-orange-50 border border-orange-200 p-3 rounded-lg font-medium">
                    O móvel está atualmente <strong>em produção</strong>. Quando a fabricação for finalizada e estiver pronto para montagem, conclua esta etapa.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Documentos de Produção (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: plano_corte.pdf, romaneio.pdf"
                        value={producaoFileName}
                        onChange={(e) => setProducaoFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setProducaoFileName(`doc_producao_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Anexar
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Produção Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 4: MONTAGEM */}
              {order.currentStage === 'montagem' && (
                <form onSubmit={handleSaveMontagem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Fotos da Montagem *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: foto_montagem_1.jpg"
                        value={montagemFotoName}
                        onChange={(e) => setMontagemFotoName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setMontagemFotoName(`montagem_${order.id.toLowerCase()}.jpg`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                      >
                        Anexar
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Montagem Concluída →'}
                  </button>
                </form>
              )}

              {/* ETAPA 5: ENTREGA / ACEITE */}
              {order.currentStage === 'entrega_aceite' && (
                <form onSubmit={handleSaveAceite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Termo de Aceite Assinado (PDF)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: termo_aceite.pdf"
                        value={aceiteFileName}
                        onChange={(e) => setAceiteFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setAceiteFileName(`termo_aceite_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                      >
                        Anexar
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="client-confirmed"
                      checked={clientConfirmedAceite}
                      onChange={(e) => setClientConfirmedAceite(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="client-confirmed" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                      Cliente confirmou o recebimento e aceite
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center mt-4"
                  >
                    {isSubmitting ? 'Finalizando...' : 'Concluir Pedido 🎉'}
                  </button>
                </form>
              )}

              {/* ETAPA 6: CONCLUÍDO */}
              {order.currentStage === 'concluido' && (
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">
                    Pedido #{order.id} Finalizado!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                    O pedido foi concluído com sucesso e todas as informações e documentos estão salvos na Pasta Digital.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: TIMELINE DE AUDITORIA */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Timeline de Auditoria
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {order.timeline?.length || 0} Registros
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {order.timeline && order.timeline.length > 0 ? (
                order.timeline.map((log) => (
                  <div key={log.id} className="relative pl-5 border-l-2 border-slate-200 group hover:border-blue-500 transition-colors">
                    <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-slate-400 group-hover:bg-blue-600 transition-colors" />
                    
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-800">
                        {log.user}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mb-1">
                      {log.userRole}
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                      {log.action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Nenhum evento registrado.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Sistema Simplificado de Auditoria ERP Ativado
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Fechar Pasta
          </button>
        </div>

      </div>
    </div>
  );
};
