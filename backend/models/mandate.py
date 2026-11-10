from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from backend.database.connection import Base

class AuthorizationMandateModel(Base):
    __tablename__ = "authorization_mandates"

    mandate_id = Column(String(64), primary_key=True)
    request_id = Column(String(36), nullable=False, unique=True, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    vendor_id = Column(String(64), nullable=True, index=True)
    
    intent_hash = Column(String(64), nullable=False) # SHA-256 of canonical intent payload
    nonce = Column(String(64), nullable=False, unique=True, index=True)
    
    issued_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False, index=True)
    
    max_authorized_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    product_category = Column(String(64), nullable=True)
    payment_purpose = Column(String(256), nullable=True)
    
    # Multi-tenant scoping
    tenant_type = Column(String(32), default="ORGANIZATION", index=True)
    organization_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(36), nullable=True, index=True)

    signature = Column(String(128), nullable=False) # HMAC-SHA256
    
    is_executed = Column(Boolean, default=False, index=True)
    executed_at = Column(DateTime, nullable=True)
    
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    is_revoked = Column(Boolean, default=False)
    revoked_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def purchase_id(self) -> str:
        return self.request_id

    @purchase_id.setter
    def purchase_id(self, val: str):
        self.request_id = val

    @property
    def transaction_request_id(self) -> str:
        return self.request_id

    @transaction_request_id.setter
    def transaction_request_id(self, val: str):
        self.request_id = val

    @property
    def approved_amount(self) -> float:
        return self.max_authorized_amount

    @approved_amount.setter
    def approved_amount(self, val: float):
        self.max_authorized_amount = val

    @property
    def expiry_timestamp(self) -> datetime:
        return self.expires_at

    @expiry_timestamp.setter
    def expiry_timestamp(self, val: datetime):
        self.expires_at = val

    @property
    def allowed_payment_purpose(self) -> str:
        return self.payment_purpose or ""

    @allowed_payment_purpose.setter
    def allowed_payment_purpose(self, val: str):
        self.payment_purpose = val

    @property
    def is_approved_by_human(self) -> bool:
        return bool(self.approved_by)

    @is_approved_by_human.setter
    def is_approved_by_human(self, val: bool):
        if val and not self.approved_by:
            self.approved_by = "admin_verified"
        elif not val:
            self.approved_by = None

class ConsumedNonceModel(Base):
    __tablename__ = "consumed_nonces"

    nonce = Column(String(64), primary_key=True)
    mandate_id = Column(String(64), nullable=False, index=True)
    transaction_id = Column(String(64), nullable=True, index=True)
    consumed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

# Alias for backward compatibility
CryptographicMandateModel = AuthorizationMandateModel
