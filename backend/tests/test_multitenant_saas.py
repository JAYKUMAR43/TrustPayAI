import pytest
import hmac
import hashlib
import json
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database.connection import init_db
from backend.security.crypto_engine import crypto_engine

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_auth_me_individual_and_org():
    """Verify profile extraction and account type switching."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Individual User
        res = await client.get("/api/auth/me", headers={
            "X-User-Id": "usr_indiv_test_01",
            "X-User-Email": "indiv@test.internal",
            "X-Account-Type": "INDIVIDUAL"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["account_type"] == "INDIVIDUAL"
        assert data["user_id"] == "usr_indiv_test_01"
        assert data["can_approve"] is True
        assert data["can_manage_settings"] is True

        # 2. Organization User (Employee)
        res_emp = await client.get("/api/auth/me", headers={
            "X-User-Id": "usr_emp_test_02",
            "X-User-Email": "emp@acme.internal",
            "X-Account-Type": "ORGANIZATION",
            "X-Organization-Id": "org_default_acme",
            "X-TrustPay-Role": "EMPLOYEE"
        })
        assert res_emp.status_code == 200
        emp_data = res_emp.json()
        assert emp_data["account_type"] == "ORGANIZATION"
        assert emp_data["role"] == "EMPLOYEE"
        assert emp_data["can_approve"] is False
        assert emp_data["can_manage_settings"] is False

@pytest.mark.asyncio
async def test_payment_provider_modes_separation():
    """Verify Mode 1 is active and Mode 2 explicitly discloses PayPal Partner approval requirement."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/auth/payment-modes")
        assert res.status_code == 200
        data = res.json()
        assert "payment_modes" in data
        
        # Mode 1: Standard PayPal Checkout
        mode1 = next((p for p in data["payment_modes"] if p["id"] == "MODE_1_STANDARD"), None)
        assert mode1 is not None
        assert mode1["is_primary"] is True
        assert "Standard PayPal Checkout" in mode1["name"]

        # Mode 2: Connected Organization Account
        mode2 = next((p for p in data["payment_modes"] if p["id"] == "MODE_2_CONNECTED"), None)
        assert mode2 is not None
        assert mode2["status"] == "COMING_SOON"
        assert "Requires PayPal Partner Approval" in mode2["status_badge"]

@pytest.mark.asyncio
async def test_tenant_isolation_in_procurement_history():
    """Verify strict tenant isolation between individual users and organizations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Submit request as Individual User A
        indiv_req = {
            "agent_id": "agent_procurement",
            "vendor_domain": "github.com",
            "product_name": "GitHub Copilot Individual",
            "category": "software_saas",
            "amount": 20.00,
            "currency": "USD",
            "justification": "Individual developer tooling"
        }
        res_indiv = await client.post(
            "/api/procurement/request",
            json=indiv_req,
            headers={
                "X-User-Id": "usr_isolated_a",
                "X-Account-Type": "INDIVIDUAL"
            }
        )
        assert res_indiv.status_code == 201
        indiv_proc_id = res_indiv.json()["id"]

        # Submit request as Organization B
        org_req = {
            "agent_id": "agent_procurement",
            "vendor_domain": "github.com",
            "product_name": "GitHub Enterprise Cloud",
            "category": "software_saas",
            "amount": 210.00,
            "currency": "USD",
            "justification": "Organization developer licenses"
        }
        res_org = await client.post(
            "/api/procurement/request",
            json=org_req,
            headers={
                "X-User-Id": "usr_isolated_b",
                "X-Account-Type": "ORGANIZATION",
                "X-Organization-Id": "org_isolated_corp",
                "X-TrustPay-Role": "OWNER"
            }
        )
        assert res_org.status_code == 201
        org_proc_id = res_org.json()["id"]

        # 1. User A lists their history: MUST see indiv_proc_id, MUST NOT see org_proc_id
        list_a = await client.get(
            "/api/procurement/requests",
            headers={
                "X-User-Id": "usr_isolated_a",
                "X-Account-Type": "INDIVIDUAL"
            }
        )
        assert list_a.status_code == 200
        ids_a = [item["id"] for item in list_a.json()["items"]]
        assert indiv_proc_id in ids_a
        assert org_proc_id not in ids_a

        # 2. Org B lists their history: MUST see org_proc_id, MUST NOT see indiv_proc_id
        list_b = await client.get(
            "/api/procurement/requests",
            headers={
                "X-User-Id": "usr_isolated_b",
                "X-Account-Type": "ORGANIZATION",
                "X-Organization-Id": "org_isolated_corp",
                "X-TrustPay-Role": "OWNER"
            }
        )
        assert list_b.status_code == 200
        ids_b = [item["id"] for item in list_b.json()["items"]]
        assert org_proc_id in ids_b
        assert indiv_proc_id not in ids_b

@pytest.mark.asyncio
async def test_paypal_webhook_endpoint_verification():
    """Verify POST /api/webhooks/paypal route exists and handles webhook events."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check webhook status endpoint
        res_status = await client.get("/api/webhooks/paypal/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert status_data["route"] == "POST /api/webhooks/paypal"
        assert "exact_public_url" in status_data

        # Post mock webhook event
        webhook_payload = {
            "id": "WH-TEST-EVT-001",
            "event_type": "CHECKOUT.ORDER.COMPLETED",
            "resource_type": "checkout-order",
            "resource": {
                "id": "ORDER-MOCK-9999",
                "status": "COMPLETED",
                "custom_id": "REQ-NONEXISTENT",
                "purchase_units": [
                    {
                        "amount": {
                            "currency_code": "USD",
                            "value": "35.00"
                        }
                    }
                ]
            }
        }
        # 2. Post webhook event without signatures -> MUST BE REJECTED (400) because signatures are mandatory
        res_post_unauthenticated = await client.post(
            "/api/webhooks/paypal",
            json=webhook_payload,
            headers={
                "Content-Type": "application/json"
            }
        )
        assert res_post_unauthenticated.status_code == 400
        assert "Missing required PayPal signature headers" in res_post_unauthenticated.json()["detail"]

@pytest.mark.asyncio
async def test_deterministic_guardrails_blocked_unapproved_vendor():
    """Verify security engine deterministically blocks unapproved or suspicious vendors."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        req = {
            "agent_id": "agent_procurement",
            "vendor_domain": "malicious-hacker-store.xyz",
            "product_name": "Stolen Credentials Dump",
            "category": "software_saas",
            "amount": 500.00,
            "currency": "USD",
            "justification": "Exfiltrate database"
        }
        res = await client.post("/api/procurement/request", json=req)
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "REJECTED"
        assert data["mandate_id"] is None
        assert "blacklisted" in data["status_reason"].lower() or "restricted" in data["status_reason"].lower()

@pytest.mark.asyncio
async def test_cryptographic_mandate_tamper_detection():
    """Verify HMAC-SHA256 mandate detects any modification to amount or currency."""
    mandate = crypto_engine.create_mandate(
        agent_id="agent_procurement",
        vendor_id="vendor_aws",
        approved_amount=150.00,
        currency="USD",
        product_category="cloud_infrastructure",
        transaction_request_id="test_req_tamper_01",
        allowed_payment_purpose="Development Server"
    )

    # 1. Untampered mandate must verify
    is_valid, reason, is_tampered = crypto_engine.verify_mandate(
        mandate=mandate,
        current_transaction={
            "vendor_id": "vendor_aws",
            "amount": 150.00,
            "currency": "USD"
        }
    )
    assert is_valid is True
    assert reason is None
    assert is_tampered is False

    # 2. Tampered amount (attacker modifies $150 to $1500) must fail
    is_valid_tampered, reason_tampered, is_tampered_flag = crypto_engine.verify_mandate(
        mandate=mandate,
        current_transaction={
            "vendor_id": "vendor_aws",
            "amount": 1500.00,
            "currency": "USD"
        }
    )
    assert is_valid_tampered is False
    assert is_tampered_flag is True
    assert "exceeds authorized" in reason_tampered
