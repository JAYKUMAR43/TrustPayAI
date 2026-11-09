from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, Any, Dict
from datetime import datetime

class PolicyCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    policy_type: str = Field(..., min_length=3, max_length=64)
    description: str = Field(..., min_length=5, max_length=256)
    rule_value: Optional[Dict[str, Any]] = Field(default=None, description="JSON rule parameters")
    rules: Optional[Any] = Field(default=None)
    is_active: bool = Field(default=True)

    @model_validator(mode="before")
    @classmethod
    def resolve_rules(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("rule_value"):
                if "rules" in data and data["rules"] is not None:
                    data["rule_value"] = {"rules": data["rules"]} if isinstance(data["rules"], list) else data["rules"]
                else:
                    data["rule_value"] = {}
        return data

class PolicyResponse(BaseModel):
    id: int
    name: str
    policy_type: str
    description: str
    rule_value: Dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
