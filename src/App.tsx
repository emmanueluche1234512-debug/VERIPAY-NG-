import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './views/public/LandingPage';
import { SignIn } from './views/auth/SignIn';
import { SignUp } from './views/auth/SignUp';
import { ForgotPassword } from './views/auth/ForgotPassword';
import { ResetPassword } from './views/auth/ResetPassword';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './views/dashboard/DashboardOverview';
import { ProjectsView } from './views/dashboard/ProjectsView';
import { OrdersView } from './views/dashboard/OrdersView';
import { TransactionsView } from './views/dashboard/TransactionsView';
import { ManualReviewView } from './views/dashboard/ManualReviewView';
import { IntegrationsView } from './views/dashboard/IntegrationsView';
import { ApiKeysView } from './views/dashboard/ApiKeysView';
import { WebhooksView } from './views/dashboard/WebhooksView';
import { NotificationsView } from './views/dashboard/NotificationsView';
import { DocumentationView } from './views/dashboard/DocumentationView';
import { SettingsView } from './views/dashboard/SettingsView';
import { MerchantAdminView } from './views/dashboard/MerchantAdminView';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-md bg-[#0B0D11] text-white flex items-center justify-center font-bold text-sm tracking-wider animate-pulse">
        VP
      </div>
      <span className="text-base font-bold tracking-tight text-[#0B0D11]">
        VERIPAY NG
      </span>
    </div>
    <div className="flex items-center gap-2 text-xs font-mono text-[#6C757D]">
      <svg className="animate-spin h-3.5 w-3.5 text-[#0B0D11]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Restoring secure session...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { currentRoute, activeProject, isAuthLoading, navigate } = useApp();
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  // While Supabase restores session, show brand loading state
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // Route Dispatcher
  switch (currentRoute) {
    case '/':
      return <LandingPage />;

    case '/signin':
      return <SignIn />;

    case '/signup':
      return <SignUp />;

    case '/forgot-password':
      return <ForgotPassword />;

    case '/reset-password':
      return <ResetPassword />;

    case '/dashboard':
      return (
        <DashboardLayout
          title="Dashboard Overview"
          breadcrumbs={['Stores', activeProject?.name || 'Overview']}
        >
          <DashboardOverview
            onOpenCreateOrder={() => {
              navigate('/orders');
              setIsCreateOrderModalOpen(true);
            }}
            onOpenCreateProject={() => navigate('/projects')}
          />
        </DashboardLayout>
      );

    case '/projects':
      return (
        <DashboardLayout
          title="Projects & Stores"
          breadcrumbs={['Settings', 'Projects']}
        >
          <ProjectsView />
        </DashboardLayout>
      );

    case '/orders':
      return (
        <DashboardLayout
          title="Orders"
          breadcrumbs={[activeProject?.name || 'Store', 'Orders']}
        >
          <OrdersView 
            isCreateModalOpen={isCreateOrderModalOpen}
            onCloseCreateModal={() => setIsCreateOrderModalOpen(false)}
            onOpenCreateModal={() => setIsCreateOrderModalOpen(true)}
          />
        </DashboardLayout>
      );

    case '/transactions':
      return (
        <DashboardLayout
          title="Bank Transactions"
          breadcrumbs={[activeProject?.name || 'Store', 'Transactions']}
        >
          <TransactionsView />
        </DashboardLayout>
      );

    case '/manual-review':
      return (
        <DashboardLayout
          title="Manual Review Queue"
          breadcrumbs={[activeProject?.name || 'Store', 'Manual Review']}
        >
          <ManualReviewView />
        </DashboardLayout>
      );

    case '/integrations':
      return (
        <DashboardLayout
          title="Integrations & Channels"
          breadcrumbs={[activeProject?.name || 'Store', 'Integrations']}
        >
          <IntegrationsView />
        </DashboardLayout>
      );

    case '/api-keys':
      return (
        <DashboardLayout
          title="API Keys"
          breadcrumbs={[activeProject?.name || 'Store', 'API Keys']}
        >
          <ApiKeysView />
        </DashboardLayout>
      );

    case '/webhooks':
      return (
        <DashboardLayout
          title="Webhook Endpoints"
          breadcrumbs={[activeProject?.name || 'Store', 'Webhooks']}
        >
          <WebhooksView />
        </DashboardLayout>
      );

    case '/notifications':
      return (
        <DashboardLayout
          title="Notifications"
          breadcrumbs={[activeProject?.name || 'Store', 'Notifications']}
        >
          <NotificationsView />
        </DashboardLayout>
      );

    case '/docs':
      return (
        <DashboardLayout
          title="Developer Documentation"
          breadcrumbs={['Resources', 'API Docs']}
        >
          <DocumentationView />
        </DashboardLayout>
      );

    case '/settings':
      return (
        <DashboardLayout
          title="Settings"
          breadcrumbs={[activeProject?.name || 'Store', 'Settings']}
        >
          <SettingsView />
        </DashboardLayout>
      );

    case '/merchant-admin':
      return (
        <DashboardLayout
          title="Merchant Admin Integration"
          breadcrumbs={['Integration', 'Merchant Admin']}
        >
          <MerchantAdminView />
        </DashboardLayout>
      );

    default:
      return <LandingPage />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
