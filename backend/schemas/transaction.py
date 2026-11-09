from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TransactionResponse(BaseModel):
    transaction_id: str
    agent_id: str
    vendor_id: str
    requested_amount: float
    currency: str
    requested_product: str
    transaction_status: str
    risk_score: float
    approval_status: str
    paypal_order_id: Optional[str] = None
    created_timestamp: datetime
    
    # Optional extensions
    procurement_id: Optional[str] = None
    mandate_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
