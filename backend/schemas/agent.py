from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from backend.schemas.common import validate_monetary_amount

class AgentCreateRequest(BaseModel):
    id: str = Field(..., min_length=3, max_length=64, description="Unique identifier for agent e.g. agent_devops_01")
    name: str = Field(..., min_length=2, max_length=128)
    model_name: str = Field(default="gemini-2.5-flash", max_length=64)
    role_description: str = Field(..., min_length=5, max_length=500)
    allocated_budget: float = Field(default=5000.00, gt=0.0)

    @field_validator("allocated_budget")
    @classmethod
    def validate_budget(cls, v: float) -> float:
        return validate_monetary_amount(v)

class AgentResponse(BaseModel):
    id: str
    name: str
    model_name: str
    role_description: str
    allocated_budget: float
    spent_budget: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
