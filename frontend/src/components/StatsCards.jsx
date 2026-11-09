import React from 'react';
import { DollarSign, Clock, ShieldAlert, KeyRound, TrendingUp, AlertTriangle } from 'lucide-react';

export default function StatsCards({ stats }) {
  if (!stats) return null;

  const dailyLimit = stats.limits?.daily_limit || 5000;
  const settledSpend = stats.total_settled_spend || 0;
  const burnPercent = Math.min(Math.round((settledSpend / dailyLimit) * 100), 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Settled Spend & Budget Meter */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Settled Spend</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          ${settledSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
            <span>24h Velocity Cap</span>
            <span>{burnPercent}% of ${dailyLimit.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                burnPercent > 80 ? 'bg-rose-500' : burnPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${burnPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Pending Human Approvals */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Pending Approvals</span>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          {stats.pending_approvals || 0}
        </div>
        <p className="mt-2 text-xs text-amber-400/90 font-mono flex items-center space-x-1">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
          <span>Human-in-the-Loop Gate Engaged</span>
        </p>
      </div>

      {/* 3. Blocked / Intercepted Attacks */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Violations Intercepted</span>
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          {stats.blocked_attempts || 0}
        </div>
        <p className="mt-2 text-xs text-rose-400/90 font-mono">
          Single cap, category & merchant blocks
        </p>
      </div>

      {/* 4. Active Cryptographic Mandates */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Sealed Mandates</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <KeyRound className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          {stats.active_mandates || 0}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Avg Risk Score:</span>
          <span className={`font-bold ${
            stats.average_risk_score > 60 ? 'text-rose-400' : stats.average_risk_score > 30 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {stats.average_risk_score}/100
          </span>
        </div>
      </div>

    </div>
  );
}
