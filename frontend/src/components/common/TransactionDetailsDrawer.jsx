import React, { useState, useEffect } from 'react';
import { 
  DrawerModal, 
  StatusBadge, 
  RiskScoreBadge, 
  Button, 
  SkeletonLoader, 
  ErrorBanner 
} from './UIComponents';
import { fetchTransactionTrace } from '../../api';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Key, 
  CreditCard, 
  History, 
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  Lock
} from 'lucide-react';

export function TransactionDetailsDrawer({ transactionId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      loadTrace();
    } else {
      setData(null);
      setError(null);
      setActiveTab('overview');
    }
  }, [isOpen, transactionId]);

  const loadTrace = async () => {
    setLoading(true);
    setError(null);
    try {
      const trace = await fetchTransactionTrace(transactionId);
      setData(trace);
    } catch (err) {
      setError(err.message || 'Failed to load transaction trace');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'checks', label: 'Policy Checks', count: data?.policy_checks?.length, icon: ShieldCheck },
    { id: 'risk', label: 'Risk Findings', icon: ShieldAlert },
    { id: 'mandate', label: 'Mandate & Crypto', icon: Key },
    { id: 'paypal', label: 'PayPal Settlement', icon: CreditCard },
    { id: 'audit', label: 'Audit Trail', count: data?.audit_history?.length, icon: History },
  ];

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Security & Settlement Trace"
      subtitle={transactionId ? `TXID: ${transactionId}` : ''}
      size="xl"
    >
      {loading && <SkeletonLoader rows={8} />}
      {error && <ErrorBanner message={error} onRetry={loadTrace} />}

      {data && !loading && (
        <div className="space-y-6">
          {/* Top Summary Banner */}
          <div className="p-4 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={data.unified_status} />
              <span className="text-xl font-bold text-[#172033] dark:text-[#F2F4F7]">
                ${Number(data.amount).toFixed(2)} <span className="text-xs font-normal text-[#667085] dark:text-[#98A2B3]">{data.currency}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#667085] dark:text-[#98A2B3]">Risk Evaluation:</span>
              <RiskScoreBadge score={data.risk_score} />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#E7EAF0] dark:border-[#243347] space-x-1 overflow-x-auto pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-[#356AE6] text-[#356AE6] font-semibold bg-[#EEF4FF] dark:bg-[#1E293B]'
                      : 'border-transparent text-[#667085] dark:text-[#98A2B3] hover:text-[#172033] dark:hover:text-[#F2F4F7]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3]">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW & AGENT REQUEST */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Agent Request Details */}
              <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#98A2B3] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#356AE6]" />
                    Autonomous Agent Procurement Request
                  </h4>
                  <span className="text-xs text-[#356AE6] font-medium">Agent: {data.agent_request?.agent_id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] block mb-0.5">Agent Name</span>
                    <span className="font-semibold text-[#172033] dark:text-[#F2F4F7]">{data.agent_request?.agent_name || 'Autonomous Agent'}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] block mb-0.5">Product / Service</span>
                    <span className="font-semibold text-[#172033] dark:text-[#F2F4F7]">{data.agent_request?.product_name}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] block mb-0.5">Product Category</span>
                    <span className="text-[#172033] dark:text-[#F2F4F7]">{data.agent_request?.category}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] block mb-0.5">Target Vendor</span>
                    <span className="font-semibold text-[#172033] dark:text-[#F2F4F7]">{data.agent_request?.vendor_name} ({data.agent_request?.vendor_domain})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E7EAF0] dark:border-[#243347]">
                  <span className="text-[#667085] dark:text-[#98A2B3] text-xs block mb-1">Agent Justification</span>
                  <p className="text-xs text-[#344054] dark:text-[#D0D5DD] bg-[#F8F9FB] dark:bg-[#141C28] p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] leading-relaxed">
                    "{data.agent_request?.justification || 'No justification recorded'}"
                  </p>
                </div>
              </div>

              {/* Lifecycle Progress Flow */}
              <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-5 shadow-xs">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#98A2B3] mb-4">
                  Financial Pipeline Verification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#BCE5D5] dark:border-[#1A3F37] bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C]">
                    <span className="font-bold block mb-1">1. Policy Check</span>
                    <span className="text-[11px] opacity-85">10 Guardrails Passed</span>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs ${
                    data.mandate_verification?.is_valid 
                      ? 'border-[#BCE5D5] dark:border-[#1A3F37] bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C]'
                      : 'border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] text-[#667085]'
                  }`}>
                    <span className="font-bold block mb-1">2. Signed Mandate</span>
                    <span className="text-[11px] opacity-85">{data.mandate_verification ? 'HMAC Signed' : 'Not Issued'}</span>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs ${
                    data.approval_status === 'APPROVED' || data.approval_status === 'APPROVED_BY_HUMAN' || data.mandate_verification?.is_approved_by_human
                      ? 'border-[#BCE5D5] dark:border-[#1A3F37] bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C]'
                      : 'border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] text-[#667085]'
                  }`}>
                    <span className="font-bold block mb-1">3. Human Review</span>
                    <span className="text-[11px] opacity-85">{data.approval_status || 'Pending'}</span>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs ${
                    data.unified_status === 'PAYMENT_CAPTURED'
                      ? 'border-[#BCE5D5] dark:border-[#1A3F37] bg-[#EBF7F2] dark:bg-[#122A25] text-[#16865C]'
                      : (data.paypal_order?.order_id ? 'border-[#D0E0FD] dark:border-[#2E3C54] bg-[#EEF4FF] dark:bg-[#1E293B] text-[#356AE6]' : 'border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] text-[#667085]')
                  }`}>
                    <span className="font-bold block mb-1">4. PayPal Settlement</span>
                    <span className="text-[11px] opacity-85">{data.unified_status === 'PAYMENT_CAPTURED' ? 'Settled' : 'Pending Capture'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POLICY CHECKS (10 VERIFICATIONS) */}
          {activeTab === 'checks' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#98A2B3] mb-2">
                <span>Guardrail Evaluator Results</span>
                <span className="text-[#16865C] font-semibold">10 Policy Guardrails Configured</span>
              </div>
              {data.policy_checks?.map((check) => (
                <div
                  key={check.id}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                    check.passed 
                      ? 'border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230]' 
                      : 'border-[#F7C4C8] dark:border-[#4B2529] bg-[#FDF2F2] dark:bg-[#2E191B]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#16865C] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D94B55] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7] block">{check.name}</span>
                      <span className="text-xs text-[#667085] dark:text-[#98A2B3]">{check.details}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    check.passed ? 'bg-[#EBF7F2] text-[#16865C]' : 'bg-[#FDF2F2] text-[#D94B55]'
                  }`}>
                    {check.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RISK FINDINGS */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#667085] dark:text-[#98A2B3] block mb-1">Composite Risk Assessment</span>
                  <div className="flex items-center gap-2">
                    <RiskScoreBadge score={data.risk_findings?.overall_score} />
                    <span className="text-xs font-medium text-[#172033] dark:text-[#F2F4F7]">
                      Level: {data.risk_findings?.risk_level}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-[#667085] dark:text-[#98A2B3]">
                  Calculated by TrustPay Risk Engine
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#98A2B3]">
                  Recorded Risk Events ({data.risk_findings?.events?.length || 0})
                </h4>
                {(!data.risk_findings?.events || data.risk_findings.events.length === 0) ? (
                  <div className="p-6 text-center text-xs text-[#667085] dark:text-[#98A2B3] border border-dashed border-[#E7EAF0] dark:border-[#243347] rounded-xl bg-[#F8F9FB] dark:bg-[#141C28]">
                    No abnormal risk flags recorded for this transaction.
                  </div>
                ) : (
                  data.risk_findings.events.map((evt, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#172033] dark:text-[#F2F4F7]">{evt.event_type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          evt.severity === 'CRITICAL' ? 'bg-[#FDF2F2] text-[#D94B55]' : 'bg-[#FEF7EB] text-[#C58B24]'
                        }`}>
                          {evt.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#667085] dark:text-[#98A2B3]">{evt.description}</p>
                      <span className="text-[10px] text-[#98A2B3] block">{evt.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MANDATE & CRYPTO */}
          {activeTab === 'mandate' && (
            <div className="space-y-4">
              {!data.mandate_verification ? (
                <div className="p-6 text-center text-xs text-[#667085] dark:text-[#98A2B3] border border-dashed border-[#E7EAF0] dark:border-[#243347] rounded-xl">
                  No cryptographic spending mandate issued.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    data.mandate_verification.is_valid
                      ? 'border-[#BCE5D5] bg-[#EBF7F2] text-[#16865C]'
                      : 'border-[#F7C4C8] bg-[#FDF2F2] text-[#D94B55]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {data.mandate_verification.is_valid ? (
                        <ShieldCheck className="w-5 h-5 text-[#16865C]" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-[#D94B55]" />
                      )}
                      <div>
                        <span className="font-bold text-sm block">
                          {data.mandate_verification.is_valid ? 'Cryptographic Signature Valid' : 'Signature / Expiration Violation'}
                        </span>
                        <span className="text-xs opacity-90">{data.mandate_verification.verification_reason}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-[#172033] border border-[#E7EAF0]">
                      HMAC-SHA256
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-2">
                      <span className="text-[#667085] dark:text-[#98A2B3]">Mandate ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#356AE6] font-mono font-medium">{data.mandate_verification.mandate_id}</span>
                        <button 
                          onClick={() => copyToClipboard(data.mandate_verification.mandate_id, 'm_id')}
                          className="text-[#667085] hover:text-[#172033] cursor-pointer"
                        >
                          {copiedKey === 'm_id' ? <Check className="w-3.5 h-3.5 text-[#16865C]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-2">
                      <span className="text-[#667085] dark:text-[#98A2B3]">Single-Use Nonce</span>
                      <span className="text-[#172033] dark:text-[#F2F4F7] font-mono">{data.mandate_verification.nonce}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-2">
                      <span className="text-[#667085] dark:text-[#98A2B3]">Authorized Limit</span>
                      <span className="text-[#16865C] font-bold font-mono">${Number(data.mandate_verification.max_authorized_amount).toFixed(2)} {data.mandate_verification.currency}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-2">
                      <span className="text-[#667085] dark:text-[#98A2B3]">Expires At</span>
                      <span className="text-[#C58B24] font-medium">{data.mandate_verification.expires_at}</span>
                    </div>

                    <div>
                      <span className="text-[#667085] dark:text-[#98A2B3] block mb-1">HMAC-SHA256 Signature</span>
                      <div className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347] break-all text-[#172033] dark:text-[#F2F4F7] text-[11px] font-mono">
                        {data.mandate_verification.signature}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYPAL SETTLEMENT */}
          {activeTab === 'paypal' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E7EAF0] dark:border-[#243347] pb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085] dark:text-[#98A2B3] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#356AE6]" />
                    PayPal Sandbox Orders v2 Gateway
                  </h4>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#EEF4FF] text-[#356AE6] border border-[#D0E0FD]">
                    {data.paypal_order?.is_sandbox ? 'PayPal Sandbox Mode' : 'Live PayPal'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] font-sans block mb-0.5">PayPal Order ID</span>
                    <span className="text-[#356AE6] font-semibold">{data.paypal_order?.order_id || 'Not Yet Created'}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] font-sans block mb-0.5">PayPal Capture ID</span>
                    <span className="text-[#16865C] font-semibold">{data.paypal_order?.capture_id || 'Not Captured'}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] font-sans block mb-0.5">Intent</span>
                    <span className="text-[#172033] dark:text-[#F2F4F7]">{data.paypal_order?.intent || 'CAPTURE'}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] dark:text-[#98A2B3] font-sans block mb-0.5">Order Status</span>
                    <span className="text-[#172033] dark:text-[#F2F4F7]">{data.paypal_order?.status}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E7EAF0] dark:border-[#243347] text-xs">
                  <span className="text-[#667085] dark:text-[#98A2B3] block mb-1">Idempotency & Rail</span>
                  <div className="p-3 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347] font-mono text-[#344054] dark:text-[#D0D5DD]">
                    Idempotency Key: {data.payment_status?.idempotency_key || 'N/A'}<br />
                    Settlement Rail: {data.payment_status?.settlement_rail}<br />
                    Amount Settled: ${Number(data.payment_status?.amount_captured || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#98A2B3]">
                <span>Cryptographic Immutable Audit Chain</span>
                <span className="text-[#16865C] font-medium">SHA-256 Hash Chain</span>
              </div>

              {(!data.audit_history || data.audit_history.length === 0) ? (
                <div className="p-6 text-center text-xs text-[#667085] dark:text-[#98A2B3] border border-dashed border-[#E7EAF0] dark:border-[#243347] rounded-xl">
                  No linked audit blocks found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.audit_history.map((block) => (
                    <div key={block.block_index} className="p-3.5 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[10px] font-semibold text-[#344054] dark:text-[#D0D5DD]">
                            Block #{block.block_index}
                          </span>
                          <span className="font-semibold text-[#172033] dark:text-[#F2F4F7]">{block.event_type}</span>
                        </div>
                        <span className="text-[11px] text-[#667085] dark:text-[#98A2B3]">Actor: {block.actor}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-[#667085] dark:text-[#98A2B3] bg-[#F8F9FB] dark:bg-[#141C28] p-2 rounded-lg border border-[#E7EAF0] dark:border-[#243347]">
                        <div className="truncate">Prev: {block.prev_hash}</div>
                        <div className="truncate text-[#16865C]">Curr: {block.curr_hash}</div>
                      </div>

                      <span className="text-[10px] text-[#98A2B3] block">{block.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DrawerModal>
  );
}
