import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Terminal, 
  Lock, 
  Clock, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw,
  Flame
} from 'lucide-react';
import { 
  Card, 
  Badge, 
  Button, 
  ErrorBanner, 
  SkeletonLoader, 
  EmptyState,
  StatusBadge 
} from '../common/UIComponents';
import { fetchMandate, testMandateTamper, fetchHistory } from '../../api';

export function MandateManagement() {
  const [mandates, setMandates] = useState([]);
  const [selectedMandate, setSelectedMandate] = useState(null);
  const [tamperResult, setTamperResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tampering, setTampering] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  async function loadData() {
    setLoading(true);
    setErrorMessage('');
    try {
      const history = await fetchHistory();
      const list = Array.isArray(history) ? history : (history?.items || []);
      // Extract requests that have mandate_id
      const mandateList = list
        .filter((h) => h.mandate_id)
        .map((h) => ({
          mandate_id: h.mandate_id,
          purchase_id: h.id,
          agent_id: h.agent_id,
          amount: h.amount,
          currency: h.currency,
          item_name: h.item_name || h.product_name,
          vendor: h.vendor_domain || h.vendor_name,
          status: h.status
        }));
      setMandates(mandateList);
      if (mandateList.length > 0 && !selectedMandate) {
        inspectMandate(mandateList[0].mandate_id);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load mandate ledger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function inspectMandate(id) {
    try {
      const m = await fetchMandate(id);
      setSelectedMandate(m);
      setTamperResult(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to inspect mandate');
    }
  }

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  async function handleLiveVerify() {
    if (!selectedMandate) return;
    setVerifying(true);
    setTamperResult(null);
    try {
      const payload = {
        mandate_id: selectedMandate.mandate_id,
        tamper_type: 'NONE',
        simulated_value: null
      };
      const result = await testMandateTamper(payload);
      setTamperResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSimulateTamper(tamperType) {
    if (!selectedMandate) return;
    setTampering(true);
    setTamperResult(null);
    try {
      const payload = {
        mandate_id: selectedMandate.mandate_id,
        tamper_type: tamperType,
        simulated_value: tamperType === 'AMOUNT' ? 9999.00 : 'hacker-phishing.com'
      };
      const result = await testMandateTamper(payload);
      setTamperResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Tamper simulation failed');
    } finally {
      setTampering(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-teal-400" />
            Cryptographic Spending Mandate Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Canonical serialization, HMAC-SHA256 signatures, single-use nonce tracking, and timing-attack resilient verification.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadData}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Mandates
        </Button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Mandate List */}
        <Card title={`Issued Mandates (${mandates.length})`} subtitle="Authorized token inventory" className="lg:col-span-1">
          {loading ? (
            <SkeletonLoader rows={4} />
          ) : mandates.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No mandates issued"
              description="Approved purchases from the AI Procurement Console generate cryptographic mandates."
            />
          ) : (
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {mandates.map((m) => {
                const isSelected = selectedMandate?.mandate_id === m.mandate_id;
                return (
                  <button
                    key={m.mandate_id}
                    onClick={() => inspectMandate(m.mandate_id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500/60 bg-teal-950/25 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/30'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700/80 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-mono text-teal-400 font-semibold truncate max-w-[150px]">
                        {m.mandate_id}
                      </span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-xs text-slate-200 font-semibold truncate">{m.item_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1.5 flex justify-between">
                      <span className="font-bold text-slate-100">${Number(m.amount).toFixed(2)} {m.currency}</span>
                      <span className="text-slate-500">{m.vendor}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Columns: Mandate Inspector & Live Tamper Test */}
        <div className="lg:col-span-2 space-y-6">
          {selectedMandate ? (
            <>
              {/* Token Details */}
              <Card 
                title="Cryptographic Mandate Proof & Signature" 
                subtitle={`Canonical state for mandate ${selectedMandate.mandate_id}`}
                action={
                  <Button 
                    variant="teal" 
                    size="sm" 
                    loading={verifying}
                    onClick={handleLiveVerify}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Verify Signature
                  </Button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-slate-500 block text-[10px] font-sans uppercase mb-1">Mandate ID</span>
                    <div className="flex items-center justify-between">
                      <span className="text-teal-400 font-bold truncate">{selectedMandate.mandate_id}</span>
                      <button 
                        onClick={() => copyToClipboard(selectedMandate.mandate_id, 'mid')}
                        className="text-slate-400 hover:text-white ml-2"
                      >
                        {copiedKey === 'mid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-slate-500 block text-[10px] font-sans uppercase mb-1">Single-Use Nonce</span>
                    <div className="flex items-center justify-between">
                      <span className="text-purple-400 font-bold truncate">{selectedMandate.nonce}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {selectedMandate.is_executed ? 'Consumed' : 'Fresh'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-slate-500 block text-[10px] font-sans uppercase mb-1">Authorized Spending Ceiling</span>
                    <span className="text-teal-400 font-bold text-base">
                      ${Number(selectedMandate.max_authorized_amount || 0).toFixed(2)} {selectedMandate.currency || 'USD'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-slate-500 block text-[10px] font-sans uppercase mb-1">Expiration Window (TTL 15m)</span>
                    <span className="text-amber-400 block font-bold">
                      {new Date(selectedMandate.expires_at).toLocaleTimeString()} ({new Date(selectedMandate.expires_at).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
                    <span>HMAC-SHA256 Cryptographic Signature</span>
                    <span className="text-teal-400">Constant-Time Verified</span>
                  </div>
                  <div className="text-teal-400 break-all bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-[11px] select-all">
                    {selectedMandate.signature}
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50 font-mono text-[10px] text-slate-400">
                  <span className="text-slate-500 block mb-0.5 font-sans">Canonical Intent Hash:</span>
                  <span className="break-all text-slate-300">{selectedMandate.intent_hash}</span>
                </div>
              </Card>

              {/* Adversarial Tamper Resistance Benchmark */}
              <Card 
                title="Adversarial Tamper Simulation Lab" 
                subtitle="Verify that any modified byte invalidates the HMAC-SHA256 signature immediately"
              >
                <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
                  Simulate in-transit modifications by hostile actors attempting to inflate authorized amounts, change merchant accounts, or replay used nonces.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={tampering}
                    onClick={() => handleSimulateTamper('AMOUNT')}
                    className="border-rose-800 text-rose-300 hover:bg-rose-950/50"
                  >
                    Simulate Price Inflation ($9,999)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={tampering}
                    onClick={() => handleSimulateTamper('VENDOR')}
                    className="border-amber-800 text-amber-300 hover:bg-amber-950/50"
                  >
                    Simulate Vendor Hijacking
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={tampering}
                    onClick={() => handleSimulateTamper('NONCE')}
                    className="border-purple-800 text-purple-300 hover:bg-purple-950/50"
                  >
                    Simulate Nonce Replay Attack
                  </Button>
                </div>

                {tamperResult && (
                  <div className={`mt-4 p-4 rounded-xl border font-mono text-xs ${
                    tamperResult.is_valid
                      ? 'border-emerald-700/60 bg-emerald-950/30'
                      : 'border-rose-700/60 bg-rose-950/30'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {tamperResult.is_valid ? (
                        <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Signature Authentic & Verified
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4" /> Tamper Detected: Operation Intercepted
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 text-xs mb-2 leading-relaxed font-sans">
                      {tamperResult.message || tamperResult.reason}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span>Defense: hmac.compare_digest</span>
                      <span>Timing Attack Resistance: Active</span>
                    </div>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card title="Mandate Inspector">
              <EmptyState
                icon={Search}
                title="Select a mandate to inspect"
                description="View its cryptographic token payload, verify the HMAC signature, and run live tamper tests."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
