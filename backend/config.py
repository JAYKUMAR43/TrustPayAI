import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    ENVIRONMENT: str = "sandbox"
    DEBUG: bool = True
    
    # Cryptographic Master Secret for HMAC-SHA256
    TRUSTPAY_MASTER_SECRET: str = "tp_sec_2026_trustpay_autonomous_fintech_guardrail_hmac_master_key"
    
    # AI Model Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # PayPal Configuration
    PAYPAL_MODE: str = "sandbox"
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WEBHOOK_ID: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./trustpay.db"

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    # Default Policy Limits
    DEFAULT_SINGLE_TRANSACTION_LIMIT: float = 1000.00
    DEFAULT_DAILY_SPEND_LIMIT: float = 5000.00
    DEFAULT_MONTHLY_SPEND_LIMIT: float = 25000.00
    MANDATE_EXPIRATION_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: str = "https://trust-pay-ai-five.vercel.app,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def has_real_paypal_credentials(self) -> bool:
        return bool(self.PAYPAL_CLIENT_ID and self.PAYPAL_CLIENT_SECRET and "..." not in self.PAYPAL_CLIENT_ID)

    @property
    def has_real_gemini_key(self) -> bool:
        return bool(self.GEMINI_API_KEY and len(self.GEMINI_API_KEY) > 10)

settings = Settings()
