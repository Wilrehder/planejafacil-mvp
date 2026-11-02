import React, { useState } from 'react';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Store,
  ArrowRight
} from 'lucide-react';
import { signInUser, sendPasswordResetEmail, AuthenticatedUserContext } from '../../lib/authService';
import { Logo } from '../common/Logo';

interface PainelLoginPageProps {
  onSuccess: (context: AuthenticatedUserContext) => void;
}

export const PainelLoginPage: React.FC<PainelLoginPageProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const { context } = await signInUser(email, password);
      if (context) {
        onSuccess(context);
      } else {
        throw new Error('Não foi possível identificar o perfil de usuário.');
      }
    } catch (err: any) {
      console.error('[PainelLoginPage] Erro de autenticação:', err);
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
      console.error('[PainelLoginPage] Erro ao recuperar senha:', err);
      setErrorMessage(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#1B2B48] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800">
      
      {/* Container Central */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header com Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="md" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1B2B48] tracking-tight">
              Portal do Parceiro & Gestão
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              painel.useplanejafacil.com
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#439346]" />
            <span>Ambiente Exclusivo para Lojistas e Admins</span>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMessage && (
          <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário de Login */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@loja.com.br"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorMessage(null);
                  }}
                  className="text-xs font-bold text-[#439346] hover:text-[#387F3B] hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#439346] focus:ring-2 focus:ring-[#439346]/20 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#439346] hover:bg-[#387F3B] text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login</span>
            </button>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail para Redefinição
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@loja.com.br"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#439346]"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#1B2B48] hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Enviar Link de Redefinição</span>
              )}
            </button>
          </form>
        )}

        {/* Rodapé do Login */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <a
            href="https://www.useplanejafacil.com"
            className="text-[11px] font-extrabold text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1"
          >
            <span>← Voltar ao site do cliente consumidor</span>
          </a>
        </div>
      </div>
    </div>
  );
};
