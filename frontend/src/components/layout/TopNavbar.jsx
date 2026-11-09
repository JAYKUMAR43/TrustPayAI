import React from 'react';
import {
  Shield,
  Bell,
  RefreshCw,
  ExternalLink,
  Lock,
  Cpu,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { Button, RealtimePulse } from '../common/UIComponents';

export function TopNavbar({ onRefresh, isRefreshing, title, subtitle, onToggleMobileMenu, isDarkMode = false, onToggleTheme }) {
  return (
    <header className="h-16 border-b border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-[#F2F4F7]"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-[#667085] dark:text-[#98A2B3] hidden sm:block truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
        {/* Real-time status pulse */}
        <div className="hidden sm:block">
          <RealtimePulse connected={true} />
        </div>

        {/* Sandbox Environment Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F2F4F7] dark:bg-[#1F2C3F] border border-[#E4E7EC] dark:border-[#2E3C54] text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#356AE6]" />
          <span className="text-[#344054] dark:text-[#D0D5DD] font-medium text-[11px]">PayPal Sandbox v2</span>
        </div>

        {/* Sync Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#356AE6]' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </Button>

        {/* Light/Dark Theme Switcher */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
            className="p-2 rounded-lg text-[#667085] dark:text-[#98A2B3] hover:text-[#172033] dark:hover:text-[#F2F4F7] hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#C58B24]" /> : <Moon className="w-4 h-4 text-[#356AE6]" />}
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-[#E7EAF0] dark:border-[#243347]">
          <div className="w-7 h-7 rounded-full bg-[#EEF4FF] dark:bg-[#1E293B] border border-[#D0E0FD] dark:border-[#2E3C54] flex items-center justify-center text-[11px] font-bold text-[#356AE6]">
            SA
          </div>
          <div className="hidden xl:block">
            <div className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7]">SecOps Admin</div>
            <div className="text-[10px] text-[#667085] dark:text-[#98A2B3]">Security Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
}
