import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { completePasswordChange } from '../../lib/authService';

interface MustChangePasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({ isOpen, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação não coincide com a nova senha digitada.');
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordChange(newPassword);
      onSuccess();
    } catch (err: any) {
      console.error('[MustChangePasswordModal] Erro ao atualizar senha:', err);
      setErrorMessage(err.message || 'Erro ao definir nova senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 text-left">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Defina sua Senha Pessoal
          </h2>
          <p className="text-xs text-slate-500">
            Você está utilizando uma senha provisória de primeiro acesso. Por segurança, crie sua senha definitiva para continuar.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nova Senha Pessoal *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#439346] bg-slate-50/50"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirme a Nova Senha *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#439346] bg-slate-50/50"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-bold text-slate-700">Critérios de Segurança:</div>
            <div>• Pelo menos 8 caracteres</div>
            <div>• Não reutilize senhas simples ou sequenciais</div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-emerald-glow transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Salvando nova senha...</span>
              </>
            ) : (
              <span>Ativar Senha e Continuar</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
