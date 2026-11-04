import React, { useState, useRef, useMemo } from 'react';
import { 
  Wrench, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Camera, 
  CheckCircle2, 
  Navigation, 
  Clock, 
  Calendar, 
  Check, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  User,
  Image as ImageIcon
} from 'lucide-react';
import { StoreOrder } from '../../types';
import { useApp } from '../../context/AppContext';
import { uploadAndAttachOrderDocument, advanceOrderStageOnServer } from '../../lib/erpService';

interface AssemblerMobileViewProps {
  orders: StoreOrder[];
  onRefreshOrders?: () => void;
}

export const AssemblerMobileView: React.FC<AssemblerMobileViewProps> = ({ orders, onRefreshOrders }) => {
  const { currentUser, logout, updateOrder, triggerConfetti } = useApp();
  const [filterTab, setFilterTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [selectedOrderIdForPhoto, setSelectedOrderIdForPhoto] = useState<string | null>(null);
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [finishingOrderId, setFinishingOrderId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtragem dos pedidos pertinentes ao montador
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const isCompleted = o.currentStage === 'concluido' || o.currentStage === 'entrega_aceite' || o.montagemDone;
      if (filterTab === 'pendentes') {
        return !isCompleted;
      } else {
        return isCompleted;
      }
    });
  }, [orders, filterTab]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 4000);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const handleCapturePhotoClick = (orderId: string) => {
    setSelectedOrderIdForPhoto(orderId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderIdForPhoto) return;

    const targetOrder = orders.find((o) => o.id === selectedOrderIdForPhoto);
    if (!targetOrder) return;

    setUploadingOrderId(selectedOrderIdForPhoto);
    try {
      const targetUuid = targetOrder.uuid || targetOrder.id;
      const tenantId = targetOrder.tenantId || currentUser?.tenantId || 'store-tenant';
      const res = await uploadAndAttachOrderDocument(
        targetUuid,
        tenantId,
        'montagem',
        file,
        'foto_montagem'
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao enviar foto para a pasta digital.');
      }

      updateOrder(
        targetOrder.id,
        { montagemFoto: file.name, montagemDone: true },
        `Foto de montagem "${file.name}" enviada pelo montador no local.`,
        'Montador',
        currentUser?.fullName || 'Montador'
      );

      showToast('📸 Foto da montagem salva na Pasta Digital com sucesso!');
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      showToast(err.message || 'Falha ao salvar foto.', true);
    } finally {
      setUploadingOrderId(null);
      setSelectedOrderIdForPhoto(null);
    }
  };

  const handleFinishAssembly = async (order: StoreOrder) => {
    setFinishingOrderId(order.id);
    try {
      const targetUuid = order.uuid || order.id;
      const res = await advanceOrderStageOnServer(
        targetUuid,
        'entrega_aceite',
        `Montagem finalizada por ${currentUser?.fullName || 'Montador'}.`,
        'Concluído no local via Smartphone',
        true
      );

      if (!res.success) {
        throw new Error(res.error || 'Erro ao atualizar etapa no servidor.');
      }

      updateOrder(
        order.id,
        { currentStage: 'entrega_aceite', montagemDone: true },
        'Montagem finalizada no local pelo montador. Pedido pronto para aceite.',
        'Montador',
        currentUser?.fullName || 'Montador'
      );

      triggerConfetti();
      showToast('🎉 Montagem concluída com sucesso! Parabéns.');
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      showToast(err.message || 'Erro ao concluir montagem.', true);
    } finally {
      setFinishingOrderId(null);
    }
  };

  const cleanPhoneForCall = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const getWazeUrl = (address: string, city: string) => {
    const fullQuery = encodeURIComponent(`${address}, ${city}`);
    return `https://waze.com/ul?q=${fullQuery}&navigate=yes`;
  };

  const getGoogleMapsUrl = (address: string, city: string) => {
    const fullQuery = encodeURIComponent(`${address}, ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${fullQuery}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none pb-24">
      
      {/* Hidden File Input para Câmera Nativa */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelected}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>App do Montador</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <h1 className="text-sm font-black text-white truncate max-w-[200px]">
              {currentUser?.fullName || 'Montador de Campo'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {onRefreshOrders && (
            <button
              onClick={onRefreshOrders}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Feedback */}
      {successToast && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl bg-rose-600 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Filter Tabs (Grandes para Toque Fácil) */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 grid grid-cols-2 gap-2">
        <button
          onClick={() => setFilterTab('pendentes')}
          className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            filterTab === 'pendentes'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>A Montar ({orders.filter(o => !o.montagemDone && o.currentStage !== 'concluido').length})</span>
        </button>

        <button
          onClick={() => setFilterTab('concluidas')}
          className={`py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            filterTab === 'concluidas'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Finalizadas ({orders.filter(o => o.montagemDone || o.currentStage === 'concluido').length})</span>
        </button>
      </div>

      {/* Lista de Ordens de Montagem */}
      <main className="p-3 space-y-4 flex-1">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Wrench className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-white">Nenhuma montagem nesta lista</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {filterTab === 'pendentes'
                ? 'Você não possui montagens pendentes no momento. Bom trabalho!'
                : 'Nenhuma montagem finalizada registrada recentemente.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted = order.montagemDone || order.currentStage === 'concluido' || order.currentStage === 'entrega_aceite';
            const isUploading = uploadingOrderId === order.id;
            const isFinishing = finishingOrderId === order.id;
            const rawPhone = cleanPhoneForCall(order.phone || '');

            return (
              <div 
                key={order.id}
                className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-4 space-y-4 shadow-xl overflow-hidden"
              >
                {/* Header do Card: Pedido & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-black uppercase font-mono">
                        {order.orderNumber || order.id}
                      </span>
                      {order.targetDeliveryDate && (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{order.targetDeliveryDate}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-white mt-1">
                      {order.clientName}
                    </h3>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isCompleted ? 'Montagem Concluída' : 'Na Fila de Montagem'}
                  </span>
                </div>

                {/* Ambiente & Descrição do Móvel */}
                <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Ambiente / Projeto</span>
                  <p className="text-xs font-black text-slate-200">
                    {order.environment || 'Móveis Planejados'}
                  </p>
                  {order.stageNotes && (
                    <p className="text-[11px] text-slate-400 italic mt-1 pt-1 border-t border-slate-800">
                      Obs: {order.stageNotes}
                    </p>
                  )}
                </div>

                {/* Endereço com 1-Toque para Waze e Maps */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-slate-300">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-white block">
                        {order.address || 'Endereço residencial do cliente'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {order.city} - {order.state}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={getWazeUrl(order.address || order.city, order.city)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Abrir no Waze</span>
                    </a>

                    <a
                      href={getGoogleMapsUrl(order.address || order.city, order.city)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>

                {/* Contato com o Cliente (Telefone e WhatsApp) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <a
                    href={`tel:${rawPhone}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ligar ({order.phone || 'Cliente'})</span>
                  </a>

                  <a
                    href={`https://wa.me/55${rawPhone}?text=${encodeURIComponent(`Olá ${order.clientName}, sou o montador da marcenaria responsável pela montagem dos seus móveis planejados.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Ações de Campo: Foto da Câmera & Concluir */}
                <div className="space-y-2 pt-2 border-t-2 border-slate-700">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Fotos na Pasta Digital:</span>
                    <span className="font-bold text-white">
                      {order.montagemFoto ? '1 foto anexada ✓' : 'Nenhuma foto ainda'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCapturePhotoClick(order.id)}
                    disabled={isUploading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando Foto da Câmera...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Tirar Foto do Móvel Montado</span>
                      </>
                    )}
                  </button>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleFinishAssembly(order)}
                      disabled={isFinishing}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isFinishing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Finalizando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finalizar Montagem no Local</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </main>

    </div>
  );
};
