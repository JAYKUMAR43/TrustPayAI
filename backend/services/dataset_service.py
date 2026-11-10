import hmac
import hashlib
import time
import json
import base64
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from backend.config import settings
from backend.models.transaction import TransactionModel
from backend.models.procurement import ProcurementRequestModel
from backend.security.rbac import TenantContext
from backend.services.catalog_service import INTERNAL_VENDOR_CATALOG, CatalogProduct
from backend.services.audit_service import audit_service

class DatasetFulfillmentService:
    def __init__(self):
        secret = getattr(settings, "TRUSTPAY_MASTER_SECRET", "tp_sec_2026_trustpay_autonomous_fintech_guardrail_hmac_master_key")
        self.secret_key = secret.encode("utf-8")

    def _find_catalog_dataset(self, product_name: str) -> Optional[CatalogProduct]:
        norm = product_name.lower().strip()
        for prod in INTERNAL_VENDOR_CATALOG:
            if prod.item_type and prod.item_type.lower() == "digital_dataset":
                if prod.name.lower() in norm or norm in prod.name.lower() or any(t in norm for t in prod.tags):
                    return prod
        # Fallback to first dataset
        for prod in INTERNAL_VENDOR_CATALOG:
            if prod.item_type and prod.item_type.lower() == "digital_dataset":
                return prod
        return None

    def generate_signed_download_token(self, purchase_id: str, product_id: str, user_id: str, ttl_seconds: int = 900) -> str:
        """Generates an expiring HMAC-SHA256 signed download token."""
        expires_at = int(time.time()) + ttl_seconds
        payload_data = {
            "pid": purchase_id,
            "prod": product_id,
            "uid": user_id,
            "exp": expires_at
        }
        raw_json = json.dumps(payload_data, separators=(",", ":"))
        b64_payload = base64.urlsafe_b64encode(raw_json.encode("utf-8")).decode("utf-8").rstrip("=")
        sig = hmac.new(self.secret_key, b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{b64_payload}.{sig}"

    def verify_download_token(self, token: str) -> Dict[str, Any]:
        """Verifies signature, expiration, and payload integrity."""
        try:
            parts = token.split(".")
            if len(parts) != 2:
                raise ValueError("Malformed token format")
            b64_payload, signature = parts
            
            # Verify signature
            expected_sig = hmac.new(self.secret_key, b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected_sig, signature):
                raise ValueError("Invalid cryptographic token signature")

            # Decode payload
            padded = b64_payload + "=" * (-len(b64_payload) % 4)
            payload_str = base64.urlsafe_b64decode(padded).decode("utf-8")
            payload = json.loads(payload_str)

            # Check expiration
            if time.time() > payload.get("exp", 0):
                raise ValueError("Download token expired. Please request a new link.")

            return payload
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Dataset download authorization failed: {str(e)}")

    async def get_entitlement_status(
        self,
        purchase_id: str,
        db: AsyncSession,
        tenant_context: TenantContext
    ) -> Dict[str, Any]:
        """
        Validates transaction payment status on the backend, checks tenant ownership,
        and generates signed expiring download URL only if verified paid.
        """
        # Look up transaction or procurement request
        res = await db.execute(
            select(TransactionModel).where(
                (TransactionModel.transaction_id == purchase_id) |
                (TransactionModel.procurement_id == purchase_id)
            )
        )
        tx = res.scalar_one_or_none()

        proc = None
        if not tx:
            p_res = await db.execute(
                select(ProcurementRequestModel).where(ProcurementRequestModel.id == purchase_id)
            )
            proc = p_res.scalar_one_or_none()

        if not tx and not proc:
            raise HTTPException(status_code=404, detail=f"Purchase record '{purchase_id}' not found.")

        # Check tenant ownership
        record_user = tx.user_id if tx else proc.user_id
        record_org = tx.organization_id if tx else proc.organization_id

        if tenant_context.is_individual:
            if record_user and record_user != tenant_context.user_id:
                raise HTTPException(status_code=403, detail="Access Denied: You do not own this purchase record.")
        elif tenant_context.is_organization:
            if record_org and record_org != tenant_context.organization_id:
                raise HTTPException(status_code=403, detail="Access Denied: Record belongs to a different organization.")

        # Check payment status
        status = tx.transaction_status if tx else proc.status
        is_paid = status in ("CAPTURED", "COMPLETED", "PAYMENT_CAPTURED")

        product_name = tx.requested_product if tx else proc.product_name
        catalog_item = self._find_catalog_dataset(product_name)

        if not catalog_item:
            return {
                "purchase_id": purchase_id,
                "status": "NON_DIGITAL",
                "is_entitled": False,
                "message": f"Item '{product_name}' is physical hardware or SaaS license. Physical fulfillment tracking active."
            }

        meta = catalog_item.dataset_metadata or {}

        if not is_paid:
            return {
                "purchase_id": purchase_id,
                "status": "LOCKED",
                "is_entitled": False,
                "dataset_title": catalog_item.name,
                "provider": catalog_item.vendor_name,
                "format": meta.get("file_format", "Compressed Archive"),
                "size": meta.get("dataset_size", "N/A"),
                "license": meta.get("license", "Commercial License"),
                "checksum_sha256": meta.get("checksum_sha256", "N/A"),
                "message": f"Payment status is '{status}'. Download entitlement requires confirmed PayPal Sandbox payment capture."
            }

        # User is entitled! Issue cryptographic signed download URL
        token = self.generate_signed_download_token(
            purchase_id=purchase_id,
            product_id=catalog_item.product_id,
            user_id=tenant_context.user_id,
            ttl_seconds=900 # 15 minutes
        )

        return {
            "purchase_id": purchase_id,
            "status": "ENTITLED",
            "is_entitled": True,
            "dataset_title": catalog_item.name,
            "provider": catalog_item.vendor_name,
            "format": meta.get("file_format", "Parquet / CSV"),
            "size": meta.get("dataset_size", "4.8 GB"),
            "license": meta.get("license", "Commercial License"),
            "checksum_sha256": meta.get("checksum_sha256"),
            "preview_columns": meta.get("preview_columns", []),
            "download_token": token,
            "download_url": f"/api/datasets/download/{token}",
            "expires_in_seconds": 900,
            "file_name": meta.get("download_filename", "dataset_archive.parquet")
        }

dataset_service = DatasetFulfillmentService()
