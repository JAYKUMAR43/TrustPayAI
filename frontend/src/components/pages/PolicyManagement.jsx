import React, { useState, useEffect } from 'react';
import { Sliders, Plus, ShieldCheck, CheckCircle2, ToggleLeft, ToggleRight, DollarSign, Lock, AlertCircle } from 'lucide-react';
import { Card, Badge, Button, ErrorBanner, SkeletonLoader } from '../common/UIComponents';
import { fetchPolicies, createPolicy, updatePolicy } from '../../api';

export function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    policy_type: 'SPENDING_LIMIT',
    rule_value: '40.00',
    description: '',
    is_active: true
  });

  async function loadPolicies() {
    setLoading(true);
    try {
      const data = await fetchPolicies();
      setPolicies(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load policy rules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  async function handleTogglePolicy(policy) {
    try {
      await updatePolicy(policy.id, !policy.is_active, policy.rule_value);
      loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Error updating policy state');
    }
  }

  async function handleCreatePolicy(e) {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await createPolicy(formData);
      setShowModal(false);
      setFormData({
        name: '',
        policy_type: 'SPENDING_LIMIT',
        rule_value: '40.00',
        description: '',
        is_active: true
      });
      loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save policy');
    }
  }

  const activeCount = policies.filter(p => p.is_active).length;

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#356AE6] font-semibold mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase text-[11px]">Autonomous Agent Governance</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">
            Spending Policies & Guardrails
          </h2>
          <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1 max-w-2xl leading-relaxed">
            Deterministic rules evaluated by the Policy Guardrail Agent before any cryptographic mandate or PayPal order can be issued.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Guardrail Rule
        </Button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadPolicies} />

      {/* Policy KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085] dark:text-[#98A2B3] uppercase tracking-wider">Active Guardrails</div>
          <div className="text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] mt-1 font-mono">{activeCount} / {policies.length}</div>
          <div className="text-xs text-[#16865C] mt-1 font-medium">100% Deterministic Enforcement</div>
        </div>

        <div className="p-4 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085] dark:text-[#98A2B3] uppercase tracking-wider">Max Single Transaction Limit</div>
          <div className="text-2xl font-bold text-[#356AE6] mt-1 font-mono">$40.00 USD</div>
          <div className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1">Requires dual-custody approval above threshold</div>
        </div>

        <div className="p-4 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085] dark:text-[#98A2B3] uppercase tracking-wider">Permitted Currencies & Domains</div>
          <div className="text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] mt-1 font-mono">USD Only</div>
          <div className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1">Non-USD proposals rejected immediately</div>
        </div>
      </div>

      {/* Policy Cards Grid */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className={`rounded-xl border p-5 shadow-sm transition-all bg-white dark:bg-[#182230] ${
                pol.is_active ? 'border-[#E7EAF0] dark:border-[#243347]' : 'border-[#E7EAF0]/60 dark:border-[#243347]/60 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="pr-2">
                  <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm leading-snug">{pol.name}</h3>
                  <div className="text-[10px] text-[#667085] dark:text-[#98A2B3] font-mono mt-0.5">{pol.policy_type}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePolicy(pol)}
                  className="cursor-pointer transition-transform hover:scale-105 shrink-0"
                  title={pol.is_active ? 'Click to disable policy' : 'Click to enable policy'}
                >
                  {pol.is_active ? (
                    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#16865C]/10 text-[#16865C] border border-[#16865C]/20">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#667085]/10 text-[#667085] border border-[#667085]/20">
                      DISABLED
                    </span>
                  )}
                </button>
              </div>

              <div className="bg-[#F7F8FA] dark:bg-[#101828] p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] mb-3">
                <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] uppercase font-semibold block tracking-wider">
                  Enforced Boundary / Value
                </span>
                <div className="font-mono font-bold text-[#172033] dark:text-[#F2F4F7] text-sm mt-0.5 truncate">
                  {pol.rule_value || 'N/A'}
                </div>
              </div>

              <p className="text-xs text-[#667085] dark:text-[#98A2B3] min-h-[32px] line-clamp-2 leading-relaxed">
                {pol.description || 'Deterministic rule enforced across all autonomous AI agent procurement requests.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Policy */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#182230] border border-[#E7EAF0] dark:border-[#243347] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#172033] dark:text-[#F2F4F7] mb-1">Create Guardrail Policy</h3>
            <p className="text-xs text-[#667085] dark:text-[#98A2B3] mb-4">Establish an immutable financial guardrail enforced before payment authorization.</p>

            <form onSubmit={handleCreatePolicy} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#172033] dark:text-[#F2F4F7] font-medium block mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Single Transaction Hard Ceiling"
                  className="w-full bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347] rounded-lg p-2.5 text-[#172033] dark:text-[#F2F4F7] outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
                />
              </div>

              <div>
                <label className="text-[#172033] dark:text-[#F2F4F7] font-medium block mb-1">Rule Type</label>
                <select
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                  className="w-full bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347] rounded-lg p-2.5 text-[#172033] dark:text-[#F2F4F7] font-mono outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
                >
                  <option value="SPENDING_LIMIT">SPENDING_LIMIT (Max Amount)</option>
                  <option value="DAILY_LIMIT">DAILY_LIMIT (Daily Budget)</option>
                  <option value="VENDOR_WHITELIST">VENDOR_WHITELIST (Allowed Vendors)</option>
                  <option value="CATEGORY_WHITELIST">CATEGORY_WHITELIST (Allowed Categories)</option>
                  <option value="APPROVAL_REQUIREMENT">APPROVAL_REQUIREMENT (Human Threshold)</option>
                </select>
              </div>

              <div>
                <label className="text-[#172033] dark:text-[#F2F4F7] font-medium block mb-1">Rule Value / Constraint</label>
                <input
                  type="text"
                  required
                  value={formData.rule_value}
                  onChange={(e) => setFormData({ ...formData, rule_value: e.target.value })}
                  placeholder="e.g. 40.00 or Approved Data Portal"
                  className="w-full bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347] rounded-lg p-2.5 text-[#172033] dark:text-[#F2F4F7] font-mono outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
                />
              </div>

              <div>
                <label className="text-[#172033] dark:text-[#F2F4F7] font-medium block mb-1">Description / Justification</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Rejects any autonomous purchase attempt exceeding $40"
                  className="w-full bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347] rounded-lg p-2.5 text-[#172033] dark:text-[#F2F4F7] outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E7EAF0] dark:border-[#243347]">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Enforce Guardrail</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
