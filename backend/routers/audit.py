import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.database import get_db
from backend.models.audit import AuditLogModel
from backend.schemas.audit import AuditLogSchema, IntegrityVerificationResult
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("/logs", response_model=List[AuditLogSchema])
async def get_audit_logs(
    limit: int = Query(100, le=500),
    event_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLogModel).order_by(desc(AuditLogModel.block_index)).limit(limit)
    if event_type:
        query = query.where(AuditLogModel.event_type == event_type)
    
    result = await db.execute(query)
    blocks = result.scalars().all()

    out = []
    for b in blocks:
        try:
            details = json.loads(b.details)
        except Exception:
            details = {"raw": b.details}
        out.append(AuditLogSchema(
            block_index=b.block_index,
            event_id=b.event_id,
            event_type=b.event_type,
            purchase_id=b.purchase_id,
            mandate_id=b.mandate_id,
            actor=b.actor,
            details=details,
            timestamp=b.timestamp,
            prev_hash=b.prev_hash,
            curr_hash=b.curr_hash
        ))
    return out

@router.get("/verify", response_model=IntegrityVerificationResult)
async def verify_audit_ledger_integrity(db: AsyncSession = Depends(get_db)):
    """
    Performs full cryptographic traversal of the entire immutable hash-chain ledger.
    Verifies every block hash and parent link back to the genesis block.
    """
    is_valid, total_blocks, broken_index, msg = await audit_service.verify_chain_integrity(db)
    return IntegrityVerificationResult(
        is_valid=is_valid,
        total_blocks=total_blocks,
        broken_block_index=broken_index,
        message=msg
    )
