import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.database.connection import get_db
from backend.models.user import UserModel
from backend.models.organization import OrganizationModel
from backend.models.membership import OrganizationMembershipModel, OrganizationInvitationModel
from backend.models.payment_account import PaymentAccountModel
from backend.security.rbac import (
    TenantContext,
    get_current_tenant_context,
    AccountType,
    OrganizationRole
)
from backend.services.payment_provider import payment_provider_registry

router = APIRouter(prefix="/api/auth", tags=["auth"])

class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    name: str
    account_type: str # INDIVIDUAL or ORGANIZATION
    current_organization_id: Optional[str]
    organization_name: Optional[str] = None
    role: str
    can_approve: bool
    can_manage_settings: bool

class SwitchAccountTypeRequest(BaseModel):
    account_type: str # INDIVIDUAL or ORGANIZATION
    organization_id: Optional[str] = None

class CreateOrgRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    default_currency: str = "USD"
    single_transaction_limit: float = 1500.00
    daily_spend_limit: float = 5000.00

class InviteMemberRequest(BaseModel):
    email: str
    name: Optional[str] = None
    role: str = "EMPLOYEE" # ADMIN, APPROVER, EMPLOYEE

class MemberResponse(BaseModel):
    id: str
    organization_id: str
    user_id: str
    email: str
    name: str
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

async def seed_demo_memberships_if_empty(db: AsyncSession, org_id: str):
    res = await db.execute(select(OrganizationMembershipModel).where(OrganizationMembershipModel.organization_id == org_id))
    if not res.scalars().first():
        default_members = [
            {"email": "alex.owner@acme.internal", "name": "Alex Vance (Owner)", "role": "OWNER"},
            {"email": "sarah.admin@acme.internal", "name": "Sarah Connor (Admin)", "role": "ADMIN"},
            {"email": "david.approver@acme.internal", "name": "David Miller (Approver)", "role": "APPROVER"},
            {"email": "elena.dev@acme.internal", "name": "Elena Rostova (Employee)", "role": "EMPLOYEE"}
        ]
        for m in default_members:
            mem = OrganizationMembershipModel(
                organization_id=org_id,
                user_id=f"usr_{m['email'].split('@')[0]}",
                email=m["email"],
                name=m["name"],
                role=m["role"],
                status="ACTIVE"
            )
            db.add(mem)
        await db.commit()

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns current user profile, account type, active workspace, and RBAC permissions.
    """
    org_name = None
    if tenant_context.organization_id:
        o_res = await db.execute(select(OrganizationModel).where(OrganizationModel.id == tenant_context.organization_id))
        org = o_res.scalar_one_or_none()
        if org:
            org_name = org.name

    return UserProfileResponse(
        user_id=tenant_context.user_id,
        email=tenant_context.user_email,
        name=tenant_context.user_name,
        account_type=tenant_context.account_type,
        current_organization_id=tenant_context.organization_id,
        organization_name=org_name or ("Personal Individual Account" if tenant_context.is_individual else "Default Organization"),
        role=tenant_context.role,
        can_approve=tenant_context.can_approve,
        can_manage_settings=tenant_context.can_manage_settings
    )

@router.post("/switch-account-type", response_model=UserProfileResponse)
async def switch_account_type(
    payload: SwitchAccountTypeRequest,
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Switches between Individual user mode and Organization workspace mode.
    """
    acc_type = payload.account_type.upper()
    if acc_type not in ("INDIVIDUAL", "ORGANIZATION"):
        raise HTTPException(status_code=400, detail="Invalid account_type. Must be INDIVIDUAL or ORGANIZATION.")

    new_org_id = payload.organization_id if acc_type == "ORGANIZATION" else None
    role = OrganizationRole.INDIVIDUAL.value if acc_type == "INDIVIDUAL" else OrganizationRole.OWNER.value

    return UserProfileResponse(
        user_id=tenant_context.user_id,
        email=tenant_context.user_email,
        name=tenant_context.user_name,
        account_type=acc_type,
        current_organization_id=new_org_id,
        organization_name="Personal Workspace" if acc_type == "INDIVIDUAL" else "Acme Global Engineering",
        role=role,
        can_approve=True,
        can_manage_settings=True
    )

@router.post("/create-organization")
async def create_organization(
    payload: CreateOrgRequest,
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new Organization workspace and grants OWNER role to the creator.
    """
    org_id = f"org_{uuid.uuid4().hex[:10]}"
    slug = payload.slug or payload.name.lower().replace(" ", "-")[:48]

    # Check slug collision
    exist = await db.execute(select(OrganizationModel).where(OrganizationModel.slug == slug))
    if exist.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    org = OrganizationModel(
        id=org_id,
        name=payload.name,
        slug=slug,
        environment="sandbox",
        default_currency=payload.default_currency,
        single_transaction_limit=payload.single_transaction_limit,
        daily_spend_limit=payload.daily_spend_limit
    )
    db.add(org)

    # Add owner membership
    owner_membership = OrganizationMembershipModel(
        organization_id=org_id,
        user_id=tenant_context.user_id,
        email=tenant_context.user_email,
        name=tenant_context.user_name,
        role=OrganizationRole.OWNER.value,
        status="ACTIVE"
    )
    db.add(owner_membership)
    await db.commit()

    return {
        "status": "CREATED",
        "organization_id": org_id,
        "name": org.name,
        "slug": org.slug,
        "role": OrganizationRole.OWNER.value
    }

@router.get("/members", response_model=List[MemberResponse])
async def list_organization_members(
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists members of the active organization. Requires active organization context.
    """
    if tenant_context.is_individual or not tenant_context.organization_id:
        return []

    await seed_demo_memberships_if_empty(db, tenant_context.organization_id)
    res = await db.execute(
        select(OrganizationMembershipModel)
        .where(OrganizationMembershipModel.organization_id == tenant_context.organization_id)
        .order_by(OrganizationMembershipModel.created_at.asc())
    )
    return res.scalars().all()

@router.post("/invite")
async def invite_organization_member(
    payload: InviteMemberRequest,
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Invites a new member to the organization with assigned role (Owner/Admin only).
    """
    if tenant_context.is_individual or not tenant_context.organization_id:
        raise HTTPException(status_code=400, detail="Cannot invite members in Individual account mode.")

    if not tenant_context.can_manage_settings:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can invite new organization members.")

    role_str = payload.role.upper()
    if role_str not in (OrganizationRole.ADMIN.value, OrganizationRole.APPROVER.value, OrganizationRole.EMPLOYEE.value):
        role_str = OrganizationRole.EMPLOYEE.value

    # Check if member already exists
    exist = await db.execute(
        select(OrganizationMembershipModel).where(
            OrganizationMembershipModel.organization_id == tenant_context.organization_id,
            OrganizationMembershipModel.email == payload.email
        )
    )
    if exist.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"User {payload.email} is already a member of this organization.")

    # Create membership and invitation token
    token = secrets.token_urlsafe(32)
    invitation = OrganizationInvitationModel(
        organization_id=tenant_context.organization_id,
        email=payload.email,
        role=role_str,
        token=token,
        invited_by=tenant_context.user_email,
        status="PENDING",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(invitation)

    new_member = OrganizationMembershipModel(
        organization_id=tenant_context.organization_id,
        user_id=f"usr_{payload.email.split('@')[0]}",
        email=payload.email,
        name=payload.name or payload.email.split("@")[0].title(),
        role=role_str,
        status="ACTIVE"
    )
    db.add(new_member)
    await db.commit()

    return {
        "status": "INVITED",
        "email": payload.email,
        "role": role_str,
        "invitation_token": token
    }

@router.delete("/members/{member_id}")
async def remove_organization_member(
    member_id: str,
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Removes a member from the active organization workspace.
    """
    if not tenant_context.can_manage_settings:
        raise HTTPException(status_code=403, detail="Only Owners and Admins may remove members.")

    await db.execute(
        delete(OrganizationMembershipModel).where(
            OrganizationMembershipModel.id == member_id,
            OrganizationMembershipModel.organization_id == tenant_context.organization_id
        )
    )
    await db.commit()
    return {"status": "REMOVED", "member_id": member_id}

@router.get("/payment-modes")
async def get_payment_provider_modes(
    tenant_context: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the two supported payment modes:
    1. Standard PayPal Checkout (Orders v2) - Active & Functional
    2. Connected Organization PayPal Account - Coming Soon (Requires PayPal Partner Approval)
    """
    tenant_id = tenant_context.organization_id if tenant_context.is_organization else tenant_context.user_id
    status_mode1 = await payment_provider_registry.standard_provider.get_connection_status(db, tenant_context.account_type, tenant_id)
    status_mode2 = await payment_provider_registry.connected_provider.get_connection_status(db, tenant_context.account_type, tenant_id)

    return {
        "account_type": tenant_context.account_type,
        "tenant_id": tenant_id,
        "payment_modes": [
            {
                "id": "MODE_1_STANDARD",
                "name": "Standard PayPal Checkout",
                "is_primary": True,
                "status": "ACTIVE",
                "status_badge": "Production / Sandbox Ready",
                "description": "Native PayPal Orders v2 checkout with server-side HMAC validation and idempotent capture.",
                "details": status_mode1
            },
            {
                "id": "MODE_2_CONNECTED",
                "name": "Connected Organization PayPal Account",
                "is_primary": False,
                "status": "COMING_SOON",
                "status_badge": "Coming Soon – Requires PayPal Partner Approval",
                "description": "Multi-seller and connected merchant onboarding using PayPal Multiparty APIs.",
                "notice": "Requires vetted PayPal Partner account status and approved Multiparty Onboarding API access.",
                "details": status_mode2
            }
        ]
    }
