import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import settings
from backend.paypal.client import paypal_client

logger = logging.getLogger("trustpay.payment_provider")

class BasePaymentProvider(ABC):
    """
    Abstract interface for multi-mode payment provider architectures.
    Decouples settlement execution from order governance.
    """

    @abstractmethod
    def get_provider_id(self) -> str:
        pass

    @abstractmethod
    def get_display_name(self) -> str:
        pass

    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_connection_status(
        self,
        db: AsyncSession,
        tenant_type: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        pass

class StandardPayPalCheckoutProvider(BasePaymentProvider):
    """
    MODE 1: Standard PayPal Checkout (Primary Functional Rails).
    
    Settles individual and organization disbursements using official PayPal Orders v2 REST APIs.
    Requires server-side amount & currency validation, cryptographic mandate checks,
    buyer approval, idempotency protection, and single-use nonce burning.
    """

    def get_provider_id(self) -> str:
        return "STANDARD_PAYPAL_CHECKOUT"

    def get_display_name(self) -> str:
        return "Standard PayPal Checkout (Orders v2)"

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "mode": 1,
            "status": "ACTIVE_PRODUCTION_READY",
            "supported_currencies": ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"],
            "features": [
                "Server-side Orders v2 REST settlement",
                "Idempotency keys (PayPal-Request-Id)",
                "Cryptographic mandate token verification",
                "Human buyer approval gate",
                "Single-use nonce replay defense",
                "Verified webhook processing"
            ],
            "requires_partner_approval": False
        }

    async def get_connection_status(
        self,
        db: AsyncSession,
        tenant_type: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        is_configured = settings.has_real_paypal_credentials
        return {
            "mode": "MODE_1_STANDARD",
            "provider": "PAYPAL",
            "is_connected": is_configured,
            "environment": settings.PAYPAL_MODE,
            "account_type": tenant_type,
            "tenant_id": tenant_id,
            "status_label": "Active (Sandbox v2)" if is_configured else "Unconfigured Sandbox",
            "description": "Standard direct PayPal checkout rails available for both individual users and organizations."
        }

class ConnectedMerchantPayPalProvider(BasePaymentProvider):
    """
    MODE 2: Connected Organization PayPal Account (Partner Multiparty Onboarding).
    
    IMPORTANT ARCHITECTURAL DISCLOSURE:
    PayPal multiparty marketplace onboarding and custom merchant onboarding require
    official PayPal Partner verification and approved Partner Referrals API permissions.
    In accordance with system specifications, we do NOT fabricate partner credentials
    or simulate a fake connected account.
    """

    def get_provider_id(self) -> str:
        return "CONNECTED_ORGANIZATION_PAYPAL"

    def get_display_name(self) -> str:
        return "Connected Organization PayPal Account (Partner Rails)"

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "mode": 2,
            "status": "REQUIRES_PARTNER_APPROVAL",
            "supported_currencies": ["USD"],
            "features": [
                "Direct seller disbursements",
                "Custom platform fee split",
                "Partner onboarding integration interface"
            ],
            "requires_partner_approval": True,
            "approval_status_label": "Coming Soon – Requires PayPal Partner Approval"
        }

    async def get_connection_status(
        self,
        db: AsyncSession,
        tenant_type: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        return {
            "mode": "MODE_2_CONNECTED",
            "provider": "PAYPAL",
            "is_connected": False,
            "environment": settings.PAYPAL_MODE,
            "account_type": tenant_type,
            "tenant_id": tenant_id,
            "status_label": "Coming Soon – Requires PayPal Partner Approval",
            "notice": (
                "PayPal multiparty merchant onboarding and connected organization accounts "
                "require official approved PayPal Partner credentials and Multiparty Onboarding API access. "
                "Standard PayPal Checkout remains 100% active and functional independently."
            )
        }

class PaymentProviderRegistry:
    """Registry managing active and upcoming payment providers."""

    def __init__(self):
        self.standard_provider = StandardPayPalCheckoutProvider()
        self.connected_provider = ConnectedMerchantPayPalProvider()

    def get_provider(self, mode: str) -> BasePaymentProvider:
        if mode == "CONNECTED_ORGANIZATION":
            return self.connected_provider
        return self.standard_provider

    def list_providers(self) -> Dict[str, Any]:
        return {
            "mode_1_standard": self.standard_provider.get_capabilities(),
            "mode_2_connected": self.connected_provider.get_capabilities()
        }

payment_provider_registry = PaymentProviderRegistry()
