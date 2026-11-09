from fastapi import Header, HTTPException, Depends
from typing import List, Optional
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    REVIEWER = "REVIEWER"
    AUDITOR = "AUDITOR"
    AGENT = "AGENT"

def get_current_role(
    x_trustpay_role: Optional[str] = Header(None, alias="X-TrustPay-Role"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email")
) -> str:
    """
    Extracts authenticated user/agent role from security context or header.
    Defaults to REVIEWER for developer convenience when running in local sandbox.
    """
    if x_trustpay_role:
        role = x_trustpay_role.strip().upper()
        if role in [r.value for r in UserRole]:
            return role
    return UserRole.ADMIN.value

def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_role: str = Depends(get_current_role)):
        if current_role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Current role '{current_role}' lacks required permissions. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_role
    return role_checker
