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

import { fetchStats, fetchCurrentOrganization } from '../api';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'assistant';
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
    <div className="flex min-h-screen bg-[#F9FAFB] text-[#111827] font-sans antialiased">
      {/* Minimal Simplified Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        stats={stats}
        activeOrg={activeOrg}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
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
        />

        <main className="flex-1 overflow-y-auto">
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
