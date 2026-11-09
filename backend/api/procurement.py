import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.database.connection import get_db
from backend.models.procurement import ProcurementRequestModel
from backend.models.purchase import PurchaseRequestModel
from backend.models.agent import AgentModel
from backend.models.vendor import VendorModel
from backend.models.transaction import TransactionModel
from backend.models.risk import RiskEventModel
from backend.models.mandate import AuthorizationMandateModel
from backend.schemas.procurement import ProcurementSubmitRequest, ProcurementResponse
from backend.schemas.procurement_agent import NaturalLanguageProcurementRequest, AutonomousProcurementResult, CatalogProduct
from backend.schemas.common import PaginatedResponse
from backend.schemas.purchase import SimulationScenario, PurchaseCreateRequest
from backend.agents.policy_agent import policy_agent
from backend.agents.risk_agent import risk_engine, RiskLevel
from backend.agents.procurement_agent import procurement_agent
from backend.security.crypto_engine import crypto_engine
from backend.services.policy_service import policy_service
from backend.services.audit_service import audit_service
from backend.services.catalog_service import catalog_service
from backend.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/procurement", tags=["procurement"])

@router.post("/request", response_model=ProcurementResponse, status_code=201)
async def submit_procurement_request(
    payload: ProcurementSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an autonomous agent procurement request.
    Executes:
    1. Agent and Vendor resolution
    2. Policy Guardrail Evaluation
    3. Multi-factor Risk Assessment (stores in risk_events)
    4. Cryptographic Mandate Generation (if policy passed)
    5. Transaction Record Initialization (stores in transactions)
    6. Audit Ledger Commit
    """
    # 1. Resolve or auto-register Agent
    agent_res = await db.execute(select(AgentModel).where(AgentModel.id == payload.agent_id))
    agent = agent_res.scalar_one_or_none()
    if not agent:
        agent = AgentModel(
            id=payload.agent_id,
            name=payload.agent_id.replace("_", " ").title(),
            model_name="gemini-2.5-flash",
            role_description="Autonomous procurement worker",
            allocated_budget=5000.00,
            spent_budget=0.00,
            status="ACTIVE"
        )
        db.add(agent)
        await db.commit()

    # 2. Resolve or register Vendor
    vendor_clean_domain = payload.vendor_domain.lower().strip()
    vendor_res = await db.execute(select(VendorModel).where(VendorModel.domain == vendor_clean_domain))
    vendor = vendor_res.scalar_one_or_none()
    if not vendor:
        vendor_id = payload.vendor_id or f"vendor_{vendor_clean_domain.replace('.', '_')}"
        vendor_name = payload.vendor_name or vendor_clean_domain.split(".")[0].title()
        
        # Check domain against known suspicious TLDs
        is_suspicious = any(vendor_clean_domain.endswith(tld) for tld in [".xyz", ".biz", ".top", ".ru", ".su"])
        vendor_status = "BLACKLISTED" if is_suspicious else "WHITELISTED"
        
        vendor = VendorModel(
            id=vendor_id,
            name=vendor_name,
            domain=vendor_clean_domain,
            category=payload.category,
            status=vendor_status,
            trust_score=20.0 if is_suspicious else 85.0
        )
        db.add(vendor)
        await db.commit()

    request_id = str(uuid.uuid4())

    # 3. Policy Guardrail Evaluation
    purchase_req_adapter = PurchaseCreateRequest(
        agent_id=payload.agent_id,
        agent_name=agent.name,
        item_name=payload.product_name,
        category=payload.category,
        vendor_name=vendor.name,
        vendor_domain=vendor.domain,
        amount=payload.amount,
        currency=payload.currency,
        justification=payload.justification
    )
    
    policies = await policy_service.get_policy_dict(db)
    policy_passed, violations, warnings = await policy_agent.evaluate_purchase(purchase_req_adapter, policies, db)

    # 4. Multi-Factor Risk Assessment
    risk_score, risk_level, risk_factors = await risk_engine.analyze_risk(purchase_req_adapter, db)

    # Record Risk Event
    action_taken = "BLOCKED" if not policy_passed else "FLAGGED_FOR_REVIEW" if risk_score >= 30 else "ALLOWED"
    risk_event = RiskEventModel(
        procurement_id=request_id,
        agent_id=payload.agent_id,
        vendor_id=vendor.id,
        risk_score=risk_score,
        risk_level=risk_level.value,
        risk_factors=json.dumps(risk_factors + warnings),
        action_taken=action_taken
    )
    db.add(risk_event)

    mandate_model = None
    transaction_status = "PENDING"
    approval_status = "AWAITING_REVIEW"

    if not policy_passed:
        req_status = "REJECTED"
        req_status_reason = " | ".join(violations)
        transaction_status = "REJECTED"
        approval_status = "AUTO_REJECTED"
    elif risk_level == RiskLevel.HIGH and payload.amount > 1000:
        req_status = "REJECTED"
        req_status_reason = f"Critical Risk ({risk_score}/100) on unauthorized high-ticket procurement."
        transaction_status = "REJECTED"
        approval_status = "AUTO_REJECTED"
    else:
        req_status = "PENDING_HUMAN_APPROVAL"
        req_status_reason = "Mandate generated. Awaiting authorized human review before payment execution."

        # 5. Generate Cryptographic Mandate
        mandate_dict = crypto_engine.generate_mandate(
            purchase_id=request_id,
            agent_id=payload.agent_id,
            item_name=payload.product_name,
            vendor_name=vendor.name,
            vendor_domain=vendor.domain,
            amount=payload.amount,
            currency=payload.currency
        )

        mandate_model = AuthorizationMandateModel(
            mandate_id=mandate_dict["mandate_id"],
            request_id=request_id,
            agent_id=payload.agent_id,
            intent_hash=mandate_dict["intent_hash"],
            nonce=mandate_dict["nonce"],
            issued_at=mandate_dict["issued_at"],
            expires_at=mandate_dict["expires_at"],
            max_authorized_amount=mandate_dict["max_authorized_amount"],
            currency=mandate_dict["currency"],
            signature=mandate_dict["signature"]
        )
        db.add(mandate_model)

    # 6. Create Procurement Request Record
    procurement_model = ProcurementRequestModel(
        id=request_id,
        agent_id=payload.agent_id,
        vendor_id=vendor.id,
        product_name=payload.product_name,
        category=payload.category,
        amount=payload.amount,
        currency=payload.currency,
        justification=payload.justification,
        status=req_status,
        status_reason=req_status_reason,
        risk_score=risk_score,
        mandate_id=mandate_model.mandate_id if mandate_model else None
    )
    db.add(procurement_model)

    # Synchronize with purchase_requests table for payment and mandate workflows
    purchase_model = PurchaseRequestModel(
        id=request_id,
        agent_id=payload.agent_id,
        agent_name=agent.name,
        item_name=payload.product_name,
        category=payload.category,
        vendor_name=vendor.name,
        vendor_domain=vendor.domain,
        amount=payload.amount,
        currency=payload.currency,
        justification=payload.justification,
        status=req_status,
        status_reason=req_status_reason,
        risk_score=risk_score,
        mandate_id=mandate_model.mandate_id if mandate_model else None
    )
    db.add(purchase_model)

    # 7. Create Mandatory Transaction Record
    transaction_id = str(uuid.uuid4())
    transaction_model = TransactionModel(
        transaction_id=transaction_id,
        agent_id=payload.agent_id,
        vendor_id=vendor.id,
        requested_amount=payload.amount,
        currency=payload.currency,
        requested_product=payload.product_name,
        transaction_status=transaction_status,
        risk_score=risk_score,
        approval_status=approval_status,
        paypal_order_id=None,
        procurement_id=request_id,
        mandate_id=mandate_model.mandate_id if mandate_model else None
    )
    db.add(transaction_model)

    # Commit atomic database transaction
    await db.commit()
    await db.refresh(procurement_model)

    # 8. Append Immutable Block to Hash-Chained Audit Ledger
    event_type = "MANDATE_ISSUED" if mandate_model else "REQUEST_REJECTED"
    await audit_service.log_event(
        db=db,
        event_type=event_type,
        actor=payload.agent_id,
        details={
            "procurement_id": request_id,
            "transaction_id": transaction_id,
            "agent_id": payload.agent_id,
            "vendor_domain": vendor.domain,
            "amount": payload.amount,
            "currency": payload.currency,
            "risk_score": risk_score,
            "mandate_id": mandate_model.mandate_id if mandate_model else None,
            "status": req_status
        },
        purchase_id=request_id,
        mandate_id=mandate_model.mandate_id if mandate_model else None
    )

    # Broadcast real-time activity event via WebSockets
    try:
        await ws_manager.broadcast_event(
            event_type=event_type,
            data={
                "transaction_id": transaction_id,
                "procurement_id": request_id,
                "agent_id": payload.agent_id,
                "vendor_name": vendor.name,
                "item_name": payload.product_name,
                "amount": payload.amount,
                "currency": payload.currency,
                "risk_score": risk_score,
                "status": req_status,
                "mandate_id": mandate_model.mandate_id if mandate_model else None
            },
            actor=payload.agent_id
        )
    except Exception:
        pass

    return ProcurementResponse.model_validate(procurement_model)

@router.get("/requests", response_model=PaginatedResponse[ProcurementResponse])
async def list_procurement_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProcurementRequestModel)
    count_query = select(func.count(ProcurementRequestModel.id))

    if status:
        query = query.where(ProcurementRequestModel.status == status.upper())
        count_query = count_query.where(ProcurementRequestModel.status == status.upper())
    if agent_id:
        query = query.where(ProcurementRequestModel.agent_id == agent_id)
        count_query = count_query.where(ProcurementRequestModel.agent_id == agent_id)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(desc(ProcurementRequestModel.created_at))
    res = await db.execute(query)
    requests = res.scalars().all()

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[ProcurementResponse.model_validate(r) for r in requests]
    )

# Backward-compatible alias for existing frontend dashboard
@router.get("/history")
async def get_history_alias(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    paginated = await list_procurement_requests(skip=skip, limit=limit, status=status, db=db)
    # Map to frontend purchase format
    return [
        {
            "id": r.id,
            "agent_id": r.agent_id,
            "agent_name": r.agent_id.replace("_", " ").title(),
            "item_name": r.product_name,
            "category": r.category,
            "vendor_name": r.vendor_id,
            "vendor_domain": r.vendor_id.replace("vendor_", "").replace("_", "."),
            "amount": r.amount,
            "currency": r.currency,
            "justification": r.justification,
            "status": r.status,
            "status_reason": r.status_reason,
            "risk_score": r.risk_score,
            "mandate_id": r.mandate_id,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat()
        }
        for r in paginated.items
    ]

@router.get("/scenarios")
async def get_scenarios():
    from backend.routers.procurement import DEMO_SCENARIOS
    return DEMO_SCENARIOS

@router.post("/parse-prompt")
async def parse_prompt_endpoint(payload: dict):
    prompt = payload.get("prompt", "")
    agent_id = payload.get("agent_id")
    agent_name = payload.get("agent_name")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    parsed = await procurement_agent.parse_prompt_to_purchase_request(prompt, agent_id, agent_name)
    return {
        "agent_id": parsed.agent_id,
        "vendor_domain": parsed.vendor_domain,
        "vendor_name": parsed.vendor_name,
        "product_name": parsed.item_name,
        "category": parsed.category,
        "amount": parsed.amount,
        "currency": parsed.currency,
        "justification": parsed.justification
    }

@router.post("/agent/process", response_model=AutonomousProcurementResult)
async def process_autonomous_procurement(payload: NaturalLanguageProcurementRequest):
    """
    Autonomous Procurement Agent pipeline powered by LangGraph & Google Gemini.
    Understands intent, extracts category/budget/vendor, searches internal catalog,
    compares products, explains recommendation rationale, and submits to policy guardrails.
    SECURITY: NEVER executes payments. Generates strictly validated proposals.
    """
    return await procurement_agent.process_procurement_request(payload)

@router.get("/catalog", response_model=List[CatalogProduct])
async def list_internal_catalog(
    category: Optional[str] = None,
    query: Optional[str] = None,
    max_budget: Optional[float] = None
):
    """
    Searches or lists items in the verified internal vendor catalog.
    """
    return catalog_service.search_catalog(
        query=query or "",
        category=category,
        max_budget=max_budget,
        only_approved=False
    )

