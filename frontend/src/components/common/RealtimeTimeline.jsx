import React, { useState, useEffect, useRef } from 'react';
import { 
  RealtimePulse, 
  StatusBadge, 
  Badge, 
  Button 
} from './UIComponents';
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  Cpu, 
  UserCheck, 
  XCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { fetchTransactions, fetchAuditLogs } from '../../api';

export function RealtimeTimeline({ onSelectTransaction, limit = 8 }) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    loadInitialFeed();

    const pollInterval = setInterval(() => {
      loadInitialFeed(true);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/api/ws/activity`;
      
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        socket.send(JSON.stringify({ type: 'PING' }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'PONG' || payload.type === 'CONNECTION_ESTABLISHED') {
            return;
          }
          handleIncomingEvent(payload);
        } catch (e) {
          // ignore parse errors
        }
      };

      socket.onclose = () => {
        setConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = () => {
        setConnected(false);
        socket.close();
      };
    } catch (err) {
      setConnected(false);
    }
  };

  const handleIncomingEvent = (incoming) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === incoming.data?.transaction_id || (e.timestamp === incoming.timestamp && e.type === incoming.type));
      if (exists) return prev;
      const normalized = {
        id: incoming.data?.transaction_id || incoming.data?.purchase_id || `evt_${Date.now()}`,
        type: incoming.type,
        actor: incoming.actor || 'system',
        timestamp: incoming.timestamp || new Date().toISOString(),
        title: getEventTitle(incoming.type, incoming.data),
        amount: incoming.data?.amount,
        currency: incoming.data?.currency || 'USD',
        status: incoming.data?.status,
        data: incoming.data,
      };
      return [normalized, ...prev].slice(0, limit);
    });
  };

  const loadInitialFeed = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [txRes, auditRes] = await Promise.all([
        fetchTransactions(0, 6).catch(() => ({ items: [] })),
        fetchAuditLogs('', 0, 6).catch(() => ({ items: [] }))
      ]);

      const txItems = Array.isArray(txRes) ? txRes : (txRes?.items || []);
      const auditItems = Array.isArray(auditRes) ? auditRes : (auditRes?.items || []);

      const txEvents = txItems.map((t) => ({
        id: t.transaction_id,
        type: t.transaction_status === 'CAPTURED' ? 'PAYMENT_CAPTURED' : (t.transaction_status === 'REJECTED' ? 'REQUEST_REJECTED' : 'PROCUREMENT_CREATED'),
        actor: t.agent_id,
        timestamp: t.created_timestamp,
        title: `${t.requested_product || 'Purchase'} via ${t.vendor_id || 'Vendor'}`,
        amount: t.requested_amount,
        currency: t.currency || 'USD',
        status: t.transaction_status,
        data: t
      }));

      const auditEvents = auditItems.map((a) => {
        let details = {};
        try {
          details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
        } catch (e) {
          details = {};
        }
        return {
          id: details.transaction_id || a.purchase_id || a.event_id,
          type: a.event_type,
          actor: a.actor,
          timestamp: a.timestamp,
          title: formatAuditTitle(a.event_type, a.actor, details),
          amount: details.amount,
          currency: details.currency || 'USD',
          status: details.status,
          data: { ...details, transaction_id: details.transaction_id || a.entity_id }
        };
      });

      const combined = [...txEvents, ...auditEvents];
      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        const key = `${item.id}_${item.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEvents(unique.slice(0, limit));
    } catch (err) {
      // Fallback
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const getEventTitle = (type, data = {}) => {
    switch (type) {
      case 'MANDATE_ISSUED':
        return `Mandate Authorized ($${data.amount || ''} ${data.currency || 'USD'})`;
      case 'REQUEST_REJECTED':
        return `Policy Violation: Intercepted (${data.item_name || 'Item'})`;
      case 'HUMAN_APPROVAL_GRANTED':
        return `Human Review Sign-off Granted ($${data.amount || ''})`;
      case 'HUMAN_APPROVAL_DENIED':
        return `Reviewer Denied Request`;
      case 'PAYPAL_ORDER_CREATED':
        return `PayPal Sandbox Order Created (${data.paypal_order_id || 'v2'})`;
      case 'PAYMENT_CAPTURED':
        return `PayPal Funds Captured ($${data.amount || ''})`;
      default:
        return data.item_name ? `Procurement Proposal: ${data.item_name}` : 'Financial Event Recorded';
    }
  };

  const formatAuditTitle = (eventType, actor, details) => {
    if (eventType === 'PAYPAL_PAYMENT_CAPTURED') return `PayPal Capture Confirmed ($${details.amount || ''})`;
    if (eventType === 'HUMAN_APPROVAL_GRANTED') return `Authorized by ${actor}`;
    if (eventType === 'MANDATE_ISSUED') return `Signed Mandate for ${details.vendor_domain || 'Vendor'}`;
    if (eventType === 'REQUEST_REJECTED') return `Blocked by Policy Guardrails`;
    return `${eventType.replace(/_/g, ' ')} (${actor})`;
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'PAYMENT_CAPTURED':
      case 'PAYPAL_PAYMENT_CAPTURED':
        return <ShieldCheck className="w-3.5 h-3.5 text-[#16865C]" />;
      case 'REQUEST_REJECTED':
      case 'HUMAN_APPROVAL_DENIED':
        return <XCircle className="w-3.5 h-3.5 text-[#D94B55]" />;
      case 'HUMAN_APPROVAL_GRANTED':
        return <UserCheck className="w-3.5 h-3.5 text-[#16865C]" />;
      case 'PAYPAL_ORDER_CREATED':
        return <CreditCard className="w-3.5 h-3.5 text-[#356AE6]" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#667085]" />;
    }
  };

  return (
    <div className="rounded-xl border border-[#E7EAF0] dark:border-[#243347] bg-white dark:bg-[#182230] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-[#E7EAF0] dark:border-[#243347] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#356AE6]" />
          <h3 className="font-semibold text-[#172033] dark:text-[#F2F4F7] text-sm tracking-tight">Real-Time Activity Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <RealtimePulse connected={connected} />
          <button
            onClick={() => loadInitialFeed(false)}
            aria-label="Refresh timeline feed"
            className="p-1 rounded-md text-[#667085] hover:text-[#172033] dark:hover:text-[#F2F4F7] hover:bg-[#F2F4F7] dark:hover:bg-[#1F2C3F] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#356AE6]' : ''}`} />
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#667085] dark:text-[#98A2B3]">
          Listening for autonomous agent transaction events...
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((evt, idx) => (
            <div
              key={`${evt.id}_${idx}`}
              onClick={() => onSelectTransaction && evt.id && onSelectTransaction(evt.id)}
              className="p-3 rounded-lg border border-[#E7EAF0] dark:border-[#243347] bg-[#F8F9FB] dark:bg-[#141C28] hover:bg-white dark:hover:bg-[#182230] hover:border-[#D0D5DD] dark:hover:border-[#344054] transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-md bg-white dark:bg-[#182230] border border-[#E7EAF0] dark:border-[#243347] shrink-0">
                  {getIconForType(evt.type)}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#172033] dark:text-[#F2F4F7] group-hover:text-[#356AE6] transition-colors truncate block">
                    {evt.title}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-[#667085] dark:text-[#98A2B3] mt-0.5">
                    <span>{evt.actor}</span>
                    <span>•</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {evt.amount !== undefined && evt.amount !== null ? (
                  <span className="font-semibold text-xs text-[#172033] dark:text-[#F2F4F7] block">
                    ${Number(evt.amount).toFixed(2)}
                  </span>
                ) : null}
                {evt.status && (
                  <div className="mt-1">
                    <StatusBadge status={evt.status} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
