import React, { useState, useEffect } from 'react';
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
  Lock
} from 'lucide-react';

export function Sidebar({
  currentTab,
  onSelectTab,
  stats,
  activeOrg,
  mobileOpen = false,
  onCloseMobile
}) {
  const [adminOpen, setAdminOpen] = useState(() => {
    // Keep open if user navigated to an admin tab directly
    return ['overview', 'agents', 'policies', 'security', 'mandates', 'payments', 'audit'].includes(currentTab);
  });

  const primaryNavItems = [
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles, badge: 'Active' },
    { id: 'history', label: 'Purchase History', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const adminNavItems = [
    { id: 'overview', label: 'Overview Metrics', icon: LayoutDashboard },
    { id: 'agents', label: 'Agent Fleet', icon: Bot, count: stats?.active_agents },
    { id: 'policies', label: 'Policy Configuration', icon: Sliders },
    { id: 'security', label: 'Security Interceptor', icon: ShieldAlert, badge: stats?.blocked_attacks > 0 ? `${stats.blocked_attacks} Blocked` : null },
    { id: 'mandates', label: 'Mandate Logs', icon: KeyRound },
    { id: 'payments', label: 'PayPal Transactions', icon: CreditCard },
    { id: 'audit', label: 'Audit Ledger', icon: FileText }
  ];

  useEffect(() => {
    if (['overview', 'agents', 'policies', 'security', 'mandates', 'payments', 'audit'].includes(currentTab)) {
      setAdminOpen(true);
    }
  }, [currentTab]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Top Brand Header */}
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-[#111827] flex items-center gap-1.5">
                  TRUSTPAY <span className="text-[#2563EB] text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EFF6FF] border border-[#DBEAFE]">AI</span>
                </div>
                <div className="text-[10px] text-[#6B7280] font-medium">Zero-Trust Procurement</div>
              </div>
            </div>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="md:hidden p-1 rounded-lg text-[#6B7280] hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Active Workspace Pill */}
          <div className="mx-3.5 mt-3 p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
              <span className="font-medium text-[#111827] truncate text-[11px]">
                {activeOrg?.name || 'Acme Engineering'}
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] shrink-0">
              {activeOrg?.environment === 'live' ? 'Live' : 'Sandbox'}
            </span>
          </div>

          {/* Primary Navigation */}
          <div className="p-3 space-y-1">
            <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-2.5 py-1">
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
                      : 'text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EFF6FF] text-[#2563EB]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Collapsible Admin & Developer Console */}
          <div className="px-3 pt-2 flex-1 overflow-y-auto">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span className="text-[11px] uppercase tracking-wider">Admin & Developer</span>
              </div>
              {adminOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {adminOpen && (
              <div className="mt-1 space-y-0.5 pl-1.5 border-l-2 border-[#E5E7EB] ml-2">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                          : 'text-[#4B5563] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FEE2E2] text-[#DC2626] font-semibold">
                          {item.badge}
                        </span>
                      )}
                      {item.count !== undefined && !item.badge && (
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Security Assurance Badge */}
          <div className="p-3.5 border-t border-[#E5E7EB] bg-[#F9FAFB] mt-auto">
            <div className="flex items-center space-x-2 text-xs text-[#15803D]">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="font-semibold text-[11px]">HMAC Engine Active</span>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-0.5">
              Deterministic 10-Vector Policy Shield
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
