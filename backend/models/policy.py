from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer
from backend.database.connection import Base

class SpendingPolicyModel(Base):
    __tablename__ = "spending_policies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    policy_type = Column(String(64), nullable=False, index=True)
    description = Column(String(256), nullable=False)
    rule_value = Column(Text, nullable=False) # JSON encoded configuration
    is_active = Column(Boolean, default=True, index=True)
    created_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    @property
    def rule_name(self) -> str:
        return self.name

    @rule_name.setter
    def rule_name(self, value: str):
        self.name = value

# Backward-compatibility alias
PolicyRuleModel = SpendingPolicyModel
