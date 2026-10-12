import React, { useState } from 'react';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Store, 
  X 
} from 'lucide-react';
import { signInUser, sendPasswordResetEmail, AuthenticatedUserContext } from '../../lib/authService';
import { Logo } from '../common/Logo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (context: AuthenticatedUserContext) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { context } = await signInUser(email, password);
      if (context) {
        onSuccess(context);
        onClose();
      } else {
        throw new Error('Não foi possível identificar o perfil de usuário.');
      }
    } catch (err: any) {
      console.error('[LoginModal] Erro de autenticação:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (err.message?.includes('Email not confirmed')) {
        setErrorMessage('E-mail pendente de confirmação.');
      } else {
        setErrorMessage(err.message || 'Erro ao efetuar login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setSuccessMessage(`Enviamos instruções de redefinição de senha para o e-mail: ${email}`);
    } catch (err: any) {
      console.error('[LoginModal] Erro ao recuperar senha:', err);
      setErrorMessage(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('PlanejaFacil2026!');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Logo variant="light" size="md" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'Acesso ao PlanejaFácil' : 'Recuperação de Senha'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {mode === 'login' 
              ? 'Portal exclusivo para lojistas parceiros e administração da plataforma.'
              : 'Informe seu e-mail cadastrado para receber o link seguro de redefinição.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@loja.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#439346] bg-slate-50/50"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-bold text-[#439346] hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#439346] bg-slate-50/50"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-emerald-glow transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Seu E-mail Cadastrado
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@loja.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#439346] bg-slate-50/50"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-emerald-glow transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando link...</span>
                  </>
                ) : (
                  <span>Enviar Link de Recuperação</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase transition-colors flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para o Login</span>
              </button>
            </div>
          </form>
        )}

        {/* Homologation Quick-fill Buttons */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Atalhos de Acesso Rápido (Homologação)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@planejafacil.com.br')}
              className="px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-700 transition-colors flex items-center justify-center space-x-1"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('dono.suzano@loja.com')}
              className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Store className="w-3 h-3" />
              <span>Suzano</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('dono.mogi@loja.com')}
              className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Store className="w-3 h-3" />
              <span>Mogi</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
