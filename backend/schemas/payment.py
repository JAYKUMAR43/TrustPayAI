from pydantic import BaseModel, Field
from typing import Optional

class PaymentApprovalRequest(BaseModel):
    purchase_id: str
    mandate_id: str
    approved_by: str = Field(default="admin@trustpay.internal")
    notes: Optional[str] = None

class CreatePayPalOrderRequest(BaseModel):
    purchase_id: str
    mandate_id: str
    idempotency_key: str

class CapturePayPalOrderRequest(BaseModel):
    purchase_id: str
    mandate_id: str
    paypal_order_id: str
    idempotency_key: str

class PaymentResultResponse(BaseModel):
    success: bool
    purchase_id: str
    mandate_id: str
    paypal_order_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None
    status: str
    amount: float
    currency: str
    is_sandbox: bool
    approval_url: Optional[str] = None
    message: str
