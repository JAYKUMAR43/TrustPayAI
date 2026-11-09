import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.agents.policy_agent import PolicyGuardrailAgent
from backend.agents.risk_agent import RiskAnalysisEngine, RiskLevel
from backend.schemas.purchase import PurchaseCreateRequest

@pytest.mark.asyncio
async def test_banned_category_triggers_policy_violation():
    agent = PolicyGuardrailAgent()
    mock_db = AsyncMock()
    
    policies = {
        "BANNED_CATEGORIES": {"categories": ["gambling", "cryptocurrency", "prepaid_gift_cards"]},
        "SINGLE_TRANSACTION_CAP": {"max_amount": 1000.0},
        "BLOCKED_VENDOR_DOMAINS": {"domains": []}
    }

    req = PurchaseCreateRequest(
        agent_id="agent_1",
        agent_name="Test Agent",
        item_name="Crypto Mining Credits",
        category="cryptocurrency",
        vendor_name="CryptoNode",
        vendor_domain="cryptonode.io",
        amount=50.0,
        currency="USD",
        justification="Experimental liquidity"
    )

    passed, violations, warnings = await agent.evaluate_purchase(req, policies, mock_db)
    assert passed is False
    assert any("Prohibited Category" in v for v in violations)

@pytest.mark.asyncio
async def test_amount_exceeding_cap_fails_policy():
    agent = PolicyGuardrailAgent()
    mock_db = AsyncMock()
    
    policies = {
        "BANNED_CATEGORIES": {"categories": []},
        "SINGLE_TRANSACTION_CAP": {"max_amount": 1000.0},
        "BLOCKED_VENDOR_DOMAINS": {"domains": []}
    }

    req = PurchaseCreateRequest(
        agent_id="agent_1",
        agent_name="Test Agent",
        item_name="Enterprise Supercomputer",
        category="cloud_infrastructure",
        vendor_name="AWS",
        vendor_domain="aws.amazon.com",
        amount=2500.0,
        currency="USD",
        justification="High compute cluster"
    )

    passed, violations, warnings = await agent.evaluate_purchase(req, policies, mock_db)
    assert passed is False
    assert any("Transaction Limit Exceeded" in v for v in violations)

@pytest.mark.asyncio
async def test_risk_scoring_suspicious_domain():
    engine = RiskAnalysisEngine()
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_result

    req = PurchaseCreateRequest(
        agent_id="agent_sec",
        agent_name="Security Agent",
        item_name="Exploit DB",
        category="software_saas",
        vendor_name="Shady Tools",
        vendor_domain="shady-tools.xyz",
        amount=200.0,
        currency="USD",
        justification="Security research payload data feed"
    )

    score, level, reasons = await engine.analyze_risk(req, mock_db)
    assert score >= 30.0 # Suspicious TLD (.xyz) adds 30 pts
    assert any("Suspicious top-level domain" in r for r in reasons)
