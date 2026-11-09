import React from 'react';
import { Bot, ShieldCheck, Gauge, KeyRound, UserCheck, CreditCard, Check, X, Clock } from 'lucide-react';

export default function PipelineVisualizer({ currentPurchase }) {
  if (!currentPurchase) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center mb-8">
        <p className="text-sm font-mono text-slate-400">
          Select or execute a procurement request above to view the real-time LangGraph state progression.
        </p>
      </div>
    );
  }

  const isRejected = currentPurchase.status === 'REJECTED';
  const isMandateIssued = !!currentPurchase.mandate_id;
  const isAuthorized = ['AUTHORIZED', 'PAYMENT_INITIATED', 'COMPLETED'].includes(currentPurchase.status);
  const isCompleted = currentPurchase.status === 'COMPLETED';

  const stages = [
    {
      id: 'agent',
      label: 'Agent Request',
      detail: `${currentPurchase.agent_name || currentPurchase.agent_id}`,
      icon: Bot,
      status: 'success'
    },
    {
      id: 'guardrails',
      label: 'Policy Guardrails',
      detail: isRejected ? 'Policy Breach' : 'All Caps Passed',
      icon: ShieldCheck,
      status: isRejected ? 'error' : 'success'
    },
    {
      id: 'risk',
      label: 'Risk Engine',
      detail: `Score: ${currentPurchase.risk_score || 0}/100 (${currentPurchase.risk_level || 'LOW'})`,
      icon: Gauge,
      status: isRejected ? 'error' : currentPurchase.risk_score > 60 ? 'warning' : 'success'
    },
    {
      id: 'mandate',
      label: 'Crypto Mandate',
      detail: isMandateIssued ? `Sealed (${currentPurchase.mandate_id.substring(0, 10)}...)` : 'Not Issued',
      icon: KeyRound,
      status: isMandateIssued ? 'success' : isRejected ? 'neutral' : 'pending'
    },
    {
      id: 'human',
      label: 'Human Review',
      detail: isAuthorized ? 'Approved by Admin' : isRejected ? 'Rejected' : 'Awaiting Sign-off',
      icon: UserCheck,
      status: isAuthorized ? 'success' : isRejected ? 'error' : 'pending'
    },
    {
      id: 'paypal',
      label: 'PayPal Gateway',
      detail: isCompleted ? `Captured: ${currentPurchase.paypal_capture_id?.substring(0, 12)}...` : 'Pending Authorization',
      icon: CreditCard,
      status: isCompleted ? 'success' : 'pending'
    }
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
          <span>LangGraph Pipeline State Machine</span>
          <span className="text-slate-400 font-normal">| Transaction: {currentPurchase.id.substring(0, 8)}...</span>
        </h3>
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
          isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          isRejected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          STATUS: {currentPurchase.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 min-w-[700px]">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                stage.status === 'success'
                  ? 'bg-slate-900/90 border-emerald-500/40'
                  : stage.status === 'error'
                  ? 'bg-slate-900/90 border-rose-500/40'
                  : stage.status === 'warning'
                  ? 'bg-slate-900/90 border-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${
                  stage.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                  stage.status === 'error' ? 'bg-rose-500/10 text-rose-400' :
                  stage.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  0{idx + 1}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-200 block truncate">
                  {stage.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                  {stage.detail}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Stage:</span>
                {stage.status === 'success' && <span className="text-emerald-400 flex items-center"><Check className="w-3 h-3 mr-0.5" /> PASS</span>}
                {stage.status === 'error' && <span className="text-rose-400 flex items-center"><X className="w-3 h-3 mr-0.5" /> FAIL</span>}
                {stage.status === 'pending' && <span className="text-amber-400 flex items-center"><Clock className="w-3 h-3 mr-0.5" /> HOLD</span>}
                {stage.status === 'neutral' && <span className="text-slate-500">N/A</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
