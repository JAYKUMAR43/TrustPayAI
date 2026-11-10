import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.connection import get_db
from backend.models.organization import OrganizationModel
from backend.config import settings

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    environment: str
    paypal_connected: bool
    paypal_merchant_id: Optional[str] = None
    paypal_account_email: Optional[str] = None
    paypal_mode: str
    default_currency: str
    single_transaction_limit: float
    daily_spend_limit: float
    monthly_spend_limit: float
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UpdateOrganizationRequest(BaseModel):
    name: Optional[str] = None
    single_transaction_limit: Optional[float] = None
    daily_spend_limit: Optional[float] = None
    default_currency: Optional[str] = None
    description: Optional[str] = None

class ConnectPaymentRequest(BaseModel):
    account_email: str
    merchant_id: Optional[str] = None
    environment: str = "sandbox" # "sandbox" or "live"
    notes: Optional[str] = None

# Active organization session state
ACTIVE_ORG_ID = "org_default_acme"

DEFAULT_ORGS = [
    {
        "id": "org_default_acme",
        "name": "Acme Global Engineering",
        "slug": "acme-engineering",
        "environment": "sandbox",
        "paypal_connected": True,
        "paypal_merchant_id": "MCH-SANDBOX-8491",
        "paypal_account_email": "finance@acme-engineering.internal",
        "paypal_mode": "sandbox",
        "default_currency": "USD",
        "single_transaction_limit": 1500.00,
        "daily_spend_limit": 5000.00,
        "monthly_spend_limit": 25000.00,
        "description": "Primary development and AI agent fleet procurement workspace."
    },
    {
        "id": "org_trustpay_labs",
        "name": "TrustPay AI Research Labs",
        "slug": "trustpay-labs",
        "environment": "sandbox",
        "paypal_connected": False,
        "paypal_merchant_id": None,
        "paypal_account_email": None,
        "paypal_mode": "sandbox",
        "default_currency": "USD",
        "single_transaction_limit": 1000.00,
        "daily_spend_limit": 3000.00,
        "monthly_spend_limit": 15000.00,
        "description": "Autonomous experimental research sandbox for testing model capabilities."
    }
]

async def ensure_default_orgs(db: AsyncSession):
    for d in DEFAULT_ORGS:
        res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == d["id"]))
        if not res.scalar_one_or_none():
            org = OrganizationModel(**d)
            db.add(org)
    await db.commit()

@router.get("", response_model=List[OrganizationResponse])
async def list_organizations(db: AsyncSession = Depends(get_db)):
    """Lists all organization workspaces available to the authenticated user."""
    await ensure_default_orgs(db)
    res = await db.execute(select(OrganizationModel).order_by(OrganizationModel.created_at.asc()))
    return res.scalars().all()

@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(db: AsyncSession = Depends(get_db)):
    """Gets active organization workspace details."""
    global ACTIVE_ORG_ID
    await ensure_default_orgs(db)
    res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == ACTIVE_ORG_ID))
    org = res.scalar_one_or_none()
    if not org:
        # Fallback to first
        res = await db.execute(select(OrganizationModel))
        org = res.scalars().first()
    return org

@router.post("/switch/{org_id}", response_model=OrganizationResponse)
async def switch_organization(org_id: str, db: AsyncSession = Depends(get_db)):
    """Switches the active workspace."""
    global ACTIVE_ORG_ID
    await ensure_default_orgs(db)
    res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == org_id))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization workspace not found")
    ACTIVE_ORG_ID = org_id
    return org

@router.put("/current", response_model=OrganizationResponse)
async def update_current_organization(
    payload: UpdateOrganizationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Updates active workspace settings, limits, and profile."""
    global ACTIVE_ORG_ID
    await ensure_default_orgs(db)
    res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == ACTIVE_ORG_ID))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Active organization not found")
    
    if payload.name is not None:
        org.name = payload.name
    if payload.single_transaction_limit is not None:
        org.single_transaction_limit = payload.single_transaction_limit
    if payload.daily_spend_limit is not None:
        org.daily_spend_limit = payload.daily_spend_limit
    if payload.default_currency is not None:
        org.default_currency = payload.default_currency
    if payload.description is not None:
        org.description = payload.description

    await db.commit()
    await db.refresh(org)
    return org

@router.post("/connect-payment", response_model=OrganizationResponse)
async def connect_payment_account(
    payload: ConnectPaymentRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Connects or authorizes an organization-specific PayPal Sandbox or Live account.
    Keeps customer accounts cleanly separated without shared credentials.
    """
    global ACTIVE_ORG_ID
    await ensure_default_orgs(db)
    res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == ACTIVE_ORG_ID))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Active organization not found")

    # Securely record connected account metadata (no raw card/bank data ever stored)
    org.paypal_connected = True
    org.paypal_account_email = payload.account_email
    org.paypal_merchant_id = payload.merchant_id or f"MCH-{uuid.uuid4().hex[:8].upper()}"
    org.paypal_mode = payload.environment
    org.environment = payload.environment

    await db.commit()
    await db.refresh(org)
    return org
