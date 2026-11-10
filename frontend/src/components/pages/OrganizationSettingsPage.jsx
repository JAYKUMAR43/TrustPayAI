import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  Shield,
  Sliders,
  CheckCircle,
  ExternalLink,
  Save,
  AlertCircle,
  Lock,
  Layers,
  RotateCcw
} from 'lucide-react';
import {
  fetchOrganizations,
  fetchCurrentOrganization,
  switchOrganization,
  updateCurrentOrganization,
  connectOrganizationPayment
} from '../../api';

export function OrganizationSettingsPage({ onOrgUpdated }) {
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [singleLimit, setSingleLimit] = useState(1500);
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [currency, setCurrency] = useState('USD');

  // Payment form states
  const [paypalEmail, setPaypalEmail] = useState('');
  const [paymentEnv, setPaymentEnv] = useState('sandbox');
  const [connectSuccess, setConnectSuccess] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [list, curr] = await Promise.all([
        fetchOrganizations(),
        fetchCurrentOrganization()
      ]);
      setOrgs(list || []);
      setCurrentOrg(curr);
      if (curr) {
        setOrgName(curr.name || '');
        setSingleLimit(curr.single_transaction_limit || 1500);
        setDailyLimit(curr.daily_spend_limit || 5000);
        setCurrency(curr.default_currency || 'USD');
        setPaypalEmail(curr.paypal_account_email || 'finance@acme-engineering.internal');
        setPaymentEnv(curr.environment || 'sandbox');
      }
    } catch (e) {
      console.error('Failed to load organization settings:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSwitchOrg(orgId) {
    try {
      const switched = await switchOrganization(orgId);
      setCurrentOrg(switched);
      setOrgName(switched.name);
      setSingleLimit(switched.single_transaction_limit);
      setDailyLimit(switched.daily_spend_limit);
      if (onOrgUpdated) onOrgUpdated(switched);
    } catch (err) {
      alert(`Switch failed: ${err.message}`);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await updateCurrentOrganization({
        name: orgName,
        single_transaction_limit: parseFloat(singleLimit),
        daily_spend_limit: parseFloat(dailyLimit),
        default_currency: currency
      });
      setCurrentOrg(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onOrgUpdated) onOrgUpdated(updated);
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectPayment(e) {
    e.preventDefault();
    try {
      const updated = await connectOrganizationPayment({
        account_email: paypalEmail,
        environment: paymentEnv
      });
      setCurrentOrg(updated);
      setConnectSuccess(true);
      setTimeout(() => setConnectSuccess(false), 3000);
      if (onOrgUpdated) onOrgUpdated(updated);
    } catch (err) {
      alert(`Payment configuration failed: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-xs text-[#6B7280]">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 bg-[#F9FAFB] min-h-[calc(100vh-65px)] text-[#111827]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#111827]">Workspace & Organization Settings</h2>
        <p className="text-xs text-[#6B7280] mt-1">
          Manage multi-tenant workspaces, spending governance limits, and payment gateway authorizations.
        </p>
      </div>

      {/* Workspace Switcher Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-sm font-semibold text-[#111827]">
          <Building2 className="w-4 h-4 text-[#2563EB]" />
          <span>Active Organization Workspace</span>
        </div>
        <p className="text-xs text-[#6B7280]">
          Each organization has an isolated financial workspace with dedicated spending policies and payment rails.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {orgs.map((org) => {
            const isSelected = org.id === currentOrg?.id;
            return (
              <div
                key={org.id}
                onClick={() => !isSelected && handleSwitchOrg(org.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#2563EB] bg-[#EFF6FF] shadow-sm'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">{org.name}</span>
                  {isSelected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB] text-white font-medium">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  Single Limit: ${org.single_transaction_limit?.toFixed(2)} &bull; {org.environment}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spending Governance Form */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 text-sm font-semibold text-[#111827]">
          <Sliders className="w-4 h-4 text-[#2563EB]" />
          <span>Spending Governance & Caps</span>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] text-xs text-[#15803D] rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Workspace policy caps updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Single Transaction Cap ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={singleLimit}
                onChange={(e) => setSingleLimit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none"
              />
              <span className="text-[10px] text-[#6B7280] mt-1 block">
                Purchases exceeding this amount are blocked automatically by Guardrail #1.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Daily Spend Limit ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none"
              />
              <span className="text-[10px] text-[#6B7280] mt-1 block">
                Rolling 24-hour velocity ceiling across all agents in this organization.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Policy Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payment Gateway Authorization */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-sm font-semibold text-[#111827]">
          <CreditCard className="w-4 h-4 text-[#2563EB]" />
          <span>Payment Gateway Connection</span>
        </div>

        <p className="text-xs text-[#6B7280] leading-relaxed">
          Connect your organization's PayPal merchant account. Payments are settled using official PayPal Orders v2 APIs.
        </p>

        <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#111827]">Zero-Trust Security Guarantee:</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D]">
              Secured
            </span>
          </div>
          <ul className="text-[11px] text-[#64748B] space-y-1 list-disc list-inside">
            <li>Never request or store raw card numbers, CVVs, or online banking passwords.</li>
            <li>Platform PayPal Client Secrets remain protected exclusively on the backend.</li>
            <li>All checkout disbursements require dual-custody approval before capture.</li>
          </ul>
        </div>

        {connectSuccess && (
          <div className="p-3 bg-[#F0FDF4] border border-[#DCFCE7] text-xs text-[#15803D] rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Payment account settings updated!</span>
          </div>
        )}

        <form onSubmit={handleConnectPayment} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Authorized Finance / Merchant Email
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1.5">
                Environment Rail
              </label>
              <select
                value={paymentEnv}
                onChange={(e) => setPaymentEnv(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D1D5DB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none bg-white"
              >
                <option value="sandbox">PayPal Sandbox (Testing & Validation)</option>
                <option value="live">PayPal Live (Production Commerce)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#0070BA] hover:bg-[#005EA6] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Update Payment Rails</span>
          </button>
        </form>
      </div>
    </div>
  );
}
