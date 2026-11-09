# TRUSTPAY AI — REST API & OpenAPI Documentation

**Base URLs:**
- Local Development: `http://localhost:8000/api`
- Production Render: `https://trustpay-backend.onrender.com/api`
- Interactive Swagger UI: `/docs`
- Interactive ReDoc: `/redoc`

---

## 1. System & Health

### `GET /api/health`
Returns system status, active environment mode, cryptographic engine integrity, and PayPal connection status.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "TRUSTPAY AI Control Layer",
  "environment": "sandbox",
  "paypal_mode": "sandbox",
  "paypal_credentials_configured": true,
  "gemini_configured": true,
  "version": "1.0.0"
}
```

### `GET /api/dashboard/stats`
Returns aggregated real-time fintech statistics, spend totals, and security block metrics.

**Response `200 OK`:**
```json
{
  "total_requests": 14,
  "approved_requests": 9,
  "rejected_requests": 5,
  "pending_human_approval": 2,
  "total_authorized_spend": 320.00,
  "total_settled_amount": 190.00,
  "blocked_attacks": 5,
  "active_agents": 4,
  "compliance_rate_pct": 100.0
}
```

---

## 2. Autonomous Procurement Agent

### `POST /api/procurement/parse-prompt`
Uses LangGraph and Google Gemini (with deterministic heuristic fallback) to extract structured procurement intent from natural-language prompts.

**Request Body:**
```json
{
  "prompt": "Purchase a machine learning dataset for $35 from Approved Data Portal.",
  "agent_id": "agent_data_science_01",
  "agent_name": "Data Engineering Autonomous Agent"
}
```

**Response `200 OK`:**
```json
{
  "item_name": "machine learning dataset",
  "category": "datasets",
  "vendor_name": "Approved Data Portal",
  "vendor_domain": "data-portal.internal",
  "amount": 35.0,
  "currency": "USD",
  "justification": "Purchase a machine learning dataset for $35 from Approved Data Portal.",
  "confidence": 0.95
}
```

### `POST /api/procurement/request`
Evaluates a procurement proposal through the 10-guardrail policy engine, calculates multi-factor risk scores, and generates an HMAC-SHA256 mandate if approved.

**Request Body:**
```json
{
  "agent_id": "agent_data_science_01",
  "agent_name": "Data Engineering Autonomous Agent",
  "item_name": "Enterprise ML Dataset",
  "category": "datasets",
  "vendor_name": "Approved Data Portal",
  "vendor_domain": "data-portal.internal",
  "amount": 35.0,
  "currency": "USD",
  "justification": "Training computer vision models for product detection"
}
```

**Response `201 Created` (Approved Request):**
```json
{
  "id": "purch_9a8b7c6d5e",
  "status": "PENDING_HUMAN_APPROVAL",
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "risk_score": 12,
  "status_reason": "All 10 security guardrails successfully validated.",
  "violations": [],
  "requires_human_approval": true
}
```

**Response `200 OK` (Rejected Request):**
```json
{
  "id": "purch_11223344",
  "status": "REJECTED",
  "mandate_id": null,
  "risk_score": 95,
  "status_reason": "Rejected: Single transaction cap of $40.00 USD exceeded ($500.00 requested).",
  "violations": ["EXCEEDS_SINGLE_TRANSACTION_LIMIT"],
  "requires_human_approval": false
}
```

### `GET /api/procurement/requests`
List all historical procurement requests with pagination and status filters.

**Parameters:**
- `skip` (int, default: 0)
- `limit` (int, default: 50)
- `status` (string, optional: `APPROVED`, `REJECTED`, `PENDING_HUMAN_APPROVAL`, `COMPLETED`)

---

## 3. Cryptographic Spending Mandate Engine

### `GET /api/mandates/{mandate_id}`
Retrieves canonical cryptographic mandate payload, expiration epoch, and verification status.

**Response `200 OK`:**
```json
{
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "agent_id": "agent_data_science_01",
  "vendor_id": "data-portal.internal",
  "approved_amount": 35.0,
  "currency": "USD",
  "product_category": "datasets",
  "nonce": "c98e3b7a12401f8d9c2a3e5b7f104d8e",
  "expiry_timestamp": 1741549800,
  "is_expired": false,
  "is_executed": false,
  "verification_status": true,
  "signature": "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0"
}
```

### `POST /api/mandates/tamper-test`
Adversarial test laboratory to verify that modified fields (amount, vendor, nonce, or currency) immediately trigger cryptographic signature verification failure.

**Request Body:**
```json
{
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "tampered_amount": 9999.00
}
```

**Response `200 OK`:**
```json
{
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "tamper_detected": true,
  "is_valid": false,
  "reason": "HMAC-SHA256 signature verification failed. Computed signature does not match canonical payload."
}
```

---

## 4. Dual-Custody Approval & PayPal Settlement

### `POST /api/payments/approve`
Human-in-the-loop review gate authorizing a validated mandate for PayPal settlement.

**Request Body:**
```json
{
  "purchase_id": "purch_9a8b7c6d5e",
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "approved_by": "admin_buyer@trustpay.internal",
  "notes": "Verified Copilot license requirements with CTO."
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "purchase_id": "purch_9a8b7c6d5e",
  "approval_status": "APPROVED",
  "message": "Human dual-custody authorization granted."
}
```

### `POST /api/payments/create-order`
Creates an official PayPal Orders v2 resource with `CAPTURE` intent and `PayPal-Request-Id` idempotency.

**Request Body:**
```json
{
  "purchase_id": "purch_9a8b7c6d5e",
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "idempotency_key": "idem_order_purch_9a8b7c6d5e"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "paypal_order_id": "5O190127TN364715T",
  "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  "status": "CREATED"
}
```

### `POST /api/payments/capture-order`
Executes payment capture via PayPal Sandbox Orders v2, burns single-use mandate nonce, and records audit block.

**Request Body:**
```json
{
  "purchase_id": "purch_9a8b7c6d5e",
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "paypal_order_id": "5O190127TN364715T",
  "idempotency_key": "idem_cap_purch_9a8b7c6d5e"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "purchase_id": "purch_9a8b7c6d5e",
  "mandate_id": "mandate_f1e2d3c4b5a6",
  "paypal_order_id": "5O190127TN364715T",
  "paypal_capture_id": "CAP-8F21B9032A",
  "status": "COMPLETED",
  "amount": 35.0,
  "currency": "USD",
  "is_sandbox": true,
  "message": "Payment successfully captured via PayPal Sandbox (ID: CAP-8F21B9032A)."
}
```

---

## 5. Audit Ledger & Cryptographic Verification

### `GET /api/audit/logs`
Returns the append-only sequence of immutable system and financial events.

### `GET /api/audit/verify`
Performs complete genesis-to-head mathematical verification of all SHA-256 block hashes.

**Response `200 OK`:**
```json
{
  "is_valid": true,
  "verified_blocks": 28,
  "genesis_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "head_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "tampering_detected": false
}
```

---

## 6. Real-Time WebSockets

### `WS /api/ws/activity`
Bi-directional real-time WebSocket connection streaming live transaction, guardrail, and payment capture events. Supports `PING`/`PONG` heartbeat.
