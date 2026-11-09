import React, { useEffect } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle,
  X,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

/**
 * Enterprise Card: Clean white surface with subtle border and crisp shadow
 */
export function Card({ children, className = '', title, action, subtitle }) {
  return (
    <div className={`rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-[0_1px_3px_0_rgba(16,24,40,0.06),0_1px_2px_0_rgba(16,24,40,0.03)] transition-all ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] px-6 py-4 gap-2">
          <div>
            {title && <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

/**
 * Executive Stat Card: Metric, Context, Icon, Trend
 */
export function StatCard({ label, value, subvalue, icon: Icon, trend, variant = 'blue' }) {
  const iconThemes = {
    blue: 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] border-[#D0E0FD] dark:border-[#2E3C54]',
    teal: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
    emerald: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
    amber: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
    rose: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
    purple: 'bg-[#F4F3FF] dark:bg-[#241E3A] text-[#6941C6] border-[#D9D6FE] dark:border-[#382F5A]',
  };

  return (
    <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-5 shadow-[0_1px_3px_0_rgba(16,24,40,0.06),0_1px_2px_0_rgba(16,24,40,0.03)] hover:border-[#D0D5DD] dark:hover:border-[#344054] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[#667085] dark:text-[#98A2B3]">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border text-xs ${iconThemes[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">{value}</div>
      {(subvalue || trend !== undefined) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-[#667085] dark:text-[#98A2B3]">
          <span className="truncate pr-2">{subvalue}</span>
          {trend !== undefined && (
            <span className={`inline-flex items-center font-medium shrink-0 ${
              trend >= 0 ? 'text-[#16865C]' : 'text-[#D94B55]'
            }`}>
              {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {trend >= 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const styles = {
    default: 'bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#344054] dark:text-[#D0D5DD] border-[#E4E7EC] dark:border-[#2E3C54]',
    success: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
    warning: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
    danger: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
    info: 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] border-[#D0E0FD] dark:border-[#2E3C54]',
    teal: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
    purple: 'bg-[#F4F3FF] dark:bg-[#241E3A] text-[#6941C6] border-[#D9D6FE] dark:border-[#382F5A]',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Standardized Canonical Status Indicators for TRUSTPAY AI
 * Required: APPROVED, REJECTED, PENDING_APPROVAL, PAYMENT_CREATED, PAYMENT_CAPTURED, PAYMENT_FAILED, MANDATE_EXPIRED
 */
export function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toUpperCase().trim();

  const configMap = {
    APPROVED: {
      label: 'APPROVED',
      style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
      dot: 'bg-[#16865C]',
      icon: CheckCircle2,
    },
    AUTHORIZED: {
      label: 'APPROVED',
      style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
      dot: 'bg-[#16865C]',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: 'REJECTED',
      style: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
      dot: 'bg-[#D94B55]',
      icon: XCircle,
    },
    BLOCKED: {
      label: 'REJECTED',
      style: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
      dot: 'bg-[#D94B55]',
      icon: XCircle,
    },
    PENDING_APPROVAL: {
      label: 'PENDING_APPROVAL',
      style: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
      dot: 'bg-[#C58B24]',
      icon: Clock,
    },
    PENDING_HUMAN_APPROVAL: {
      label: 'PENDING_APPROVAL',
      style: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
      dot: 'bg-[#C58B24]',
      icon: Clock,
    },
    AWAITING_REVIEW: {
      label: 'PENDING_APPROVAL',
      style: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
      dot: 'bg-[#C58B24]',
      icon: Clock,
    },
    PENDING: {
      label: 'PENDING_APPROVAL',
      style: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]',
      dot: 'bg-[#C58B24]',
      icon: Clock,
    },
    PAYMENT_CREATED: {
      label: 'PAYMENT_CREATED',
      style: 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] border-[#D0E0FD] dark:border-[#2E3C54]',
      dot: 'bg-[#356AE6]',
      icon: CreditCard,
    },
    PAYMENT_INITIATED: {
      label: 'PAYMENT_CREATED',
      style: 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] border-[#D0E0FD] dark:border-[#2E3C54]',
      dot: 'bg-[#356AE6]',
      icon: CreditCard,
    },
    PAYMENT_CAPTURED: {
      label: 'PAYMENT_CAPTURED',
      style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
      dot: 'bg-[#16865C]',
      icon: ShieldCheck,
    },
    CAPTURED: {
      label: 'PAYMENT_CAPTURED',
      style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
      dot: 'bg-[#16865C]',
      icon: ShieldCheck,
    },
    COMPLETED: {
      label: 'PAYMENT_CAPTURED',
      style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]',
      dot: 'bg-[#16865C]',
      icon: ShieldCheck,
    },
    PAYMENT_FAILED: {
      label: 'PAYMENT_FAILED',
      style: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
      dot: 'bg-[#D94B55]',
      icon: AlertTriangle,
    },
    FAILED: {
      label: 'PAYMENT_FAILED',
      style: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]',
      dot: 'bg-[#D94B55]',
      icon: AlertTriangle,
    },
    MANDATE_EXPIRED: {
      label: 'MANDATE_EXPIRED',
      style: 'bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3] border-[#E4E7EC] dark:border-[#2E3C54]',
      dot: 'bg-[#98A2B3]',
      icon: Clock,
    },
    EXPIRED: {
      label: 'MANDATE_EXPIRED',
      style: 'bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3] border-[#E4E7EC] dark:border-[#2E3C54]',
      dot: 'bg-[#98A2B3]',
      icon: Clock,
    }
  };

  const current = configMap[normalized] || {
    label: normalized || 'UNKNOWN',
    style: 'bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#344054] dark:text-[#D0D5DD] border-[#E4E7EC] dark:border-[#2E3C54]',
    dot: 'bg-[#667085]',
    icon: Activity
  };

  const IconComp = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight border ${current.style} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <IconComp className="w-3.5 h-3.5 shrink-0" />
      <span>{current.label}</span>
    </span>
  );
}

export function AgentStatusBadge({ status = 'ACTIVE', className = '' }) {
  const norm = (status || '').toUpperCase();
  const config = {
    ACTIVE: { label: 'Active', style: 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]', dot: 'bg-[#16865C]' },
    IDLE: { label: 'Idle', style: 'bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6] border-[#D0E0FD] dark:border-[#2E3C54]', dot: 'bg-[#356AE6]' },
    SUSPENDED: { label: 'Suspended', style: 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]', dot: 'bg-[#C58B24]' },
    BLOCKED: { label: 'Blocked', style: 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529]', dot: 'bg-[#D94B55]' },
    RATE_LIMITED: { label: 'Rate-Limited', style: 'bg-[#F4F3FF] dark:bg-[#241E3A] text-[#6941C6] border-[#D9D6FE] dark:border-[#382F5A]', dot: 'bg-[#6941C6]' }
  }[norm] || { label: norm, style: 'bg-[#F2F4F7] text-[#344054] border-[#E4E7EC]', dot: 'bg-[#667085]' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.style} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export function RiskScoreBadge({ score = 0 }) {
  const num = Math.round(Number(score) || 0);
  let color = 'bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C] border-[#BCE5D5] dark:border-[#1A3F37]';
  let label = 'Low Risk';
  if (num >= 80) {
    color = 'bg-[#FDF2F2] dark:bg-[#2E191B] text-[#D94B55] border-[#F7C4C8] dark:border-[#4B2529] font-bold';
    label = 'Critical Risk';
  } else if (num >= 60) {
    color = 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E] font-semibold';
    label = 'High Risk';
  } else if (num >= 35) {
    color = 'bg-[#FEF7EB] dark:bg-[#2B2313] text-[#C58B24] border-[#FCE0B0] dark:border-[#42361E]';
    label = 'Medium Risk';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${color}`}>
      <span>{num}/100</span>
      <span className="text-[11px] opacity-80">({label})</span>
    </div>
  );
}

export function RealtimePulse({ connected = true }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F2F4F7] dark:bg-[#1F2C3F] border border-[#E4E7EC] dark:border-[#2E3C54] text-xs">
      <span className="relative flex h-2 w-2">
        {connected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16865C] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16865C]" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#98A2B3]" />
        )}
      </span>
      <span className={connected ? 'text-[#16865C] font-semibold tracking-wide' : 'text-[#667085]'}>
        {connected ? 'LIVE FEED' : 'OFFLINE'}
      </span>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ariaLabel
}) {
  const variants = {
    primary: 'bg-[#356AE6] hover:bg-[#2756C4] text-white shadow-sm border border-transparent focus-visible:ring-2 focus-visible:ring-[#356AE6]/40',
    secondary: 'bg-white dark:bg-[#182230] hover:bg-[#F8F9FB] dark:hover:bg-[#1F2C3F] text-[#172033] dark:text-[#F2F4F7] border border-[#E7EAF0] dark:border-[#243347] shadow-sm focus-visible:ring-2 focus-visible:ring-[#356AE6]/30',
    outline: 'bg-transparent hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] text-[#172033] dark:text-[#F2F4F7] border border-[#E7EAF0] dark:border-[#243347]',
    ghost: 'bg-transparent hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3] hover:text-[#172033] dark:hover:text-[#F2F4F7] border-transparent',
    danger: 'bg-[#D94B55] hover:bg-[#C43C46] text-white shadow-sm border border-transparent focus-visible:ring-2 focus-visible:ring-[#D94B55]/40',
    teal: 'bg-[#16865C] hover:bg-[#12704D] text-white shadow-sm border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-xs rounded-lg',
    lg: 'px-5 py-2.5 text-sm rounded-lg font-semibold',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

export function DrawerModal({ isOpen, onClose, title, subtitle, children, size = 'lg' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Inspector'}
    >
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div className={`relative w-full ${maxWidths[size]} h-full bg-white dark:bg-[#182230] border-l border-[#E7EAF0] dark:border-[#243347] shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200`}>
        <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] px-6 py-4 bg-white dark:bg-[#182230]">
          <div>
            <h2 className="text-base font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-0.5 font-mono">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#172033] dark:hover:text-[#F2F4F7] hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-10 bg-[#F2F4F7] dark:bg-[#1F2C3F] rounded-lg w-full border border-[#E7EAF0] dark:border-[#243347]" 
          style={{ width: `${100 - (i % 3) * 10}%` }} 
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Activity, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center border border-dashed border-[#E7EAF0] dark:border-[#243347] rounded-xl bg-[#F8F9FB] dark:bg-[#141C28]">
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#182230] text-[#356AE6] mb-3.5 border border-[#E7EAF0] dark:border-[#243347] shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-[#172033] dark:text-[#F2F4F7] mb-1 tracking-tight">{title}</h4>
      {description && <p className="text-xs text-[#667085] dark:text-[#98A2B3] max-w-sm mb-4 leading-relaxed">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#FDF2F2] dark:bg-[#2E191B] border border-[#F7C4C8] dark:border-[#4B2529] text-[#D94B55] text-xs mb-4">
      <div className="flex items-center space-x-2.5">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="border-[#F7C4C8] text-[#D94B55] hover:bg-[#FDF2F2]">
          Retry
        </Button>
      )}
    </div>
  );
}
