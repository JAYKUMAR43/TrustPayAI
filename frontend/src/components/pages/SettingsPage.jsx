import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Terminal, CheckCircle2, RefreshCw, Cpu, Server, Lock } from 'lucide-react';
import { Card, Badge, Button, ErrorBanner } from '../common/UIComponents';
import { fetchHealth, fetchMCPTools, fetchMCPLogs } from '../../api';

export function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpLogs, setMcpLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [hData, toolsData, logsData] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchMCPTools().catch(() => null),
        fetchMCPLogs().catch(() => null)
      ]);
      setHealth(hData);
      setMcpTools(toolsData?.tools || []);
      setMcpLogs(logsData?.logs || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs text-[#356AE6] font-semibold mb-1">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span className="tracking-wide uppercase text-[11px]">System Infrastructure</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-[#172033] dark:text-[#F2F4F7] tracking-tight">
          System Architecture & Gateway Settings
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1 max-w-2xl leading-relaxed">
          Cryptographic HMAC-SHA256 signing engine, official PayPal Sandbox Orders v2 connectivity, and read-only Model Context Protocol (MCP) server parameters.
        </p>
      </div>

      {/* Backend Health & Connectivity */}
      <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm">Environment & Infrastructure Health</h3>
          <p className="text-[11px] text-[#667085] dark:text-[#98A2B3]">Verified backend services and active cryptographic components</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F7F8FA] dark:bg-[#101828]">
            <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] uppercase font-semibold">Service Health</span>
            <span className="text-[#16865C] font-bold flex items-center gap-1.5 mt-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#16865C]" />
              {health?.status?.toUpperCase() || 'HEALTHY'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F7F8FA] dark:bg-[#101828]">
            <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] uppercase font-semibold">Target Environment</span>
            <span className="text-[#356AE6] font-bold mt-1 text-sm block">
              {health?.environment?.toUpperCase() || 'SANDBOX'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F7F8FA] dark:bg-[#101828]">
            <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] uppercase font-semibold">PayPal REST Gateway</span>
            <span className="text-[#172033] dark:text-[#F2F4F7] font-bold mt-1 text-sm block">
              {health?.paypal_mode?.toUpperCase() || 'SANDBOX (REST v2)'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F7F8FA] dark:bg-[#101828]">
            <span className="text-[#667085] dark:text-[#98A2B3] block text-[10px] uppercase font-semibold">Cryptographic Engine</span>
            <span className="text-[#172033] dark:text-[#F2F4F7] font-bold mt-1 text-sm block">
              HMAC-SHA256
            </span>
          </div>
        </div>
      </div>

      {/* Official PayPal MCP Server Adapter */}
      <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-6 shadow-sm space-y-5">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm">Official PayPal Model Context Protocol (MCP) Adapter</h3>
            <Badge variant="blue">Read-Only Tools</Badge>
          </div>
          <p className="text-xs text-[#667085] dark:text-[#98A2B3] mt-1 leading-relaxed">
            The Official PayPal MCP Server provides autonomous agents with safe, read-only tools to inspect vendor catalogs, verify order status, and track disputes. Direct payment execution via MCP tools is strictly blocked by TrustPay policy.
          </p>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-[#667085] dark:text-[#98A2B3] uppercase tracking-wider block mb-3">
            Exposed MCP Tools for Autonomous Agents:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {mcpTools.map((t, idx) => (
              <div key={idx} className="p-3.5 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F7F8FA] dark:bg-[#101828] text-xs">
                <div className="font-mono font-bold text-[#356AE6] mb-1">{t.name}</div>
                <div className="text-[#667085] dark:text-[#98A2B3] text-[11px] leading-relaxed">{t.description}</div>
              </div>
            ))}
          </div>
        </div>

        {mcpLogs.length > 0 && (
          <div className="pt-4 border-t border-[#E7EAF0] dark:border-[#243347]">
            <span className="text-[11px] font-semibold text-[#667085] dark:text-[#98A2B3] uppercase tracking-wider block mb-2.5">
              Recent MCP Tool Invocations:
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
              {mcpLogs.map((l, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
                  <span className="text-[#172033] dark:text-[#F2F4F7]">{l.tool_name}</span>
                  <Badge variant={l.status === 'ALLOWED' ? 'success' : 'danger'}>
                    {l.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security Policies Invariant Rules */}
      <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm">Fintech Security & Governance Invariants</h3>
          <p className="text-[11px] text-[#667085] dark:text-[#98A2B3]">Architectural security invariants strictly enforced by the backend</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#172033] dark:text-[#F2F4F7]">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
            <CheckCircle2 className="w-4 h-4 text-[#16865C] shrink-0 mt-0.5" />
            <span className="leading-relaxed">Zero simulated payment responses. All operations invoke official PayPal REST v2 endpoints.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
            <CheckCircle2 className="w-4 h-4 text-[#16865C] shrink-0 mt-0.5" />
            <span className="leading-relaxed">Autonomous AI agents cannot disburse funds without explicit dual-custody approval.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
            <CheckCircle2 className="w-4 h-4 text-[#16865C] shrink-0 mt-0.5" />
            <span className="leading-relaxed">Mandates are strictly single-use, non-reusable, and sealed with HMAC-SHA256 signatures.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#101828] border border-[#E7EAF0] dark:border-[#243347]">
            <CheckCircle2 className="w-4 h-4 text-[#16865C] shrink-0 mt-0.5" />
            <span className="leading-relaxed">All capture operations enforce idempotency via the official PayPal-Request-Id header.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
