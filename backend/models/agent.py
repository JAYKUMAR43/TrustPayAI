from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from backend.database.connection import Base

class AgentModel(Base):
    __tablename__ = "ai_agents"

    id = Column(String(64), primary_key=True) # e.g. "agent_devops_01"
    name = Column(String(128), nullable=False)
    model_name = Column(String(64), nullable=False, default="gemini-2.5-flash")
    role_description = Column(Text, nullable=False)
    owner_id = Column(String(36), nullable=True)
    allocated_budget = Column(Float, nullable=False, default=5000.00)
    spent_budget = Column(Float, nullable=False, default=0.00)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True) # ACTIVE, PAUSED, REVOKED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
