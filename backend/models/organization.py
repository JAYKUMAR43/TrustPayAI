import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from backend.database.connection import Base

class OrganizationModel(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    slug = Column(String(64), unique=True, nullable=False, index=True)
    environment = Column(String(16), nullable=False, default="sandbox") # "sandbox" or "live"
    
    # Secure Payment Gateway Integration settings
    paypal_connected = Column(Boolean, default=False)
    paypal_merchant_id = Column(String(64), nullable=True) # Masked merchant ID (e.g. MCH-***-8821)
    paypal_account_email = Column(String(128), nullable=True)
    paypal_mode = Column(String(16), default="sandbox") # "sandbox" or "live"
    
    # Financial Governance Defaults
    default_currency = Column(String(3), default="USD")
    single_transaction_limit = Column(Float, default=1500.00)
    daily_spend_limit = Column(Float, default=5000.00)
    monthly_spend_limit = Column(Float, default=25000.00)
    
    # Description / metadata
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
