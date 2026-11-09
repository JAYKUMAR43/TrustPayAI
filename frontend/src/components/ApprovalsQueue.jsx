import React, { useState } from 'react';
import { Check, X, CreditCard, ShieldCheck, AlertTriangle, KeyRound, ExternalLink, Loader2, ArrowUpRight } from 'lucide-react';
import { approvePurchase, rejectPurchase, createPayPalOrder, capturePayPalOrder } from '../api';

export default function ApprovalsQueue({ purchases, onActionCompleted, onSelectMandate }) {
  const [processingId, setProcessingId] = useState(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Filter pending or authorized purchases
  const actionablePurchases = purchases.filter(p =>
    ['PENDING_HUMAN_APPROVAL', 'AUTHORIZED'].includes(p.status)
  );

  const handleApprove = async (p) => {
    setProcessingId(p.id);
    setActionError(null);
    try {
      await approvePurchase(p.id, p.mandate_id);
      onActionCompleted();
    } catch (err) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (p) => {
    setProcessingId(p.id);
    setActionError(null);
    try {
      await rejectPurchase(p.id, p.mandate_id, 'admin@trustpay.internal', 'Manual reviewer override: Rejected in review desk');
      onActionCompleted();
    } catch (err) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecutePayPal = async (p) => {
    setProcessingId(p.id);
    setActionError(null);
    try {
      // Step 1: Create Order
      const orderRes = await createPayPalOrder(p.id, p.mandate_id);
      
      // Step 2: Capture Order
      const captureRes = await capturePayPalOrder(p.id, p.mandate_id, orderRes.paypal_order_id);
      
      setPaymentSuccessData({
        purchase: p,
        paypal_order_id: captureRes.paypal_order_id,
        paypal_capture_id: captureRes.paypal_capture_id,
        amount: captureRes.amount,
        currency: captureRes.currency,
        message: captureRes.message
      });
      onActionCompleted();
    } catch (err) {
      setActionError(err.message || 'PayPal execution failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Human-in-the-Loop Review Desk</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {actionablePurchases.length} Awaiting Action
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Mandatory human authorization gate before cryptographic PayPal settlement
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
          {actionError}
        </div>
      )}

      {/* Payment Success Receipt Banner */}
      {paymentSuccessData && (
        <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-mono">PayPal Payment Successfully Captured!</h4>
                <p className="text-xs text-slate-300 font-mono">
                  Order ID: <span className="text-white font-bold">{paymentSuccessData.paypal_order_id}</span> • 
                  Capture ID: <span className="text-emerald-400 font-bold">{paymentSuccessData.paypal_capture_id}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setPaymentSuccessData(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Settled: ${paymentSuccessData.amount?.toFixed(2)} {paymentSuccessData.currency}</span>
            <span className="text-emerald-400">Ledger Block Sealed & Appended</span>
          </div>
        </div>
      )}

      {actionablePurchases.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800">
          <ShieldCheck className="w-10 h-10 text-emerald-400/80 mx-auto mb-2" />
          <p className="text-sm font-mono text-slate-300 font-bold">Review Desk Clear</p>
          <p className="text-xs text-slate-500 font-mono mt-1">
            All agent purchase requests have been processed or sealed. Use the Agent Console to trigger a new procurement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actionablePurchases.map((p) => {
            const isProcessing = processingId === p.id;
            const isAuthorized = p.status === 'AUTHORIZED';

            return (
              <div
                key={p.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-white">
                      {p.item_name}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {p.category}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      p.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      p.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      RISK: {p.risk_score || 0}/100 ({p.risk_level || 'LOW'})
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono mb-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Agent: <strong className="text-slate-200">{p.agent_name}</strong></span>
                    <span>Merchant: <strong className="text-slate-200">{p.vendor_domain}</strong></span>
                    <span>Amount: <strong className="text-emerald-400">${p.amount.toFixed(2)} {p.currency}</strong></span>
                  </div>

                  <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded border border-slate-850">
                    "{p.justification}"
                  </p>

                  {p.mandate_id && (
                    <div className="mt-2 flex items-center space-x-2 text-[11px] font-mono text-indigo-400">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Mandate: {p.mandate_id.substring(0, 16)}...</span>
                      {onSelectMandate && (
                        <button
                          onClick={() => onSelectMandate(p.mandate_id)}
                          className="hover:underline flex items-center space-x-0.5 text-slate-400 hover:text-indigo-300"
                        >
                          <span>(Inspect Proof)</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                  {!isAuthorized ? (
                    <>
                      <button
                        onClick={() => handleApprove(p)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Approve Purchase</span>
                      </button>
                      <button
                        onClick={() => handleReject(p)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 font-mono text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-700 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleExecutePayPal(p)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Capturing PayPal Sandbox...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Execute PayPal Settlement</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
