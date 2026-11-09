import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw, Hash, Database, Link, ArrowDown } from 'lucide-react';
import { verifyAuditChain } from '../api';

export default function AuditLedger({ logs, onRefresh }) {
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterType, setFilterType] = useState('');

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({ is_valid: false, message: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredLogs = filterType ? logs.filter(l => l.event_type === filterType) : logs;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Immutable Hash-Chained Audit Ledger</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SHA-256 Chain
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Tamper-evident append-only ledger where every block seals the previous block hash
            </p>
          </div>
        </div>

        {/* Action: Verify Chain Integrity */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>Verify Chain Integrity</span>
        </button>
      </div>

      {/* Verification Seal Banner */}
      {verificationResult && (
        <div className={`mb-6 p-4 rounded-xl text-xs font-mono border flex items-center justify-between ${
          verificationResult.is_valid
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center space-x-3">
            {verificationResult.is_valid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">
                {verificationResult.is_valid ? 'LEDGER CRYPTOGRAPHICALLY INTACT' : 'CHAIN COMPROMISE DETECTED'}
              </p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {verificationResult.message}
              </p>
            </div>
          </div>
          <span className="text-slate-400 text-[10px]">
            {verificationResult.total_blocks} Blocks Verified
          </span>
        </div>
      )}

      {/* Event Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs font-mono">
        <span className="text-slate-500 text-[11px] mr-1">Filter:</span>
        {['', 'MANDATE_ISSUED', 'PAYPAL_ORDER_CREATED', 'PAYPAL_PAYMENT_CAPTURED', 'TAMPER_ATTEMPT_DETECTED', 'HUMAN_APPROVAL_GRANTED', 'REQUEST_REJECTED'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {type ? type.replace(/_/g, ' ') : 'All Events'}
          </button>
        ))}
      </div>

      {/* Block Stream */}
      <div className="space-y-3">
        {filteredLogs.map((b) => {
          const isTamper = b.event_type.includes('TAMPER');
          const isPayment = b.event_type.includes('PAYPAL') || b.event_type.includes('PAYMENT');
          const isApproved = b.event_type.includes('APPROVAL');
          const isRejected = b.event_type.includes('REJECTED');

          return (
            <div
              key={b.block_index}
              className={`p-4 rounded-xl border transition-all ${
                isTamper ? 'bg-rose-950/20 border-rose-500/40' :
                isPayment ? 'bg-emerald-950/10 border-emerald-500/30' :
                isRejected ? 'bg-rose-950/10 border-rose-500/20' :
                'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono mb-2 gap-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-bold border border-slate-700">
                    Block #{b.block_index}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    isTamper ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    isPayment ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    isApproved ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    isRejected ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {b.event_type}
                  </span>
                  <span className="text-slate-400">Actor: <strong className="text-slate-200">{b.actor}</strong></span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  {new Date(b.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Hashes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 mb-2">
                <div>
                  <span className="text-slate-500 block">PREVIOUS HASH:</span>
                  <span className="text-slate-400 truncate block">{b.prev_hash}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">CURRENT BLOCK HASH:</span>
                  <span className="text-emerald-400 truncate block font-bold">{b.curr_hash}</span>
                </div>
              </div>

              {/* Details JSON */}
              <div className="text-[11px] font-mono text-slate-300 bg-slate-950/40 p-2 rounded overflow-x-auto">
                <span className="text-slate-500 block text-[9px] mb-0.5 uppercase">Payload Digest Metadata:</span>
                {JSON.stringify(b.details)}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
