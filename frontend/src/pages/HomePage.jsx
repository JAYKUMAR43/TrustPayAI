import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNavbar } from '../components/layout/TopNavbar';
import { AIChatAssistant } from '../components/chat/AIChatAssistant';
import { PurchaseHistoryPage } from '../components/pages/PurchaseHistoryPage';
import { OrganizationSettingsPage } from '../components/pages/OrganizationSettingsPage';

// Admin & Developer Protected Area
import { OverviewDashboard } from '../components/pages/OverviewDashboard';
import { ProcurementConsole } from '../components/pages/ProcurementConsole';
import { AgentManagement } from '../components/pages/AgentManagement';
import { PolicyManagement } from '../components/pages/PolicyManagement';
import { SecurityCenter } from '../components/pages/SecurityCenter';
import { MandateManagement } from '../components/pages/MandateManagement';
import { PayPalTransactions } from '../components/pages/PayPalTransactions';
import { AuditLogs } from '../components/pages/AuditLogs';
import { TransactionDetailsDrawer } from '../components/common/TransactionDetailsDrawer';

import { fetchStats, fetchCurrentOrganization, getStoredRole, setStoredRole } from '../api';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'assistant';
  });

  const [activeRole, setActiveRole] = useState(() => {
    return getStoredRole() || 'ORG_ADMIN';
  });

  const [activeOrg, setActiveOrg] = useState(null);
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  // Light theme by default
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('trustpay_theme') === 'dark';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setCurrentTab(hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelectTab = (tab) => {
    setCurrentTab(tab);
    window.location.hash = tab;
  };

  const handleChangeRole = (newRole) => {
    setActiveRole(newRole);
    setStoredRole(newRole);
  };

  // RBAC permission check for administrative tabs
  const tabPermissions = {
    assistant: ['INDIVIDUAL', 'EMPLOYEE', 'APPROVER', 'ORG_ADMIN', 'SECURITY_ADMIN', 'DEVELOPER', 'OWNER', 'ADMIN'],
    history: ['INDIVIDUAL', 'EMPLOYEE', 'APPROVER', 'ORG_ADMIN', 'SECURITY_ADMIN', 'DEVELOPER', 'OWNER', 'ADMIN'],
    settings: ['INDIVIDUAL', 'EMPLOYEE', 'APPROVER', 'ORG_ADMIN', 'SECURITY_ADMIN', 'DEVELOPER', 'OWNER', 'ADMIN'],
    overview: ['ORG_ADMIN', 'OWNER', 'ADMIN'],
    policies: ['ORG_ADMIN', 'OWNER', 'ADMIN'],
    security: ['SECURITY_ADMIN', 'OWNER', 'ADMIN'],
    mandates: ['SECURITY_ADMIN', 'OWNER', 'ADMIN'],
    audit: ['SECURITY_ADMIN', 'OWNER', 'ADMIN'],
    console: ['DEVELOPER', 'OWNER', 'ADMIN'],
    agents: ['DEVELOPER', 'OWNER', 'ADMIN'],
    payments: ['DEVELOPER', 'OWNER', 'ADMIN']
  };

  const allowedRolesForTab = tabPermissions[currentTab] || ['ORG_ADMIN', 'OWNER', 'ADMIN'];
  const hasAccess = allowedRolesForTab.includes(activeRole);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('trustpay_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('trustpay_theme', 'light');
    }
  }, [isDarkMode]);

  async function loadInitialData() {
    setIsRefreshing(true);
    try {
      const [statsData, orgData] = await Promise.all([
        fetchStats().catch(() => null),
        fetchCurrentOrganization().catch(() => null)
      ]);
      if (statsData) setStats(statsData);
      if (orgData) setActiveOrg(orgData);
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  const pageHeaders = {
    assistant: {
      title: 'AI Procurement Assistant',
      subtitle: 'Natural-language purchasing powered by zero-trust cryptographic guardrails'
    },
    history: {
      title: 'Purchase History',
      subtitle: 'Immutable record of autonomous agent purchases, policy validations, and PayPal settlements'
    },
    settings: {
      title: 'Workspace & Organization Settings',
      subtitle: 'Manage multi-tenant workspaces, spending governance caps, and payment rails'
    },
    // Admin / Developer section headers
    overview: {
      title: 'Telemetry & Financial Metrics',
      subtitle: 'Global spending volume, active agent fleet, and real-time security events'
    },
    console: {
      title: 'Interactive Guardrail Testbed',
      subtitle: 'Developer workspace for testing adversarial scenarios and guardrails'
    },
    agents: {
      title: 'Autonomous Agent Fleet',
      subtitle: 'Register and govern AI agent spending limits and taxonomy scopes'
    },
    policies: {
      title: 'Spending Policy Management',
      subtitle: 'Deterministic 10-vector security rules and spending caps'
    },
    security: {
      title: 'Security Command Center',
      subtitle: 'Prompt injection threats, budget manipulation, and quarantine events'
    },
    mandates: {
      title: 'Cryptographic Mandate Engine',
      subtitle: 'HMAC-SHA256 authorization tokens, single-use nonces, and tamper checks'
    },
    payments: {
      title: 'PayPal Sandbox Transactions',
      subtitle: 'Official PayPal Orders v2 captures, buyer approvals, and settlements'
    },
    audit: {
      title: 'Cryptographic Audit Ledger',
      subtitle: 'Immutable SHA-256 hash-chained transaction custody blocks'
    }
  };

  const headerInfo = pageHeaders[currentTab] || pageHeaders.assistant;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] dark:bg-[#0B0F19] text-[#111827] dark:text-[#F3F4F6] font-sans antialiased transition-colors">
      {/* Minimal Simplified Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        stats={stats}
        activeOrg={activeOrg}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        activeRole={activeRole}
      />

      {/* Main Experience Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={loadInitialData}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          activeRole={activeRole}
          onChangeRole={handleChangeRole}
        />

        <main className="flex-1 overflow-y-auto">
          {!hasAccess ? (
            <div className="max-w-xl mx-auto mt-16 p-8 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl shadow-xs text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#111827] dark:text-[#F9FAFB] mb-2">
                Protected Administrative Workspace
              </h2>
              <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] mb-6 leading-relaxed">
                The <span className="font-semibold text-[#111827] dark:text-white capitalize">{currentTab}</span> workspace requires administrative privileges.
                Your current role is <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeRole}</span>.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleSelectTab('assistant')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F3F4F6] dark:bg-[#1F2937] text-sm font-medium text-[#374151] dark:text-[#D1D5DB] hover:bg-[#E5E7EB] dark:hover:bg-[#374151] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to AI Assistant
                </button>
                <button
                  onClick={() => handleChangeRole(allowedRolesForTab[0] || 'ORG_ADMIN')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-medium text-white transition-colors cursor-pointer shadow-xs"
                >
                  Switch to {allowedRolesForTab[0] || 'ORG_ADMIN'} Role
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Primary User Experience */}
              {currentTab === 'assistant' && (
                <AIChatAssistant
                  activeOrg={activeOrg}
                  onRefreshStats={loadInitialData}
                />
              )}

              {currentTab === 'history' && (
                <PurchaseHistoryPage
                  onOpenDetails={(id) => setSelectedTransactionId(id)}
                />
              )}

              {currentTab === 'settings' && (
                <OrganizationSettingsPage
                  onOrgUpdated={(org) => setActiveOrg(org)}
                />
              )}

              {/* Admin & Developer Protected Area */}
              {currentTab === 'overview' && (
                <OverviewDashboard onNavigateTo={handleSelectTab} />
              )}

              {currentTab === 'console' && (
                <ProcurementConsole onRefreshStats={loadInitialData} />
              )}

              {currentTab === 'agents' && <AgentManagement />}

              {currentTab === 'policies' && <PolicyManagement />}

              {currentTab === 'security' && <SecurityCenter />}

              {currentTab === 'mandates' && <MandateManagement />}

              {currentTab === 'payments' && <PayPalTransactions />}

              {currentTab === 'audit' && <AuditLogs />}
            </>
          )}
        </main>
      </div>

      {/* Transaction Details Inspector Drawer */}
      {selectedTransactionId && (
        <TransactionDetailsDrawer
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
        />
      )}
    </div>
  );
}
