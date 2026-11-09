import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, Enum
import enum
from backend.database import Base

class PurchaseStatus(str, enum.Enum):
    PENDING_EVALUATION = "PENDING_EVALUATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MANDATE_ISSUED = "MANDATE_ISSUED"
    PENDING_HUMAN_APPROVAL = "PENDING_HUMAN_APPROVAL"
    AUTHORIZED = "AUTHORIZED"
    PAYMENT_INITIATED = "PAYMENT_INITIATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class PurchaseRequestModel(Base):
    __tablename__ = "purchase_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), nullable=False, index=True)
    agent_name = Column(String(128), nullable=False)
    item_name = Column(String(256), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    vendor_name = Column(String(128), nullable=False)
    vendor_domain = Column(String(128), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    justification = Column(Text, nullable=False)
    
    status = Column(String(32), nullable=False, default=PurchaseStatus.PENDING_EVALUATION.value, index=True)
    status_reason = Column(Text, nullable=True)
    
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String(16), nullable=True)
    risk_reasons = Column(Text, nullable=True) # JSON list of reasons
    
    mandate_id = Column(String(64), nullable=True, index=True)
    paypal_order_id = Column(String(64), nullable=True, index=True)
    paypal_capture_id = Column(String(64), nullable=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
