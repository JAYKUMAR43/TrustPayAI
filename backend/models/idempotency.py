from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.database import Base

class IdempotencyRecordModel(Base):
    __tablename__ = "idempotency_records"

    idempotency_key = Column(String(128), primary_key=True)
    request_path = Column(String(256), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
