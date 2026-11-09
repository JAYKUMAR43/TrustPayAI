import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from backend.database.connection import Base

class ProcurementRequestModel(Base):
    __tablename__ = "procurement_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), nullable=False, index=True)
    vendor_id = Column(String(64), nullable=False, index=True)
    product_name = Column(String(256), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    justification = Column(Text, nullable=False)
    
    status = Column(String(32), nullable=False, default="PENDING_EVALUATION", index=True)
    status_reason = Column(Text, nullable=True)
    risk_score = Column(Float, nullable=True)
    mandate_id = Column(String(64), nullable=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
