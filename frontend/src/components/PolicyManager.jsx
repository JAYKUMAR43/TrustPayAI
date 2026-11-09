import React, { useState } from 'react';
import { ShieldCheck, Sliders, ToggleLeft, ToggleRight, Check, AlertCircle } from 'lucide-react';
import { updatePolicy } from '../api';

export default function PolicyManager({ policies, onPolicyUpdated }) {
  const [updatingId, setUpdatingId] = useState(null);

  const handleToggle = async (policy) => {
    setUpdatingId(policy.id);
    try {
      await updatePolicy(policy.id, !policy.is_active, policy.rule_value);
      if (onPolicyUpdated) onPolicyUpdated();
    } catch (err) {
      console.error('Failed to update policy:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Enterprise Guardrails & Policy Configuration</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active Enforcement
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Deterministic organizational spending rules enforced prior to risk analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((p) => {
          const isUpdating = updatingId === p.id;
          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border transition-all ${
                p.is_active
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {p.rule_name}
                </span>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={isUpdating}
                  className={`text-xs font-mono flex items-center space-x-1 transition-colors ${
                    p.is_active ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {p.is_active ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                      <span>ENABLED</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-slate-500" />
                      <span>DISABLED</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-3 font-sans">
                {p.description}
              </p>

              {/* Value rendering */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400 overflow-x-auto">
                {p.rule_type === 'SPEND_LIMIT' && (
                  <div>
                    {p.rule_value?.max_amount && <span>Limit: <strong className="text-emerald-400">${p.rule_value.max_amount}</strong></span>}
                    {p.rule_value?.daily_cap && <span>Daily Cap: <strong className="text-emerald-400">${p.rule_value.daily_cap}</strong></span>}
                  </div>
                )}
                {p.rule_type === 'ALLOWED_VENDORS' && (
                  <div>
                    <span className="text-slate-500 block mb-1">Pre-Approved Domains:</span>
                    <div className="flex flex-wrap gap-1">
                      {p.rule_value?.domains?.slice(0, 7).map((d) => (
                        <span key={d} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-800">
                          {d}
                        </span>
                      ))}
                      {p.rule_value?.domains?.length > 7 && (
                        <span className="text-slate-500 text-[10px]">+{p.rule_value.domains.length - 7} more</span>
                      )}
                    </div>
                  </div>
                )}
                {p.rule_type === 'BLOCKED_VENDORS' && (
                  <div>
                    <span className="text-slate-500 block mb-1">Blacklisted Domains:</span>
                    <div className="flex flex-wrap gap-1">
                      {p.rule_value?.domains?.map((d) => (
                        <span key={d} className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 text-[10px] border border-rose-900/40">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.rule_type === 'BANNED_CATEGORIES' && (
                  <div>
                    <span className="text-slate-500 block mb-1">Strictly Prohibited:</span>
                    <div className="flex flex-wrap gap-1">
                      {p.rule_value?.categories?.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 text-[10px] border border-rose-900/40">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.rule_type === 'APPROVAL_GATE' && (
                  <div>
                    <span>Threshold for Mandatory Review: <strong className="text-amber-400">${p.rule_value?.threshold}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
