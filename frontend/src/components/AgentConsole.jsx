import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertOctagon, CheckCircle2, ShieldX, Play, ArrowRight, Layers } from 'lucide-react';
import { parsePrompt, submitPurchaseRequest } from '../api';

const AGENT_PROFILES = [
  { id: 'agent_devops_01', name: 'DevOps AutoScaler', icon: '⚡', role: 'Cloud Infrastructure' },
  { id: 'agent_copilot_ops', name: 'Developer Productivity', icon: '💻', role: 'SaaS & Development' },
  { id: 'agent_data_pipeline', name: 'Data Pipeline Runner', icon: '📊', role: 'Data Streams & Storage' },
  { id: 'agent_sec_sentry', name: 'AppSec Sentry Agent', icon: '🛡️', role: 'Security & Scanning' }
];

export default function AgentConsole({ scenarios, onPurchaseCreated, onSelectPurchase }) {
  const [selectedAgent, setSelectedAgent] = useState(AGENT_PROFILES[1]);
  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleSelectScenario = (sc) => {
    setPrompt(sc.request.justification);
    setPreviewRequest(sc.request);
    const agent = AGENT_PROFILES.find(a => a.id === sc.request.agent_id) || AGENT_PROFILES[0];
    setSelectedAgent(agent);
  };

  const handleParsePrompt = async () => {
    if (!prompt.trim()) return;
    setIsParsing(true);
    setStatusMessage(null);
    try {
      const parsed = await parsePrompt(prompt, selectedAgent.id, selectedAgent.name);
      setPreviewRequest(parsed);
      setStatusMessage({ type: 'info', text: 'AI Agent parsed procurement specifications.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to parse prompt.' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!previewRequest) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await submitPurchaseRequest(previewRequest);
      onPurchaseCreated(result);
      if (onSelectPurchase) onSelectPurchase(result);
      
      if (result.status === 'REJECTED') {
        setStatusMessage({
          type: 'rejected',
          text: `Request Intercepted & Blocked: ${result.status_reason}`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Cryptographic Mandate Issued (${result.mandate_id?.substring(0, 16)}...). Ready for Human Review.`
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Error executing procurement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800 mb-6 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Autonomous Procurement Agent Console</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                LangGraph State Machine
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Agents generate purchase requests under mathematical policy guardrails
            </p>
          </div>
        </div>

        {/* Agent Selector Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {AGENT_PROFILES.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedAgent(a);
                if (previewRequest) setPreviewRequest({ ...previewRequest, agent_id: a.id, agent_name: a.name });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                selectedAgent.id === a.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{a.icon}</span>
              <span>{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Test Scenarios */}
      <div className="mb-6">
        <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
          ⚡ 1-Click Verification Scenarios:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {scenarios.map((sc) => {
            const isBlocked = sc.expected_outcome.includes('BLOCKED');
            return (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className="text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {sc.title}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isBlocked ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      ${sc.request.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {sc.description}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-indigo-400/80 flex items-center space-x-1">
                  <span>Load Scenario</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt Input & Parser */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Agent Natural Language Procurement Intent:
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            Powered by Google Gemini / Heuristic Parser
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Order 5 GitHub Copilot seats for $190 to accelerate backend pull request velocity..."
            className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 font-sans resize-none"
          />
          <button
            onClick={handleParsePrompt}
            disabled={isParsing || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{isParsing ? 'Parsing...' : 'Parse with AI'}</span>
          </button>
        </div>
      </div>

      {/* Structured Proposal Preview Card */}
      {previewRequest && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-indigo-400 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Structured Pydantic Procurement Payload</span>
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Agent: {previewRequest.agent_id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">ITEM</span>
              <span className="text-white font-medium truncate block">{previewRequest.item_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CATEGORY</span>
              <span className="text-slate-200 uppercase">{previewRequest.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">MERCHANT DOMAIN</span>
              <span className="text-slate-200">{previewRequest.vendor_domain}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">AMOUNT</span>
              <span className="text-emerald-400 font-bold text-sm">
                ${previewRequest.amount.toFixed(2)} {previewRequest.currency}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono mb-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-bold block mb-0.5 text-[10px]">JUSTIFICATION:</span>
            {previewRequest.justification}
          </div>

          {/* Execution Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-xs tracking-wider uppercase font-mono shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isSubmitting ? 'Evaluating via LangGraph Orchestrator...' : 'Execute Procurement Pipeline'}</span>
          </button>
        </div>
      )}

      {/* Live Status Alert Box */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl text-xs font-mono flex items-start space-x-2.5 ${
          statusMessage.type === 'rejected'
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            : statusMessage.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-slate-800 border border-slate-700 text-slate-300'
        }`}>
          {statusMessage.type === 'rejected' ? (
            <ShieldX className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

    </div>
  );
}
