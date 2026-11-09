import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text
from backend.database.connection import Base

class RiskEventModel(Base):
    __tablename__ = "risk_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    procurement_id = Column(String(36), nullable=True, index=True)
    transaction_id = Column(String(36), nullable=True, index=True)
    agent_id = Column(String(64), nullable=False, index=True)
    vendor_id = Column(String(64), nullable=True)
    risk_score = Column(Float, nullable=False) # 0 - 100
    risk_level = Column(String(16), nullable=False, index=True) # LOW, MEDIUM, HIGH
    risk_factors = Column(Text, nullable=False) # JSON list of reasons
    action_taken = Column(String(32), nullable=False, default="FLAGGED_FOR_REVIEW") # ALLOWED, FLAGGED_FOR_REVIEW, BLOCKED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
