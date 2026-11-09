from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas.common import validate_monetary_amount, validate_currency_code

class ProcurementSubmitRequest(BaseModel):
    agent_id: str = Field(..., min_length=2, max_length=64)
    agent_name: Optional[str] = Field(default=None, max_length=128)
    vendor_id: Optional[str] = Field(default=None, max_length=64)
    vendor_domain: str = Field(..., min_length=3, max_length=128)
    vendor_name: Optional[str] = Field(default=None, max_length=128)
    product_name: Optional[str] = Field(default=None, min_length=2, max_length=256)
    item_name: Optional[str] = Field(default=None, min_length=2, max_length=256)
    category: str = Field(..., min_length=2, max_length=64)
    amount: float = Field(..., description="Monetary transaction amount")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    justification: str = Field(..., min_length=5)

    @model_validator(mode="before")
    @classmethod
    def resolve_product_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            p_name = data.get("product_name") or data.get("item_name")
            if not p_name:
                raise ValueError("product_name or item_name must be provided")
            data["product_name"] = p_name
            data["item_name"] = p_name
        return data

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        return validate_monetary_amount(v)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_currency_code(v)

class ProcurementResponse(BaseModel):
    id: str
    agent_id: str
    vendor_id: str
    product_name: str
    item_name: Optional[str] = None
    category: str
    amount: float
    currency: str
    justification: str
    status: str
    status_reason: Optional[str] = None
    risk_score: Optional[float] = None
    mandate_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_item_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "product_name" in data and "item_name" not in data:
                data["item_name"] = data["product_name"]
        elif hasattr(data, "product_name") and not hasattr(data, "item_name"):
            setattr(data, "item_name", getattr(data, "product_name"))
        return data

    model_config = ConfigDict(from_attributes=True)
