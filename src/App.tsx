import React from 'react';
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

const MainContent: React.FC = () => {
  const { role, consumerTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-slate-800 antialiased selection:bg-brand-600 selection:text-white">
      <Navbar />

      <div className="flex-1">
        {role === 'consumer' && (
          <main>
            {consumerTab === 'landing' ? <LandingPage /> : <SimulatorWizard />}
            <LeadCaptureModal />
            <MobileBottomNav />
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

      {role === 'consumer' && <Footer />}
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
