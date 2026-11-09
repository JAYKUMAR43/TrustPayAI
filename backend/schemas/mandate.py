from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class MandateResponse(BaseModel):
    mandate_id: str
    purchase_id: str
    agent_id: str
    intent_hash: str
    nonce: str
    issued_at: datetime
    expires_at: datetime
    max_authorized_amount: float
    currency: str
    signature: str
    is_executed: bool
    is_approved_by_human: bool
    is_revoked: bool
    verification_status: bool = True

    model_config = ConfigDict(from_attributes=True)

class TamperTestRequest(BaseModel):
    mandate_id: str
    tampered_amount: Optional[float] = None
    tampered_vendor: Optional[str] = None
    tampered_nonce: Optional[str] = None

class TamperTestResult(BaseModel):
    mandate_id: str
    is_valid: bool
    tamper_detected: bool
    failure_reason: Optional[str] = None
    original_intent_hash: str
    computed_intent_hash: str
    signature_verified: bool
