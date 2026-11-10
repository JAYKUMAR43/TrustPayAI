import React, { useState } from 'react';
import {
  Sparkles,
  Package,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Bot,
  Sliders,
  ShieldAlert,
  KeyRound,
  CreditCard,
  FileText,
  X,
  Building2,
  Lock,
  Terminal,
  User
} from 'lucide-react';

export function Sidebar({
  currentTab,
  onSelectTab,
  stats,
  activeOrg,
  mobileOpen = false,
  onCloseMobile,
  activeRole = 'ORG_ADMIN'
}) {
  const [adminOpen, setAdminOpen] = useState(true);

  // 1. Primary Navigation (Mandatory: ONLY AI Assistant, Purchase History, Settings)
  const primaryNavItems = [
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Active' },
    { id: 'history', label: 'Purchase History', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // 2. Role-Partitioned Protected Administrative Workspaces
  const isOrgAdmin = ['ORG_ADMIN', 'OWNER', 'ADMIN'].includes(activeRole);
  const isSecAdmin = ['SECURITY_ADMIN', 'OWNER'].includes(activeRole);
  const isDeveloper = ['DEVELOPER', 'OWNER'].includes(activeRole);
  const hasAnyAdminAccess = isOrgAdmin || isSecAdmin || isDeveloper;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#111827] border-r border-[#E5E7EB] dark:border-[#1F2937] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Top Brand Header */}
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#1F2937] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                  TRUSTPAY{' '}
                  <span className="text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 border border-[#DBEAFE] dark:border-[#1E40AF]">
                    AI
                  </span>
                </div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">
                  Zero-Trust Procurement
                </div>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="md:hidden p-1 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Active Workspace / Account Pill */}
          <div className="mx-3.5 mt-3 p-2.5 rounded-lg bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#1F2937] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              {activeRole === 'INDIVIDUAL' ? (
                <User className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
              )}
              <span className="font-medium text-[#111827] dark:text-[#F9FAFB] truncate text-[11px]">
                {activeRole === 'INDIVIDUAL'
                  ? 'Personal Account'
                  : activeOrg?.name || 'Acme Global Engineering'}
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#1E40AF] shrink-0">
              {activeOrg?.environment === 'live' ? 'Live' : 'Sandbox'}
            </span>
          </div>

          {/* Primary Navigation — ONLY AI Assistant, Purchase History, Settings */}
          <div className="p-3 space-y-1">
            <div className="text-[10px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider px-2.5 py-1">
              Procurement Experience
            </div>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] dark:text-[#60A5FA]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Protected Administrative Workspaces (Partitioned by Role) */}
          {hasAnyAdminAccess && (
            <div className="px-3 pt-2 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between px-2.5 py-1 text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span className="text-[10px] uppercase tracking-wider font-bold">
                    Protected Workspaces
                  </span>
                </div>
              </div>

              {/* A. Organization Admin Workspace */}
              {isOrgAdmin && (
                <div className="space-y-0.5 pl-1 border-l-2 border-[#2563EB]/40 ml-2">
                  <div className="text-[10px] uppercase font-bold text-[#2563EB] dark:text-[#60A5FA] px-2 py-0.5">
                    Organization Admin
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('overview');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'overview'
                        ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] dark:text-[#60A5FA] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span className="truncate">Overview Metrics</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('policies');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'policies'
                        ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/30 text-[#2563EB] dark:text-[#60A5FA] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="truncate">Policy Configuration</span>
                    </div>
                  </button>
                </div>
              )}

              {/* B. Security Admin Workspace */}
              {isSecAdmin && (
                <div className="space-y-0.5 pl-1 border-l-2 border-[#DB2777]/40 ml-2">
                  <div className="text-[10px] uppercase font-bold text-[#DB2777] dark:text-[#F472B6] px-2 py-0.5">
                    Security Command Center
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('audit');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'audit'
                        ? 'bg-[#FDF2F8] dark:bg-[#831843]/30 text-[#DB2777] dark:text-[#F472B6] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">Audit Ledger</span>
                    </div>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#EFF6FF] text-[#2563EB] font-mono">
                      SHA-256
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('security');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'security'
                        ? 'bg-[#FDF2F8] dark:bg-[#831843]/30 text-[#DB2777] dark:text-[#F472B6] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span className="truncate">Threat Interceptor</span>
                    </div>
                    {stats?.blocked_attacks > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FEE2E2] text-[#DC2626] font-semibold">
                        {stats.blocked_attacks} Blocked
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('mandates');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'mandates'
                        ? 'bg-[#FDF2F8] dark:bg-[#831843]/30 text-[#DB2777] dark:text-[#F472B6] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span className="truncate">Mandate Logs</span>
                    </div>
                  </button>
                </div>
              )}

              {/* C. Developer Workspace */}
              {isDeveloper && (
                <div className="space-y-0.5 pl-1 border-l-2 border-[#059669]/40 ml-2">
                  <div className="text-[10px] uppercase font-bold text-[#059669] dark:text-[#6EE7B7] px-2 py-0.5">
                    Developer Workspace
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('console');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'console'
                        ? 'bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#059669] dark:text-[#6EE7B7] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Terminal className="w-3.5 h-3.5" />
                      <span className="truncate">Guardrail Testbed</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('agents');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'agents'
                        ? 'bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#059669] dark:text-[#6EE7B7] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Bot className="w-3.5 h-3.5" />
                      <span className="truncate">Agent Fleet</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('payments');
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentTab === 'payments'
                        ? 'bg-[#ECFDF5] dark:bg-[#064E3B]/30 text-[#059669] dark:text-[#6EE7B7] font-semibold'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="truncate">PayPal Orders v2</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Security Assurance Badge */}
          <div className="p-3.5 border-t border-[#E5E7EB] dark:border-[#1F2937] bg-[#F9FAFB] dark:bg-[#111827] mt-auto">
            <div className="flex items-center space-x-2 text-xs text-[#15803D] dark:text-[#4ADE80]">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="font-semibold text-[11px]">HMAC Engine Active</span>
            </div>
            <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Deterministic 10-Vector Policy Shield
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
