from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.schemas.common import validate_monetary_amount, validate_currency_code

class NaturalLanguageProcurementRequest(BaseModel):
    prompt: str = Field(..., min_length=3, description="Natural language procurement request from agent or user")
    agent_id: Optional[str] = Field(default="agent_autonomous_core", max_length=64)
    agent_name: Optional[str] = Field(default="Autonomous Procurement Worker", max_length=128)
    context: Optional[Dict[str, Any]] = Field(default=None, description="Conversation context and history")

class ExtractedIntent(BaseModel):
    raw_prompt: str
    intent: str
    category: str
    max_budget: Optional[float] = None
    currency: str = "USD"
    requested_vendor: Optional[str] = None
    item_keywords: List[str] = Field(default_factory=list)
    quantity: int = 1

class CatalogProduct(BaseModel):
    product_id: str
    name: str
    vendor_name: str
    vendor_domain: str
    category: str
    price: float
    currency: str = "USD"
    is_approved_vendor: bool = True
    description: str
    rating: float = 5.0
    tags: List[str] = Field(default_factory=list)
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    specifications: Dict[str, Any] = Field(default_factory=dict)
    availability: str = "IN_STOCK" # IN_STOCK, LOW_STOCK, BACKORDER, OUT_OF_STOCK, INSTANT_DIGITAL_ENTITLEMENT
    warranty: Optional[str] = None
    delivery_estimate: Optional[str] = None
    item_type: str = "PHYSICAL" # PHYSICAL, DIGITAL_DATASET, SAAS_LICENSE, CLOUD_INFRA
    dataset_metadata: Optional[Dict[str, Any]] = None

    @field_validator("price")
    @classmethod
    def check_price(cls, v: float) -> float:
        return validate_monetary_amount(v)

class ProductComparisonResult(BaseModel):
    recommended_product: Optional[CatalogProduct] = None
    considered_products: List[CatalogProduct] = Field(default_factory=list)
    recommendation_reason: str
    within_budget: bool = True
    product_verified: bool = True

class TraceStep(BaseModel):
    step_number: int
    step_name: str
    tool_called: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str
    status: str = "COMPLETED"

class AutonomousProcurementResult(BaseModel):
    trace_id: str
    user_prompt: str
    status: str = Field(..., description="SUCCESS_PROPOSAL_GENERATED, UNVERIFIED_PRODUCT, BUDGET_EXCEEDED, POLICY_VIOLATION, or ERROR")
    extracted_intent: ExtractedIntent
    comparison: ProductComparisonResult
    purchase_request: Optional[Dict[str, Any]] = None
    guardrail_evaluation: Optional[Dict[str, Any]] = None
    message: str
    execution_trace: List[TraceStep] = Field(default_factory=list)
    created_at: str

    model_config = ConfigDict(from_attributes=True)
