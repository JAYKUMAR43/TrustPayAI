import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Download,
  Check,
  X,
  Loader2,
  FileCode
} from 'lucide-react';
import {
  fetchHistory,
  fetchDatasetEntitlement,
  getDatasetDownloadUrl,
  approvePurchase,
  getStoredRole
} from '../../api';

export function PurchaseHistoryPage({ onOpenDetails }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const userRole = getStoredRole() || 'ORG_ADMIN';
  const canApprove = ['APPROVER', 'ORG_ADMIN', 'OWNER', 'ADMIN'].includes(userRole);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await fetchHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load purchase history:', e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleDownloadDataset(e, item) {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [item.id]: 'downloading' }));
    try {
      const entitlement = await fetchDatasetEntitlement(item.id);
      if (entitlement && entitlement.download_token) {
        const downloadUrl = getDatasetDownloadUrl(entitlement.download_token);
        window.open(downloadUrl, '_blank');
      } else {
        alert('No active download token available for this item.');
      }
    } catch (err) {
      alert(`Download failed: ${err.message || 'Verification required'}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: null }));
    }
  }

  async function handleApprovePending(e, item) {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [item.id]: 'approving' }));
    try {
      await approvePurchase(
        item.id,
        item.mandate_id,
        'approver_officer@trustpay.internal',
        'Authorized by Approver in Purchase History ledger'
      );
      await loadHistory();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [item.id]: null }));
    }
  }

  const filteredItems = history.filter((item) => {
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (filterStatus === 'PENDING' && !item.status?.includes('PENDING')) return false;
      if (filterStatus === 'REJECTED' && item.status !== 'REJECTED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.item_name?.toLowerCase().includes(q);
      const matchVendor =
        item.vendor_name?.toLowerCase().includes(q) || item.vendor_domain?.toLowerCase().includes(q);
      const matchId = item.id?.toLowerCase().includes(q);
      return matchName || matchVendor || matchId;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-[#F9FAFB] dark:bg-[#0B0F19] min-h-[calc(100vh-65px)] transition-colors">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Purchase History
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Verifiable record of all autonomous agent purchase requests, policy decisions, and PayPal settlements.
          </p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-white dark:bg-[#111827] border border-[#D1D5DB] dark:border-[#374151] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] text-xs font-medium text-[#374151] dark:text-[#D1D5DB] rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchases or vendors..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] dark:border-[#374151] focus:border-[#2563EB] dark:focus:border-[#3B82F6] focus:ring-1 focus:ring-[#2563EB] outline-none text-[#111827] dark:text-[#F9FAFB] bg-[#F9FAFB] dark:bg-[#0B0F19]"
          />
        </div>

        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'COMPLETED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filterStatus === st
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'
              }`}
            >
              {st === 'ALL'
                ? 'All Orders'
                : st === 'COMPLETED'
                ? 'Completed'
                : st === 'PENDING'
                ? 'Pending'
                : 'Blocked'}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-[#E5E7EB] dark:border-[#1F2937] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            <span>Loading real purchase records from database...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <div className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              No purchase records found
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-sm mx-auto">
              Start by typing a purchase instruction in the AI Assistant to generate and record your first procurement proposal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] dark:divide-[#1F2937]">
            {filteredItems.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isPending = item.status?.includes('PENDING');
              const isDataset =
                item.category === 'dataset' ||
                item.item_name?.toLowerCase().includes('dataset') ||
                item.item_name?.toLowerCase().includes('corpus');

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenDetails && onOpenDetails(item.id)}
                  className="p-4 sm:p-5 hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-[#DCFCE7] dark:bg-[#14532D]/40 text-[#15803D] dark:text-[#4ADE80]'
                          : isPending
                          ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 text-[#2563EB] dark:text-[#93C5FD]'
                          : 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : isPending ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
                          {item.item_name}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isCompleted
                              ? 'bg-[#DCFCE7] dark:bg-[#14532D]/40 text-[#15803D] dark:text-[#4ADE80]'
                              : isPending
                              ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 text-[#2563EB] dark:text-[#93C5FD]'
                              : 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171]'
                          }`}
                        >
                          {item.status}
                        </span>
                        {isDataset && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                            Digital Dataset
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        Vendor:{' '}
                        <span className="font-medium text-[#374151] dark:text-[#D1D5DB]">
                          {item.vendor_name || item.vendor_domain}
                        </span>
                        {item.category && <span> &bull; Category: {item.category}</span>}
                      </div>
                      {item.mandate_id && (
                        <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                          Mandate: {item.mandate_id.slice(0, 16)}...
                        </div>
                      )}
                      {item.status_reason && (
                        <p className="text-[11px] text-[#9CA3AF] line-clamp-1">
                          {item.status_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                    {/* Action button: Download Dataset if completed dataset */}
                    {isCompleted && isDataset && (
                      <button
                        onClick={(e) => handleDownloadDataset(e, item)}
                        disabled={actionLoading[item.id] === 'downloading'}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Download verified dataset via signed token"
                      >
                        {actionLoading[item.id] === 'downloading' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download</span>
                      </button>
                    )}

                    {/* Action button: Approve if user is Approver and item is pending */}
                    {isPending && canApprove && item.mandate_id && (
                      <button
                        onClick={(e) => handleApprovePending(e, item)}
                        disabled={actionLoading[item.id] === 'approving'}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title="Authorize expenditure mandate"
                      >
                        {actionLoading[item.id] === 'approving' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Authorize</span>
                      </button>
                    )}

                    <div className="text-right">
                      <div className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                        ${item.amount?.toFixed(2)} {item.currency || 'USD'}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}