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
  AlertTriangle
} from 'lucide-react';
import { fetchHistory } from '../../api';

export function PurchaseHistoryPage({ onOpenDetails }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredItems = history.filter((item) => {
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (filterStatus === 'PENDING' && !item.status.includes('PENDING')) return false;
      if (filterStatus === 'REJECTED' && item.status !== 'REJECTED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.item_name?.toLowerCase().includes(q);
      const matchVendor = item.vendor_name?.toLowerCase().includes(q) || item.vendor_domain?.toLowerCase().includes(q);
      const matchId = item.id?.toLowerCase().includes(q);
      return matchName || matchVendor || matchId;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-[#F9FAFB] min-h-[calc(100vh-65px)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Purchase History</h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Verifiable record of all autonomous agent purchase requests, policy decisions, and PayPal settlements.
          </p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-xs font-medium text-[#374151] rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search purchases or vendors..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E7EB] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none text-[#111827] bg-[#F9FAFB]"
          />
        </div>

        <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'COMPLETED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                filterStatus === st
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#4B5563] hover:bg-[#F3F4F6]'
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
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">
            Loading real purchase records from database...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-[#9CA3AF] mx-auto" />
            <div className="text-sm font-semibold text-[#111827]">No purchase records found</div>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Start by typing a purchase instruction in the AI Assistant to generate and record your first procurement proposal.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {filteredItems.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isPending = item.status?.includes('PENDING');
              const isRejected = item.status === 'REJECTED';

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenDetails && onOpenDetails(item.id)}
                  className="p-4 sm:p-5 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : isPending
                          ? 'bg-[#EFF6FF] text-[#2563EB]'
                          : 'bg-[#FEE2E2] text-[#DC2626]'
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

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-[#111827]">{item.item_name}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isCompleted
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : isPending
                              ? 'bg-[#EFF6FF] text-[#2563EB]'
                              : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        Vendor: <span className="font-medium text-[#374151]">{item.vendor_name || item.vendor_domain}</span>
                        {item.category && <span> &bull; Category: {item.category}</span>}
                      </div>
                      {item.status_reason && (
                        <p className="text-[11px] text-[#9CA3AF] line-clamp-1">
                          {item.status_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pl-12 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#111827]">
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
