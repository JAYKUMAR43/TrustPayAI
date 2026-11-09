import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, CheckCircle2, RefreshCw, KeyRound, Search, ExternalLink, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Card, Badge, Button, ErrorBanner, SkeletonLoader, EmptyState } from '../common/UIComponents';
import { fetchAuditLogs, verifyAuditChain } from '../../api';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      const list = Array.isArray(data) ? data : (data?.items || []);
      setLogs(list);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyChain() {
    setVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerification(res);
    } catch (err) {
      setErrorMessage(err.message || 'Audit chain verification failed');
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  function handleCopy(text) {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.event_type && log.event_type.toLowerCase().includes(q)) ||
      (log.actor && log.actor.toLowerCase().includes(q)) ||
      (log.current_hash && log.current_hash.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#356AE6] font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="tracking-wide uppercase text-[11px]">Tamper-Evident SHA-256 Chain</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">
            Cryptographic Audit Ledger
          </h2>
          <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1 max-w-2xl leading-relaxed">
            Immutable hash-chained journal recording every agent proposal, guardrail decision, dual-custody approval, and PayPal Sandbox capture.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="sm" onClick={handleVerifyChain} loading={verifying}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Verify Chain Integrity
          </Button>
          <Button variant="secondary" size="sm" onClick={loadLogs}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadLogs} />

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`rounded-xl border p-5 shadow-sm transition-all ${
            verification.is_valid
              ? 'border-[#16865C]/30 bg-[#16865C]/5 text-[#16865C]'
              : 'border-[#D94B55]/30 bg-[#D94B55]/5 text-[#D94B55]'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${verification.is_valid ? 'text-[#16865C]' : 'text-[#D94B55]'}`} />
              <div>
                <span className="font-bold text-[#172033] dark:text-[#F2F4F7] text-sm block">
                  {verification.is_valid ? 'Ledger Chain Cryptographically Valid' : 'Integrity Compromise Detected'}
                </span>
                <span className="text-[#667085] dark:text-[#98A2B3] text-xs">
                  {verification.verified_blocks} consecutive blocks verified via SHA-256 hash chaining. Genesis to head intact.
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border ${
                verification.is_valid
                  ? 'bg-[#16865C]/10 text-[#16865C] border-[#16865C]/20'
                  : 'bg-[#D94B55]/10 text-[#D94B55] border-[#D94B55]/20'
              }`}
            >
              {verification.is_valid ? 'ZERO TAMPERING DETECTED' : 'CHAIN COMPROMISED'}
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] dark:text-[#98A2B3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit events, actors, or block hashes..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] text-[#172033] dark:text-[#F2F4F7] outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
          />
        </div>
        <div className="text-xs text-[#667085] dark:text-[#98A2B3] font-mono">
          Showing {filteredLogs.length} of {logs.length} blocks
        </div>
      </div>

      {/* Audit Blocks Table / List */}
      <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E7EAF0] dark:border-[#243347] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm">Sequential Cryptographic Journal</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#98A2B3]">All changes are append-only and immutable</p>
          </div>
          <Badge variant="blue">SHA-256 Sealed</Badge>
        </div>

        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={6} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="No audit entries found"
              description="All verified actions and payment workflows will be immutably recorded here."
            />
          </div>
        ) : (
          <div className="divide-y divide-[#E7EAF0] dark:divide-[#243347]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-[#F7F8FA]/60 dark:hover:bg-[#101828]/40 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="text-[#667085] hover:text-[#172033] dark:hover:text-[#F2F4F7] p-1 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-[#172033] dark:text-[#F2F4F7]">
                            {log.event_type}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#356AE6]/10 text-[#356AE6] border border-[#356AE6]/20 font-medium">
                            {log.actor}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#667085] dark:text-[#98A2B3] mt-0.5">
                          {new Date(log.timestamp || log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-mono text-[#667085] dark:text-[#98A2B3]">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] uppercase font-semibold text-[#667085]">Hash:</span>
                        <span className="text-[#172033] dark:text-[#F2F4F7] truncate max-w-[140px] sm:max-w-[180px]">
                          {log.current_hash ? log.current_hash.substring(0, 16) + '...' : 'SEALED'}
                        </span>
                        {log.current_hash && (
                          <button
                            type="button"
                            onClick={() => handleCopy(log.current_hash)}
                            className="p-1 hover:text-[#356AE6] transition-colors"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === log.current_hash ? <Check className="w-3 h-3 text-[#16865C]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Block Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#E7EAF0] dark:border-[#243347] space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                        <div className="p-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
                          <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] uppercase block font-semibold mb-0.5">
                            Previous Block Hash
                          </span>
                          <span className="text-[#172033] dark:text-[#F2F4F7] break-all">
                            {log.previous_hash || '0000000000000000000000000000000000000000000000000000000000000000 (GENESIS)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
                          <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] uppercase block font-semibold mb-0.5">
                            Current Block Hash
                          </span>
                          <span className="text-[#356AE6] break-all font-semibold">
                            {log.current_hash || 'SHA-256 SEALED'}
                          </span>
                        </div>
                      </div>

                      {log.details && (
                        <div>
                          <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] uppercase font-semibold block mb-1">
                            Block Payload Data:
                          </span>
                          <pre className="p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347] text-[11px] font-mono text-[#172033] dark:text-[#F2F4F7] overflow-x-auto max-h-60">
                            {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
