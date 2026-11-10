from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime, timezone
from backend.schemas.common import validate_monetary_amount, validate_currency_code

class PolicyDecisionEnum(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REQUIRES_HUMAN_APPROVAL = "REQUIRES_HUMAN_APPROVAL"

class PolicyConfig(BaseModel):
    name: str = "Enterprise Standard Policy"
    # 1. Spending limits
    max_transaction_amount: float = Field(default=40.0, description="Maximum single transaction cap")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    allowed_currencies: List[str] = Field(default_factory=lambda: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"])
    
    # 2. Approved & Blocked Vendors
    approved_vendors: List[str] = Field(
        default_factory=lambda: [
            "Approved Data Portal", "Kaggle, Inc.", "Hugging Face, Inc.",
            "GitHub, Inc.", "Google Cloud", "Amazon Web Services",
            "Datadog", "Anthropic PBC", "OpenAI, Inc.", "Postman, Inc.",
            "Dell Technologies", "Lenovo Group", "Apple Inc.", "dell.com", "lenovo.com", "apple.com"
        ]
    )
    blocked_vendors: List[str] = Field(
        default_factory=lambda: [
            "darkmarket.io", "crypto-mixer.cc", "shady-downloads.xyz",
            "malicious-tools.net", "CryptoBet LLC", "evil-hacker.com"
        ]
    )
    require_approved_vendor: bool = True
    
    # 3. Product Categories
    allowed_categories: List[str] = Field(
        default_factory=lambda: [
            "Software and Datasets", "software_saas", "datasets_ai",
            "api_credits", "cloud_infrastructure", "developer_tooling",
            "hardware_equipment", "hardware"
        ]
    )
    banned_categories: List[str] = Field(
        default_factory=lambda: [
            "gambling", "weapons", "adult_content", "crypto_speculation",
            "restricted", "surveillance", "exploit_kits"
        ]
    )

    # 4. Velocity Limits
    max_daily_spending: float = Field(default=100.0, description="Maximum cumulative spend in 24 hours")
    max_transactions_per_hour: int = Field(default=50, description="Maximum number of purchases per hour")

    # 5. Agent Permissions
    allowed_agents: Optional[List[str]] = None
    agent_budget_overrides: Optional[Dict[str, float]] = None

    # 6. Price Manipulation Threshold
    max_catalog_deviation_ratio: float = 1.35 # 35% above expected catalog price triggers violation

    # 7. Prompt Injection
    prompt_injection_strict: bool = True

    # 8. Human Approval Threshold
    human_approval_threshold: float = Field(default=35.0, description="Amount above which human approval is mandatory")

    @field_validator("max_transaction_amount", "max_daily_spending")
    @classmethod
    def check_monetary(cls, v: float) -> float:
        return validate_monetary_amount(v)

class ProcurementEvaluationPayload(BaseModel):
    agent_id: str = Field(..., min_length=2, max_length=64)
    agent_name: Optional[str] = "Autonomous Agent"
    vendor_name: str = Field(..., min_length=2, max_length=128)
    vendor_domain: str = Field(..., min_length=3, max_length=128)
    product_name: str = Field(..., min_length=2, max_length=256)
    category: str = Field(..., min_length=2, max_length=64)
    amount: float = Field(..., description="Transaction amount")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    justification: str = Field(..., min_length=3)
    policy_config: Optional[PolicyConfig] = None

    @field_validator("amount")
    @classmethod
    def check_amount(cls, v: float) -> float:
        return validate_monetary_amount(v)

    @field_validator("currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        return validate_currency_code(v)

class CheckDetail(BaseModel):
    check_name: str
    passed: bool
    risk_points: float = 0.0
    details: str

class PolicyEvaluationResult(BaseModel):
    decision: str = Field(..., description="APPROVED, REJECTED, or REQUIRES_HUMAN_APPROVAL")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Computed risk score 0 - 100")
    reason: str = Field(..., description="Primary reason for the decision")
    violations: List[str] = Field(default_factory=list, description="Fatal policy violations")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings")
    requires_human_approval: bool = Field(default=False)
    checks_performed: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    evaluated_at: str

    model_config = ConfigDict(from_attributes=True)
