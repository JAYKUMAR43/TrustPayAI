import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNavbar } from '../components/layout/TopNavbar';
import { OverviewDashboard } from '../components/pages/OverviewDashboard';
import { ProcurementConsole } from '../components/pages/ProcurementConsole';
import { AgentManagement } from '../components/pages/AgentManagement';
import { PolicyManagement } from '../components/pages/PolicyManagement';
import { SecurityCenter } from '../components/pages/SecurityCenter';
import { MandateManagement } from '../components/pages/MandateManagement';
import { PayPalTransactions } from '../components/pages/PayPalTransactions';
import { RiskIntelligence } from '../components/pages/RiskIntelligence';
import { AuditLogs } from '../components/pages/AuditLogs';
import { SettingsPage } from '../components/pages/SettingsPage';
import { fetchStats } from '../api';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'overview';
  });
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  async function refreshStats() {
    setIsRefreshing(true);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (e) {
      console.error('Error refreshing stats:', e);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refreshStats();
  }, []);

  const pageHeaders = {
    overview: { title: 'Financial Security Overview', subtitle: 'Global telemetry and real-time autonomous agent spending control' },
    console: { title: 'AI Procurement Console', subtitle: 'Natural-language purchase proposal and multi-step policy evaluation workspace' },
    agents: { title: 'Autonomous Agent Fleet', subtitle: 'Register and govern AI agent spending limits and taxonomy scopes' },
    policies: { title: 'Spending Policy Management', subtitle: 'Hard financial limits, category constraints, and approval rules' },
    security: { title: 'Security Command Center', subtitle: 'Prompt injection threats, price anomalies, and quarantine events' },
    mandates: { title: 'Cryptographic Mandate Engine', subtitle: 'HMAC-SHA256 authorization tokens, single-use nonces, and tamper checks' },
    payments: { title: 'PayPal Sandbox Transactions', subtitle: 'Official PayPal Orders v2 captures, buyer approvals, and settlements' },
    risk: { title: 'Risk Intelligence', subtitle: 'Dynamic scoring, spending velocity checks, and merchant verification' },
    audit: { title: 'Cryptographic Audit Ledger', subtitle: 'Immutable SHA-256 hash-chained transaction custody logs' },
    settings: { title: 'Enterprise Control Settings', subtitle: 'System infrastructure, PayPal Sandbox mode, and official MCP server' }
  };

  const headerInfo = pageHeaders[currentTab] || pageHeaders.overview;

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] dark:bg-[#101828] text-[#172033] dark:text-[#F2F4F7] font-sans transition-colors">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        stats={stats}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={refreshStats}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && <OverviewDashboard onNavigateTo={setCurrentTab} />}
          {currentTab === 'console' && <ProcurementConsole onRefreshStats={refreshStats} />}
          {currentTab === 'agents' && <AgentManagement />}
          {currentTab === 'policies' && <PolicyManagement />}
          {currentTab === 'security' && <SecurityCenter />}
          {currentTab === 'mandates' && <MandateManagement />}
          {currentTab === 'payments' && <PayPalTransactions />}
          {currentTab === 'risk' && <RiskIntelligence />}
          {currentTab === 'audit' && <AuditLogs />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
