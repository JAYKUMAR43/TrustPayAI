import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.mandate import CryptographicMandateModel
from backend.models.purchase import PurchaseRequestModel
from backend.schemas.mandate import MandateResponse, TamperTestRequest, TamperTestResult
from backend.security.crypto_engine import crypto_engine
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/api/mandates", tags=["mandates"])

@router.get("/{mandate_id}", response_model=MandateResponse)
async def get_mandate(mandate_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(CryptographicMandateModel).where(CryptographicMandateModel.mandate_id == mandate_id)
    )
    mandate = res.scalar_one_or_none()
    if not mandate:
        raise HTTPException(status_code=404, detail="Cryptographic Mandate not found")

    p_res = await db.execute(
        select(PurchaseRequestModel).where(PurchaseRequestModel.id == mandate.purchase_id)
    )
    purchase = p_res.scalar_one_or_none()
    
    # Run live verification
    is_valid, reason, tampered = crypto_engine.verify_mandate(
        mandate_id=mandate.mandate_id,
        purchase_id=mandate.purchase_id,
        agent_id=mandate.agent_id,
        intent_hash=mandate.intent_hash,
        nonce=mandate.nonce,
        max_authorized_amount=mandate.max_authorized_amount,
        currency=mandate.currency,
        expires_at=mandate.expires_at,
        signature=mandate.signature,
        current_purchase_details={
            "agent_id": purchase.agent_id,
            "item_name": purchase.item_name,
            "vendor_name": purchase.vendor_name,
            "vendor_domain": purchase.vendor_domain,
            "amount": purchase.amount,
            "currency": purchase.currency
        } if purchase else None
    )

    return MandateResponse(
        mandate_id=mandate.mandate_id,
        purchase_id=mandate.purchase_id,
        agent_id=mandate.agent_id,
        intent_hash=mandate.intent_hash,
        nonce=mandate.nonce,
        issued_at=mandate.issued_at,
        expires_at=mandate.expires_at,
        max_authorized_amount=mandate.max_authorized_amount,
        currency=mandate.currency,
        signature=mandate.signature,
        is_executed=mandate.is_executed,
        is_approved_by_human=mandate.is_approved_by_human,
        is_revoked=mandate.is_revoked,
        verification_status=is_valid
    )

@router.post("/tamper-test", response_model=TamperTestResult)
async def test_mandate_tamper(payload: TamperTestRequest, db: AsyncSession = Depends(get_db)):
    """
    Cryptographic Mandate Tamper Playground:
    Allows user or security auditor to simulate an adversary tampering with
    the transaction parameters (e.g. changing $190 to $9,000 or rerouting vendor).
    Demonstrates mathematically that HMAC-SHA256 immediately detects tampering.
    """
    res = await db.execute(
        select(CryptographicMandateModel).where(CryptographicMandateModel.mandate_id == payload.mandate_id)
    )
    mandate = res.scalar_one_or_none()
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandate not found")

    p_res = await db.execute(
        select(PurchaseRequestModel).where(PurchaseRequestModel.id == mandate.purchase_id)
    )
    purchase = p_res.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase record not found")

    # Use tampered values or original
    effective_amount = payload.tampered_amount if payload.tampered_amount is not None else purchase.amount
    effective_vendor_domain = payload.tampered_vendor if payload.tampered_vendor is not None else purchase.vendor_domain
    effective_nonce = payload.tampered_nonce if payload.tampered_nonce is not None else mandate.nonce

    # Compute what the intent hash would be with these tampered values
    computed_intent_hash = crypto_engine.compute_intent_hash(
        agent_id=purchase.agent_id,
        item_name=purchase.item_name,
        vendor_name=purchase.vendor_name,
        vendor_domain=effective_vendor_domain,
        amount=effective_amount,
        currency=purchase.currency
    )

    tampered_details = {
        "agent_id": purchase.agent_id,
        "item_name": purchase.item_name,
        "vendor_name": purchase.vendor_name,
        "vendor_domain": effective_vendor_domain,
        "amount": effective_amount,
        "currency": purchase.currency
    }

    is_valid, failure_reason, tamper_detected = crypto_engine.verify_mandate(
        mandate_id=mandate.mandate_id,
        purchase_id=mandate.purchase_id,
        agent_id=mandate.agent_id,
        intent_hash=mandate.intent_hash,
        nonce=effective_nonce,
        max_authorized_amount=mandate.max_authorized_amount,
        currency=mandate.currency,
        expires_at=mandate.expires_at,
        signature=mandate.signature,
        current_purchase_details=tampered_details
    )

    if tamper_detected:
        await audit_service.log_event(
            db=db,
            event_type="TAMPER_ATTEMPT_DETECTED",
            actor="security_auditor_simulation",
            details={
                "mandate_id": mandate.mandate_id,
                "original_intent_hash": mandate.intent_hash,
                "computed_intent_hash": computed_intent_hash,
                "tampered_amount": payload.tampered_amount,
                "tampered_vendor": payload.tampered_vendor,
                "tampered_nonce": payload.tampered_nonce,
                "reason": failure_reason
            },
            purchase_id=purchase.id,
            mandate_id=mandate.mandate_id
        )

    return TamperTestResult(
        mandate_id=mandate.mandate_id,
        is_valid=is_valid,
        tamper_detected=tamper_detected,
        failure_reason=failure_reason,
        original_intent_hash=mandate.intent_hash,
        computed_intent_hash=computed_intent_hash,
        signature_verified=(is_valid and not tamper_detected)
    )
