import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from backend.database.connection import get_db
from backend.models.risk import RiskEventModel
from backend.schemas.risk import RiskEventResponse
from backend.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/risk-events", tags=["risk"])

@router.get("", response_model=PaginatedResponse[RiskEventResponse])
async def list_risk_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="Filter by LOW, MEDIUM, HIGH"),
    agent_id: Optional[str] = Query(None, description="Filter by agent"),
    db: AsyncSession = Depends(get_db)
):
    query = select(RiskEventModel)
    count_query = select(func.count(RiskEventModel.id))

    if risk_level:
        query = query.where(RiskEventModel.risk_level == risk_level.upper())
        count_query = count_query.where(RiskEventModel.risk_level == risk_level.upper())
    if agent_id:
        query = query.where(RiskEventModel.agent_id == agent_id)
        count_query = count_query.where(RiskEventModel.agent_id == agent_id)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(desc(RiskEventModel.created_at))
    res = await db.execute(query)
    events = res.scalars().all()

    items = []
    for e in events:
        try:
            factors = json.loads(e.risk_factors)
        except Exception:
            factors = [e.risk_factors]
        items.append(RiskEventResponse(
            id=e.id,
            procurement_id=e.procurement_id,
            transaction_id=e.transaction_id,
            agent_id=e.agent_id,
            vendor_id=e.vendor_id,
            risk_score=e.risk_score,
            risk_level=e.risk_level,
            risk_factors=factors,
            action_taken=e.action_taken,
            created_at=e.created_at
        ))

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items
    )
