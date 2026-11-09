from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database.connection import get_db
from backend.models.agent import AgentModel
from backend.schemas.agent import AgentCreateRequest, AgentResponse
from backend.schemas.common import PaginatedResponse
from backend.security.rbac import require_roles, UserRole
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/api/agents", tags=["agents"])

@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(
    payload: AgentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_role: str = Depends(require_roles([UserRole.ADMIN]))
):
    # Check duplicate agent ID
    existing = await db.execute(select(AgentModel).where(AgentModel.id == payload.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Agent with ID '{payload.id}' already exists")

    agent = AgentModel(
        id=payload.id,
        name=payload.name,
        model_name=payload.model_name,
        role_description=payload.role_description,
        allocated_budget=payload.allocated_budget,
        spent_budget=0.00,
        status="ACTIVE"
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    # Log to audit trail
    await audit_service.log_event(
        db=db,
        event_type="AGENT_REGISTERED",
        actor="admin",
        details={
            "agent_id": agent.id,
            "name": agent.name,
            "budget": agent.allocated_budget,
            "model": agent.model_name
        }
    )

    return AgentResponse.model_validate(agent)

@router.get("", response_model=PaginatedResponse[AgentResponse])
async def list_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(AgentModel)
    count_query = select(func.count(AgentModel.id))

    if status:
        query = query.where(AgentModel.status == status.upper())
        count_query = count_query.where(AgentModel.status == status.upper())

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.offset(skip).limit(limit).order_by(AgentModel.created_at.desc())
    res = await db.execute(query)
    agents = res.scalars().all()

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[AgentResponse.model_validate(a) for a in agents]
    )
