import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  MessageCircle, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Sliders, 
  Sparkles, 
  X, 
  Send,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  StoreMetaIntegration, 
  getStoreMetaIntegration, 
  saveStoreMetaIntegration, 
  simulateMetaLeadCapture,
  META_CONFIG 
} from '../../lib/metaService';

const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

interface Props {
  storeId: string;
  storeName: string;
  storePlan: string;
}

export const MerchantMetaIntegration: React.FC<Props> = ({ storeId, storeName, storePlan }) => {
  const { refreshLeads } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [integration, setIntegration] = useState<StoreMetaIntegration | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mock de dados da loja ao conectar
  const [connectionForm, setConnectionForm] = useState({
    pageName: `${storeName} — Oficial`,
    pageId: `fb-page-${Date.now().toString().slice(-6)}`,
    instaUser: `@${storeName.toLowerCase().replace(/\s+/g, '_')}`,
    instaId: `ig-act-${Date.now().toString().slice(-6)}`,
    whatsappNumber: '(11) 98988-3025',
  });

  // Simulador de evento Meta
  const [simChannel, setSimChannel] = useState<'instagram_comment' | 'instagram_direct' | 'facebook_comment' | 'whatsapp'>('instagram_comment');
  const [simAuthor, setSimAuthor] = useState('Juliana Ferreira');
  const [simMessage, setSimMessage] = useState('Olá! Amei essa cozinha planejada em MDF cinza sagrado. Qual o valor aproximado para 4 metros lineares?');

  const isPro = storePlan?.toLowerCase() === 'pro';

  const loadIntegration = async () => {
    setLoading(true);
    try {
      const data = await getStoreMetaIntegration(storeId);
      setIntegration(data);
    } catch (err) {
      console.error('Erro ao carregar integração Meta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegration();
  }, [storeId]);

  const handleToggleChannel = async (key: keyof StoreMetaIntegration) => {
    if (!integration) return;
    const updated = {
      ...integration,
      [key]: !integration[key],
    };
    setIntegration(updated);
    await saveStoreMetaIntegration(updated);
  };

  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integration) return;
    setSaving(true);
    setFeedback(null);

    const updated: StoreMetaIntegration = {
      ...integration,
      isConnected: true,
      fbPageId: connectionForm.pageId,
      fbPageName: connectionForm.pageName,
      instagramAccountId: connectionForm.instaId,
      instagramUsername: connectionForm.instaUser,
      whatsappPhoneNumber: connectionForm.whatsappNumber,
      lastSyncAt: new Date().toISOString(),
    };

    try {
      const res = await saveStoreMetaIntegration(updated);
      if (res.success) {
        setIntegration(updated);
        setIsConnectModalOpen(false);
        setFeedback({
          type: 'success',
          text: `Contas Meta de "${connectionForm.pageName}" e ${connectionForm.instaUser} conectadas com sucesso!`
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Falha ao salvar conexão.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar a integração com a Meta? Os novos comentários e directs não serão convertidos em leads automaticamente.')) {
      return;
    }
    if (!integration) return;
    setSaving(true);
    try {
      const updated: StoreMetaIntegration = {
        ...integration,
        isConnected: false,
      };
      await saveStoreMetaIntegration(updated);
      setIntegration(updated);
      setFeedback({ type: 'success', text: 'Integração Meta desconectada com sucesso.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setFeedback(null);

    try {
      const res = await simulateMetaLeadCapture({
        tenantId: storeId,
        channel: simChannel,
        authorName: simAuthor,
        messageContent: simMessage,
        postReference: simChannel.includes('comment') ? 'Post: Cozinha Provence 2026' : undefined,
      });

      if (res.success) {
        await refreshLeads();
        await loadIntegration();
        setFeedback({
          type: 'success',
          text: `Lead de "${simAuthor}" capturado com sucesso! Vá na aba CRM para visualizá-lo na coluna "Novos".`
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Falha ao processar simulação.' });
      }
    } finally {
      setSimulating(false);
    }
  };

  if (!isPro) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg">
          <InstagramIcon className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold uppercase rounded-full">
            Recurso Exclusivo Plano Pro
          </span>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            Central Meta Omni-Channel (Instagram, Facebook & WhatsApp)
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm">
            Converta automaticamente comentários em posts, directs do Instagram e mensagens do Facebook em leads qualificados no seu CRM.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
          O seu plano atual é <strong>Básico</strong>. Faça upgrade para o <strong>Plano Pro</strong> para habilitar integrações ilimitadas com redes sociais e leads externos sem custo por lead.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      
      {/* Banner Principal com Meta Branding */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1B2B48] to-[#0A192F] p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
        
        {/* Glow decorativo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="space-y-2 relative z-10 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider">
              Meta Graph API & Webhooks
            </span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> App ID: {META_CONFIG.APP_ID}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <span>Central Meta: Instagram, Facebook & WhatsApp</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300">
            Conecte as redes sociais da <strong>{storeName}</strong>. Qualquer comentário em posts ou direct enviado por clientes se transforma automaticamente em lead no seu CRM.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {integration?.isConnected ? (
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Conectado & Monitorando</span>
              </span>
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
            >
              <FacebookIcon className="w-4 h-4" />
              <span>Conectar com a Meta (Facebook / Insta)</span>
            </button>
          )}
        </div>

      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid de Canais Integrados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card Instagram */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 text-white flex items-center justify-center shadow-md">
              <InstagramIcon className="w-5 h-5" />
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
              integration?.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {integration?.isConnected ? 'Ativo' : 'Aguardando'}
            </span>
          </div>

          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Instagram Business</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {integration?.isConnected ? integration.instagramUsername : 'Nenhuma conta vinculada'}
            </p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-semibold">Capturar comentários em Posts/Reels</span>
              <input
                type="checkbox"
                disabled={!integration?.isConnected}
                checked={integration?.captureInstagramComments ?? true}
                onChange={() => handleToggleChannel('captureInstagramComments')}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-semibold">Capturar Direct Messages (DM)</span>
              <input
                type="checkbox"
                disabled={!integration?.isConnected}
                checked={integration?.captureInstagramDirects ?? true}
                onChange={() => handleToggleChannel('captureInstagramDirects')}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>

        {/* Card Facebook */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FacebookIcon className="w-5 h-5" />
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
              integration?.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {integration?.isConnected ? 'Ativo' : 'Aguardando'}
            </span>
          </div>

          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Página do Facebook</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {integration?.isConnected ? integration.fbPageName : 'Nenhuma página vinculada'}
            </p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-semibold">Capturar comentários da Página</span>
              <input
                type="checkbox"
                disabled={!integration?.isConnected}
                checked={integration?.captureFacebookComments ?? true}
                onChange={() => handleToggleChannel('captureFacebookComments')}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-semibold">Capturar mensagens do Messenger</span>
              <input
                type="checkbox"
                disabled={!integration?.isConnected}
                checked={integration?.captureFacebookMessages ?? true}
                onChange={() => handleToggleChannel('captureFacebookMessages')}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Card WhatsApp */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
              integration?.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {integration?.isConnected ? 'Ativo' : 'Aguardando'}
            </span>
          </div>

          <div>
            <h3 className="font-extrabold text-slate-900 text-base">WhatsApp Business Cloud</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {integration?.isConnected ? integration.whatsappPhoneNumber : 'Nenhum número vinculado'}
            </p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 font-semibold">Capturar novas conversas comerciais</span>
              <input
                type="checkbox"
                disabled={!integration?.isConnected}
                checked={integration?.captureWhatsappMessages ?? true}
                onChange={() => handleToggleChannel('captureWhatsappMessages')}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
            </label>
            <div className="text-[11px] text-slate-400">
              Notificação instantânea para o consultor da loja.
            </div>
          </div>
        </div>

      </div>

      {/* Painel de Teste e Simulação ao Vivo */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Simulador do Robô Meta (Teste em Tempo Real)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simule um comentário ou mensagem chegando das redes sociais para ver o lead sendo criado instantaneamente no seu CRM.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Capturados</span>
            <div className="text-xl font-black text-purple-700">{integration?.leadsGeneratedCount || 0} leads</div>
          </div>
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canal de Origem</label>
            <select
              value={simChannel}
              onChange={(e) => setSimChannel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="instagram_comment">📸 Instagram — Comentário em Post</option>
              <option value="instagram_direct">💬 Instagram — Direct Message (DM)</option>
              <option value="facebook_comment">📘 Facebook — Comentário na Página</option>
              <option value="whatsapp">🟢 WhatsApp — Mensagem Comercial</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Consumidor</label>
            <input
              type="text"
              required
              value={simAuthor}
              onChange={(e) => setSimAuthor(e.target.value)}
              placeholder="Ex: Amanda Prado"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mensagem ou Comentário</label>
            <input
              type="text"
              required
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              placeholder="Ex: Quanto custa essa cozinha?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={simulating || !integration?.isConnected}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {simulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Webhook...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Simular Disparo do Webhook Meta</span>
                </>
              )}
            </button>
          </div>
        </form>

        {!integration?.isConnected && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Conecte sua conta da Meta acima para ativar os gatilhos e testar o robô de captura.</span>
          </div>
        )}
      </div>

      {/* MODAL DE CONEXÃO OAUTH DA META */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col text-left">
            
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FacebookIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Conectar com a Meta Business</h3>
                  <p className="text-[11px] text-slate-500 font-mono">App ID: {META_CONFIG.APP_ID}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectAccount} className="p-6 space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
                Selecione a Página do Facebook da loja e o perfil comercial do Instagram para conceder permissão de leitura de mensagens e comentários.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Página do Facebook da Loja *
                </label>
                <input
                  type="text"
                  required
                  value={connectionForm.pageName}
                  onChange={(e) => setConnectionForm({ ...connectionForm, pageName: e.target.value })}
                  placeholder="Ex: Dell Anno Suzano"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Perfil Comercial do Instagram *
                </label>
                <input
                  type="text"
                  required
                  value={connectionForm.instaUser}
                  onChange={(e) => setConnectionForm({ ...connectionForm, instaUser: e.target.value })}
                  placeholder="Ex: @dellanno_suzano"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp Business Comercial
                </label>
                <input
                  type="text"
                  required
                  value={connectionForm.whatsappNumber}
                  onChange={(e) => setConnectionForm({ ...connectionForm, whatsappNumber: e.target.value })}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <span>Autorizar e Conectar</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
