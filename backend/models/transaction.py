import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text
from backend.database.connection import Base

class TransactionModel(Base):
    __tablename__ = "transactions"

    # Exact required fields
    transaction_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), nullable=False, index=True)
    vendor_id = Column(String(64), nullable=False, index=True)
    requested_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    requested_product = Column(String(256), nullable=False)
    transaction_status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, APPROVED, CAPTURED, FAILED, REJECTED
    risk_score = Column(Float, nullable=False, default=0.0)
    approval_status = Column(String(32), nullable=False, default="AWAITING_REVIEW", index=True) # AWAITING_REVIEW, APPROVED, REJECTED, AUTO_REJECTED
    paypal_order_id = Column(String(64), nullable=True, index=True)
    created_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Multi-tenant and Payment Mode fields
    tenant_type = Column(String(32), nullable=False, default="ORGANIZATION", index=True) # INDIVIDUAL or ORGANIZATION
    organization_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    payment_mode = Column(String(32), nullable=False, default="STANDARD_PAYPAL", index=True) # STANDARD_PAYPAL or CONNECTED_MERCHANT

    # Contextual identifiers
    procurement_id = Column(String(36), nullable=True, index=True)
    mandate_id = Column(String(64), nullable=True, index=True)
    paypal_capture_id = Column(String(64), nullable=True, index=True)
    idempotency_key = Column(String(128), nullable=True, index=True)
    notes = Column(Text, nullable=True)
