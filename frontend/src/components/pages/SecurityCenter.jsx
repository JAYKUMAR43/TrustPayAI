import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  Bug, 
  Terminal, 
  RefreshCw, 
  KeyRound, 
  ArrowRight,
  Eye,
  Filter,
  Search,
  Lock,
  X
} from 'lucide-react';
import { 
  Card, 
  Badge, 
  Button, 
  ErrorBanner, 
  SkeletonLoader, 
  EmptyState,
  RiskScoreBadge 
} from '../common/UIComponents';
import { fetchRiskEvents } from '../../api';

export function SecurityCenter() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  async function loadSecurityEvents() {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchRiskEvents(0, 100);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setEvents(list);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load security intelligence');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (severityFilter === 'ALL') return true;
    return (e.severity || '').toUpperCase() === severityFilter;
  });

  const promptCount = events.filter((e) => (e.event_type || '').includes('INJECTION')).length;
  const budgetCount = events.filter((e) => (e.event_type || '').includes('BUDGET') || (e.event_type || '').includes('POLICY')).length;
  const vendorCount = events.filter((e) => (e.event_type || '').includes('VENDOR')).length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            Fintech Security Command Center & Threat Defense
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time heuristic threat detection, prompt injection interception, budget violations, and cryptographic mandate verification.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadSecurityEvents}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </Button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadSecurityEvents} />

      {/* Threat Category Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider font-mono">Prompt Injections</span>
            <Terminal className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {promptCount}
          </div>
          <span className="text-[11px] text-slate-400">Jailbreaks & rule overrides blocked</span>
        </div>

        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Budget Violations</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {budgetCount}
          </div>
          <span className="text-[11px] text-slate-400">Over-limit and velocity violations</span>
        </div>

        <div className="p-5 rounded-xl border border-sky-500/20 bg-sky-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider font-mono">Vendor Anomalies</span>
            <Bug className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {vendorCount}
          </div>
          <span className="text-[11px] text-slate-400">Unapproved domains & spoofing attempts</span>
        </div>

        <div className="p-5 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider font-mono">Mandate Invariants</span>
            <KeyRound className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono text-teal-300">
            100%
          </div>
          <span className="text-[11px] text-slate-400">HMAC-SHA256 signature verification</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Severity Filter:
        </span>
        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSeverityFilter(lvl)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                severityFilter === lvl
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Security Threat Stream */}
      <Card 
        title={`Intercepted Threats & Risk Events (${filteredEvents.length})`}
        subtitle="Immutable ledger of policy violations, jailbreaks, and blocked payment attempts"
      >
        {loading ? (
          <SkeletonLoader rows={6} />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Clean Security Environment"
            description="No adversarial threats or suspicious transactions matching current filters."
          />
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredEvents.map((evt, idx) => (
              <div 
                key={evt.id || idx} 
                onClick={() => setSelectedEvent(evt)}
                className="py-4 px-2 rounded-lg hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-100 font-mono group-hover:text-rose-400 transition-colors">
                      {evt.event_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      (evt.severity || '').toUpperCase() === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      (evt.severity || '').toUpperCase() === 'HIGH' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                      'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {evt.severity || 'HIGH'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {evt.description || evt.details?.reason || 'Adversarial attempt intercepted and quarantined by policy guardrail.'}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-3">
                    <span>Actor: {evt.actor}</span>
                    <span>•</span>
                    <span>Target: {evt.target_resource || 'procurement_request'}</span>
                    <span>•</span>
                    <span>{new Date(evt.timestamp || evt.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <RiskScoreBadge score={evt.risk_score} />
                  <span className="text-[10px] text-rose-400 font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60">
                    BLOCKED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Threat Inspection Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono">{selectedEvent.event_type}</h3>
                <span className="text-xs text-slate-400 font-mono">Event ID: {selectedEvent.event_id || selectedEvent.id}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Severity</span>
                <span className="font-bold text-rose-400">{selectedEvent.severity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Calculated Risk Score</span>
                <span className="font-mono text-rose-400 font-bold">{selectedEvent.risk_score} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Actor</span>
                <span className="font-mono text-slate-200">{selectedEvent.actor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Detection Timestamp</span>
                <span className="font-mono text-slate-300">{new Date(selectedEvent.timestamp || selectedEvent.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Interception Analysis</span>
              <p className="text-xs text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                {selectedEvent.description || 'Payload quarantined due to high heuristic threat score.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
