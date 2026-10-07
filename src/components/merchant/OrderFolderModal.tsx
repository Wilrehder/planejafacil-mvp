import React, { useState } from 'react';
import { 
  X, 
  Ruler, 
  FileCheck, 
  Wrench, 
  CheckCircle2, 
  Upload, 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Download,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { OrderStage, StoreOrder } from '../../types';

interface OrderFolderModalProps {
  order: StoreOrder;
  onClose: () => void;
}

const STAGES: { key: OrderStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'medicao', label: '1. Medição Técnica', icon: Ruler },
  { key: 'projeto_executivo', label: '2. Projeto Executivo', icon: FileCheck },
  { key: 'montagem', label: '3. Montagem na Obra', icon: Wrench },
  { key: 'vistoria', label: '4. Vistoria & Aceite', icon: ShieldCheck },
  { key: 'concluido', label: '5. Pedido Concluído', icon: CheckCircle2 },
];

export const OrderFolderModal: React.FC<OrderFolderModalProps> = ({ order, onClose }) => {
  const { updateOrder } = useApp();

  // Form states for stage inputs
  const [medicaoDate, setMedicaoDate] = useState(order.medicaoDate || '');
  const [medicaoFileName, setMedicaoFileName] = useState(order.medicaoFile || '');

  const [designerName, setDesignerName] = useState(order.designerName || '');
  const [render3dFileName, setRender3dFileName] = useState(order.render3dFile || '');
  const [planoCorteFileName, setPlanoCorteFileName] = useState(order.planoCorteFile || '');

  const [installerName, setInstallerName] = useState(order.installerName || '');
  const [installationDate, setInstallationDate] = useState(order.installationDate || '');
  const [checkedInAt, setCheckedInAt] = useState(order.checkedInAt || '');

  const [inspectorName, setInspectorName] = useState(order.inspectorName || '');
  const [inspectionApproved, setInspectionApproved] = useState(order.inspectionApproved || false);
  const [termoVistoriaFileName, setTermoVistoriaFileName] = useState(order.termoVistoriaFile || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStageIndex = (stageKey: OrderStage) => {
    return STAGES.findIndex((s) => s.key === stageKey);
  };

  const currentIndex = getStageIndex(order.currentStage);

  // Handlers for updating stages
  const handleSaveMedicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicaoDate || !medicaoFileName) {
      alert('Por favor, informe a data da medição e anexe a Ficha Técnica.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        {
          medicaoDate,
          medicaoFile: medicaoFileName,
        },
        `Ficha de Medição Técnica anexada (${medicaoFileName}) por ${medicaoDate}`,
        'Medição',
        'Carlos Medições'
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveProjetoExecutivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerName || !render3dFileName || !planoCorteFileName) {
      alert('Por favor, preencha o nome do projetista e anexe o Render 3D e o Plano de Corte.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        {
          designerName,
          render3dFile: render3dFileName,
          planoCorteFile: planoCorteFileName,
        },
        `Projeto Executivo e Plano de Corte 3D anexados por ${designerName}`,
        'Projetista',
        designerName
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveMontagem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!installerName || !installationDate || !checkedInAt) {
      alert('Por favor, informe o montador, a data e confirme o check-in na obra.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        {
          installerName,
          installationDate,
          checkedInAt,
        },
        `Montagem concluída no local por ${installerName} (Check-in: ${checkedInAt})`,
        'Montagem',
        installerName
      );
      setIsSubmitting(false);
    }, 400);
  };

  const handleSaveVistoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName || !inspectionApproved || !termoVistoriaFileName) {
      alert('Por favor, informe o vistoriador, marque a aprovação e anexe o Termo de Vistoria.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      updateOrder(
        order.id,
        {
          inspectorName,
          inspectionApproved: true,
          termoVistoriaFile: termoVistoriaFileName,
        },
        `Vistoria Técnica aprovada sem pendências por ${inspectorName}. Termo de Aceite anexado.`,
        'Vistoria',
        inspectorName
      );
      setIsSubmitting(false);
    }, 400);
  };

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
              <span className="text-xs text-slate-400 block uppercase font-medium">Valor Total do Pedido</span>
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

        {/* TIMELINE DE ESTÁGIOS DO PEDIDO (PASSO A PASSO AUTOMÁTICO) */}
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
          
          {/* COLUNA ESQUERDA: FORMULÁRIO E DOCUMENTOS DA ETAPA (LG: 7 COLUNAS) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* DOCUMENTOS DA PASTA DIGITAL DO CLIENTE */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Pasta Digital do Pedido (Documentos Anexados)
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Contrato CRM */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">1. Contrato CRM</span>
                    <span className="text-xs font-medium text-slate-700 truncate block">
                      {order.contractFile || 'contrato_venda.pdf'}
                    </span>
                  </div>
                  <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>

                {/* Medição Técnica */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${order.medicaoFile ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/50 border-amber-200/60'}`}>
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">2. Medição Técnica</span>
                    <span className={`text-xs font-medium truncate block ${order.medicaoFile ? 'text-slate-700' : 'text-amber-700 italic'}`}>
                      {order.medicaoFile || 'Pendente de upload'}
                    </span>
                  </div>
                  {order.medicaoFile ? (
                    <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold shrink-0">Pendente</span>
                  )}
                </div>

                {/* Render 3D */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${order.render3dFile ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200'}`}>
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">3. Projeto Render 3D</span>
                    <span className={`text-xs font-medium truncate block ${order.render3dFile ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                      {order.render3dFile || 'Não enviado'}
                    </span>
                  </div>
                  {order.render3dFile && (
                    <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>

                {/* Plano de Corte */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${order.planoCorteFile ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200'}`}>
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">4. Plano Corte (CorteCloud)</span>
                    <span className={`text-xs font-medium truncate block ${order.planoCorteFile ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                      {order.planoCorteFile || 'Não enviado'}
                    </span>
                  </div>
                  {order.planoCorteFile && (
                    <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>

                {/* Termo de Vistoria */}
                <div className={`p-3 rounded-lg border col-span-2 flex items-center justify-between ${order.termoVistoriaFile ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200'}`}>
                  <div className="truncate pr-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">5. Termo de Vistoria & Aceite do Cliente</span>
                    <span className={`text-xs font-medium truncate block ${order.termoVistoriaFile ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                      {order.termoVistoriaFile || 'Não enviado'}
                    </span>
                  </div>
                  {order.termoVistoriaFile && (
                    <span className="p-1.5 text-emerald-600 bg-emerald-50 rounded-md shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FORMULÁRIO DA ETAPA ATUAL (Ações & Requisitos de Avanço) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Ação Requerida para a Etapa: {STAGES[currentIndex]?.label}
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                O ERP avança o status do pedido automaticamente após o preenchimento dos requisitos obrigatórios.
              </p>

              {/* ETAPA 1: MEDIÇÃO TÉCNICA */}
              {order.currentStage === 'medicao' && (
                <form onSubmit={handleSaveMedicao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data da Medição Realizada na Obra *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="date"
                        value={medicaoDate}
                        onChange={(e) => setMedicaoDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anexar Ficha Técnica de Medição (PDF / Imagem) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: ficha_medicao_obra_v1.pdf"
                        value={medicaoFileName}
                        onChange={(e) => setMedicaoFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setMedicaoFileName(`medicao_tecnica_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Simulation Upload
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Salvar Medição Técnica & Avançar para Projeto Executivo →'}
                  </button>
                </form>
              )}

              {/* ETAPA 2: PROJETO EXECUTIVO */}
              {order.currentStage === 'projeto_executivo' && (
                <form onSubmit={handleSaveProjetoExecutivo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Projetista 3D Responsável *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ex: Fernanda Designer"
                        value={designerName}
                        onChange={(e) => setDesignerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Render 3D Aprovado pelo Cliente *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: render_projeto_final.pdf"
                        value={render3dFileName}
                        onChange={(e) => setRender3dFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRender3dFileName(`projeto_3d_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Simular
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Plano de Corte (CorteCloud / Marceneiro) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: plano_cortecloud.corte"
                        value={planoCorteFileName}
                        onChange={(e) => setPlanoCorteFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPlanoCorteFileName(`plano_cortecloud_${order.id.toLowerCase()}.corte`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Simular
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Anexar Projetos & Liberar para Montagem na Obra →'}
                  </button>
                </form>
              )}

              {/* ETAPA 3: MONTAGEM NA OBRA */}
              {order.currentStage === 'montagem' && (
                <form onSubmit={handleSaveMontagem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Montador Responsável *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ex: Marcelo Montagens"
                        value={installerName}
                        onChange={(e) => setInstallerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Agendada da Montagem *
                    </label>
                    <input
                      type="date"
                      value={installationDate}
                      onChange={(e) => setInstallationDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Check-in / Confirmação na Obra *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Check-in realizado às 08:30"
                        value={checkedInAt}
                        onChange={(e) => setCheckedInAt(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setCheckedInAt(`Equipe em obra desde ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                      >
                        Registrar Agora
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? 'Registrando...' : 'Concluir Montagem & Encaminhar para Vistoria →'}
                  </button>
                </form>
              )}

              {/* ETAPA 4: VISTORIA & CONCLUSÃO */}
              {order.currentStage === 'vistoria' && (
                <form onSubmit={handleSaveVistoria} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Técnico de Vistoria / Supervisor *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Engenheiro Ricardo"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="approval-check"
                      checked={inspectionApproved}
                      onChange={(e) => setInspectionApproved(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                      required
                    />
                    <label htmlFor="approval-check" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                      Vistoria realizada e APROVADA pelo cliente sem pendências.
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Termo de Aceite & Entrega Assinado (PDF) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: termo_aceite_assinado.pdf"
                        value={termoVistoriaFileName}
                        onChange={(e) => setTermoVistoriaFileName(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setTermoVistoriaFileName(`termo_aceite_${order.id.toLowerCase()}.pdf`)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                      >
                        Simular
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? 'Finalizando...' : 'Aprovar Vistoria & Finalizar Pedido 🎉'}
                  </button>
                </form>
              )}

              {/* ETAPA 5: PEDIDO CONCLUÍDO */}
              {order.currentStage === 'concluido' && (
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-900">
                    Pedido #{order.id} Totalmente Finalizado!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                    Todas as 5 etapas da operação pós-venda foram executadas e auditadas com sucesso na plataforma ERP.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* COLUNA DIREITA: TIMELINE DE AUDITORIA & REGISTRO DE AÇÕES (LG: 5 COLUNAS) */}
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

                    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mb-1">
                      {log.userRole}
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                      {log.action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Nenhuma alteração registrada ainda.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Sistema de Trilha de Auditoria ERP Ativado
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
