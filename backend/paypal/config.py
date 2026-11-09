import os
from backend.config import settings

class PayPalConfig:
    @property
    def mode(self) -> str:
        return settings.PAYPAL_MODE

    @property
    def client_id(self) -> str:
        return settings.PAYPAL_CLIENT_ID

    @property
    def client_secret(self) -> str:
        return settings.PAYPAL_CLIENT_SECRET

    @property
    def base_url(self) -> str:
        if settings.PAYPAL_BASE_URL:
            return settings.PAYPAL_BASE_URL.rstrip("/")
        return (
            "https://api-m.sandbox.paypal.com"
            if settings.PAYPAL_MODE == "sandbox"
            else "https://api-m.paypal.com"
        )

    @property
    def is_configured(self) -> bool:
        return settings.has_real_paypal_credentials

paypal_config = PayPalConfig()
