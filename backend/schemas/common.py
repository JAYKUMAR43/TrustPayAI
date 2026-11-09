from pydantic import BaseModel, Field, field_validator
from typing import TypeVar, Generic, List

ALLOWED_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY"}

def validate_monetary_amount(v: float) -> float:
    if v is None or v <= 0.0:
        raise ValueError("Amount must be strictly greater than 0.00")
    if v > 1_000_000.0:
        raise ValueError("Amount exceeds maximum system transaction cap of $1,000,000.00")
    return round(float(v), 2)

def validate_currency_code(v: str) -> str:
    if not v:
        raise ValueError("Currency code is required")
    code = v.strip().upper()
    if code not in ALLOWED_CURRENCIES:
        raise ValueError(f"Invalid currency '{code}'. Supported currencies are: {', '.join(sorted(ALLOWED_CURRENCIES))}")
    return code

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    skip: int
    limit: int
    items: List[T]
