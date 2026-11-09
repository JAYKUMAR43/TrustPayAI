import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.database.connection import get_db
from backend.models.policy import SpendingPolicyModel
from backend.schemas.policy import PolicyCreateRequest, PolicyResponse
from backend.schemas.guardrail import ProcurementEvaluationPayload, PolicyEvaluationResult
from backend.schemas.common import PaginatedResponse
from backend.security.rbac import require_roles, UserRole
from backend.services.audit_service import audit_service
from backend.agents.policy_agent import policy_agent

router = APIRouter(prefix="/api/policies", tags=["policies"])

@router.post("", response_model=PolicyResponse, status_code=201)
async def create_policy(
    payload: PolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_role: str = Depends(require_roles([UserRole.ADMIN]))
):
    # Check duplicate policy name
    existing = await db.execute(
        select(SpendingPolicyModel).where(SpendingPolicyModel.name == payload.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Policy with name '{payload.name}' already exists")

    policy = SpendingPolicyModel(
        name=payload.name,
        policy_type=payload.policy_type.upper(),
        description=payload.description,
        rule_value=json.dumps(payload.rule_value),
        is_active=payload.is_active,
        created_by="admin"
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    # Log to audit trail
    await audit_service.log_event(
        db=db,
        event_type="POLICY_CREATED",
        actor="admin",
        details={
            "policy_id": policy.id,
            "policy_name": policy.name,
            "rule_type": policy.policy_type
        }
    )

    return PolicyResponse(
        id=policy.id,
        name=policy.name,
        policy_type=policy.policy_type,
        description=policy.description,
        rule_value=json.loads(policy.rule_value),
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at
    )

@router.get("", response_model=PaginatedResponse[PolicyResponse])
async def list_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(SpendingPolicyModel)
    count_query = select(func.count(SpendingPolicyModel.id))

    if is_active is not None:
        query = query.where(SpendingPolicyModel.is_active == is_active)
        count_query = count_query.where(SpendingPolicyModel.is_active == is_active)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(SpendingPolicyModel.id.asc())
    res = await db.execute(query)
    policies = res.scalars().all()

    items = []
    for p in policies:
        try:
            val = json.loads(p.rule_value)
        except Exception:
            val = {"raw": p.rule_value}
        items.append(PolicyResponse(
            id=p.id,
            name=p.name,
            policy_type=p.policy_type,
            description=p.description,
            rule_value=val,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items
    )

@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_role: str = Depends(require_roles([UserRole.ADMIN]))
):
    res = await db.execute(select(SpendingPolicyModel).where(SpendingPolicyModel.id == policy_id))
    policy = res.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if "is_active" in payload:
        policy.is_active = bool(payload["is_active"])
    if "rule_value" in payload:
        policy.rule_value = json.dumps(payload["rule_value"])

    await db.commit()
    await db.refresh(policy)

    val = json.loads(policy.rule_value) if policy.rule_value else {}
    return PolicyResponse(
        id=policy.id,
        name=policy.name,
        policy_type=policy.policy_type,
        description=policy.description,
        rule_value=val,
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at
    )

@router.post("/evaluate", response_model=PolicyEvaluationResult)
async def evaluate_procurement_policy(
    payload: ProcurementEvaluationPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluates a procurement request against the 10-check policy guardrail engine.
    Produces structured decision: APPROVED, REJECTED, or REQUIRES_HUMAN_APPROVAL.
    Deterministic financial logic rules unconditionally; LLM cannot override hard caps.
    """
    return await policy_agent.evaluate_request(payload, policy=payload.policy_config, db=db)

