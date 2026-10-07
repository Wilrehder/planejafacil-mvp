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
  Upload,
  Check
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
      status: 'orcado', // Move automaticamente para a categoria Orçado ao anexar
    });

    setValidationError(null);
  };

  const handleStageChangeAttempt = (targetStatus: LeadStatus) => {
    setValidationError(null);

    // Regra: Para avançar para 'orcado', exige anexo
    if (targetStatus === 'orcado' && !lead.attachmentName) {
      setValidationError('⚠️ Para mover para o estágio "Orçado", você precisa anexar a proposta de orçamento em PDF/documento abaixo.');
      return;
    }

    // Regra: Se tentar mover direto para 'convertido' ou 'perdido' sem anexo
    if ((targetStatus === 'convertido' || targetStatus === 'perdido') && !lead.attachmentName) {
      setValidationError('⚠️ Para definir o resultado final, é necessário ter o orçamento anexado primeiro.');
      return;
    }

    updateLeadStatus(lead.id, targetStatus);
  };

  const handleFinalDecision = (decision: 'convertido' | 'perdido') => {
    if (!lead.attachmentName) {
      setValidationError('⚠️ Anexe o arquivo de orçamento antes de definir a venda como Fechada ou Perdida.');
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header da Ficha do Lead */}
        <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                isPlatformLead ? 'bg-[#439346] text-white' : 'bg-amber-500 text-slate-950'
              }`}>
                {isPlatformLead ? 'Lead da Plataforma' : `Lead Externo (${lead.source || 'Manual'})`}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: #{lead.id}</span>
            </div>
            <h2 className="text-xl font-black text-white">{lead.name}</h2>
          </div>

          <button
            onClick={() => setSelectedLeadForDetail(null)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-slate-800">
          
          {/* Alerta de Validação de Regra se houver erro */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. SEÇÃO DE ETAPAS E STATUS DO FUNIL */}
          <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider">
              Estágio Atual do Funil de Vendas
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'novo', label: 'Novo Lead' },
                { id: 'em_atendimento', label: 'Em Atendimento' },
                { id: 'orcado', label: 'Orçado' },
                { id: 'convertido', label: 'Venda Fechada' },
                { id: 'perdido', label: 'Perdido' },
              ].map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => handleStageChangeAttempt(stg.id as LeadStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    lead.status === stg.id
                      ? 'bg-[#1B2B48] text-white shadow-sm ring-2 ring-[#1B2B48]/30'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {stg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. DADOS INICIAIS DE CONTATO */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-4 h-4 text-[#439346]" />
              <span>Dados Iniciais do Cliente</span>
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Nome Completo:</span>
                <span className="font-extrabold text-slate-900">{lead.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Telefone / WhatsApp:</span>
                <span className="font-bold text-[#439346]">{lead.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">E-mail:</span>
                <span className="font-bold text-slate-800">{lead.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Cidade / Região:</span>
                <span className="font-bold text-slate-800">{lead.city} - {lead.state}</span>
              </div>
            </div>
          </div>

          {/* 3. ORÇAMENTO REALIZADO NA PLATAFORMA (APENAS PARA LEADS DA PLATAFORMA) */}
          {isPlatformLead && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-[#439346]" />
                <span>Orçamento Realizado no Simulador da Plataforma</span>
              </h3>

              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-sm border border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">Estimativa Calculada em m²:</span>
                  <span className="text-lg font-black text-[#439346]">
                    {formatCurrency(lead.estimatedMin)} ~ {formatCurrency(lead.estimatedMax)}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-slate-400 font-semibold">Ambientes e Cômodos:</div>
                  <div className="font-bold text-white text-sm">{lead.environment}</div>
                </div>

                {lead.environmentsData && lead.environmentsData.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-xs text-slate-400 font-semibold">Detalhamento dos Cômodos Medidos:</span>
                    <div className="space-y-1.5">
                      {lead.environmentsData.map((env, idx) => (
                        <div key={idx} className="bg-slate-800/90 p-2.5 rounded-xl text-xs space-y-1 border border-slate-700">
                          <div className="flex justify-between font-bold text-white">
                            <span>{env.name}</span>
                            <span className="text-emerald-400">{env.areaM2}m² • {env.wallCount} Paredes • Pé-direito {env.ceilingHeight || 2.7}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. CAMPO DE ANEXOS DE ORÇAMENTO (EXIGIDO PARA AVANÇAR DE ATENDIMENTO PARA ORÇADO) */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
              <Paperclip className="w-4 h-4 text-[#439346]" />
              <span>Anexo do Orçamento Técnico (PDF / Imagem) *</span>
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              {lead.attachmentName ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center space-x-2 text-[#439346] font-bold">
                    <FileText className="w-4 h-4" />
                    <span>{lead.attachmentName}</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-[#439346] text-white px-2 py-0.5 rounded-md">
                    Anexado com Sucesso
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-500 font-medium text-[11px]">
                    Para mover a negociação para a etapa <strong>"Orçado"</strong>, anexe o arquivo de proposta da sua loja abaixo:
                  </p>

                  <label className="border-2 border-dashed border-slate-300 hover:border-[#439346] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-1 bg-slate-50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-[#1B2B48]">Clique para selecionar ou solte a proposta aqui</span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG até 10MB</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleSimulatedFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 5. DECISÃO FINAL: FECHADO OU PERDIDO (LIBERADO APÓS ORÇAMENTO ANEXADO) */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider">
              Decisão de Fechamento da Venda
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
              {lead.finalDecision ? (
                <div className={`p-4 rounded-xl font-extrabold text-xs flex items-center justify-between ${
                  lead.finalDecision === 'convertido' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-red-100 text-red-900 border border-red-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    {lead.finalDecision === 'convertido' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                    <span>Decisão Registrada: {lead.finalDecision === 'convertido' ? 'VENDA FECHADA COM SUCESSO' : 'NEGOCIAÇÃO PERDIDA'}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-white/70 px-2 py-0.5 rounded">Decisão Concluída</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-slate-500">
                    Após o envio da proposta, selecione o resultado final da oportunidade:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleFinalDecision('convertido')}
                      disabled={!lead.attachmentName}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                        lead.attachmentName
                          ? 'bg-[#439346] hover:bg-[#387F3B] text-white shadow-md cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Venda Fechada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinalDecision('perdido')}
                      disabled={!lead.attachmentName}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
                        lead.attachmentName
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Perdido</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. CAMPO DE ADICIONAR OBSERVAÇÕES / HISTÓRICO DE COMENTÁRIOS */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#1B2B48] uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-4 h-4 text-[#439346]" />
              <span>Histórico de Observações & Comentários</span>
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
              
              {/* Form Adicionar Comentário */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escreva uma observação (ex: Cliente solicitou alteração de cor)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:border-[#439346]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#1B2B48] hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>

              {/* Feed de Comentários */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {lead.notesList && lead.notesList.length > 0 ? (
                  lead.notesList.map((note) => (
                    <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>{note.author}</span>
                        <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-800 font-semibold">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-3 font-medium">Nenhuma observação registrada ainda.</p>
                )}
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
