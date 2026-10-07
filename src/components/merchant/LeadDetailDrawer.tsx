import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Mail, 
  Phone, 
  User, 
  X,
  FileText,
  Paperclip,
  Send,
  MessageSquare,
  AlertCircle,
  XCircle,
  Upload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LeadStatus } from '../../types';

export const LeadDetailDrawer: React.FC = () => {
  const { selectedLeadForDetail, setSelectedLeadForDetail, updateLead, updateLeadStatus } = useApp();
  const [newCommentText, setNewCommentText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!selectedLeadForDetail) return null;

  const lead = selectedLeadForDetail;
  const isPlatformLead = !lead.isExternal && lead.source !== 'instagram' && lead.source !== 'google' && lead.source !== 'indicacao' && lead.source !== 'balcao';

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Vendedor Loja',
      text: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    const currentNotes = lead.notesList || [];
    updateLead(lead.id, {
      notesList: [newNote, ...currentNotes],
    });

    setNewCommentText('');
  };

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const fakeUrl = URL.createObjectURL(file);

    updateLead(lead.id, {
      attachmentName: fileName,
      attachmentUrl: fakeUrl,
      status: 'orcado', // Avança automaticamente para o estágio Orçado
    });

    setValidationError(null);
  };

  const handleStageChangeAttempt = (targetStatus: LeadStatus) => {
    setValidationError(null);

    // Regra: Exige anexo para mover para 'orcado'
    if (targetStatus === 'orcado' && !lead.attachmentName) {
      setValidationError('Anexe a proposta em PDF abaixo para mover este cliente para a etapa "Orçado".');
      return;
    }

    // Regra: Exige anexo para mover para resultado final
    if ((targetStatus === 'convertido' || targetStatus === 'perdido') && !lead.attachmentName) {
      setValidationError('Anexe a proposta em PDF antes de fechar ou marcar a venda como perdida.');
      return;
    }

    updateLeadStatus(lead.id, targetStatus);
  };

  const handleFinalDecision = (decision: 'convertido' | 'perdido') => {
    if (!lead.attachmentName) {
      setValidationError('Anexe o arquivo de orçamento antes de definir o resultado da venda.');
      return;
    }

    updateLead(lead.id, {
      finalDecision: decision,
      status: decision,
    });
    setValidationError(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header Limpo do Modal */}
        <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg sm:text-xl font-black text-white">{lead.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              isPlatformLead ? 'bg-[#439346] text-white' : 'bg-amber-400 text-slate-950'
            }`}>
              {isPlatformLead ? 'Lead da Plataforma' : `Lead Externo (${lead.source || 'Manual'})`}
            </span>
          </div>

          <button
            onClick={() => setSelectedLeadForDetail(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid 2-Colunas (Visão Limpa sem poluição) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          
          {/* Mensagem de Alerta se faltar anexo */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Bar de Troca Rápida de Etapa no Funil */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black text-[#1B2B48] uppercase tracking-wider">Etapa Atual:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'novo', label: 'Novo' },
                { id: 'em_atendimento', label: 'Em Atendimento' },
                { id: 'orcado', label: 'Orçado' },
                { id: 'convertido', label: 'Fechado' },
                { id: 'perdido', label: 'Perdido' },
              ].map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => handleStageChangeAttempt(stg.id as LeadStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    lead.status === stg.id
                      ? 'bg-[#1B2B48] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {stg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Principal: Coluna Esquerda (Dados & Orçamento) | Coluna Direita (Anexos, Decisão & Comentários) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUNA ESQUERDA */}
            <div className="space-y-5">
              
              {/* Contato Inicial */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-[#439346]" />
                  <span>Contato do Cliente</span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">WhatsApp:</span> <strong className="text-[#439346]">{lead.phone}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">E-mail:</span> <strong className="text-slate-800">{lead.email}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Cidade/UF:</span> <strong className="text-slate-800">{lead.city} - {lead.state}</strong></div>
              </div>

              {/* Orçamento e Cômodos da Plataforma */}
              {isPlatformLead && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#439346]" />
                    <span>Simulação de Móveis no App</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Estimativa Calculada:</span>
                    <span className="text-base font-black text-[#439346]">{formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}</span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">Ambientes Solicitados:</span>
                    <strong className="text-white text-sm">{lead.environment}</strong>
                  </div>

                  {lead.environmentsData && lead.environmentsData.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      {lead.environmentsData.map((env, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded-xl text-[11px] flex justify-between font-semibold">
                          <span>{env.name}</span>
                          <span className="text-emerald-400">{env.areaM2}m² • {env.wallCount} Paredes</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* COLUNA DIREITA */}
            <div className="space-y-5">
              
              {/* Anexo de Orçamento Obligatório */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                  <Paperclip className="w-4 h-4 text-[#439346]" />
                  <span>Anexo do Orçamento Técnico *</span>
                </div>

                {lead.attachmentName ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center space-x-2 text-[#439346] font-extrabold">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[180px]">{lead.attachmentName}</span>
                    </div>
                    <span className="text-[10px] font-black bg-[#439346] text-white px-2 py-0.5 rounded-md">Anexado</span>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#439346] rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-1 bg-slate-50 text-center">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-[#1B2B48]">Anexar Proposta Técnica em PDF</span>
                    <span className="text-[10px] text-slate-400">Exigido para mover para a etapa Orçado</span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleSimulatedFileUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* Decisão Final de Fechamento */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider">Resultado da Venda:</div>

                {lead.finalDecision ? (
                  <div className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-between ${
                    lead.finalDecision === 'convertido' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                  }`}>
                    <span>Decisão: {lead.finalDecision === 'convertido' ? 'VENDA FECHADA' : 'PERDIDO'}</span>
                    <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded uppercase font-bold">Registrado</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFinalDecision('convertido')}
                      disabled={!lead.attachmentName}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all ${
                        lead.attachmentName ? 'bg-[#439346] hover:bg-[#387F3B] text-white cursor-pointer shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Fechado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinalDecision('perdido')}
                      disabled={!lead.attachmentName}
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all ${
                        lead.attachmentName ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Perdido</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Feed de Comentários / Observações */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-black text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-[#439346]" />
                  <span>Observações & Histórico</span>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Adicionar nota..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#439346]"
                  />
                  <button type="submit" className="px-3 py-2 rounded-xl bg-[#1B2B48] hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {lead.notesList && lead.notesList.length > 0 ? (
                    lead.notesList.map((note) => (
                      <div key={note.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                          <span>{note.author}</span>
                          <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-800 font-semibold">{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[11px] text-slate-400 py-2">Sem observações ainda.</p>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
