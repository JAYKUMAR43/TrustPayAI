import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from backend.database.connection import Base

class OrganizationMembershipModel(Base):
    __tablename__ = "organization_memberships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    email = Column(String(128), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False, default="EMPLOYEE", index=True) # OWNER, ADMIN, APPROVER, EMPLOYEE
    status = Column(String(32), nullable=False, default="ACTIVE", index=True) # ACTIVE, INVITED, SUSPENDED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_org_user_unique", "organization_id", "user_id", unique=True),
    )

class OrganizationInvitationModel(Base):
    __tablename__ = "organization_invitations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), nullable=False, index=True)
    email = Column(String(128), nullable=False, index=True)
    role = Column(String(32), nullable=False, default="EMPLOYEE") # ADMIN, APPROVER, EMPLOYEE
    token = Column(String(64), nullable=False, unique=True, index=True)
    invited_by = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, ACCEPTED, REVOKED, EXPIRED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
