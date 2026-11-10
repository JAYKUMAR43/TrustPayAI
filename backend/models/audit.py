import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.database.connection import Base

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    block_index = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    purchase_id = Column(String(36), nullable=True, index=True)
    mandate_id = Column(String(64), nullable=True, index=True)
    entity_type = Column(String(32), nullable=True) # PROCUREMENT, TRANSACTION, MANDATE, POLICY, AGENT
    entity_id = Column(String(64), nullable=True, index=True)
    actor = Column(String(64), nullable=False, index=True)
    
    # Multi-tenant scoping
    tenant_type = Column(String(32), default="ORGANIZATION", index=True)
    organization_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(36), nullable=True, index=True)

    details = Column(Text, nullable=False) # JSON payload
    prev_hash = Column(String(64), nullable=False)
    curr_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    @property
    def timestamp(self):
        return self.created_at

    @timestamp.setter
    def timestamp(self, val):
        self.created_at = val
