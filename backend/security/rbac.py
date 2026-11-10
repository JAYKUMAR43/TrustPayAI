import enum
from typing import List, Optional
from pydantic import BaseModel
from fastapi import Header, HTTPException, Depends

class AccountType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    ORGANIZATION = "ORGANIZATION"

class OrganizationRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    APPROVER = "APPROVER"
    EMPLOYEE = "EMPLOYEE"
    INDIVIDUAL = "INDIVIDUAL"

# Backward compatibility alias
UserRole = OrganizationRole

class TenantContext(BaseModel):
    user_id: str = "usr_default_individual"
    user_email: str = "buyer@trustpay.internal"
    user_name: str = "Authorized Buyer"
    account_type: str = "ORGANIZATION" # "INDIVIDUAL" or "ORGANIZATION"
    organization_id: Optional[str] = "org_default_acme"
    role: str = "OWNER" # OWNER, ADMIN, APPROVER, EMPLOYEE, INDIVIDUAL

    @property
    def is_individual(self) -> bool:
        return self.account_type.upper() == AccountType.INDIVIDUAL.value

    @property
    def is_organization(self) -> bool:
        return self.account_type.upper() == AccountType.ORGANIZATION.value

    @property
    def can_approve(self) -> bool:
        if self.is_individual:
            return True
        return self.role.upper() in (OrganizationRole.OWNER.value, OrganizationRole.ADMIN.value, OrganizationRole.APPROVER.value)

    @property
    def can_manage_settings(self) -> bool:
        if self.is_individual:
            return True
        return self.role.upper() in (OrganizationRole.OWNER.value, OrganizationRole.ADMIN.value)

def get_current_tenant_context(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    x_account_type: Optional[str] = Header(None, alias="X-Account-Type"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_trustpay_role: Optional[str] = Header(None, alias="X-TrustPay-Role")
) -> TenantContext:
    """
    Extracts authenticated user, account type, organization workspace, and RBAC role.
    Defaults safely to provide continuous developer sandbox support.
    """
    user_id = (x_user_id or "usr_default_individual").strip()
    user_email = (x_user_email or "buyer@trustpay.internal").strip()
    user_name = (x_user_name or "Authorized User").strip()
    
    # Account type resolution
    raw_type = (x_account_type or "").strip().upper()
    if raw_type in ("INDIVIDUAL", "ORGANIZATION"):
        account_type = raw_type
    else:
        account_type = "ORGANIZATION" if x_organization_id else "INDIVIDUAL"

    org_id = (x_organization_id or "org_default_acme").strip() if account_type == "ORGANIZATION" else None
    
    # Role resolution
    if account_type == "INDIVIDUAL":
        role = OrganizationRole.INDIVIDUAL.value
    else:
        raw_role = (x_trustpay_role or "OWNER").strip().upper()
        if raw_role in [r.value for r in OrganizationRole]:
            role = raw_role
        else:
            role = OrganizationRole.EMPLOYEE.value

    return TenantContext(
        user_id=user_id,
        user_email=user_email,
        user_name=user_name,
        account_type=account_type,
        organization_id=org_id,
        role=role
    )

# Backward compatible role extractor
def get_current_role(
    tenant_context: TenantContext = Depends(get_current_tenant_context)
) -> str:
    return tenant_context.role

def require_roles(allowed_roles: List[OrganizationRole]):
    def role_checker(tenant_context: TenantContext = Depends(get_current_tenant_context)):
        if tenant_context.is_individual:
            return tenant_context.role
        if tenant_context.role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Role '{tenant_context.role}' lacks required permissions in organization '{tenant_context.organization_id}'. Required: {[r.value for r in allowed_roles]}"
            )
        return tenant_context.role
    return role_checker

def require_buyer_approval_authority():
    def checker(tenant_context: TenantContext = Depends(get_current_tenant_context)):
        if not tenant_context.can_approve:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Role '{tenant_context.role}' is not authorized to approve purchase mandates. Only Approvers, Admins, and Owners may approve."
            )
        return tenant_context
    return checker
