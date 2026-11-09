import React from 'react';
import { ShieldCheck, Lock, CreditCard, Cpu, RefreshCw, AlertCircle } from 'lucide-react';

export default function Header({ health, onRefresh, isRefreshing }) {
  const isSandbox = health?.paypal_mode === 'sandbox';

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                TRUSTPAY AI
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                FINTECH CONTROL LAYER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Autonomous Agent Authorization • Cryptographic Mandates • PayPal v2
            </p>
          </div>
        </div>

        {/* Security & Health Status Pills */}
        <div className="hidden md:flex items-center space-x-3">
          
          {/* Mandate Engine Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-mono">HMAC Mandates:</span>
            <span className="text-emerald-400 font-mono font-bold">ARMED</span>
          </div>

          {/* PayPal Sandbox Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 font-mono">PayPal:</span>
            <span className="text-blue-400 font-mono font-bold">
              {isSandbox ? 'SANDBOX v2' : 'LIVE'}
            </span>
          </div>

          {/* AI Orchestrator Pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 font-mono">LangGraph:</span>
            <span className="text-purple-400 font-mono font-bold">ACTIVE</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh System State"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
}
