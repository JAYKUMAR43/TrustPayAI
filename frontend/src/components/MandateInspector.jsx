import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, Zap, AlertTriangle, CheckCircle2, Lock, FileCode, RefreshCw } from 'lucide-react';
import { fetchMandate, testMandateTamper } from '../api';

export default function MandateInspector({ activeMandateId }) {
  const [mandateIdInput, setMandateIdInput] = useState(activeMandateId || '');
  const [mandate, setMandate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tamper lab inputs
  const [tamperAmount, setTamperAmount] = useState('');
  const [tamperVendor, setTamperVendor] = useState('');
  const [tamperResult, setTamperResult] = useState(null);
  const [isTampering, setIsTampering] = useState(false);

  useEffect(() => {
    if (activeMandateId) {
      setMandateIdInput(activeMandateId);
      loadMandate(activeMandateId);
    }
  }, [activeMandateId]);

  const loadMandate = async (idToFetch) => {
    if (!idToFetch) return;
    setLoading(true);
    setError(null);
    setTamperResult(null);
    try {
      const data = await fetchMandate(idToFetch);
      setMandate(data);
      setTamperAmount(data.max_authorized_amount ? (data.max_authorized_amount * 5).toFixed(2) : '5000.00');
      setTamperVendor('evil-hacker-exploit.xyz');
    } catch (err) {
      setError(err.message || 'Mandate not found');
      setMandate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!mandate) return;
    setIsTampering(true);
    try {
      const res = await testMandateTamper({
        mandate_id: mandate.mandate_id,
        tampered_amount: tamperAmount ? parseFloat(tamperAmount) : null,
        tampered_vendor: tamperVendor || null
      });
      setTamperResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTampering(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Cryptographic Mandate Inspector & Tamper Lab</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                HMAC-SHA256 Sealed
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Inspect cryptographic nonces, canonical intent digests, and simulate adversary payload alterations
            </p>
          </div>
        </div>

        {/* Mandate search input */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={mandateIdInput}
            onChange={(e) => setMandateIdInput(e.target.value)}
            placeholder="Paste Mandate ID (mandate_...)"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none w-56 sm:w-64"
          />
          <button
            onClick={() => loadMandate(mandateIdInput)}
            disabled={loading || !mandateIdInput}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {!mandate ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800">
          <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-mono text-slate-400">
            Enter a mandate ID or click "Inspect Proof" on any purchase above to view cryptographic parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Mandate Cryptographic Token Card */}
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-slate-300">
                MANDATE IDENTIFIER: <span className="text-indigo-400">{mandate.mandate_id}</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SIGNATURE VALID</span>
                </span>
                {mandate.is_approved_by_human && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    HUMAN APPROVED
                  </span>
                )}
                {mandate.is_executed && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    EXECUTED & CLOSED
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">INTENT DIGEST (SHA-256)</span>
                  <span className="text-emerald-400 break-all select-all font-bold">{mandate.intent_hash}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CRYPTOGRAPHIC NONCE</span>
                  <span className="text-indigo-300 break-all select-all">{mandate.nonce}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MAX AUTHORIZED AMOUNT</span>
                  <span className="text-white font-bold">${mandate.max_authorized_amount.toFixed(2)} {mandate.currency}</span>
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">HMAC-SHA256 SIGNATURE</span>
                  <span className="text-amber-400 break-all select-all font-bold">{mandate.signature}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ISSUED AT / EXPIRES AT</span>
                  <span className="text-slate-300">
                    {new Date(mandate.issued_at).toLocaleTimeString()} → {new Date(mandate.expires_at).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">LINKED PURCHASE REQUEST</span>
                  <span className="text-slate-300">{mandate.purchase_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adversary Tamper Simulation Lab */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-purple-500/30 relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-bold text-purple-300 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Adversary Tamper Simulation Playground</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Tests that any post-issuance modification is rejected by HMAC math
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-4">
              Simulate an adversary intercepting this mandate token in transit and tampering with the purchase amount or merchant domain before it hits the PayPal gateway.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Tamper Amount ($):
                </label>
                <input
                  type="number"
                  value={tamperAmount}
                  onChange={(e) => setTamperAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  Tamper Merchant Domain:
                </label>
                <input
                  type="text"
                  value={tamperVendor}
                  onChange={(e) => setTamperVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateTamper}
              disabled={isTampering}
              className="py-2.5 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isTampering ? 'Verifying HMAC Signature...' : 'Simulate Adversary Attack & Test Verification'}</span>
            </button>

            {/* Tamper Test Output Result */}
            {tamperResult && (
              <div className={`mt-4 p-4 rounded-xl text-xs font-mono border ${
                tamperResult.tamper_detected
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              }`}>
                <div className="flex items-center space-x-2 font-bold mb-2">
                  {tamperResult.tamper_detected ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="text-rose-400">TAMPER ATTEMPT DETECTED & PREVENTED</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">SIGNATURE UNALTERED</span>
                    </>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400">Original Intent Digest:</span>{' '}
                    <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">{tamperResult.original_intent_hash}</code>
                  </div>
                  <div>
                    <span className="text-slate-400">Computed Tampered Digest:</span>{' '}
                    <code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">{tamperResult.computed_intent_hash}</code>
                  </div>
                  <div>
                    <span className="text-slate-400">HMAC-SHA256 Match:</span>{' '}
                    <strong className={tamperResult.signature_verified ? 'text-emerald-400' : 'text-rose-400'}>
                      {tamperResult.signature_verified ? 'VERIFIED' : 'FAILED - SIGNATURE INVALID'}
                    </strong>
                  </div>
                  {tamperResult.failure_reason && (
                    <div className="mt-2 text-rose-300 bg-rose-900/30 p-2 rounded border border-rose-500/30">
                      <strong>Rejection Rationale:</strong> {tamperResult.failure_reason}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
