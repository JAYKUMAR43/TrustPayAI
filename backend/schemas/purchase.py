from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class PurchaseCreateRequest(BaseModel):
    agent_id: str = Field(..., min_length=2, max_length=64, description="ID of the autonomous requesting agent")
    agent_name: str = Field(..., min_length=2, max_length=128, description="Human readable name of the agent")
    item_name: str = Field(..., min_length=2, max_length=256, description="Description or name of item being procured")
    category: str = Field(..., description="Category: software_saas, cloud_infrastructure, api_credits, hardware, consulting, restricted")
    vendor_name: str = Field(..., min_length=2, max_length=128, description="Vendor merchant name")
    vendor_domain: str = Field(..., min_length=3, max_length=128, description="Vendor domain name e.g. github.com, aws.amazon.com")
    amount: float = Field(..., gt=0.0, description="Purchase amount in specified currency")
    currency: str = Field(default="USD", min_length=3, max_length=3, description="Currency code (USD, EUR, GBP)")
    justification: str = Field(..., min_length=5, description="Business rationale and justification provided by the agent")

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return v.upper()

class PurchaseResponse(BaseModel):
    id: str
    agent_id: str
    agent_name: str
    item_name: str
    category: str
    vendor_name: str
    vendor_domain: str
    amount: float
    currency: str
    justification: str
    status: str
    status_reason: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    risk_reasons: Optional[List[str]] = None
    mandate_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SimulationScenario(BaseModel):
    id: str
    title: str
    description: str
    category: str
    expected_outcome: str
    request: PurchaseCreateRequest
