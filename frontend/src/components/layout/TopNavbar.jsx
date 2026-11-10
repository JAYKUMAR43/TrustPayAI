import React, { useState } from 'react';
import {
  Shield,
  Bell,
  RefreshCw,
  ExternalLink,
  Lock,
  Cpu,
  Menu,
  Sun,
  Moon,
  UserCheck,
  ChevronDown,
  Building,
  User
} from 'lucide-react';
import { Button, RealtimePulse } from '../common/UIComponents';

export const USER_ROLES = [
  { id: 'INDIVIDUAL', label: 'Individual User', badge: 'Personal', desc: 'Personal procurement and purchase history' },
  { id: 'EMPLOYEE', label: 'Organization Employee', badge: 'Requester', desc: 'Create requests and view permitted org purchases' },
  { id: 'APPROVER', label: 'Approver', badge: 'Dual-Custody', desc: 'Authorize or reject pending expenditure mandates' },
  { id: 'ORG_ADMIN', label: 'Organization Admin', badge: 'Admin', desc: 'Manage policies, budgets, members, and reports' },
  { id: 'SECURITY_ADMIN', label: 'Security Admin', badge: 'SecOps', desc: 'Audit ledger, security interceptors, mandate seals' },
  { id: 'DEVELOPER', label: 'Developer', badge: 'Dev Tools', desc: 'Diagnostics, API telemetry, webhook monitor' }
];

export function TopNavbar({
  onRefresh,
  isRefreshing,
  title,
  subtitle,
  onToggleMobileMenu,
  isDarkMode = false,
  onToggleTheme,
  activeRole = 'ORG_ADMIN',
  onChangeRole
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const currentRoleObj = USER_ROLES.find((r) => r.id === activeRole) || USER_ROLES[3];

  const roleColors = {
    INDIVIDUAL: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB] dark:bg-[#1F2937] dark:text-[#D1D5DB] dark:border-[#374151]',
    EMPLOYEE: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE] dark:bg-[#1E3A8A]/30 dark:text-[#93C5FD] dark:border-[#1E40AF]',
    APPROVER: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] dark:bg-[#78350F]/30 dark:text-[#FCD34D] dark:border-[#92400E]',
    ORG_ADMIN: 'bg-[#EEF2FF] text-[#4F46E5] border-[#E0E7FF] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] dark:border-[#3730A3]',
    SECURITY_ADMIN: 'bg-[#FDF2F8] text-[#DB2777] border-[#FCE7F3] dark:bg-[#831843]/30 dark:text-[#F472B6] dark:border-[#9D174D]',
    DEVELOPER: 'bg-[#ECFDF5] text-[#059669] border-[#D1FAE5] dark:bg-[#064E3B]/30 dark:text-[#6EE7B7] dark:border-[#047857]'
  };

  return (
    <header className="h-16 border-b border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] hidden sm:block truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
        {/* Real-time status pulse */}
        <div className="hidden sm:block">
          <RealtimePulse connected={true} />
        </div>

        {/* Role Switcher Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              roleColors[activeRole] || roleColors.ORG_ADMIN
            }`}
            title="Click to switch simulated user role"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">{currentRoleObj.label}</span>
            <span className="sm:hidden font-semibold">{currentRoleObj.badge}</span>
            <ChevronDown className="w-3 h-3 opacity-75" />
          </button>

          {showRoleMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowRoleMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] shadow-xl p-2 z-50 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider border-b border-[#E5E7EB] dark:border-[#1F2937] mb-1">
                  Simulate User & Workspace Role
                </div>
                {USER_ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      if (onChangeRole) onChangeRole(role.id);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start space-x-2.5 cursor-pointer ${
                      activeRole === role.id
                        ? 'bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] font-semibold'
                        : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
                    }`}
                  >
                    <div className="pt-0.5">
                      {role.id === 'INDIVIDUAL' ? (
                        <User className="w-3.5 h-3.5 text-[#6B7280]" />
                      ) : (
                        <Building className="w-3.5 h-3.5 text-[#2563EB]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{role.label}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium border border-current opacity-80">
                          {role.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-1 mt-0.5">
                        {role.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sync Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </Button>

        {/* Theme Switcher */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#2563EB]" />}
          </button>
        )}
      </div>
    </header>
  );
}
