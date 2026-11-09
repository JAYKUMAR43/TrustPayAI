const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/procurement/scenarios`);
  return res.json();
}

export async function fetchHistory(status = '') {
  const url = status ? `${API_BASE}/procurement/history?status=${status}` : `${API_BASE}/procurement/history`;
  const res = await fetch(url);
  return res.json();
}

export async function parsePrompt(prompt, agentId, agentName) {
  const res = await fetch(`${API_BASE}/procurement/parse-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agent_id: agentId, agent_name: agentName })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to parse prompt' }));
    throw new Error(err.detail || 'Parsing error');
  }
  return res.json();
}

export async function submitPurchaseRequest(requestData) {
  const res = await fetch(`${API_BASE}/procurement/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Submission failed' }));
    throw new Error(err.detail || 'Procurement error');
  }
  return res.json();
}

export async function fetchMandate(mandateId) {
  const res = await fetch(`${API_BASE}/mandates/${mandateId}`);
  if (!res.ok) throw new Error('Failed to fetch mandate');
  return res.json();
}

export async function testMandateTamper(payload) {
  const res = await fetch(`${API_BASE}/mandates/tamper-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function approvePurchase(purchaseId, mandateId, approvedBy = 'admin@trustpay.internal', notes = '') {
  const res = await fetch(`${API_BASE}/payments/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, approved_by: approvedBy, notes })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Approval failed' }));
    throw new Error(err.detail || 'Approval failed');
  }
  return res.json();
}

export async function rejectPurchase(purchaseId, mandateId, rejectedBy = 'admin@trustpay.internal', notes = '') {
  const res = await fetch(`${API_BASE}/payments/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, approved_by: rejectedBy, notes })
  });
  return res.json();
}

export async function createPayPalOrder(purchaseId, mandateId) {
  const idempotencyKey = `idem_create_${purchaseId}_${Date.now()}`;
  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purchase_id: purchaseId, mandate_id: mandateId, idempotency_key: idempotencyKey })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Order creation failed' }));
    throw new Error(err.detail || 'Failed to create PayPal order');
  }
  return res.json();
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Capture failed' }));
    throw new Error(err.detail || 'Failed to capture PayPal payment');
  }
  return res.json();
}

export async function fetchPolicies() {
  const res = await fetch(`${API_BASE}/policies`);
  return res.json();
}

export async function updatePolicy(policyId, is_active, rule_value) {
  const res = await fetch(`${API_BASE}/policies/${policyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active, rule_value })
  });
  return res.json();
}

export async function fetchAuditLogs(eventType = '') {
  const url = eventType ? `${API_BASE}/audit/logs?event_type=${eventType}` : `${API_BASE}/audit/logs`;
  const res = await fetch(url);
  return res.json();
}

export async function verifyAuditChain() {
  const res = await fetch(`${API_BASE}/audit/verify`);
  return res.json();
}
