from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.purchase import PurchaseRequestModel, PurchaseStatus
from backend.models.mandate import CryptographicMandateModel
from backend.schemas.payment import (
    PaymentApprovalRequest,
    CreatePayPalOrderRequest,
    CapturePayPalOrderRequest,
    PaymentResultResponse
)
from backend.services.paypal_service import paypal_service
from backend.services.audit_service import audit_service
from backend.services.websocket_manager import ws_manager
from backend.security.crypto_engine import crypto_engine

router = APIRouter(prefix="/api/payments", tags=["payments"])

@router.post("/approve")
async def approve_purchase_mandate(
    payload: PaymentApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Human-in-the-Loop Approval Gate:
    Explicit human administrator or designated buyer review and digital sign-off.
    """
    # Fetch purchase and mandate
    p_res = await db.execute(select(PurchaseRequestModel).where(PurchaseRequestModel.id == payload.purchase_id))
    purchase = p_res.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    m_res = await db.execute(select(CryptographicMandateModel).where(CryptographicMandateModel.mandate_id == payload.mandate_id))
    mandate = m_res.scalar_one_or_none()
    if not mandate:
        raise HTTPException(status_code=404, detail="Cryptographic mandate not found")

    # Verify mandate before allowing approval
    is_valid, reason, tampered = crypto_engine.verify_mandate(
        mandate_id=mandate.mandate_id,
        purchase_id=mandate.purchase_id,
        agent_id=mandate.agent_id,
        intent_hash=mandate.intent_hash,
        nonce=mandate.nonce,
        max_authorized_amount=mandate.max_authorized_amount,
        currency=mandate.currency,
        expires_at=mandate.expires_at,
        signature=mandate.signature
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Cannot approve invalid mandate: {reason}")

    # Mark mandate approved
    now = datetime.now(timezone.utc)
    mandate.is_approved_by_human = True
    mandate.approved_by = payload.approved_by
    mandate.approved_at = now

    purchase.status = PurchaseStatus.AUTHORIZED.value
    purchase.status_reason = f"Authorized by human reviewer ({payload.approved_by}). Ready for PayPal settlement."
    await db.commit()

    # Log to audit ledger
    await audit_service.log_event(
        db=db,
        event_type="HUMAN_APPROVAL_GRANTED",
        actor=payload.approved_by,
        details={
            "purchase_id": purchase.id,
            "mandate_id": mandate.mandate_id,
            "approved_by": payload.approved_by,
            "amount": purchase.amount,
            "notes": payload.notes
        },
        purchase_id=purchase.id,
        mandate_id=mandate.mandate_id
    )

    try:
        await ws_manager.broadcast_event(
            event_type="HUMAN_APPROVAL_GRANTED",
            data={
                "purchase_id": purchase.id,
                "mandate_id": mandate.mandate_id,
                "approved_by": payload.approved_by,
                "amount": purchase.amount,
                "status": purchase.status
            },
            actor=payload.approved_by
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Mandate successfully approved by {payload.approved_by}. Payment execution unlocked.",
        "purchase_id": purchase.id,
        "mandate_id": mandate.mandate_id,
        "status": purchase.status
    }

@router.post("/reject")
async def reject_purchase_mandate(
    payload: PaymentApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    p_res = await db.execute(select(PurchaseRequestModel).where(PurchaseRequestModel.id == payload.purchase_id))
    purchase = p_res.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    m_res = await db.execute(select(CryptographicMandateModel).where(CryptographicMandateModel.mandate_id == payload.mandate_id))
    mandate = m_res.scalar_one_or_none()
    if mandate:
        mandate.is_revoked = True
        mandate.revoked_reason = payload.notes or f"Rejected by human reviewer {payload.approved_by}"

    purchase.status = PurchaseStatus.REJECTED.value
    purchase.status_reason = f"Rejected by reviewer {payload.approved_by}: {payload.notes or 'No reason provided'}"
    await db.commit()

    await audit_service.log_event(
        db=db,
        event_type="HUMAN_APPROVAL_DENIED",
        actor=payload.approved_by,
        details={
            "purchase_id": purchase.id,
            "mandate_id": payload.mandate_id,
            "rejected_by": payload.approved_by,
            "notes": payload.notes
        },
        purchase_id=purchase.id,
        mandate_id=payload.mandate_id
    )

    try:
        await ws_manager.broadcast_event(
            event_type="HUMAN_APPROVAL_DENIED",
            data={
                "purchase_id": purchase.id,
                "mandate_id": payload.mandate_id,
                "rejected_by": payload.approved_by,
                "status": purchase.status
            },
            actor=payload.approved_by
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": "Purchase request and mandate rejected.",
        "purchase_id": purchase.id,
        "status": purchase.status
    }

@router.get("/order/{order_id}")
async def get_paypal_order(
    order_id: str
):
    """
    Retrieves PayPal order status and buyer approval details from PayPal Sandbox.
    """
    success, res_data, code = await paypal_service.get_order_status(order_id)
    if not success:
        raise HTTPException(status_code=code, detail=res_data.get("error", "Failed to retrieve PayPal order"))
    return res_data

@router.post("/create-order", response_model=PaymentResultResponse, status_code=201)
async def create_paypal_order(
    payload: CreatePayPalOrderRequest,
    db: AsyncSession = Depends(get_db)
):
    success, res_data, code = await paypal_service.create_order(
        db=db,
        purchase_id=payload.purchase_id,
        mandate_id=payload.mandate_id,
        idempotency_key=payload.idempotency_key
    )
    if not success:
        raise HTTPException(status_code=code, detail=res_data.get("error", "Failed to create PayPal order"))
    try:
        await ws_manager.broadcast_event(
            event_type="PAYPAL_ORDER_CREATED",
            data=res_data,
            actor="paypal_gateway"
        )
    except Exception:
        pass
    return res_data

@router.post("/capture-order", response_model=PaymentResultResponse)
async def capture_paypal_order(
    payload: CapturePayPalOrderRequest,
    db: AsyncSession = Depends(get_db)
):
    success, res_data, code = await paypal_service.capture_order(
        db=db,
        purchase_id=payload.purchase_id,
        mandate_id=payload.mandate_id,
        paypal_order_id=payload.paypal_order_id,
        idempotency_key=payload.idempotency_key
    )
    if not success:
        raise HTTPException(status_code=code, detail=res_data.get("error", "Failed to capture PayPal order"))
    try:
        await ws_manager.broadcast_event(
            event_type="PAYMENT_CAPTURED",
            data=res_data,
            actor="paypal_gateway"
        )
    except Exception:
        pass
    return res_data
