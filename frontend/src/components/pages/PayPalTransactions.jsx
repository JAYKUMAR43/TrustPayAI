import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  DollarSign, 
  Lock,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  Card, 
  Badge, 
  Button, 
  ErrorBanner, 
  SkeletonLoader, 
  EmptyState,
  StatusBadge,
  RiskScoreBadge
} from '../common/UIComponents';
import { TransactionDetailsDrawer } from '../common/TransactionDetailsDrawer';
import { fetchTransactions, getPayPalOrderStatus } from '../../api';

export function PayPalTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkingOrderId, setCheckingOrderId] = useState(null);
  const [liveStatusDetails, setLiveStatusDetails] = useState(null);
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function loadTransactions() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchTransactions(0, 100);
      const items = Array.isArray(data) ? data : (data?.items || []);
      setTransactions(items);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load PayPal transactions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function handleVerifyLivePayPalOrder(e, orderId) {
    e.stopPropagation();
    if (!orderId) return;
    setCheckingOrderId(orderId);
    setLiveStatusDetails(null);
    try {
      const statusData = await getPayPalOrderStatus(orderId);
      setLiveStatusDetails({ orderId, data: statusData });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to query live PayPal order');
    } finally {
      setCheckingOrderId(null);
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      (tx.requested_product || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.agent_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.vendor_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.paypal_order_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const s = (tx.transaction_status || '').toUpperCase();
    if (statusFilter === 'CAPTURED') return s === 'CAPTURED' || s === 'COMPLETED';
    if (statusFilter === 'REJECTED') return s === 'REJECTED' || s === 'BLOCKED';
    if (statusFilter === 'PENDING') return s === 'PENDING' || s === 'PENDING_BUYER_APPROVAL' || s === 'AWAITING_REVIEW';
    if (statusFilter === 'APPROVED') return s === 'APPROVED' || s === 'AUTHORIZED';
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#356AE6]" />
            PayPal Transactions & Settlement Ledger
          </h2>
          <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1">
            PayPal REST Orders v2 settlement tracking, cryptographic mandate verification, and immutable audit links.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={loadTransactions}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadTransactions} />

      {/* Live PayPal Status Modal */}
      {liveStatusDetails && (
        <Card 
          title={`Live PayPal Sandbox Status: ${liveStatusDetails.orderId}`} 
          subtitle="Queried directly from PayPal Sandbox REST API v2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono mb-4">
            <div className="p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28]">
              <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] font-sans">Order Status</span>
              <span className="text-[#16865C] font-bold">{liveStatusDetails.data.status}</span>
            </div>
            <div className="p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28]">
              <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] font-sans">Payment Intent</span>
              <span className="text-[#172033] dark:text-[#F2F4F7]">{liveStatusDetails.data.intent || 'CAPTURE'}</span>
            </div>
            <div className="p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28]">
              <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] font-sans">Environment</span>
              <span className="text-[#356AE6]">api-m.sandbox.paypal.com</span>
            </div>
            <div className="p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28]">
              <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] font-sans">Idempotency</span>
              <span className="text-[#16865C] font-bold">PayPal-Request-Id</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLiveStatusDetails(null)}>
            Dismiss Inspector
          </Button>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            placeholder="Search by product, agent, vendor, order ID or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347] rounded-lg text-xs text-[#172033] dark:text-[#F2F4F7] placeholder-[#98A2B3] focus:outline-none focus:border-[#356AE6]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#667085] dark:text-[#98A2B3] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'CAPTURED', 'APPROVED', 'PENDING', 'REJECTED'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === filterKey
                  ? 'bg-[#356AE6] text-white shadow-xs'
                  : 'bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[#667085] dark:text-[#98A2B3] hover:text-[#172033] dark:hover:text-[#F2F4F7]'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      {/* Main Transactions Table */}
      <Card 
        title={`All Financial Transactions (${filteredTransactions.length})`}
        subtitle="Click any row to open the full cryptographic mandate and payment trace"
      >
        {loading ? (
          <SkeletonLoader rows={6} />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No matching transactions found"
            description={searchTerm || statusFilter !== 'ALL' ? "No records match your search or filter parameters." : "Submit a procurement request via the AI Procurement Console to populate the financial ledger."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#E7EAF0] dark:border-[#243347] text-[#667085] dark:text-[#98A2B3] font-medium text-[11px] uppercase tracking-wider bg-[#F8F9FB] dark:bg-[#141C28]">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Product & Purpose</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">PayPal Order ID</th>
                  <th className="py-2.5 px-3">Settlement</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAF0] dark:divide-[#243347]">
                {filteredTransactions.map((tx) => {
                  const txId = tx.transaction_id || tx.id;
                  return (
                    <tr 
                      key={txId} 
                      onClick={() => setSelectedTxId(txId)}
                      className="hover:bg-[#F8F9FB] dark:hover:bg-[#1F2C3F] transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-3 text-[#356AE6] font-mono font-medium truncate max-w-[120px]">
                        {txId}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#172033] dark:text-[#F2F4F7] group-hover:text-[#356AE6] transition-colors">
                          {tx.requested_product || tx.item_name || 'N/A'}
                        </div>
                        <div className="text-[11px] text-[#667085] dark:text-[#98A2B3]">
                          {tx.vendor_id || tx.vendor_domain}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#667085] dark:text-[#98A2B3]">
                        <span className="px-2 py-0.5 rounded bg-[#F2F4F7] dark:bg-[#1F2C3F] text-[11px] font-mono">
                          {tx.agent_id}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#172033] dark:text-[#F2F4F7]">
                        ${Number(tx.requested_amount || tx.amount || 0).toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-[#667085] dark:text-[#98A2B3]">{tx.currency || 'USD'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <RiskScoreBadge score={tx.risk_score} />
                      </td>
                      <td className="py-3 px-3">
                        {tx.paypal_order_id ? (
                          <span 
                            className="text-[#356AE6] hover:underline cursor-pointer font-mono text-[11px]" 
                            onClick={(e) => handleVerifyLivePayPalOrder(e, tx.paypal_order_id)}
                          >
                            {tx.paypal_order_id}
                          </span>
                        ) : (
                          <span className="text-[#98A2B3] text-[11px]">Unbound</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={tx.transaction_status || tx.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTxId(txId);
                          }}
                          aria-label="Inspect transaction trace"
                          className="p-1 rounded text-[#667085] hover:text-[#172033] dark:hover:text-[#F2F4F7] hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Interactive Detail Drawer */}
      <TransactionDetailsDrawer
        transactionId={selectedTxId}
        isOpen={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
}
