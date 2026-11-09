import React, { useState, useEffect } from 'react';
import { Bot, Plus, CheckCircle, XCircle, Power, DollarSign, Clock, Shield, Sparkles, X } from 'lucide-react';
import { Card, Badge, Button, ErrorBanner, SkeletonLoader, EmptyState, AgentStatusBadge } from '../common/UIComponents';
import { fetchAgents, createAgent } from '../../api';

export function AgentManagement() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: `agent_${Date.now()}`,
    name: '',
    description: '',
    spending_limit_per_tx: 40.0,
    daily_limit: 100.0,
    allowed_categories: 'software_saas,datasets'
  });

  async function loadAgents() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchAgents();
      const list = Array.isArray(data) ? data : (data?.items || []);
      setAgents(list);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load autonomous agents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  async function handleCreateAgent(e) {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await createAgent({
        id: formData.id,
        name: formData.name,
        description: formData.description,
        spending_limit_per_tx: parseFloat(formData.spending_limit_per_tx),
        daily_limit: parseFloat(formData.daily_limit),
        allowed_categories: formData.allowed_categories.split(',').map((c) => c.trim())
      });
      setShowModal(false);
      setFormData({
        id: `agent_${Date.now()}`,
        name: '',
        description: '',
        spending_limit_per_tx: 40.0,
        daily_limit: 100.0,
        allowed_categories: 'software_saas,datasets'
      });
      loadAgents();
    } catch (err) {
      setErrorMessage(err.message || 'Error registering new agent');
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-purple-400" />
            Autonomous Agent Fleet Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Register and govern AI agents with granular per-transaction limits, daily budgets, and category whitelists.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Register AI Agent
        </Button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadAgents} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader rows={4} />
          <SkeletonLoader rows={4} />
          <SkeletonLoader rows={4} />
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents registered yet"
          description="Register your first autonomous procurement agent to enforce dedicated spending caps and policies."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              Register Agent
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((ag) => {
            const spent = ag.total_spent || 0;
            const dailyCap = ag.daily_limit || ag.max_daily_limit || 100;
            const pct = Math.min(Math.round((spent / dailyCap) * 100), 100);

            return (
              <Card key={ag.id} className="relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 font-bold shadow-md shadow-purple-950/30">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm">{ag.name}</h3>
                      <div className="text-[10px] text-slate-400 font-mono">{ag.id}</div>
                    </div>
                  </div>
                  <AgentStatusBadge status={ag.status || 'ACTIVE'} />
                </div>

                <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                  {ag.description || 'Autonomous procurement agent running under TrustPay policy supervision.'}
                </p>

                {/* Spending Progress Against Daily Cap */}
                <div className="space-y-1.5 mb-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Daily Cap Utilization</span>
                    <span className="font-mono text-slate-200 font-semibold">${spent.toFixed(2)} / ${dailyCap.toFixed(2)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-rose-500' : (pct >= 70 ? 'bg-amber-500' : 'bg-teal-500')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Max Per Tx</span>
                    <span className="font-mono font-bold text-teal-400 text-sm">
                      ${(ag.spending_limit_per_tx || ag.max_tx_limit || 40).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Daily Cap</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      ${dailyCap.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]">
                    Allowed: {Array.isArray(ag.allowed_categories) ? ag.allowed_categories.join(', ') : (ag.allowed_categories || 'All')}
                  </span>
                  <span className="font-mono text-teal-400 text-[10px] shrink-0">Policy Bound</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Register Agent */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-1">Register Autonomous AI Agent</h3>
            <p className="text-xs text-slate-400 mb-4">Assign strict budgetary parameters and taxonomy boundaries.</p>

            <form onSubmit={handleCreateAgent} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Agent Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cloud Infrastructure Agent"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-sans focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Handles compute and data procurement"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Max Per Tx ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="1000"
                    value={formData.spending_limit_per_tx}
                    onChange={(e) => setFormData({ ...formData, spending_limit_per_tx: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Daily Cap ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="10000"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Allowed Categories (comma separated)</label>
                <input
                  type="text"
                  value={formData.allowed_categories}
                  onChange={(e) => setFormData({ ...formData, allowed_categories: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Deploy Agent</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
