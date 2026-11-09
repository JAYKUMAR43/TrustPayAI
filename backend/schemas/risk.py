from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class RiskEventResponse(BaseModel):
    id: str
    procurement_id: Optional[str] = None
    transaction_id: Optional[str] = None
    agent_id: str
    vendor_id: Optional[str] = None
    risk_score: float
    risk_level: str
    risk_factors: List[str]
    action_taken: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
