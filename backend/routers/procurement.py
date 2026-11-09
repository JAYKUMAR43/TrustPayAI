import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.database import get_db
from backend.models.purchase import PurchaseRequestModel
from backend.schemas.purchase import PurchaseCreateRequest, PurchaseResponse, SimulationScenario
from backend.agents.orchestrator import orchestrator
from backend.agents.procurement_agent import procurement_agent

router = APIRouter(prefix="/api/procurement", tags=["procurement"])

DEMO_SCENARIOS: List[SimulationScenario] = [
    SimulationScenario(
        id="scenario_safe_saas",
        title="Approved SaaS: GitHub Copilot Pack",
        description="Autonomous developer agent requests 5 seats of GitHub Enterprise Copilot ($190.00).",
        category="software_saas",
        expected_outcome="PASS: Low Risk (15/100). Policy passes, Cryptographic Mandate issued, Pending Human Approval.",
        request=PurchaseCreateRequest(
            agent_id="agent_copilot_ops",
            agent_name="Developer Productivity Agent",
            item_name="GitHub Enterprise Copilot 5-Seat Pack",
            category="software_saas",
            vendor_name="GitHub, Inc.",
            vendor_domain="github.com",
            amount=190.00,
            currency="USD",
            justification="Accelerate pull request delivery velocity for backend engineering squad."
        )
    ),
    SimulationScenario(
        id="scenario_over_budget",
        title="Policy Breach: AWS Cloud Instance Spike",
        description="Autonomous infra agent attempts to purchase heavy GPU instances ($4,800.00), breaching the $1,000 cap.",
        category="cloud_infrastructure",
        expected_outcome="BLOCKED: Single transaction limit ($1,000) exceeded. Immediate hard guardrail rejection.",
        request=PurchaseCreateRequest(
            agent_id="agent_devops_01",
            agent_name="DevOps AutoScaler Agent",
            item_name="AWS EC2 p4de.24xlarge GPU Multi-Node Cluster",
            category="cloud_infrastructure",
            vendor_name="Amazon Web Services",
            vendor_domain="aws.amazon.com",
            amount=4800.00,
            currency="USD",
            justification="Auto-scale request triggered due to transient spike in background task inference."
        )
    ),
    SimulationScenario(
        id="scenario_banned_category",
        title="Prohibited Category: Anonymous Prepaid Cards",
        description="Agent attempts to procure anonymous digital prepaid gift cards ($500.00).",
        category="prepaid_gift_cards",
        expected_outcome="BLOCKED: Banned product category 'prepaid_gift_cards'. Zero tolerance policy violation.",
        request=PurchaseCreateRequest(
            agent_id="agent_sec_sentry",
            agent_name="AppSec Vulnerability Scanner",
            item_name="Anonymous Visa Digital Prepaid Cards",
            category="prepaid_gift_cards",
            vendor_name="DarkVendor Liquidity",
            vendor_domain="darknet-market.io",
            amount=500.00,
            currency="USD",
            justification="Emergency off-book vendor subscription payment experiment."
        )
    ),
    SimulationScenario(
        id="scenario_blacklisted_vendor",
        title="Hostile Merchant: Blacklisted Darknet Domain",
        description="Agent requests exploit database subscription from unverified suspicious merchant domain.",
        category="software_saas",
        expected_outcome="BLOCKED: Domain 'unknown-crypto-vendor.xyz' is on the restricted merchant blacklist.",
        request=PurchaseCreateRequest(
            agent_id="agent_data_pipeline",
            agent_name="Data Analytics Runner",
            item_name="Unverified High-Frequency Data Feed",
            category="software_saas",
            vendor_name="CryptoFeed Solutions",
            vendor_domain="unknown-crypto-vendor.xyz",
            amount=280.00,
            currency="USD",
            justification="Data ingestion enrichment for financial modeling."
        )
    ),
    SimulationScenario(
        id="scenario_monitoring_pass",
        title="Verified Tool: Datadog APM Suite",
        description="Autonomous observability agent procures Datadog APM & Synthetics ($320.00).",
        category="software_saas",
        expected_outcome="PASS: Low/Medium Risk (25/100). Whitelisted domain, Mandate generated, ready for human sign-off.",
        request=PurchaseCreateRequest(
            agent_id="agent_devops_01",
            agent_name="DevOps AutoScaler Agent",
            item_name="Datadog APM & Synthetic Monitoring Pro Tier",
            category="software_saas",
            vendor_name="Datadog Inc",
            vendor_domain="datadoghq.com",
            amount=320.00,
            currency="USD",
            justification="Continuous microservice telemetry and synthetic uptime health-checks."
        )
    )
]

@router.get("/scenarios", response_model=List[SimulationScenario])
async def get_simulation_scenarios():
    return DEMO_SCENARIOS

@router.post("/parse-prompt", response_model=PurchaseCreateRequest)
async def parse_agent_prompt(payload: dict):
    prompt = payload.get("prompt", "")
    agent_id = payload.get("agent_id")
    agent_name = payload.get("agent_name")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    return await procurement_agent.parse_prompt_to_purchase_request(prompt, agent_id, agent_name)

@router.post("/request", response_model=PurchaseResponse)
async def submit_procurement_request(
    request: PurchaseCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    purchase_model = await orchestrator.execute_procurement_flow(request, db)
    
    # Format response
    risk_reasons_list = []
    if purchase_model.risk_reasons:
        try:
            risk_reasons_list = json.loads(purchase_model.risk_reasons)
        except Exception:
            risk_reasons_list = [purchase_model.risk_reasons]

    return PurchaseResponse(
        id=purchase_model.id,
        agent_id=purchase_model.agent_id,
        agent_name=purchase_model.agent_name,
        item_name=purchase_model.item_name,
        category=purchase_model.category,
        vendor_name=purchase_model.vendor_name,
        vendor_domain=purchase_model.vendor_domain,
        amount=purchase_model.amount,
        currency=purchase_model.currency,
        justification=purchase_model.justification,
        status=purchase_model.status,
        status_reason=purchase_model.status_reason,
        risk_score=purchase_model.risk_score,
        risk_level=purchase_model.risk_level,
        risk_reasons=risk_reasons_list,
        mandate_id=purchase_model.mandate_id,
        paypal_order_id=purchase_model.paypal_order_id,
        paypal_capture_id=purchase_model.paypal_capture_id,
        created_at=purchase_model.created_at,
        updated_at=purchase_model.updated_at
    )

@router.get("/history", response_model=List[PurchaseResponse])
async def get_procurement_history(
    limit: int = Query(50, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(PurchaseRequestModel).order_by(desc(PurchaseRequestModel.created_at)).limit(limit)
    if status:
        query = query.where(PurchaseRequestModel.status == status)
    
    result = await db.execute(query)
    purchases = result.scalars().all()
    
    out = []
    for p in purchases:
        reasons = []
        if p.risk_reasons:
            try:
                reasons = json.loads(p.risk_reasons)
            except Exception:
                reasons = [p.risk_reasons]
        out.append(PurchaseResponse(
            id=p.id,
            agent_id=p.agent_id,
            agent_name=p.agent_name,
            item_name=p.item_name,
            category=p.category,
            vendor_name=p.vendor_name,
            vendor_domain=p.vendor_domain,
            amount=p.amount,
            currency=p.currency,
            justification=p.justification,
            status=p.status,
            status_reason=p.status_reason,
            risk_score=p.risk_score,
            risk_level=p.risk_level,
            risk_reasons=reasons,
            mandate_id=p.mandate_id,
            paypal_order_id=p.paypal_order_id,
            paypal_capture_id=p.paypal_capture_id,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))
    return out

@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase_by_id(purchase_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PurchaseRequestModel).where(PurchaseRequestModel.id == purchase_id))
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    reasons = []
    if p.risk_reasons:
        try:
            reasons = json.loads(p.risk_reasons)
        except Exception:
            reasons = [p.risk_reasons]

    return PurchaseResponse(
        id=p.id,
        agent_id=p.agent_id,
        agent_name=p.agent_name,
        item_name=p.item_name,
        category=p.category,
        vendor_name=p.vendor_name,
        vendor_domain=p.vendor_domain,
        amount=p.amount,
        currency=p.currency,
        justification=p.justification,
        status=p.status,
        status_reason=p.status_reason,
        risk_score=p.risk_score,
        risk_level=p.risk_level,
        risk_reasons=reasons,
        mandate_id=p.mandate_id,
        paypal_order_id=p.paypal_order_id,
        paypal_capture_id=p.paypal_capture_id,
        created_at=p.created_at,
        updated_at=p.updated_at
    )
