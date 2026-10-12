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
  X 
} from 'lucide-react';
import { 
  listStoreUsers, 
  createStoreUser, 
  toggleUserStatus, 
  resetUserPassword, 
  StoreUserSummary 
} from '../../lib/authService';
import { STORE_ID_TO_TENANT_UUID } from '../../lib/crmService';

interface StoreUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    id: string;
    name: string;
    city: string;
  };
}

export const StoreUsersModal: React.FC<StoreUsersModalProps> = ({ isOpen, onClose, store }) => {
  const [users, setUsers] = useState<StoreUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New user form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'store_owner' | 'store_operator'>('store_operator');
  const [newTempPassword, setNewTempPassword] = useState('PlanejaFacil2026!');

  // Reset password state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetTempPassword, setResetTempPassword] = useState('PlanejaFacil2026!');

  const tenantUuid = STORE_ID_TO_TENANT_UUID[store.id] || store.id;

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await listStoreUsers(tenantUuid);
      setUsers(data);
    } catch (err: any) {
      console.error('[StoreUsersModal] Erro ao carregar usuários:', err);
      setErrorMessage(err.message || 'Erro ao consultar usuários da loja.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, store.id]);

  if (!isOpen) return null;

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createStoreUser({
        tenantId: tenantUuid,
        email: newEmail,
        fullName: newName,
        role: newRole,
        tempPassword: newTempPassword,
      });
      setSuccessMessage(`Usuário ${newName} provisionado com sucesso para ${store.name}.`);
      setIsAddingUser(false);
      setNewEmail('');
      setNewName('');
      loadUsers();
    } catch (err: any) {
      console.error('[StoreUsersModal] Erro ao criar usuário:', err);
      setErrorMessage(err.message || 'Erro ao provisionar usuário.');
    }
  };

  const handleToggleStatus = async (user: StoreUserSummary) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextStatus = !user.isActive;
      await toggleUserStatus(user.id, nextStatus);
      setSuccessMessage(`Acesso de ${user.fullName} ${nextStatus ? 'reativado' : 'suspenso'}.`);
      loadUsers();
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
      setSuccessMessage('Senha temporária redefinida com sucesso. O lojista deverá alterá-la no próximo acesso.');
      setResettingUserId(null);
      loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 my-8 text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#439346] uppercase mb-1">
            <Users className="w-4 h-4" />
            <span>Gestão de Acessos & Operadores</span>
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Usuários Vinculados — {store.name}
          </h3>
          <p className="text-xs text-slate-500">
            Gerencie proprietários e operadores com acesso aos módulos de CRM, ERP e propostas desta loja.
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-bold text-slate-700">
            {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
          </div>

          {!isAddingUser && (
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#439346] border border-emerald-200 text-xs font-extrabold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Convidar / Adicionar Operador</span>
            </button>
          )}
        </div>

        {/* FORM: ADD NEW STORE USER */}
        {isAddingUser && (
          <form onSubmit={handleCreateUserSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase">Novo Acesso para {store.name}</span>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Roberto Gerente"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#439346]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="roberto@loja.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#439346]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Papel / Função *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#439346]"
                >
                  <option value="store_operator">Operador / Vendedor (Acesso Comercial)</option>
                  <option value="store_owner">Proprietário / Gerente Geral (Acesso Total)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Senha Inicial Provisória *</label>
                <input
                  type="text"
                  required
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-[#439346]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#439346] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              Criar Acesso e Vincular à Loja
            </button>
          </form>
        )}

        {/* MODAL: RESET PASSWORD */}
        {resettingUserId && (
          <form onSubmit={handleResetPasswordSubmit} className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase">Redefinir Senha do Usuário</span>
              <button
                type="button"
                onClick={() => setResettingUserId(null)}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold"
              >
                Cancelar
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Nova Senha Temporária *</label>
              <input
                type="text"
                required
                value={resetTempPassword}
                onChange={(e) => setResetTempPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              Salvar Nova Senha Temporária
            </button>
          </form>
        )}

        {/* USERS LIST */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Carregando usuários vinculados...
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
            Nenhum usuário associado diretamente a esta loja. Use o botão acima para adicionar o primeiro responsável.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
            {users.map((u) => (
              <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900">{u.fullName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'store_owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role === 'store_owner' ? 'Dono da Loja' : 'Operador'}
                    </span>
                    {!u.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                        Inativo
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        Primeiro Acesso Pendente
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setResettingUserId(u.id);
                      setResetTempPassword('PlanejaFacil2026!');
                    }}
                    title="Redefinir senha provisória"
                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition-colors flex items-center space-x-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resetar Senha</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(u)}
                    title={u.isActive ? 'Desativar acesso' : 'Reativar acesso'}
                    className={`p-1.5 rounded-lg border text-[10px] font-bold transition-colors flex items-center space-x-1 ${
                      u.isActive 
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
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
