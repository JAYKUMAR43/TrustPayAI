import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Bot,
  Layers,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Lock
} from 'lucide-react';
import { Card, StatCard, Badge, Button, SkeletonLoader, EmptyState, StatusBadge, RiskScoreBadge } from '../common/UIComponents';
import { VolumeTrendChart, CategoryDistributionBar, PipelineRatioRing } from '../common/FinancialCharts';
import { RealtimeTimeline } from '../common/RealtimeTimeline';
import { TransactionDetailsDrawer } from '../common/TransactionDetailsDrawer';
import { fetchStats, fetchTransactions, fetchRiskEvents } from '../../api';

export function OverviewDashboard({ onNavigateTo }) {
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, txData, riskData] = await Promise.all([
        fetchStats().catch(() => null),
        fetchTransactions(0, 6).catch(() => ({ items: [] })),
        fetchRiskEvents(0, 6).catch(() => ({ items: [] }))
      ]);

      if (statsData) setStats(statsData);

      const txList = Array.isArray(txData) ? txData : (txData?.items || []);
      setRecentTransactions(txList);

      const alertList = Array.isArray(riskData) ? riskData : (riskData?.items || []);
      setRecentAlerts(alertList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <SkeletonLoader rows={2} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader rows={3} />
          <SkeletonLoader rows={3} />
          <SkeletonLoader rows={3} />
          <SkeletonLoader rows={3} />
        </div>
        <SkeletonLoader rows={5} />
      </div>
    );
  }

  const totalRequests = stats?.total_requests || 0;
  const approvedRequests = stats?.approved_requests || 0;
  const rejectedRequests = stats?.rejected_requests || 0;
  const pendingApprovals = stats?.pending_human_approval || 0;
  const authorizedSpend = stats?.total_authorized_spend || 0;
  const capturedSpend = stats?.total_settled_amount || 0;
  const blockedAttacks = stats?.blocked_attacks || 0;
  const activeAgents = stats?.active_agents || 0;

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Executive Financial Health Banner (Clean Stripe Style) */}
      <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#16865C] font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-[#16865C]" />
            <span className="tracking-wide uppercase text-[11px]">Financial Control Layer · Enforced</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">
            Autonomous Spending Command Center
          </h2>
          <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1 max-w-2xl leading-relaxed">
            Real-time policy guardrails, cryptographic HMAC-SHA256 mandate authorization, and PayPal Sandbox settlement monitoring.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="primary" size="sm" onClick={() => onNavigateTo('console')}>
            Procurement Console
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigateTo('security')}>
            Security Center
          </Button>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Purchase Requests"
          value={totalRequests}
          subvalue={`${approvedRequests} Approved · ${rejectedRequests} Blocked`}
          icon={Layers}
          variant="blue"
        />
        <StatCard
          label="Authorized Spending"
          value={`$${authorizedSpend.toFixed(2)}`}
          subvalue={`$${capturedSpend.toFixed(2)} settled on PayPal Sandbox`}
          icon={DollarSign}
          variant="teal"
        />
        <StatCard
          label="Blocked Security Attacks"
          value={blockedAttacks}
          subvalue="Prompt injections & price manipulation"
          icon={ShieldAlert}
          variant="rose"
        />
        <StatCard
          label="Active Autonomous Agents"
          value={activeAgents}
          subvalue="Governed by Spending Policies"
          icon={Bot}
          variant="purple"
        />
      </div>

      {/* Middle Section: Financial Charts & Pipeline Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Execution Analytics & Volume Area Chart */}
        <Card 
          title="Procurement Volume & Spending Trajectory" 
          subtitle="Cumulative authorized volume vs settled payments over time" 
          className="lg:col-span-2"
        >
          <div className="mb-4">
            <VolumeTrendChart height={190} />
          </div>

          <div className="pt-4 border-t border-[#E7EAF0] dark:border-[#243347]">
            <h4 className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7] mb-3">
              Spend Allocation by Category
            </h4>
            <CategoryDistributionBar />
          </div>
        </Card>

        {/* Security & Risk Distribution */}
        <Card 
          title="Policy & Compliance Ratio" 
          subtitle="Autonomous agent policy pass rate" 
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTo('security')}>
              View Threats <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-6">
            <div className="py-1">
              <PipelineRatioRing
                approved={approvedRequests}
                rejected={rejectedRequests}
                pending={pendingApprovals}
                total={totalRequests}
              />
            </div>

            <div className="space-y-2 pt-4 border-t border-[#E7EAF0] dark:border-[#243347]">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347]">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#16865C]" />
                  <span className="text-xs text-[#344054] dark:text-[#D0D5DD]">Clean Evaluations</span>
                </div>
                <span className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7]">{stats?.clean_evaluations || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347]">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D94B55]" />
                  <span className="text-xs text-[#344054] dark:text-[#D0D5DD]">Blocked Attacks</span>
                </div>
                <span className="text-xs font-semibold text-[#D94B55]">{blockedAttacks}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347] text-xs text-[#667085] dark:text-[#98A2B3]">
              <div className="font-semibold text-[#172033] dark:text-[#F2F4F7] mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#356AE6]" />
                Zero-Trust Financial Invariant
              </div>
              Deterministic financial rules override LLM proposals unconditionally. Payments require signed cryptographic mandates.
            </div>
          </div>
        </Card>
      </div>

      {/* Real-Time Transaction Timeline & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time WebSockets Stream */}
        <div className="lg:col-span-1">
          <RealtimeTimeline 
            onSelectTransaction={(id) => setSelectedTxId(id)}
            limit={6}
          />
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Procurement Transactions"
            subtitle="Click any row to view complete security and cryptographic trace"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigateTo('payments')}>
                All Transactions <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          >
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No transactions yet"
                description="Submit a procurement request via the AI Procurement Console to populate the ledger."
                action={
                  <Button variant="primary" size="sm" onClick={() => onNavigateTo('console')}>
                    Open Procurement Console
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-[#E7EAF0] dark:divide-[#243347]">
                {recentTransactions.map((tx) => {
                  const txId = tx.transaction_id || tx.id;
                  return (
                    <div
                      key={txId}
                      onClick={() => setSelectedTxId(txId)}
                      className="py-3 px-2 rounded-lg hover:bg-[#F8F9FB] dark:hover:bg-[#1F2C3F] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7] group-hover:text-[#356AE6] transition-colors truncate">
                            {tx.requested_product || tx.item_name || 'Procurement Item'}
                          </span>
                          <span className="text-[11px] text-[#667085] dark:text-[#98A2B3]">
                            {tx.vendor_id || 'Vendor'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#667085] dark:text-[#98A2B3] mt-0.5 flex items-center gap-2">
                          <span>Agent: {tx.agent_id}</span>
                          <span>•</span>
                          <span>{new Date(tx.created_timestamp || tx.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#172033] dark:text-[#F2F4F7]">
                            ${Number(tx.requested_amount || tx.amount || 0).toFixed(2)}{' '}
                            <span className="text-[10px] text-[#667085] dark:text-[#98A2B3] font-normal">{tx.currency || 'USD'}</span>
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={tx.transaction_status || tx.status} />
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#172033] dark:group-hover:text-[#F2F4F7] transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Interactive Transaction Trace Drawer */}
      <TransactionDetailsDrawer
        transactionId={selectedTxId}
        isOpen={Boolean(selectedTxId)}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
}
