import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  KeyRound, 
  Mail, 
  Plus, 
  RefreshCw, 
  Shield, 
  UserCheck, 
  UserMinus, 
  Users, 
  X,
  Briefcase,
  Wrench,
  User,
  Info,
  DollarSign,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { 
  createStoreUser, 
  toggleUserStatus, 
  resetUserPassword, 
  fetchStoreUsersAndLimit,
  StoreUserSummary 
} from '../../lib/authService';
import { STORE_ID_TO_TENANT_UUID } from '../../lib/crmService';
import { StoreUserRole } from '../../types';

interface StoreUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    id: string;
    name: string;
    city: string;
    plan?: 'Basic' | 'Pro' | string;
  };
}

export const StoreUsersModal: React.FC<StoreUsersModalProps> = ({ isOpen, onClose, store }) => {
  const [users, setUsers] = useState<StoreUserSummary[]>([]);
  const [planTier, setPlanTier] = useState<'basic' | 'pro'>('basic');
  const [maxUsers, setMaxUsers] = useState<number>(1);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [extraUsersCount, setExtraUsersCount] = useState<number>(0);
  const [extraUserPrice, setExtraUserPrice] = useState<number>(39.90);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New user form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StoreUserRole>('store_operator');
  const [newTempPassword, setNewTempPassword] = useState('PlanejaFacil2026!');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Reset password state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('PlanejaFacil2026!');

  const tenantUuid = STORE_ID_TO_TENANT_UUID[store.id] || store.id;

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchStoreUsersAndLimit(tenantUuid);
      if (res && res.success) {
        setUsers(res.users || []);
        setPlanTier(res.planTier || (store.plan?.toLowerCase() === 'pro' ? 'pro' : 'basic'));
        setMaxUsers(Number(res.maxUsers) || (store.plan?.toLowerCase() === 'pro' ? 3 : 1));
        setActiveUsersCount(Number(res.activeUsersCount) || 0);
        setExtraUsersCount(Number(res.extraUsersCount) || 0);
        setExtraUserPrice(Number(res.extraUserPrice) || 39.90);
      }
    } catch (err: any) {
      console.error('[StoreUsersModal] Erro ao carregar usuários:', err);
      setErrorMessage(err.message || 'Erro ao consultar usuários da loja.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, store.id]);

  if (!isOpen) return null;

  const willBeExtra = activeUsersCount >= maxUsers;

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmittingUser(true);

    try {
      const result = await createStoreUser({
        tenantId: tenantUuid,
        email: newEmail.trim().toLowerCase(),
        fullName: newName.trim(),
        role: newRole,
        tempPassword: newTempPassword,
        allowExtra: true,
      });

      if (result && result.is_extra) {
        setSuccessMessage(`Acesso adicional criado para "${newName}"! O valor de R$ ${extraUserPrice.toFixed(2).replace('.', ',')}/mês será adicionado à fatura.`);
      } else {
        setSuccessMessage(`Usuário "${newName}" adicionado com sucesso dentro da cota do plano.`);
      }

      setIsAddingUser(false);
      setNewEmail('');
      setNewName('');
      setNewRole('store_operator');
      await loadData();
    } catch (err: any) {
      console.error('[StoreUsersModal] Erro ao criar usuário:', err);
      setErrorMessage(err.message || 'Erro ao provisionar usuário.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleStatus = async (user: StoreUserSummary) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextStatus = !user.isActive;
      await toggleUserStatus(user.id, nextStatus);
      setSuccessMessage(`Acesso de ${user.fullName} ${nextStatus ? 'reativado' : 'suspenso'}.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao alterar status do usuário.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await resetUserPassword(resettingUserId, resetTempPassword);
      setSuccessMessage('Senha temporária redefinida com sucesso.');
      setResettingUserId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir senha.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'store_owner':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-600" /> Gerente / Dono
          </span>
        );
      case 'store_assembler':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-700" /> Montador (Mobile ERP)
          </span>
        );
      case 'store_operator':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-700" /> Vendedor (CRM)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 my-6 text-left max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header Amplo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black text-emerald-700 uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Painel Amplo de Gestão de Equipe & Acessos</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{store.name}</span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase ${
                planTier === 'pro' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                Plano {planTier.toUpperCase()}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {store.city} • Gerencie permissões de Gerente, Vendedores e Montadores com cobrança automática de acessos extras.
            </p>
          </div>

          {!isAddingUser && (
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Acesso</span>
            </button>
          )}
        </div>

        {/* Metrics Grid (Cota, Usuários Ativos e Extras) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Cota do Plano</span>
              <span className="text-lg font-black text-slate-900">{maxUsers} {maxUsers === 1 ? 'Acesso Incluído' : 'Acessos Incluídos'}</span>
              <span className="text-[10px] text-slate-400 block">Sem custo adicional</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Acessos Ativos</span>
              <span className="text-lg font-black text-slate-900">{activeUsersCount} de {maxUsers} em uso</span>
              <span className="text-[10px] text-slate-400 block">
                {activeUsersCount <= maxUsers ? 'Dentro do limite do plano' : `${extraUsersCount} usuário(s) extra(s)`}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Acessos Adicionais</span>
              <span className="text-lg font-black text-emerald-900">
                {extraUsersCount > 0 
                  ? `+ R$ ${(extraUsersCount * extraUserPrice).toFixed(2).replace('.', ',')}/mês`
                  : `R$ ${extraUserPrice.toFixed(2).replace('.', ',')}/mês por extra`}
              </span>
              <span className="text-[10px] text-emerald-600 block">
                {extraUsersCount > 0 ? `${extraUsersCount} extra(s) faturado(s)` : 'Nenhum extra faturado'}
              </span>
            </div>
          </div>
        </div>

        {/* Roles Visual Guide Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/70 border border-slate-200 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-black text-purple-900">
              <User className="w-4 h-4 text-purple-600" />
              <span>Gerente / Dono da Loja</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Visão irrestrita de tudo: Funil de Leads, ERP de Produção, Faturas B2B da Loja, Contrato e Gestão de Equipe.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-black text-blue-900">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Vendedor (Comercial)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Visão focada em clientes: CRM de Leads, Orçamentos, Funil e Pasta Digital. Oculta dados da fatura B2B e equipe.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-900">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>Montador (100% Mobile)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Interface tátil para celular: Ordens de montagem do dia, 1 toque para Waze/Maps, ligação direta e envio de fotos.
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ADD USER EXPANDED FORM */}
        {isAddingUser && (
          <form onSubmit={handleCreateUserSubmit} className="p-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <div>
                <h4 className="text-sm font-black uppercase text-emerald-950 tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  Cadastrar Novo Acesso para a Loja
                </h4>
                <p className="text-xs text-emerald-800">
                  Preencha os dados abaixo para conceder o acesso e credenciais de login ao colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer px-3 py-1 bg-white rounded-lg border border-slate-200"
              >
                Cancelar
              </button>
            </div>

            {willBeExtra && (
              <div className="p-3.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Cobrança de Acesso Adicional:</span>
                  <span className="block mt-0.5">
                    A cota contratual desta loja ({maxUsers} acesso(s)) já foi atingida. Este novo usuário será registrado como <strong>Acesso Adicional</strong> e adicionará <strong>R$ {extraUserPrice.toFixed(2).replace('.', ',')}/mês</strong> à fatura mensal desta loja parceira.
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Nome Completo do Colaborador *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">E-mail de Login *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="carlos@loja.com.br"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Função / Perfil de Acesso *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StoreUserRole)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="store_owner">👑 Gerente / Dono da Loja (Acesso Total irrestrito)</option>
                  <option value="store_operator">💼 Vendedor (CRM de Leads, Propostas e Clientes)</option>
                  <option value="store_assembler">🛠️ Montador (Interface Mobile ERP, Fotos & Waze)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Senha Provisória Inicial *</label>
                <input
                  type="text"
                  required
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">O usuário deverá trocar a senha no primeiro acesso.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmittingUser}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmittingUser ? 'Gravando Acesso...' : 'Confirmar e Criar Acesso'}
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD INLINE FORM */}
        {resettingUserId && (
          <form onSubmit={handleResetPasswordSubmit} className="p-5 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700" />
                Redefinir Senha Provisória do Usuário
              </span>
              <button
                type="button"
                onClick={() => setResettingUserId(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">Nova Senha Temporária *</label>
              <input
                type="text"
                required
                value={resetTempPassword}
                onChange={(e) => setResetTempPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-amber-300 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResettingUserId(null)}
                className="px-4 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                Salvar Nova Senha
              </button>
            </div>
          </form>
        )}

        {/* USERS LIST TABLE */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
            Consultando acessos e cotas da loja...
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
            Nenhum usuário cadastrado para esta loja ainda. Clique em "Criar Novo Acesso" no topo para adicionar o Gerente ou Colaboradores.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Função / Perfil</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Condição</th>
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, index) => {
                    const isExtraUser = index >= maxUsers && u.isActive;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 text-xs">{u.fullName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {getRoleBadge(u.role)}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Suspenso
                            </span>
                          )}
                          {u.mustChangePassword && (
                            <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                              1º Acesso Pendente
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isExtraUser ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
                              Extra (+ R$ {extraUserPrice.toFixed(2).replace('.', ',')}/mês)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              Incluso no Plano
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResettingUserId(u.id);
                                setResetTempPassword('PlanejaFacil2026!');
                              }}
                              title="Redefinir senha provisória"
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Resetar Senha</span>
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={u.isActive ? 'Suspender acesso' : 'Reativar acesso'}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                u.isActive 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {u.isActive ? (
                                <>
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Suspender</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Reativar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Acessos adicionais são somados automaticamente na fatura mensal do lojista.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
};
