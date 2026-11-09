import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database.connection import init_db

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "version" in data

@pytest.mark.asyncio
async def test_agent_registration_and_listing():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an agent
        agent_payload = {
            "id": "agent_test_sec_01",
            "name": "Security Test Runner",
            "model_name": "gemini-2.5-flash",
            "role_description": "Performs vulnerability regression scanning",
            "allocated_budget": 3500.00
        }
        res = await client.post("/api/agents", json=agent_payload, headers={"X-TrustPay-Role": "ADMIN"})
        assert res.status_code in (201, 409)

        # List agents with pagination
        res = await client.get("/api/agents?skip=0&limit=10")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
        assert any(a["id"] == "agent_test_sec_01" for a in data["items"])

@pytest.mark.asyncio
async def test_procurement_validation_rules():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Negative amount must be rejected (422)
        neg_req = {
            "agent_id": "agent_test_sec_01",
            "vendor_domain": "github.com",
            "product_name": "Invalid Negative Item",
            "category": "software_saas",
            "amount": -50.00,
            "currency": "USD",
            "justification": "Testing negative amount rejection"
        }
        res = await client.post("/api/procurement/request", json=neg_req)
        assert res.status_code == 422

        # 2. Zero amount must be rejected (422)
        zero_req = {
            "agent_id": "agent_test_sec_01",
            "vendor_domain": "github.com",
            "product_name": "Zero Item",
            "category": "software_saas",
            "amount": 0.00,
            "currency": "USD",
            "justification": "Testing zero amount rejection"
        }
        res = await client.post("/api/procurement/request", json=zero_req)
        assert res.status_code == 422

        # 3. Invalid currency must be rejected (422)
        bad_curr = {
            "agent_id": "agent_test_sec_01",
            "vendor_domain": "github.com",
            "product_name": "Invalid Currency Item",
            "category": "software_saas",
            "amount": 100.00,
            "currency": "INVALID_CURR",
            "justification": "Testing currency code rejection"
        }
        res = await client.post("/api/procurement/request", json=bad_curr)
        assert res.status_code == 422

@pytest.mark.asyncio
async def test_procurement_and_transaction_creation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Submit valid procurement request
        req = {
            "agent_id": "agent_copilot_ops",
            "vendor_domain": "github.com",
            "vendor_name": "GitHub Inc",
            "product_name": "GitHub Copilot Squad Pack",
            "category": "software_saas",
            "amount": 190.00,
            "currency": "USD",
            "justification": "Engineering team code completion expansion"
        }
        res = await client.post("/api/procurement/request", json=req)
        assert res.status_code == 201
        proc_data = res.json()
        assert proc_data["amount"] == 190.00
        assert proc_data["currency"] == "USD"
        assert proc_data["status"] == "PENDING_HUMAN_APPROVAL"

        # List procurement requests
        res = await client.get("/api/procurement/requests?skip=0&limit=10")
        assert res.status_code == 200
        p_list = res.json()
        assert p_list["total"] >= 1

        # Check transactions list
        res = await client.get("/api/transactions?skip=0&limit=10")
        assert res.status_code == 200
        tx_data = res.json()
        assert tx_data["total"] >= 1
        tx = tx_data["items"][0]
        assert "transaction_id" in tx
        assert "agent_id" in tx
        assert "vendor_id" in tx
        assert "requested_amount" in tx
        assert "currency" in tx
        assert "requested_product" in tx
        assert "transaction_status" in tx
        assert "risk_score" in tx
        assert "approval_status" in tx
        assert "created_timestamp" in tx

        # Fetch transaction by ID
        tx_id = tx["transaction_id"]
        res = await client.get(f"/api/transactions/{tx_id}")
        assert res.status_code == 200
        assert res.json()["transaction_id"] == tx_id

@pytest.mark.asyncio
async def test_policies_and_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Non-admin role is rejected with 403 Forbidden
        new_policy = {
            "name": "TEST_STRICT_OVERRIDE_CAP",
            "policy_type": "SPEND_LIMIT",
            "description": "Strict limit for dev squad",
            "rule_value": {"max_amount": 750.00},
            "is_active": True
        }
        res = await client.post("/api/policies", json=new_policy, headers={"X-TrustPay-Role": "AUDITOR"})
        assert res.status_code == 403

        # 2. Admin role is allowed
        res = await client.post("/api/policies", json=new_policy, headers={"X-TrustPay-Role": "ADMIN"})
        assert res.status_code in (201, 409)

        # 3. List policies
        res = await client.get("/api/policies?skip=0&limit=20")
        assert res.status_code == 200
        pols = res.json()
        assert pols["total"] >= 1

@pytest.mark.asyncio
async def test_audit_logs_and_risk_events():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check risk events endpoint
        res = await client.get("/api/risk-events?skip=0&limit=20")
        assert res.status_code == 200
        risk_data = res.json()
        assert "items" in risk_data
        assert "total" in risk_data

        # Check audit logs endpoint
        res = await client.get("/api/audit-logs?skip=0&limit=20")
        assert res.status_code == 200
        audit_data = res.json()
        assert "items" in audit_data
        assert "total" in audit_data

        # Verify hash chain integrity
        res = await client.get("/api/audit/verify")
        assert res.status_code == 200
        verify_data = res.json()
        assert verify_data["is_valid"] is True

@pytest.mark.asyncio
async def test_dashboard_stats():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/dashboard/stats")
        assert res.status_code == 200
        stats = res.json()
        assert "total_purchases" in stats
        assert "total_settled_spend" in stats
        assert "pending_approvals" in stats
        assert "blocked_attempts" in stats
        assert "active_mandates" in stats
        assert "average_risk_score" in stats
        assert "risk_distribution" in stats
        assert "limits" in stats
