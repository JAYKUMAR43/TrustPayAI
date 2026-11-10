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
from backend.security.rbac import require_roles, UserRole, TenantContext, get_current_tenant_context, require_mfa_step_up
from backend.services.audit_service import audit_service
from backend.agents.policy_agent import policy_agent

router = APIRouter(prefix="/api/policies", tags=["policies"])

@router.post("", response_model=PolicyResponse, status_code=201)
async def create_policy(
    payload: PolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    current_role: str = Depends(require_roles([UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.OWNER])),
    _mfa: bool = Depends(require_mfa_step_up)
):
    # Check duplicate policy name in this scope
    existing_query = select(SpendingPolicyModel).where(SpendingPolicyModel.name == payload.name)
    if tenant_context.is_organization and tenant_context.organization_id:
        existing_query = existing_query.where(
            (SpendingPolicyModel.organization_id == tenant_context.organization_id) |
            (SpendingPolicyModel.organization_id.is_(None))
        )
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Policy with name '{payload.name}' already exists")

    org_id = tenant_context.organization_id if tenant_context.is_organization else None

    # Handle string or dict rule_value cleanly
    raw_val = payload.rule_value
    if isinstance(raw_val, str):
        try:
            val_dict = json.loads(raw_val)
        except Exception:
            val_dict = {"value": raw_val}
    elif isinstance(raw_val, dict):
        val_dict = raw_val
    else:
        val_dict = {}

    policy = SpendingPolicyModel(
        name=payload.name,
        policy_type=payload.policy_type.upper(),
        description=payload.description,
        rule_value=json.dumps(val_dict),
        is_active=payload.is_active,
        organization_id=org_id,
        created_by=tenant_context.user_email
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    # Log to audit trail
    await audit_service.log_event(
        db=db,
        event_type="POLICY_CREATED",
        actor=tenant_context.user_email,
        details={
            "policy_id": policy.id,
            "policy_name": policy.name,
            "rule_type": policy.policy_type,
            "organization_id": org_id,
            "rule_value": val_dict
        }
    )

    return PolicyResponse(
        id=policy.id,
        name=policy.name,
        policy_type=policy.policy_type,
        description=policy.description,
        rule_value=val_dict,
        is_active=policy.is_active,
        organization_id=policy.organization_id,
        created_at=policy.created_at,
        updated_at=policy.updated_at
    )

@router.get("", response_model=PaginatedResponse[PolicyResponse])
async def list_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_current_tenant_context)
):
    query = select(SpendingPolicyModel)
    count_query = select(func.count(SpendingPolicyModel.id))

    # Tenant isolation: show org policies + global defaults
    if tenant_context.is_organization and tenant_context.organization_id:
        query = query.where(
            (SpendingPolicyModel.organization_id == tenant_context.organization_id) |
            (SpendingPolicyModel.organization_id.is_(None))
        )
        count_query = count_query.where(
            (SpendingPolicyModel.organization_id == tenant_context.organization_id) |
            (SpendingPolicyModel.organization_id.is_(None))
        )

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
            organization_id=p.organization_id,
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
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    current_role: str = Depends(require_roles([UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.OWNER])),
    _mfa: bool = Depends(require_mfa_step_up)
):
    res = await db.execute(select(SpendingPolicyModel).where(SpendingPolicyModel.id == policy_id))
    policy = res.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if "is_active" in payload:
        policy.is_active = bool(payload["is_active"])
    if "rule_value" in payload:
        if isinstance(payload["rule_value"], (dict, list)):
            policy.rule_value = json.dumps(payload["rule_value"])
        else:
            try:
                # Validate json or store as string dict
                parsed = json.loads(str(payload["rule_value"]))
                policy.rule_value = json.dumps(parsed)
            except Exception:
                policy.rule_value = json.dumps({"value": payload["rule_value"]})

    await db.commit()
    await db.refresh(policy)

    # Log to audit trail
    await audit_service.log_event(
        db=db,
        event_type="POLICY_UPDATED",
        actor=tenant_context.user_email,
        details={
            "policy_id": policy.id,
            "policy_name": policy.name,
            "is_active": policy.is_active,
            "organization_id": policy.organization_id
        }
    )

    val = json.loads(policy.rule_value) if policy.rule_value else {}
    return PolicyResponse(
        id=policy.id,
        name=policy.name,
        policy_type=policy.policy_type,
        description=policy.description,
        rule_value=val,
        is_active=policy.is_active,
        organization_id=policy.organization_id,
        created_at=policy.created_at,
        updated_at=policy.updated_at
    )

@router.delete("/{policy_id}")
async def delete_policy(
    policy_id: int,
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    current_role: str = Depends(require_roles([UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.OWNER])),
    _mfa: bool = Depends(require_mfa_step_up)
):
    res = await db.execute(select(SpendingPolicyModel).where(SpendingPolicyModel.id == policy_id))
    policy = res.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    await db.delete(policy)
    await db.commit()

    await audit_service.log_event(
        db=db,
        event_type="POLICY_DELETED",
        actor=tenant_context.user_email,
        details={"policy_id": policy_id, "policy_name": policy.name}
    )
    return {"status": "SUCCESS", "deleted_policy_id": policy_id}

@router.post("/reset-defaults")
async def reset_default_policies(
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    current_role: str = Depends(require_roles([UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.OWNER]))
):
    """Seeds the full enterprise fintech guardrail policy suite."""
    defaults = [
        {
            "name": "SINGLE_TRANSACTION_CAP",
            "policy_type": "SPENDING_LIMIT",
            "description": "Deterministic ceiling enforced on every autonomous agent procurement request.",
            "rule_value": {"max_amount": 1000.0, "currency": "USD"}
        },
        {
            "name": "DAILY_VELOCITY_CAP",
            "policy_type": "DAILY_LIMIT",
            "description": "Rolling 24-hour aggregate spending velocity cap across all agents in workspace.",
            "rule_value": {"daily_cap": 5000.0, "currency": "USD"}
        },
        {
            "name": "ALLOWED_VENDOR_DOMAINS",
            "policy_type": "VENDOR_WHITELIST",
            "description": "Approved commercial vendors permitted for autonomous agent procurement.",
            "rule_value": {"domains": ["kaggle.com", "huggingface.co", "dell.com", "lenovo.com", "apple.com", "hp.com", "github.com", "aws.amazon.com", "google.com", "microsoft.com", "paypal.com"]}
        },
        {
            "name": "BLOCKED_VENDOR_DOMAINS",
            "policy_type": "BLOCKED_VENDORS",
            "description": "High-risk, non-compliant, or suspicious domains barred from payment issuance.",
            "rule_value": {"domains": ["evil-hacker.com", "shady-downloads.biz", "darknet-market.io", "crypto-mixer.cc", "pirate-cloud.net"]}
        },
        {
            "name": "BANNED_CATEGORIES",
            "policy_type": "CATEGORY_RESTRICTION",
            "description": "Prohibited procurement categories rejected unconditionally by firewall.",
            "rule_value": {"categories": ["gambling", "weapons", "adult_content", "crypto_speculation", "restricted_hardware"]}
        },
        {
            "name": "DUAL_CUSTODY_APPROVAL_THRESHOLD",
            "policy_type": "APPROVAL_REQUIREMENT",
            "description": "Purchases above this threshold require human buyer confirmation prior to capture.",
            "rule_value": {"threshold": 25.0, "currency": "USD"}
        },
        {
            "name": "PERMITTED_CURRENCIES",
            "policy_type": "CURRENCY_RESTRICTION",
            "description": "Allowed settlement currencies on corporate payment rails.",
            "rule_value": {"allowed": ["USD", "INR", "EUR"]}
        }
    ]

    count = 0
    for d in defaults:
        res = await db.execute(select(SpendingPolicyModel).where(SpendingPolicyModel.name == d["name"]))
        if not res.scalar_one_or_none():
            p = SpendingPolicyModel(
                name=d["name"],
                policy_type=d["policy_type"],
                description=d["description"],
                rule_value=json.dumps(d["rule_value"]),
                is_active=True,
                created_by=tenant_context.user_email
            )
            db.add(p)
            count += 1

    await db.commit()
    return {"status": "SUCCESS", "policies_seeded": count}

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

