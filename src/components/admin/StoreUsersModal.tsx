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
  Info
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

  const isLimitReached = activeUsersCount >= maxUsers;

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setErrorMessage(`Limite de ${maxUsers} usuário(s) atingido para esta loja no Plano ${planTier.toUpperCase()}.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmittingUser(true);

    try {
      await createStoreUser({
        tenantId: tenantUuid,
        email: newEmail.trim().toLowerCase(),
        fullName: newName.trim(),
        role: newRole,
        tempPassword: newTempPassword,
      });
      setSuccessMessage(`Usuário "${newName}" adicionado com sucesso.`);
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 flex items-center gap-1">
            <User className="w-3 h-3" /> Gerente / Dono
          </span>
        );
      case 'store_assembler':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
            <Wrench className="w-3 h-3" /> Montador
          </span>
        );
      case 'store_operator':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Vendedor
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5 my-8 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase mb-1">
            <Users className="w-4 h-4" />
            <span>Controle de Acessos & Equipe</span>
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Usuários Vinculados — {store.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gerencie os acessos de Gerente, Vendedor e Montador autorizados a acessar o portal da loja.
          </p>
        </div>

        {/* Quota Bar (Limite de Acessos por Plano) */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isLimitReached 
            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                Acessos da Loja: {activeUsersCount} de {maxUsers} utilizados
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                planTier === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-800'
              }`}>
                Plano {planTier.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {planTier === 'basic' 
                ? 'Plano Básico permite 1 acesso (Gerente). O Plano Pro libera até 3 acessos (Gerente, Vendedor e Montador).'
                : 'Plano Pro permite até 3 acessos simultâneos divididos entre Gerente, Vendedor e Montador.'}
            </p>
          </div>

          {!isAddingUser && (
            <button
              onClick={() => setIsAddingUser(true)}
              disabled={isLimitReached}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                isLimitReached
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Membro</span>
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ADD USER FORM */}
        {isAddingUser && (
          <form onSubmit={handleCreateUserSubmit} className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                Cadastrar Novo Usuário da Loja
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="joao@marcenaria.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Função / Perfil *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StoreUserRole)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="store_owner">Gerente / Dono da Loja (Acesso Total)</option>
                  <option value="store_operator">Vendedor (CRM de Leads & Propostas)</option>
                  <option value="store_assembler">Montador (ERP de Produção & Montagem)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Senha Temporária Inicial *</label>
                <input
                  type="text"
                  required
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isSubmittingUser}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmittingUser ? 'Criando...' : 'Salvar e Conceder Acesso'}
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD INLINE FORM */}
        {resettingUserId && (
          <form onSubmit={handleResetPasswordSubmit} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                Redefinir Senha Provisória
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
              <label className="block text-[11px] font-bold text-amber-800 mb-1">Nova Senha Temporária *</label>
              <input
                type="text"
                required
                value={resetTempPassword}
                onChange={(e) => setResetTempPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Confirmar Nova Senha
            </button>
          </form>
        )}

        {/* USERS LIST */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto mb-2" />
            Carregando usuários vinculados...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
            Nenhum usuário cadastrado para esta loja ainda. Clique em "Adicionar Membro" para cadastrar o primeiro acesso.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
            {users.map((u) => (
              <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{u.fullName}</span>
                    {getRoleBadge(u.role)}
                    {!u.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        Inativo
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        1º Acesso Pendente
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setResettingUserId(u.id);
                      setResetTempPassword('PlanejaFacil2026!');
                    }}
                    title="Redefinir senha provisória"
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resetar Senha</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(u)}
                    title={u.isActive ? 'Desativar acesso' : 'Reativar acesso'}
                    className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                      u.isActive 
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {u.isActive ? (
                      <>
                        <UserMinus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Desativar</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reativar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
