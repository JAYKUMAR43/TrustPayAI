import React from 'react';
import StatsCards from '../components/StatsCards';
import AgentConsole from '../components/AgentConsole';
import PipelineVisualizer from '../components/PipelineVisualizer';
import { useApp } from '../context/AppContext';

export default function DashboardOverview({ onSelectMandate }) {
  const { stats, scenarios, purchases, currentPurchase, setCurrentPurchase, setActiveMandateId, refreshAll } = useApp();

  const handlePurchaseCreated = (newPurchase) => {
    setCurrentPurchase(newPurchase);
    if (newPurchase.mandate_id) {
      setActiveMandateId(newPurchase.mandate_id);
    }
    refreshAll();
  };

  return (
    <div>
      <StatsCards stats={stats} />
      
      <AgentConsole
        scenarios={scenarios}
        onPurchaseCreated={handlePurchaseCreated}
        onSelectPurchase={(p) => setCurrentPurchase(p)}
      />

      <PipelineVisualizer currentPurchase={currentPurchase} />

      {/* Recent Autonomous Procurement Stream */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold font-mono text-white mb-4">
          Recent Autonomous Procurement Stream
        </h3>
        {purchases.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">
            No procurement requests in database yet. Use the Agent Console or 1-Click Scenarios above to initiate an agent purchase!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-normal">TIMESTAMP</th>
                  <th className="pb-3 font-normal">AGENT</th>
                  <th className="pb-3 font-normal">ITEM & CATEGORY</th>
                  <th className="pb-3 font-normal">MERCHANT</th>
                  <th className="pb-3 font-normal">AMOUNT</th>
                  <th className="pb-3 font-normal">RISK</th>
                  <th className="pb-3 font-normal">STATUS</th>
                  <th className="pb-3 font-normal text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {purchases.map((p) => {
                  const isRejected = p.status === 'REJECTED';
                  const isCompleted = p.status === 'COMPLETED';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                      onClick={() => {
                        setCurrentPurchase(p);
                        if (p.mandate_id) setActiveMandateId(p.mandate_id);
                      }}
                    >
                      <td className="py-3 text-slate-400">
                        {new Date(p.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 text-slate-200 font-medium">
                        {p.agent_name}
                      </td>
                      <td className="py-3">
                        <span className="text-white block font-medium">{p.item_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{p.category}</span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {p.vendor_domain}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        ${p.amount.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          p.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-300' :
                          p.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {p.risk_score || 0}/100
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          isRejected ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPurchase(p);
                            if (p.mandate_id && onSelectMandate) onSelectMandate(p.mandate_id);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
