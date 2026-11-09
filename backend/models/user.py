import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from backend.database.connection import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False, default="REVIEWER", index=True) # ADMIN, REVIEWER, AUDITOR, AGENT_OPERATOR
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
