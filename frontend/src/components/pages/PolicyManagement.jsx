import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  ShieldCheck,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Lock,
  AlertCircle,
  Trash2,
  RotateCcw,
  RefreshCw,
  Building2,
  Tag,
  KeyRound,
  ExternalLink,
  ShieldAlert,
  Coins
} from 'lucide-react';
import { Card, Badge, Button, ErrorBanner, SkeletonLoader, EmptyState } from '../common/UIComponents';
import { fetchPolicies, createPolicy, updatePolicy, deletePolicy, resetDefaultPolicies } from '../../api';

export function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Structured form state
  const [formData, setFormData] = useState({
    name: '',
    policy_type: 'SPENDING_LIMIT',
    description: '',
    // Specialized inputs
    amount_limit: '1000.00',
    currency: 'USD',
    domain_list: 'kaggle.com, dell.com, lenovo.com, huggingface.co',
    category_list: 'gambling, weapons, adult_content, crypto_speculation',
    threshold_amount: '25.00',
    allowed_currencies: 'USD, INR, EUR',
    is_active: true
  });

  async function loadPolicies() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchPolicies();
      const list = Array.isArray(data) ? data : (data?.items || []);
      setPolicies(list);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load policy rules from server.');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  async function handleTogglePolicy(policy) {
    const nextState = !policy.is_active;
    setActionLoading((prev) => ({ ...prev, [policy.id]: true }));
    try {
      await updatePolicy(policy.id, nextState, policy.rule_value);
      setSuccessMessage(`Policy '${policy.name}' set to ${nextState ? 'ACTIVE' : 'DISABLED'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Error updating policy state');
    } finally {
      setActionLoading((prev) => ({ ...prev, [policy.id]: false }));
    }
  }

  async function handleDeletePolicy(policyId, policyName) {
    if (!confirm(`Are you sure you want to permanently delete policy '${policyName}'?`)) return;
    setActionLoading((prev) => ({ ...prev, [policyId]: true }));
    try {
      await deletePolicy(policyId);
      setSuccessMessage(`Policy '${policyName}' deleted successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete policy');
    } finally {
      setActionLoading((prev) => ({ ...prev, [policyId]: false }));
    }
  }

  async function handleResetDefaults() {
    setIsSeeding(true);
    try {
      await resetDefaultPolicies();
      setSuccessMessage('Default enterprise guardrail policies seeded successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to seed default policies');
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCreatePolicy(e) {
    e.preventDefault();
    if (!formData.name) return;

    // Build structured rule_value based on type
    let rule_value = {};
    if (formData.policy_type === 'SPENDING_LIMIT') {
      rule_value = {
        max_amount: parseFloat(formData.amount_limit) || 1000.0,
        currency: formData.currency
      };
    } else if (formData.policy_type === 'DAILY_LIMIT') {
      rule_value = {
        daily_cap: parseFloat(formData.amount_limit) || 5000.0,
        currency: formData.currency
      };
    } else if (formData.policy_type === 'VENDOR_WHITELIST' || formData.policy_type === 'BLOCKED_VENDORS') {
      const domains = formData.domain_list.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      rule_value = { domains };
    } else if (formData.policy_type === 'CATEGORY_RESTRICTION') {
      const categories = formData.category_list.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
      rule_value = { categories };
    } else if (formData.policy_type === 'APPROVAL_REQUIREMENT') {
      rule_value = {
        threshold: parseFloat(formData.threshold_amount) || 25.0,
        currency: formData.currency
      };
    } else if (formData.policy_type === 'CURRENCY_RESTRICTION') {
      const allowed = formData.allowed_currencies.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
      rule_value = { allowed };
    } else {
      rule_value = { value: formData.amount_limit };
    }

    try {
      await createPolicy({
        name: formData.name.trim().toUpperCase().replace(/\s+/g, '_'),
        policy_type: formData.policy_type,
        description: formData.description || `Autonomous agent rule for ${formData.policy_type}`,
        rule_value,
        is_active: formData.is_active
      });

      setShowModal(false);
      setSuccessMessage(`Policy '${formData.name}' enforced successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setFormData({
        name: '',
        policy_type: 'SPENDING_LIMIT',
        description: '',
        amount_limit: '1000.00',
        currency: 'USD',
        domain_list: 'kaggle.com, dell.com, lenovo.com, huggingface.co',
        category_list: 'gambling, weapons, adult_content, crypto_speculation',
        threshold_amount: '25.00',
        allowed_currencies: 'USD, INR, EUR',
        is_active: true
      });
      await loadPolicies();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save policy');
    }
  }

  // Safe renderer for rule_value (Never renders raw objects!)
  function renderRuleValue(pol) {
    const val = pol.rule_value;
    if (!val || typeof val !== 'object') {
      return String(val || 'N/A');
    }

    if (val.max_amount !== undefined) {
      return (
        <span className="text-[#2563EB] dark:text-[#60A5FA]">
          ${Number(val.max_amount).toFixed(2)} {val.currency || 'USD'}
        </span>
      );
    }
    if (val.daily_cap !== undefined) {
      return (
        <span className="text-[#2563EB] dark:text-[#60A5FA]">
          ${Number(val.daily_cap).toFixed(2)} / day {val.currency || 'USD'}
        </span>
      );
    }
    if (val.threshold !== undefined) {
      return (
        <span className="text-[#C58B24] dark:text-[#FBBF24]">
          Dual-Custody Review above ${Number(val.threshold).toFixed(2)} {val.currency || 'USD'}
        </span>
      );
    }
    if (Array.isArray(val.domains)) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {val.domains.slice(0, 6).map((d, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] font-mono"
            >
              {d}
            </span>
          ))}
          {val.domains.length > 6 && (
            <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] self-center">
              +{val.domains.length - 6} more
            </span>
          )}
        </div>
      );
    }
    if (Array.isArray(val.categories)) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {val.categories.map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-[#FEF2F2] dark:bg-[#450A0A]/40 text-[#DC2626] dark:text-[#F87171] border border-[#FECACA] dark:border-[#7F1D1D] font-mono"
            >
              {c}
            </span>
          ))}
        </div>
      );
    }
    if (Array.isArray(val.allowed)) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {val.allowed.map((cur, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[#047857] font-mono font-semibold"
            >
              {cur}
            </span>
          ))}
        </div>
      );
    }

    // Generic object representation
    return (
      <span className="text-[11px] font-mono text-[#475569] dark:text-[#94A3B8]">
        {JSON.stringify(val)}
      </span>
    );
  }

  const activeCount = policies.filter((p) => p.is_active).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#2563EB] dark:text-[#60A5FA] font-semibold mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase text-[11px]">Autonomous Agent Governance</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
            Spending Policies & Guardrails
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1 max-w-2xl leading-relaxed">
            Deterministic rules evaluated by the Policy Guardrail Agent before any cryptographic mandate or PayPal order can be issued.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleResetDefaults} loading={isSeeding}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Guardrail Rule
          </Button>
        </div>
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} onRetry={loadPolicies} />}

      {successMessage && (
        <div className="p-3.5 rounded-xl border border-[#DCFCE7] dark:border-[#14532D] bg-[#F0FDF4] dark:bg-[#052E16] text-[#15803D] dark:text-[#4ADE80] text-xs flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
            Active Guardrails
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 font-mono">
            {activeCount} / {policies.length}
          </div>
          <div className="text-xs text-[#16A34A] dark:text-[#4ADE80] mt-1 font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Deterministic Python Enforcement</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
            Standard Transaction Ceiling
          </div>
          <div className="text-2xl font-bold text-[#2563EB] dark:text-[#60A5FA] mt-1 font-mono">
            $1,000.00 USD
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Hard cap blocks unconstrained AI purchases
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-sm">
          <div className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">
            Dual-Custody Threshold
          </div>
          <div className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 font-mono">
            $25.00 USD
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Requires human purchasing officer sign-off
          </div>
        </div>
      </div>

      {/* Policy Grid */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : policies.length === 0 ? (
        <div className="p-10 rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-center">
          <EmptyState
            icon={Sliders}
            title="No Spending Policies Configured"
            description="Establish deterministic policies to prevent unconstrained AI agent transactions, or seed the default enterprise suite."
            action={
              <Button variant="primary" size="sm" onClick={handleResetDefaults} loading={isSeeding}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Seed Enterprise Policy Suite
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {policies.map((pol) => {
            const isActing = actionLoading[pol.id];
            return (
              <div
                key={pol.id}
                className={`rounded-xl border p-5 shadow-sm transition-all bg-white dark:bg-[#111827] ${
                  pol.is_active
                    ? 'border-[#E5E7EB] dark:border-[#1F2937]'
                    : 'border-[#E5E7EB]/60 dark:border-[#1F2937]/60 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="pr-2">
                    <h3 className="font-semibold text-[#111827] dark:text-[#F9FAFB] text-sm leading-snug">
                      {pol.name}
                    </h3>
                    <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-mono mt-0.5">
                      {pol.policy_type}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleTogglePolicy(pol)}
                      className="cursor-pointer transition-transform hover:scale-105 shrink-0"
                      title={pol.is_active ? 'Click to disable' : 'Click to activate'}
                    >
                      {pol.is_active ? (
                        <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] dark:text-[#4ADE80] border border-[#16A34A]/20">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#6B7280]/10 text-[#6B7280] dark:text-[#9CA3AF] border border-[#6B7280]/20">
                          DISABLED
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleDeletePolicy(pol.id, pol.name)}
                      className="p-1 rounded text-[#9CA3AF] hover:text-[#DC2626] dark:hover:text-[#F87171] transition-colors cursor-pointer"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] dark:bg-[#1E293B]/50 p-3 rounded-lg border border-[#E5E7EB] dark:border-[#1F2937] mb-3">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] uppercase font-semibold block tracking-wider">
                    Enforced Boundary / Value
                  </span>
                  <div className="font-mono font-bold text-sm mt-0.5">
                    {renderRuleValue(pol)}
                  </div>
                </div>

                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] min-h-[32px] line-clamp-2 leading-relaxed">
                  {pol.description || 'Deterministic rule enforced across all autonomous AI agent procurement requests.'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Policy */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center space-x-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                  Create Guardrail Policy
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Establish an immutable rule verified before cryptographic mandate issuance.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. SINGLE_TRANSACTION_CAP"
                  className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                  Rule Type
                </label>
                <select
                  value={formData.policy_type}
                  onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                  className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-medium outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="SPENDING_LIMIT">SPENDING_LIMIT — Max Single Purchase Limit</option>
                  <option value="DAILY_LIMIT">DAILY_LIMIT — Rolling 24h Daily Budget</option>
                  <option value="VENDOR_WHITELIST">VENDOR_WHITELIST — Approved Merchant Whitelist</option>
                  <option value="BLOCKED_VENDORS">BLOCKED_VENDORS — Blacklisted Merchant Domains</option>
                  <option value="CATEGORY_RESTRICTION">CATEGORY_RESTRICTION — Banned Product Categories</option>
                  <option value="APPROVAL_REQUIREMENT">APPROVAL_REQUIREMENT — Dual-Custody Approval Threshold</option>
                  <option value="CURRENCY_RESTRICTION">CURRENCY_RESTRICTION — Permitted Currencies</option>
                </select>
              </div>

              {/* Dynamic inputs based on policy type */}
              {formData.policy_type === 'SPENDING_LIMIT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                      Max Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount_limit}
                      onChange={(e) => setFormData({ ...formData, amount_limit: e.target.value })}
                      placeholder="1000.00"
                      className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              )}

              {formData.policy_type === 'DAILY_LIMIT' && (
                <div>
                  <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                    Daily Velocity Cap ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount_limit}
                    onChange={(e) => setFormData({ ...formData, amount_limit: e.target.value })}
                    placeholder="5000.00"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              {(formData.policy_type === 'VENDOR_WHITELIST' || formData.policy_type === 'BLOCKED_VENDORS') && (
                <div>
                  <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                    Domains (Comma-Separated)
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.domain_list}
                    onChange={(e) => setFormData({ ...formData, domain_list: e.target.value })}
                    placeholder="kaggle.com, dell.com, lenovo.com, huggingface.co"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              {formData.policy_type === 'CATEGORY_RESTRICTION' && (
                <div>
                  <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                    Restricted Categories (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category_list}
                    onChange={(e) => setFormData({ ...formData, category_list: e.target.value })}
                    placeholder="gambling, weapons, adult_content, crypto_speculation"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              {formData.policy_type === 'APPROVAL_REQUIREMENT' && (
                <div>
                  <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                    Mandatory Dual-Custody Threshold ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.threshold_amount}
                    onChange={(e) => setFormData({ ...formData, threshold_amount: e.target.value })}
                    placeholder="25.00"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              {formData.policy_type === 'CURRENCY_RESTRICTION' && (
                <div>
                  <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                    Allowed Currencies (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.allowed_currencies}
                    onChange={(e) => setFormData({ ...formData, allowed_currencies: e.target.value })}
                    placeholder="USD, INR, EUR"
                    className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] font-mono outline-none focus:border-[#2563EB]"
                  />
                </div>
              )}

              <div>
                <label className="text-[#374151] dark:text-[#D1D5DB] font-medium block mb-1">
                  Description / Business Justification
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Enforced deterministic cap across all autonomous agents"
                  className="w-full bg-[#F9FAFB] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded-lg p-2.5 text-[#111827] dark:text-[#F9FAFB] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E5E7EB] dark:border-[#1F2937]">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Enforce Guardrail
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
