import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text
from backend.database.connection import Base

class PaymentAccountModel(Base):
    __tablename__ = "payment_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_type = Column(String(32), nullable=False, default="ORGANIZATION", index=True) # "INDIVIDUAL" or "ORGANIZATION"
    tenant_id = Column(String(36), nullable=False, index=True) # organization_id or user_id
    
    provider = Column(String(32), nullable=False, default="PAYPAL") # "PAYPAL"
    payment_mode = Column(String(32), nullable=False, default="STANDARD") # "STANDARD" or "CONNECTED_ORGANIZATION"
    
    connection_status = Column(String(32), nullable=False, default="ACTIVE", index=True) # "ACTIVE", "NOT_CONNECTED", "PENDING_PARTNER_APPROVAL"
    merchant_id = Column(String(64), nullable=True) # Masked merchant ID
    account_email = Column(String(128), nullable=True)
    
    # Partner Onboarding details
    partner_approval_required = Column(Boolean, default=False)
    partner_approval_status = Column(String(64), default="APPROVED_PLATFORM") # or "REQUIRES_PAYPAL_PARTNER_APPROVAL"
    partner_approval_message = Column(Text, nullable=True)
    
    capabilities = Column(Text, nullable=True) # JSON of supported APIs: orders_v2, checkout, capture, etc.
    environment = Column(String(16), nullable=False, default="sandbox") # "sandbox" or "live"
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
