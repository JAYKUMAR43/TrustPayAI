import httpx
import logging
import asyncio
import time
from typing import Optional, Dict, Any, Tuple
from backend.paypal.config import paypal_config

logger = logging.getLogger("trustpay.paypal")

class PayPalClient:
    """
    Production-grade client for PayPal REST APIs (v1 OAuth2 and v2 Orders).
    Provides automatic OAuth2 token management, token caching with expiration buffer,
    idempotent order creation, retrieval, and capture.
    """
    def __init__(self, config=None):
        self.config = config or paypal_config
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._token_lock = asyncio.Lock()

    async def get_access_token(self, force_refresh: bool = False) -> Optional[str]:
        """
        Retrieves a valid OAuth 2.0 Bearer access token.
        Caches the token and automatically refreshes it 60 seconds before expiration.
        """
        if not self.config.is_configured:
            logger.warning("PayPalClient: credentials are not configured or invalid.")
            return None

        now = time.time()
        # Return cached token if still valid (with 60-second safety window)
        if not force_refresh and self._cached_token and now < (self._token_expires_at - 60):
            return self._cached_token

        async with self._token_lock:
            # Double check inside lock
            now = time.time()
            if not force_refresh and self._cached_token and now < (self._token_expires_at - 60):
                return self._cached_token

            url = f"{self.config.base_url}/v1/oauth2/token"
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(
                        url,
                        data={"grant_type": "client_credentials"},
                        auth=(self.config.client_id, self.config.client_secret),
                        headers={
                            "Accept": "application/json",
                            "Accept-Language": "en_US"
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        token = data.get("access_token")
                        expires_in = int(data.get("expires_in", 3600))
                        self._cached_token = token
                        self._token_expires_at = time.time() + expires_in
                        logger.info(f"Obtained new PayPal OAuth2 token. Valid for {expires_in}s.")
                        return token
                    else:
                        logger.error(f"PayPal OAuth2 failure [{res.status_code}]: {res.text}")
                        return None
            except Exception as e:
                logger.error(f"PayPal OAuth2 network exception: {e}")
                return None

    async def create_order_v2(
        self,
        payload: Dict[str, Any],
        idempotency_key: str
    ) -> Tuple[bool, Dict[str, Any], int]:
        """
        Creates a PayPal Order v2 using CAPTURE or AUTHORIZE intent.
        Passes PayPal-Request-Id header for idempotency.
        """
        token = await self.get_access_token()
        if not token:
            return False, {"error": "PayPal credentials unconfigured or invalid"}, 401

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": idempotency_key
        }
        url = f"{self.config.base_url}/v2/checkout/orders"
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                return (res.status_code in (200, 201)), res.json(), res.status_code
        except Exception as e:
            logger.error(f"Error creating PayPal order: {e}")
            return False, {"error": str(e)}, 500

    async def get_order_v2(self, order_id: str) -> Tuple[bool, Dict[str, Any], int]:
        """
        Retrieves the current state and buyer approval status of a PayPal order.
        """
        token = await self.get_access_token()
        if not token:
            return False, {"error": "PayPal credentials unconfigured or invalid"}, 401

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        url = f"{self.config.base_url}/v2/checkout/orders/{order_id}"
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.get(url, headers=headers)
                return (res.status_code == 200), res.json(), res.status_code
        except Exception as e:
            logger.error(f"Error retrieving PayPal order {order_id}: {e}")
            return False, {"error": str(e)}, 500

    async def capture_order_v2(
        self,
        order_id: str,
        idempotency_key: str
    ) -> Tuple[bool, Dict[str, Any], int]:
        """
        Captures payment for an approved PayPal order.
        Requires that the buyer has approved the order on PayPal.
        """
        token = await self.get_access_token()
        if not token:
            return False, {"error": "PayPal credentials unconfigured or invalid"}, 401

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "PayPal-Request-Id": idempotency_key
        }
        url = f"{self.config.base_url}/v2/checkout/orders/{order_id}/capture"
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, headers=headers)
                return (res.status_code in (200, 201)), res.json(), res.status_code
        except Exception as e:
            logger.error(f"Error capturing PayPal order {order_id}: {e}")
            return False, {"error": str(e)}, 500

paypal_client = PayPalClient()
