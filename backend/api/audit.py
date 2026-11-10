import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.database.connection import get_db
from backend.models.audit import AuditLogModel
from backend.schemas.audit import AuditLogResponse
from backend.schemas.common import PaginatedResponse
from backend.services.audit_service import audit_service
from backend.security.rbac import TenantContext, get_current_tenant_context, require_roles, UserRole

router = APIRouter(tags=["audit"])

@router.get("/api/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
@router.get("/api/audit/logs", response_model=PaginatedResponse[AuditLogResponse])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = Query(None),
    actor: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_context: TenantContext = Depends(get_current_tenant_context)
):
    query = select(AuditLogModel)
    count_query = select(func.count(AuditLogModel.block_index))

    # Tenant scoping
    if tenant_context.is_organization and tenant_context.organization_id:
        query = query.where(
            (AuditLogModel.organization_id == tenant_context.organization_id) |
            (AuditLogModel.organization_id.is_(None))
        )
        count_query = count_query.where(
            (AuditLogModel.organization_id == tenant_context.organization_id) |
            (AuditLogModel.organization_id.is_(None))
        )
    elif tenant_context.is_individual:
        query = query.where(
            (AuditLogModel.user_id == tenant_context.user_id) |
            (AuditLogModel.organization_id.is_(None))
        )
        count_query = count_query.where(
            (AuditLogModel.user_id == tenant_context.user_id) |
            (AuditLogModel.organization_id.is_(None))
        )

    if event_type:
        query = query.where(AuditLogModel.event_type == event_type.upper())
        count_query = count_query.where(AuditLogModel.event_type == event_type.upper())
    if actor:
        query = query.where(AuditLogModel.actor == actor)
        count_query = count_query.where(AuditLogModel.actor == actor)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(desc(AuditLogModel.block_index))
    res = await db.execute(query)
    blocks = res.scalars().all()

    items = []
    for b in blocks:
        try:
            details = json.loads(b.details)
        except Exception:
            details = {"raw": b.details}
        items.append(AuditLogResponse(
            block_index=b.block_index,
            event_id=b.event_id,
            event_type=b.event_type,
            entity_type=b.entity_type,
            entity_id=b.entity_id,
            actor=b.actor,
            details=details,
            prev_hash=b.prev_hash,
            curr_hash=b.curr_hash,
            created_at=b.created_at
        ))

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items
    )

@router.get("/api/audit/verify")
async def verify_chain_endpoint(db: AsyncSession = Depends(get_db)):
    is_valid, total_blocks, broken_index, msg = await audit_service.verify_chain_integrity(db)
    return {
        "is_valid": is_valid,
        "total_blocks": total_blocks,
        "verified_blocks": total_blocks,
        "broken_block_index": broken_index,
        "message": msg
    }
