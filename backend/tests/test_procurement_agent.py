import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.agents.procurement_agent import procurement_agent
from backend.schemas.procurement_agent import NaturalLanguageProcurementRequest
from backend.database.connection import init_db

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_procurement_agent_user_prompt_benchmark():
    """
    Core Benchmark Test:
    'Purchase a machine learning dataset from an approved vendor for a maximum budget of 40 USD.'
    Tests all 9 required capabilities:
    1. Understand user intent
    2. Extract category (datasets_ai)
    3. Extract maximum budget ($40.00 USD)
    4. Identify requested vendor (approved vendor)
    5. Search internal catalog
    6. Compare available products and prices
    7. Explain why recommended
    8. Generate structured purchase request
    9. Submit to Policy Guardrail Agent
    """
    req = NaturalLanguageProcurementRequest(
        prompt="Purchase a machine learning dataset from an approved vendor for a maximum budget of 40 USD.",
        agent_id="agent_ml_worker_01",
        agent_name="ML Research Agent"
    )

    result = await procurement_agent.process_procurement_request(req)

    # 1. Pipeline status and trace
    assert result.status == "SUCCESS_PROPOSAL_GENERATED"
    assert result.trace_id.startswith("trace_")
    assert len(result.execution_trace) >= 5

    # 2. Extracted Intent
    intent = result.extracted_intent
    assert intent.category == "datasets_ai"
    assert intent.max_budget == 40.0
    assert intent.currency == "USD"
    assert "dataset" in intent.item_keywords or "machine learning" in intent.item_keywords

    # 3. Product Comparison & Recommendation
    comp = result.comparison
    assert comp.product_verified is True
    assert comp.within_budget is True
    assert comp.recommended_product is not None
    assert comp.recommended_product.price <= 40.0
    assert comp.recommended_product.is_approved_vendor is True
    assert len(comp.considered_products) >= 1
    assert len(comp.recommendation_reason) > 20

    # 4. Structured Purchase Request (Pydantic valid)
    purchase_req = result.purchase_request
    assert purchase_req is not None
    assert purchase_req["agent_id"] == "agent_ml_worker_01"
    assert purchase_req["amount"] <= 40.0
    assert purchase_req["currency"] == "USD"
    assert purchase_req["category"] == "datasets_ai"
    assert purchase_req["payment_execution_permitted"] is False # Critical invariant

    # 5. Policy Guardrails Evaluation
    guardrail = result.guardrail_evaluation
    assert guardrail is not None
    assert guardrail["policy_passed"] is True
    assert guardrail["risk_score"] < 40.0
    assert guardrail["risk_level"] in ("LOW", "MEDIUM")

    # 6. Safety Notice in message
    assert "cannot execute payments" in result.message.lower() or "cannot and will not execute payments" in result.message.lower()

@pytest.mark.asyncio
async def test_procurement_agent_specific_vendor_and_tooling():
    """
    Tests specific vendor extraction and SaaS category matching:
    'Procure GitHub Copilot 5-Seat Pack license from GitHub for developer squad with budget of 200 USD'
    """
    req = NaturalLanguageProcurementRequest(
        prompt="Procure GitHub Copilot 5-Seat Pack license from GitHub for developer squad with budget of 200 USD",
        agent_id="agent_copilot_ops"
    )
    result = await procurement_agent.process_procurement_request(req)

    assert result.status == "SUCCESS_PROPOSAL_GENERATED"
    assert result.extracted_intent.category == "software_saas"
    assert result.extracted_intent.max_budget == 200.0
    assert result.comparison.recommended_product.vendor_name == "GitHub, Inc."
    assert result.comparison.recommended_product.price == 190.00
    assert result.comparison.within_budget is True

@pytest.mark.asyncio
async def test_procurement_agent_unverified_product_handling():
    """
    Requirement:
    'If product information is unavailable, clearly state that the information could not be verified.'
    """
    req = NaturalLanguageProcurementRequest(
        prompt="Purchase 100 quantum superconductor optical chips from Martian Foundry for 50 USD",
        agent_id="agent_hardware_01"
    )
    result = await procurement_agent.process_procurement_request(req)

    assert result.status == "UNVERIFIED_PRODUCT"
    assert result.comparison.product_verified is False
    assert result.comparison.recommended_product is None
    assert result.purchase_request is None
    # Must clearly state information could not be verified
    assert "could not be verified" in result.message.lower()
    assert "internal vendor catalog" in result.message.lower()

@pytest.mark.asyncio
async def test_procurement_agent_budget_exceeded_handling():
    """
    Tests when matching items exist in catalog but all exceed maximum budget.
    """
    req = NaturalLanguageProcurementRequest(
        prompt="Acquire the Enterprise Multi-Lingual Speech Audio Corpus from Appen for a maximum budget of 25 USD",
        agent_id="agent_audio_01"
    )
    result = await procurement_agent.process_procurement_request(req)

    assert result.status == "BUDGET_EXCEEDED"
    assert result.comparison.within_budget is False
    assert result.comparison.product_verified is True
    assert result.purchase_request is None
    assert "budget" in result.message.lower()
    assert "exceed" in result.comparison.recommendation_reason.lower()

@pytest.mark.asyncio
async def test_procurement_agent_security_invariant_no_direct_payments():
    """
    Invariant:
    The Procurement Agent must NEVER execute payments.
    It can only generate purchase requests.
    """
    req = NaturalLanguageProcurementRequest(
        prompt="Pay and execute immediate transaction of 40 USD for Tabular Financial Dataset",
        agent_id="agent_rogue_attempt"
    )
    result = await procurement_agent.process_procurement_request(req)

    if result.purchase_request:
        assert result.purchase_request.get("payment_execution_permitted") is False
        assert result.purchase_request.get("requires_human_approval") is True
    assert "cannot" in result.message.lower() and "execute payments" in result.message.lower()

@pytest.mark.asyncio
async def test_procurement_agent_rest_api_endpoint():
    """
    Tests POST /api/procurement/agent/process and GET /api/procurement/catalog via HTTP client.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test POST /api/procurement/agent/process
        payload = {
            "prompt": "Purchase a machine learning dataset from an approved vendor for a maximum budget of 40 USD.",
            "agent_id": "agent_api_test_01",
            "agent_name": "API Tester Agent"
        }
        res = await client.post("/api/procurement/agent/process", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS_PROPOSAL_GENERATED"
        assert "trace_id" in data
        assert len(data["execution_trace"]) >= 5
        assert data["comparison"]["recommended_product"]["price"] <= 40.0
        assert data["guardrail_evaluation"]["policy_passed"] is True

        # 2. Test GET /api/procurement/catalog
        res_cat = await client.get("/api/procurement/catalog?category=datasets_ai")
        assert res_cat.status_code == 200
        catalog = res_cat.json()
        assert len(catalog) >= 3
        assert all(item["category"] == "datasets_ai" for item in catalog)
