import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.policy import PolicyRuleModel
from backend.schemas.policy import PolicyRuleSchema, PolicyUpdatePayload

router = APIRouter(prefix="/api/policies", tags=["policies"])

@router.get("", response_model=List[PolicyRuleSchema])
async def list_policies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PolicyRuleModel).order_by(PolicyRuleModel.id.asc()))
    rules = result.scalars().all()
    
    out = []
    for r in rules:
        try:
            val = json.loads(r.rule_value)
        except Exception:
            val = {"raw": r.rule_value}
        out.append(PolicyRuleSchema(
            id=r.id,
            rule_name=r.rule_name,
            rule_type=r.rule_type,
            description=r.description,
            rule_value=val,
            is_active=r.is_active,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return out

@router.put("/{policy_id}", response_model=PolicyRuleSchema)
async def update_policy(
    policy_id: int,
    payload: PolicyUpdatePayload,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(PolicyRuleModel).where(PolicyRuleModel.id == policy_id))
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Policy rule not found")

    if payload.is_active is not None:
        rule.is_active = payload.is_active
    if payload.rule_value is not None:
        rule.rule_value = json.dumps(payload.rule_value)

    await db.commit()
    await db.refresh(rule)

    val = json.loads(rule.rule_value) if rule.rule_value else {}
    return PolicyRuleSchema(
        id=rule.id,
        rule_name=rule.rule_name,
        rule_type=rule.rule_type,
        description=rule.description,
        rule_value=val,
        is_active=rule.is_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at
    )
