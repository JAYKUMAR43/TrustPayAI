import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Terminal,
  Bot,
  Sliders,
  ShieldAlert,
  KeyRound,
  CreditCard,
  Radio,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Lock
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab, stats, mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'console', label: 'AI Procurement Console', icon: Terminal, badge: 'Interactive' },
    { id: 'agents', label: 'Agent Management', icon: Bot, count: stats?.active_agents || 0 },
    { id: 'policies', label: 'Policy Management', icon: Sliders },
    { id: 'security', label: 'Security Center', icon: ShieldAlert, badge: stats?.blocked_attacks > 0 ? `${stats.blocked_attacks} Blocked` : null, badgeVariant: 'danger' },
    { id: 'mandates', label: 'Mandate Management', icon: KeyRound },
    { id: 'payments', label: 'PayPal Transactions', icon: CreditCard },
    { id: 'risk', label: 'Risk Intelligence', icon: Radio },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-full bg-white dark:bg-[#182230] text-[#172033] dark:text-[#F2F4F7]">
      <div>
        {/* Brand Header */}
        <div className={`px-5 py-4 border-b border-[#E7EAF0] dark:border-[#243347] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#356AE6] flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div>
                <div className="font-bold text-sm tracking-tight text-[#172033] dark:text-[#F2F4F7] flex items-center gap-1.5">
                  TRUSTPAY <span className="text-[#356AE6] text-[10px] font-semibold px-1 py-0.2 rounded bg-[#EEF4FF] dark:bg-[#1E293B]">AI</span>
                </div>
                <div className="text-[10px] text-[#667085] dark:text-[#98A2B3] font-medium tracking-wide">Enterprise Financial Control</div>
              </div>
            )}
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="md:hidden p-1 rounded-lg text-[#667085] hover:text-[#172033]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Environment Status Badge */}
        {!collapsed && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16865C]" />
              <span className="text-[#344054] dark:text-[#D0D5DD] font-medium text-[11px]">Guardrails Enforced</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] font-medium border border-[#D0E0FD] dark:border-[#2E3C54]">
              Sandbox
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-210px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] font-semibold shadow-xs'
                    : 'text-[#667085] dark:text-[#98A2B3] hover:text-[#172033] dark:hover:text-[#F2F4F7] hover:bg-[#F8F9FB] dark:hover:bg-[#1F2C3F]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#356AE6]' : 'text-[#667085] dark:text-[#98A2B3]'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    item.badgeVariant === 'danger'
                      ? 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border border-[#F7C4C8] dark:border-[#4B2529]'
                      : 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border border-[#BCE5D5] dark:border-[#1A3F37]'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {!collapsed && item.count !== undefined && !item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3] font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Collapse Toggle */}
      <div className="p-3 border-t border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28]">
        {!collapsed ? (
          <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#98A2B3] px-1">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-[#16865C]" />
              <span>HMAC-SHA256</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="hidden md:flex p-1 rounded hover:bg-[#E7EAF0] dark:hover:bg-[#1F2C3F] text-[#667085] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="w-full flex items-center justify-center p-1.5 rounded hover:bg-[#E7EAF0] dark:hover:bg-[#1F2C3F] text-[#667085] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${collapsed ? 'w-16' : 'w-60'} shrink-0 border-r border-[#E7EAF0] dark:border-[#243347] flex-col justify-between h-screen sticky top-0 z-30 transition-all duration-150`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="fixed inset-0" 
            onClick={onCloseMobile} 
            aria-hidden="true" 
          />
          <div className="relative w-64 max-w-[85vw] h-full bg-white dark:bg-[#182230] border-r border-[#E7EAF0] dark:border-[#243347] shadow-xl z-10 flex flex-col animate-in slide-in-from-left duration-150">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
