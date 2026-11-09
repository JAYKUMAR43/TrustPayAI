const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BACKEND_URL}/api`;

async function handleResponse(res, fallbackError = 'API Request Failed') {
  if (!res.ok) {
    let errMsg = fallbackError;
    try {
      const err = await res.json();
      errMsg = err.detail || err.error || JSON.stringify(err);
    } catch (e) {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

// ----------------------------------------------------------------------
// System & Health
// ----------------------------------------------------------------------
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res, 'Health check failed');
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return handleResponse(res, 'Failed to fetch dashboard statistics');
}

// ----------------------------------------------------------------------
// Procurement & Scenarios
// ----------------------------------------------------------------------
export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/procurement/scenarios`);
  return handleResponse(res, 'Failed to fetch test scenarios');
}

export async function fetchHistory(status = '') {
  const url = status ? `${API_BASE}/procurement/history?status=${encodeURIComponent(status)}` : `${API_BASE}/procurement/history`;
  const res = await fetch(url);
  return handleResponse(res, 'Failed to fetch procurement history');
}

export async function parsePrompt(prompt, agentId, agentName) {
  const res = await fetch(`${API_BASE}/procurement/parse-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agent_id: agentId, agent_name: agentName })
  });
  return handleResponse(res, 'Failed to parse natural language prompt');
}

export async function submitPurchaseRequest(requestData) {
  const res = await fetch(`${API_BASE}/procurement/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  return handleResponse(res, 'Failed to submit procurement request');
}

export async function fetchProcurementRequests(skip = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/procurement/requests?skip=${skip}&limit=${limit}`);
  return handleResponse(res, 'Failed to fetch procurement requests');
}

// ----------------------------------------------------------------------
// Agents
// ----------------------------------------------------------------------
export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  return handleResponse(res, 'Failed to fetch agent fleet');
}

export async function createAgent(agentData) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  return handleResponse(res, 'Failed to register agent');
}

// ----------------------------------------------------------------------
// Policies
// ----------------------------------------------------------------------
export async function fetchPolicies() {
  const res = await fetch(`${API_BASE}/policies`);
  return handleResponse(res, 'Failed to fetch policies');
}

export async function createPolicy(policyData) {
  const res = await fetch(`${API_BASE}/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policyData)
  });
  return handleResponse(res, 'Failed to create spending policy');
}

export async function updatePolicy(policyId, is_active, rule_value) {
  const res = await fetch(`${API_BASE}/policies/${policyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active, rule_value })
  });
  return handleResponse(res, 'Failed to update policy');
}

// ----------------------------------------------------------------------
// Cryptographic Mandates
// ----------------------------------------------------------------------
export async function fetchMandate(mandateId) {
  const res = await fetch(`${API_BASE}/mandates/${mandateId}`);
  return handleResponse(res, 'Failed to fetch cryptographic mandate');
}

export async function testMandateTamper(payload) {
  const res = await fetch(`${API_BASE}/mandates/tamper-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Tamper verification test failed');
}

// ----------------------------------------------------------------------
// Payments & PayPal Orders v2
// ----------------------------------------------------------------------
export async function approvePurchase(purchaseId, mandateId, approvedBy = 'admin@trustpay.internal', notes = '') {
  const res = await fetch(`${API_BASE}/payments/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, approved_by: approvedBy, notes })
  });
  return handleResponse(res, 'Human approval gate execution failed');
}

export async function rejectPurchase(purchaseId, mandateId, rejectedBy = 'admin@trustpay.internal', notes = '') {
  const res = await fetch(`${API_BASE}/payments/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, approved_by: rejectedBy, notes })
  });
  return handleResponse(res, 'Rejection failed');
}

export async function createPayPalOrder(purchaseId, mandateId) {
  const idempotencyKey = `idem_create_${purchaseId}_${Date.now()}`;
  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, idempotency_key: idempotencyKey })
  });
  return handleResponse(res, 'Failed to create PayPal order');
}

export async function capturePayPalOrder(purchaseId, mandateId, paypalOrderId) {
  const idempotencyKey = `idem_cap_${purchaseId}_${Date.now()}`;
  const res = await fetch(`${API_BASE}/payments/capture-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      purchase_id: purchaseId,
      mandate_id: mandateId,
      paypal_order_id: paypalOrderId,
      idempotency_key: idempotencyKey
    })
  });
  return handleResponse(res, 'Failed to capture PayPal payment');
}

export async function getPayPalOrderStatus(paypalOrderId) {
  const res = await fetch(`${API_BASE}/payments/order/${paypalOrderId}`);
  return handleResponse(res, 'Failed to retrieve PayPal order');
}

// ----------------------------------------------------------------------
// Transactions
// ----------------------------------------------------------------------
export async function fetchTransactions(skip = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/transactions?skip=${skip}&limit=${limit}`);
  return handleResponse(res, 'Failed to fetch transactions');
}

export async function fetchTransaction(transactionId) {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}`);
  return handleResponse(res, 'Failed to fetch transaction details');
}

export async function fetchTransactionTrace(transactionId) {
  const res = await fetch(`${API_BASE}/transactions/${transactionId}/trace`);
  return handleResponse(res, 'Failed to fetch complete transaction trace');
}

// ----------------------------------------------------------------------
// Risk & Security Intelligence
// ----------------------------------------------------------------------
export async function fetchRiskEvents(skip = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/risk-events?skip=${skip}&limit=${limit}`);
  return handleResponse(res, 'Failed to fetch risk events');
}

// ----------------------------------------------------------------------
// Audit Logs & Hash Chain
// ----------------------------------------------------------------------
export async function fetchAuditLogs(eventType = '', skip = 0, limit = 50) {
  const url = `${API_BASE}/audit/logs?event_type=${encodeURIComponent(eventType)}&skip=${skip}&limit=${limit}`;
  const res = await fetch(url);
  return handleResponse(res, 'Failed to fetch audit logs');
}

export async function verifyAuditChain() {
  const res = await fetch(`${API_BASE}/audit/verify`);
  return handleResponse(res, 'Failed to verify cryptographic audit chain');
}

// ----------------------------------------------------------------------
// PayPal MCP Adapter Tools
// ----------------------------------------------------------------------
export async function fetchMCPTools() {
  const res = await fetch(`${API_BASE}/mcp/tools`);
  return handleResponse(res, 'Failed to fetch MCP tool schema');
}

export async function invokeMCPTool(toolName, args, agentId = 'agent_procurement') {
  const res = await fetch(`${API_BASE}/mcp/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_name: toolName, arguments: args, agent_id: agentId })
  });
  return handleResponse(res, 'MCP invocation failed');
}

export async function fetchMCPLogs() {
  const res = await fetch(`${API_BASE}/mcp/logs`);
  return handleResponse(res, 'Failed to fetch MCP audit logs');
}
