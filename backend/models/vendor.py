from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text
from backend.database.connection import Base

class VendorModel(Base):
    __tablename__ = "vendors"

    id = Column(String(64), primary_key=True) # e.g. "vendor_github"
    name = Column(String(128), nullable=False)
    domain = Column(String(128), unique=True, nullable=False, index=True) # e.g. "github.com"
    category = Column(String(64), nullable=False, default="software_saas")
    status = Column(String(32), nullable=False, default="WHITELISTED", index=True) # WHITELISTED, UNVERIFIED, BLACKLISTED
    trust_score = Column(Float, nullable=False, default=90.0) # 0 - 100
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
