import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LandingPage } from './components/consumer/LandingPage';
import { LeadCaptureModal } from './components/consumer/LeadCaptureModal';
import { SimulatorWizard } from './components/consumer/SimulatorWizard';
import { Footer } from './components/layout/Footer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Navbar } from './components/layout/Navbar';
import { LeadDetailDrawer } from './components/merchant/LeadDetailDrawer';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { AppProvider, useApp } from './context/AppContext';

import { LoginModal } from './components/auth/LoginModal';
import { MustChangePasswordModal } from './components/auth/MustChangePasswordModal';
import { PainelLoginPage } from './components/auth/PainelLoginPage';
import { ContractSigningView } from './components/consumer/ContractSigningView';

const isPainelDomainOrPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    host.startsWith('painel.') ||
    host.startsWith('app.') ||
    path.startsWith('/painel') ||
    path.startsWith('/login')
  );
};

const MainContent: React.FC = () => {
  const { 
    role, 
    consumerTab, 
    isLoginModalOpen, 
    setIsLoginModalOpen, 
    isMustChangePasswordOpen, 
    setIsMustChangePasswordOpen,
    loginSuccess,
    currentUser
  } = useApp();

  const [isPainelEnv, setIsPainelEnv] = useState<boolean>(isPainelDomainOrPath());
  const [signToken, setSignToken] = useState<string | null>(null);

  useEffect(() => {
    setIsPainelEnv(isPainelDomainOrPath());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('sign_token');
      if (token) setSignToken(token);
    }
  }, []);

  // Se o cliente estiver acessando o link seguro de assinatura digital do contrato:
  if (signToken) {
    return (
      <ContractSigningView 
        token={signToken} 
        onClose={() => { 
          window.location.href = window.location.pathname; 
        }} 
      />
    );
  }

  // Se o usuário acessar via painel.useplanejafacil.com ou /painel ou /login e não estiver autenticado:
  if (isPainelEnv && !currentUser && role === 'consumer') {
    return (
      <PainelLoginPage
        onSuccess={(context) => {
          loginSuccess(context);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-slate-800 antialiased selection:bg-brand-600 selection:text-white">
      <Navbar />

      <div className="flex-1">
        {role === 'consumer' && (
          <main className={consumerTab === 'simulator' ? 'pb-24' : ''}>
            {consumerTab === 'landing' ? <LandingPage /> : <SimulatorWizard />}
            <LeadCaptureModal />
            {consumerTab !== 'simulator' && <MobileBottomNav />}
          </main>
        )}

        {role === 'merchant' && <MerchantDashboard />}

        {role === 'admin' && (
          <>
            <AdminDashboard />
            <LeadDetailDrawer />
          </>
        )}
      </div>

      {role === 'consumer' && consumerTab !== 'simulator' && <Footer />}

      {/* Official Auth Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(context) => loginSuccess(context)}
      />

      <MustChangePasswordModal
        isOpen={isMustChangePasswordOpen}
        onSuccess={() => setIsMustChangePasswordOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
