from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from backend.database import get_db
from backend.models.purchase import PurchaseRequestModel, PurchaseStatus, RiskLevel
from backend.models.mandate import CryptographicMandateModel
from backend.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # 1. Total Purchases count
    count_res = await db.execute(select(func.count(PurchaseRequestModel.id)))
    total_purchases = count_res.scalar() or 0

    # 2. Total Spend Settled
    spend_res = await db.execute(
        select(func.sum(PurchaseRequestModel.amount)).where(
            PurchaseRequestModel.status == PurchaseStatus.COMPLETED.value
        )
    )
    total_settled_spend = spend_res.scalar() or 0.0

    # 3. Pending Approvals Count
    pending_res = await db.execute(
        select(func.count(PurchaseRequestModel.id)).where(
            PurchaseRequestModel.status == PurchaseStatus.PENDING_HUMAN_APPROVAL.value
        )
    )
    pending_approvals = pending_res.scalar() or 0

    # 4. Blocked / Rejected Attempts Count
    blocked_res = await db.execute(
        select(func.count(PurchaseRequestModel.id)).where(
            PurchaseRequestModel.status == PurchaseStatus.REJECTED.value
        )
    )
    blocked_attempts = blocked_res.scalar() or 0

    # 5. Active Cryptographic Mandates
    active_mandates_res = await db.execute(
        select(func.count(CryptographicMandateModel.mandate_id)).where(
            CryptographicMandateModel.is_executed == False,
            CryptographicMandateModel.is_revoked == False
        )
    )
    active_mandates = active_mandates_res.scalar() or 0

    # 6. Average Risk Score
    avg_risk_res = await db.execute(select(func.avg(PurchaseRequestModel.risk_score)))
    avg_risk = avg_risk_res.scalar() or 0.0

    # 7. Risk Distribution
    risk_low_res = await db.execute(select(func.count(PurchaseRequestModel.id)).where(PurchaseRequestModel.risk_level == RiskLevel.LOW.value))
    risk_med_res = await db.execute(select(func.count(PurchaseRequestModel.id)).where(PurchaseRequestModel.risk_level == RiskLevel.MEDIUM.value))
    risk_high_res = await db.execute(select(func.count(PurchaseRequestModel.id)).where(PurchaseRequestModel.risk_level == RiskLevel.HIGH.value))

    # 8. Spend by Category
    category_res = await db.execute(
        select(PurchaseRequestModel.category, func.sum(PurchaseRequestModel.amount))
        .where(PurchaseRequestModel.status.in_([PurchaseStatus.COMPLETED.value, PurchaseStatus.AUTHORIZED.value, PurchaseStatus.PENDING_HUMAN_APPROVAL.value]))
        .group_by(PurchaseRequestModel.category)
    )
    category_spend = {cat: round(amt, 2) for cat, amt in category_res.all()}

    return {
        "total_purchases": total_purchases,
        "total_settled_spend": round(total_settled_spend, 2),
        "pending_approvals": pending_approvals,
        "blocked_attempts": blocked_attempts,
        "active_mandates": active_mandates,
        "average_risk_score": round(avg_risk, 1),
        "risk_distribution": {
            "low": risk_low_res.scalar() or 0,
            "medium": risk_med_res.scalar() or 0,
            "high": risk_high_res.scalar() or 0
        },
        "spend_by_category": category_spend,
        "limits": {
            "daily_limit": settings.DEFAULT_DAILY_SPEND_LIMIT,
            "monthly_limit": settings.DEFAULT_MONTHLY_SPEND_LIMIT,
            "single_transaction_limit": settings.DEFAULT_SINGLE_TRANSACTION_LIMIT
        },
        "environment": {
            "paypal_mode": settings.PAYPAL_MODE,
            "has_real_paypal": settings.has_real_paypal_credentials,
            "has_real_gemini": settings.has_real_gemini_key,
            "debug": settings.DEBUG
        }
    }
