import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database import init_db

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_end_to_end_procurement_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Get Scenarios
        res = await client.get("/api/procurement/scenarios")
        assert res.status_code == 200
        scenarios = res.json()
        assert len(scenarios) >= 3

        # 3. Submit safe procurement request
        safe_req = {
            "agent_id": "agent_copilot_ops",
            "agent_name": "Developer Productivity Agent",
            "item_name": "GitHub Enterprise Copilot 5-Seat Pack",
            "category": "software_saas",
            "vendor_name": "GitHub, Inc.",
            "vendor_domain": "github.com",
            "amount": 190.00,
            "currency": "USD",
            "justification": "Accelerate pull request delivery velocity for backend engineering squad."
        }
        res = await client.post("/api/procurement/request", json=safe_req)
        assert res.status_code in (200, 201)
        purchase_data = res.json()
        purchase_id = purchase_data["id"]
        mandate_id = purchase_data["mandate_id"]
        assert mandate_id is not None
        assert purchase_data["status"] == "PENDING_HUMAN_APPROVAL"

        # 4. Verify Cryptographic Mandate
        res = await client.get(f"/api/mandates/{mandate_id}")
        assert res.status_code == 200
        mandate_data = res.json()
        assert mandate_data["verification_status"] is True

        # 5. Tamper Test on Mandate - verify detection
        res = await client.post("/api/mandates/tamper-test", json={
            "mandate_id": mandate_id,
            "tampered_amount": 9999.00
        })
        assert res.status_code == 200
        tamper_res = res.json()
        assert tamper_res["tamper_detected"] is True
        assert tamper_res["is_valid"] is False

        # 6. Human Buyer Approves
        res = await client.post("/api/payments/approve", json={
            "purchase_id": purchase_id,
            "mandate_id": mandate_id,
            "approved_by": "lead_architect@trustpay.internal",
            "notes": "Verified Copilot license requirements with CTO."
        })
        assert res.status_code == 200
        assert res.json()["success"] is True

        # 7. Create PayPal Sandbox Order with Idempotency Key
        idempotency_key = f"idem_order_{purchase_id}"
        order_req = {
            "purchase_id": purchase_id,
            "mandate_id": mandate_id,
            "idempotency_key": idempotency_key
        }
        res = await client.post("/api/payments/create-order", json=order_req)
        assert res.status_code == 201
        order_data = res.json()
        assert order_data["success"] is True
        paypal_order_id = order_data["paypal_order_id"]
        assert paypal_order_id is not None

        # Repeat with same idempotency key - verify returns cached response
        res_repeat = await client.post("/api/payments/create-order", json=order_req)
        assert res_repeat.status_code == 201
        assert res_repeat.json()["paypal_order_id"] == paypal_order_id

        # 8. Capture PayPal Order
        capture_key = f"idem_cap_{purchase_id}"
        capture_req = {
            "purchase_id": purchase_id,
            "mandate_id": mandate_id,
            "paypal_order_id": paypal_order_id,
            "idempotency_key": capture_key
        }
        res = await client.post("/api/payments/capture-order", json=capture_req)
        assert res.status_code == 200
        cap_data = res.json()
        assert cap_data["success"] is True
        assert cap_data["status"] == "COMPLETED"

        # 9. Verify Immutable Audit Ledger Integrity
        res = await client.get("/api/audit/verify")
        assert res.status_code == 200
        verify_data = res.json()
        assert verify_data["is_valid"] is True
        assert verify_data["total_blocks"] >= 3
