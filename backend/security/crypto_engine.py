import hmac
import hashlib
import json
import secrets
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional, Union, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config import settings

class CryptographicSpendingMandateEngine:
    """
    Cryptographic Spending Mandate Engine for TRUSTPAY AI.
    
    Produces, signs, verifies, and consumes single-use, time-limited,
    tamper-evident spending mandates using HMAC-SHA256 and constant-time
    comparison.
    
    SECURITY INVARIANTS:
    1. Rejects expired mandates.
    2. Rejects altered or forged mandate data.
    3. Rejects incorrect vendor IDs.
    4. Rejects transaction amounts exceeding the authorized limit.
    5. Rejects duplicate consumption (strictly single-use).
    6. Prevents replay attacks via cryptographically random nonces.
    7. Stores consumed nonce values with thread-safe locking.
    8. Uses constant-time signature comparison (hmac.compare_digest).
    9. Never exposes signing secrets (derived from environment/settings).
    10. Never stores or logs raw payment credentials.
    """

    def __init__(self, master_secret: Optional[str] = None):
        self.secret = (master_secret or settings.TRUSTPAY_MASTER_SECRET).encode("utf-8")
        self._consumed_nonces: Set[str] = set()
        self._nonce_lock = threading.Lock()

    # -------------------------------------------------------------
    # Canonicalization & Signing
    # -------------------------------------------------------------

    def canonicalize_mandate_data(self, data: Dict[str, Any]) -> str:
        """
        Creates a deterministic, lexicographically sorted JSON payload
        of the 10 mandatory authorization fields.
        """
        raw_expiry = data.get("expiry_timestamp", data.get("expires_at"))
        if isinstance(raw_expiry, datetime):
            if raw_expiry.tzinfo is None:
                raw_expiry = raw_expiry.replace(tzinfo=timezone.utc)
            expiry_epoch = int(raw_expiry.timestamp())
        elif isinstance(raw_expiry, (int, float)):
            expiry_epoch = int(raw_expiry)
        elif isinstance(raw_expiry, str):
            try:
                dt = datetime.fromisoformat(raw_expiry.replace("Z", "+00:00"))
                expiry_epoch = int(dt.timestamp())
            except Exception:
                expiry_epoch = int(raw_expiry)
        else:
            expiry_epoch = 0

        approved_amount = float(data.get("approved_amount", data.get("max_authorized_amount", 0.0)))
        category = str(data.get("product_category", data.get("category", ""))).strip().lower()
        purpose = str(data.get("allowed_payment_purpose", data.get("payment_purpose", data.get("justification", "")))).strip()
        req_id = str(data.get("transaction_request_id", data.get("request_id", data.get("purchase_id", "")))).strip()
        vendor_id = str(data.get("vendor_id", data.get("vendor_domain", ""))).strip()

        canonical_dict = {
            "agent_id": str(data.get("agent_id", "")).strip(),
            "allowed_payment_purpose": purpose,
            "approved_amount": f"{approved_amount:.2f}",
            "currency": str(data.get("currency", "USD")).strip().upper(),
            "expiry_timestamp": expiry_epoch,
            "mandate_id": str(data.get("mandate_id", "")).strip(),
            "nonce": str(data.get("nonce", "")).strip(),
            "product_category": category,
            "transaction_request_id": req_id,
            "vendor_id": vendor_id
        }
        return json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))

    def sign_mandate(self, mandate_data: Dict[str, Any]) -> str:
        """
        Computes the HMAC-SHA256 signature over the canonicalized mandate payload.
        """
        canonical_str = self.canonicalize_mandate_data(mandate_data)
        return hmac.new(self.secret, canonical_str.encode("utf-8"), hashlib.sha256).hexdigest()

    # -------------------------------------------------------------
    # Mandate Lifecycle: Create, Verify, Expiry, Nonce, Consume
    # -------------------------------------------------------------

    def create_mandate(
        self,
        agent_id: str,
        vendor_id: str,
        approved_amount: float,
        currency: str,
        product_category: str,
        transaction_request_id: str,
        allowed_payment_purpose: str,
        duration_seconds: Optional[int] = None,
        mandate_id: Optional[str] = None,
        nonce: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a cryptographic spending mandate bound to a single transaction request.
        Contains all 10 mandatory fields and HMAC-SHA256 signature.
        """
        duration = duration_seconds if duration_seconds is not None else (settings.MANDATE_EXPIRATION_MINUTES * 60)
        now = datetime.now(timezone.utc)
        expiry_dt = now + timedelta(seconds=duration)
        
        m_id = mandate_id or f"mandate_{secrets.token_hex(12)}"
        n_val = nonce or secrets.token_hex(16)

        mandate_payload: Dict[str, Any] = {
            "mandate_id": m_id,
            "agent_id": agent_id.strip(),
            "vendor_id": vendor_id.strip(),
            "approved_amount": round(float(approved_amount), 2),
            "currency": currency.strip().upper(),
            "product_category": product_category.strip(),
            "expiry_timestamp": expiry_dt,
            "nonce": n_val,
            "transaction_request_id": transaction_request_id.strip(),
            "allowed_payment_purpose": allowed_payment_purpose.strip(),
            "issued_at": now
        }

        # Sign the canonicalized mandate
        signature = self.sign_mandate(mandate_payload)
        mandate_payload["signature"] = signature

        # Compatibility aliases for database models and existing consumers
        mandate_payload["max_authorized_amount"] = mandate_payload["approved_amount"]
        mandate_payload["expires_at"] = mandate_payload["expiry_timestamp"]
        mandate_payload["purchase_id"] = mandate_payload["transaction_request_id"]
        mandate_payload["request_id"] = mandate_payload["transaction_request_id"]
        mandate_payload["payment_purpose"] = mandate_payload["allowed_payment_purpose"]

        return mandate_payload

    def check_expiry(self, expiry_timestamp: Union[datetime, int, float, str]) -> bool:
        """
        Checks whether the given timestamp has expired.
        Returns True if the mandate is STILL VALID (current time < expiry), False if expired.
        """
        now = datetime.now(timezone.utc)
        if isinstance(expiry_timestamp, datetime):
            exp_tz = expiry_timestamp if expiry_timestamp.tzinfo is not None else expiry_timestamp.replace(tzinfo=timezone.utc)
            return now < exp_tz
        elif isinstance(expiry_timestamp, (int, float)):
            exp_tz = datetime.fromtimestamp(expiry_timestamp, tz=timezone.utc)
            return now < exp_tz
        elif isinstance(expiry_timestamp, str):
            try:
                dt = datetime.fromisoformat(expiry_timestamp.replace("Z", "+00:00"))
                return now < dt
            except Exception:
                try:
                    exp_tz = datetime.fromtimestamp(float(expiry_timestamp), tz=timezone.utc)
                    return now < exp_tz
                except Exception:
                    return False
        return False

    def check_nonce(self, nonce: str) -> bool:
        """
        Checks if a nonce has already been consumed.
        Returns True if nonce is FRESH (unused), False if already consumed.
        """
        if not nonce or not isinstance(nonce, str):
            return False
        with self._nonce_lock:
            return nonce not in self._consumed_nonces

    def consume_mandate(
        self,
        mandate_id: str,
        nonce: str,
        transaction_id: Optional[str] = None
    ) -> bool:
        """
        Marks a mandate and its nonce as consumed (single-use enforcement).
        Thread-safe atomic consumption prevents race-condition replays.
        Returns True if successfully consumed, False if already consumed (replay attempt).
        """
        if not nonce or not isinstance(nonce, str):
            return False
        with self._nonce_lock:
            if nonce in self._consumed_nonces:
                return False
            self._consumed_nonces.add(nonce)
            return True

    def verify_mandate(
        self,
        mandate: Optional[Dict[str, Any]] = None,
        current_transaction: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Tuple[bool, Optional[str], bool]:
        """
        Verifies mandate signature, expiry window, nonce replay status, and parameter binding.
        Supports both modern dict-based call and legacy keyword-argument call.
        Returns: (is_valid: bool, failure_reason: Optional[str], tamper_detected: bool)
        """
        # If called using legacy keyword args
        if mandate is None and "mandate_id" in kwargs:
            mandate = kwargs
            current_transaction = kwargs.get("current_purchase_details")

        if not isinstance(mandate, dict):
            return False, "Invalid mandate format: must be a dictionary", True

        # 1. Check Expiry
        raw_expiry = mandate.get("expiry_timestamp", mandate.get("expires_at"))
        if raw_expiry is None or not self.check_expiry(raw_expiry):
            return False, "Mandate has expired", False

        # 2. Check Nonce (Replay Detection)
        nonce = str(mandate.get("nonce", ""))
        if not self.check_nonce(nonce):
            return False, f"Replay attack detected: Nonce '{nonce}' has already been consumed.", True

        # 3. Check HMAC Signature (Tamper Detection)
        expected_sig = self.sign_mandate(mandate)
        provided_sig = str(mandate.get("signature", ""))

        if not hmac.compare_digest(expected_sig, provided_sig):
            # Also check legacy signature format if present
            if "intent_hash" in mandate:
                legacy_sig = self._verify_legacy_signature(mandate)
                if legacy_sig:
                    return self._verify_legacy_transaction_binding(mandate, current_transaction)
            return False, "Cryptographic signature mismatch. Mandate token has been altered or forged.", True

        # 4. Check Transaction Parameter Binding (if payment execution payload provided)
        if current_transaction:
            # 4a. Reject incorrect vendor ID
            expected_vendor = str(mandate.get("vendor_id", "")).strip().lower()
            actual_vendor = str(current_transaction.get("vendor_id", current_transaction.get("vendor_domain", ""))).strip().lower()
            if actual_vendor and expected_vendor and actual_vendor != expected_vendor:
                return False, f"Vendor ID mismatch: expected '{expected_vendor}', received '{actual_vendor}'", True

            # 4b. Reject amounts exceeding authorized limit
            approved_amount = float(mandate.get("approved_amount", mandate.get("max_authorized_amount", 0.0)))
            actual_amount = float(current_transaction.get("amount", 0.0))
            if actual_amount > approved_amount:
                return False, f"Amount ${actual_amount:.2f} exceeds authorized spending ceiling of ${approved_amount:.2f}", True

            # 4c. Reject currency mismatch
            expected_curr = str(mandate.get("currency", "USD")).strip().upper()
            actual_curr = str(current_transaction.get("currency", expected_curr)).strip().upper()
            if actual_curr != expected_curr:
                return False, f"Currency mismatch: expected '{expected_curr}', received '{actual_curr}'", True

            # 4d. Reject category mismatch if specified
            expected_cat = str(mandate.get("product_category", mandate.get("category", ""))).strip().lower()
            actual_cat = str(current_transaction.get("product_category", current_transaction.get("category", expected_cat))).strip().lower()
            if expected_cat and actual_cat and expected_cat != actual_cat:
                return False, f"Category mismatch: expected '{expected_cat}', received '{actual_cat}'", True

            # 4e. Reject transaction request ID mismatch
            expected_req = str(mandate.get("transaction_request_id", mandate.get("request_id", mandate.get("purchase_id", "")))).strip()
            actual_req = str(current_transaction.get("transaction_request_id", current_transaction.get("request_id", current_transaction.get("purchase_id", expected_req)))).strip()
            if expected_req and actual_req and expected_req != actual_req:
                return False, f"Transaction request ID mismatch: expected '{expected_req}', received '{actual_req}'", True

        return True, None, False

    # -------------------------------------------------------------
    # Legacy / Intent Hash Compatibility Methods
    # -------------------------------------------------------------

    def compute_intent_hash(
        self,
        agent_id: str,
        item_name: str,
        vendor_name: str,
        vendor_domain: str,
        amount: float,
        currency: str
    ) -> str:
        """Computes deterministic SHA-256 canonical hash of the purchase intent."""
        canonical_dict = {
            "agent_id": agent_id.strip(),
            "amount": f"{amount:.2f}",
            "currency": currency.strip().upper(),
            "item_name": item_name.strip(),
            "vendor_domain": vendor_domain.strip().lower(),
            "vendor_name": vendor_name.strip(),
        }
        canonical_json = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def generate_mandate(
        self,
        purchase_id: str,
        agent_id: str,
        item_name: str,
        vendor_name: str,
        vendor_domain: str,
        amount: float,
        currency: str = "USD",
        duration_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """Legacy helper for backward compatibility."""
        duration_seconds = (duration_minutes or settings.MANDATE_EXPIRATION_MINUTES) * 60
        mandate = self.create_mandate(
            agent_id=agent_id,
            vendor_id=vendor_domain,
            approved_amount=amount,
            currency=currency,
            product_category="software_saas",
            transaction_request_id=purchase_id,
            allowed_payment_purpose=item_name,
            duration_seconds=duration_seconds
        )
        # Compute and attach intent_hash for legacy tests
        mandate["intent_hash"] = self.compute_intent_hash(
            agent_id=agent_id,
            item_name=item_name,
            vendor_name=vendor_name,
            vendor_domain=vendor_domain,
            amount=amount,
            currency=currency
        )
        # Sign with legacy format for legacy verify calls
        raw_expiry = mandate["expiry_timestamp"]
        exp_epoch = int(raw_expiry.timestamp()) if isinstance(raw_expiry, datetime) else int(raw_expiry)
        legacy_msg = (
            f"{mandate['mandate_id']}|{purchase_id}|{agent_id}|"
            f"{mandate['intent_hash']}|{mandate['nonce']}|"
            f"{amount:.2f}|{currency.upper()}|{exp_epoch}"
        )
        mandate["signature"] = hmac.new(self.secret, legacy_msg.encode("utf-8"), hashlib.sha256).hexdigest()
        return mandate

    def _verify_legacy_signature(self, mandate: Dict[str, Any]) -> bool:
        expires_at = mandate.get("expires_at", mandate.get("expiry_timestamp"))
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            exp_epoch = int(expires_at.timestamp())
        else:
            exp_epoch = int(expires_at)
        max_amount = float(mandate.get("max_authorized_amount", mandate.get("approved_amount", 0.0)))
        message = (
            f"{mandate.get('mandate_id')}|{mandate.get('purchase_id', mandate.get('request_id'))}|"
            f"{mandate.get('agent_id')}|{mandate.get('intent_hash')}|{mandate.get('nonce')}|"
            f"{max_amount:.2f}|{str(mandate.get('currency', 'USD')).upper()}|{exp_epoch}"
        )
        expected_sig = hmac.new(self.secret, message.encode("utf-8"), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, mandate.get("signature", ""))

    def _verify_legacy_transaction_binding(
        self,
        mandate: Dict[str, Any],
        current_details: Optional[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str], bool]:
        if not current_details:
            return True, None, False
        recomputed = self.compute_intent_hash(
            agent_id=current_details.get("agent_id", mandate.get("agent_id")),
            item_name=current_details.get("item_name", ""),
            vendor_name=current_details.get("vendor_name", ""),
            vendor_domain=current_details.get("vendor_domain", ""),
            amount=float(current_details.get("amount", mandate.get("max_authorized_amount", 0.0))),
            currency=current_details.get("currency", mandate.get("currency", "USD"))
        )
        if not hmac.compare_digest(recomputed, mandate.get("intent_hash", "")):
            return False, "Intent hash discrepancy: parameters have been tampered with.", True
        actual_amount = float(current_details.get("amount", 0.0))
        max_amount = float(mandate.get("max_authorized_amount", mandate.get("approved_amount", 0.0)))
        if actual_amount > max_amount:
            return False, f"Actual amount ${actual_amount:.2f} exceeds authorized limit ${max_amount:.2f}", True
        return True, None, False

# Global singleton instance
crypto_engine = CryptographicSpendingMandateEngine()
CryptographicEngine = CryptographicSpendingMandateEngine

# Module-level function bindings
def create_mandate(*args, **kwargs):
    return crypto_engine.create_mandate(*args, **kwargs)

def sign_mandate(mandate_data: Dict[str, Any]) -> str:
    return crypto_engine.sign_mandate(mandate_data)

def verify_mandate(*args, **kwargs):
    return crypto_engine.verify_mandate(*args, **kwargs)

def check_expiry(expiry_timestamp) -> bool:
    return crypto_engine.check_expiry(expiry_timestamp)

def check_nonce(nonce: str) -> bool:
    return crypto_engine.check_nonce(nonce)

def consume_mandate(mandate_id: str, nonce: str, transaction_id: Optional[str] = None) -> bool:
    return crypto_engine.consume_mandate(mandate_id, nonce, transaction_id)
