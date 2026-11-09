from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database.connection import get_db
from backend.models.procurement import ProcurementRequestModel
from backend.models.transaction import TransactionModel
from backend.models.agent import AgentModel
from backend.models.mandate import AuthorizationMandateModel
from backend.models.risk import RiskEventModel
from backend.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # 1. Total Procurement Requests & Transactions
    proc_count_res = await db.execute(select(func.count(ProcurementRequestModel.id)))
    total_procurements = proc_count_res.scalar() or 0

    tx_count_res = await db.execute(select(func.count(TransactionModel.transaction_id)))
    total_transactions = tx_count_res.scalar() or 0
    total_requests = max(total_procurements, total_transactions)

    # 2. Total Settled / Captured Spend
    spend_res = await db.execute(
        select(func.sum(TransactionModel.requested_amount)).where(
            TransactionModel.transaction_status.in_(["CAPTURED", "COMPLETED"])
        )
    )
    total_settled_spend = float(spend_res.scalar() or 0.0)

    # 2b. Total Authorized Spend (Approved / In-flight / Settled requests)
    auth_spend_res = await db.execute(
        select(func.sum(TransactionModel.requested_amount)).where(
            TransactionModel.transaction_status.in_(["APPROVED", "CAPTURED", "COMPLETED", "PENDING_BUYER_APPROVAL", "AUTHORIZED"])
        )
    )
    total_authorized_spend = float(auth_spend_res.scalar() or 0.0)
    # Ensure authorized spend is at least settled spend
    total_authorized_spend = max(total_authorized_spend, total_settled_spend)

    # 3. Approved vs Rejected Requests Count
    approved_res = await db.execute(
        select(func.count(ProcurementRequestModel.id)).where(
            ProcurementRequestModel.status.in_(["PENDING_HUMAN_APPROVAL", "AUTHORIZED", "COMPLETED", "APPROVED"])
        )
    )
    approved_requests = approved_res.scalar() or 0

    # 4. Blocked / Rejected Attempts
    blocked_res = await db.execute(
        select(func.count(ProcurementRequestModel.id)).where(
            ProcurementRequestModel.status.in_(["REJECTED", "BLOCKED", "FAILED"])
        )
    )
    blocked_attempts = blocked_res.scalar() or 0

    # 4b. Pending Approvals
    pending_res = await db.execute(
        select(func.count(ProcurementRequestModel.id)).where(
            ProcurementRequestModel.status.in_(["PENDING_HUMAN_APPROVAL", "PENDING_BUYER_APPROVAL", "PENDING_EVALUATION"])
        )
    )
    pending_approvals = pending_res.scalar() or 0

    # 4c. Captured Transactions Count
    cap_count_res = await db.execute(
        select(func.count(TransactionModel.transaction_id)).where(
            TransactionModel.transaction_status.in_(["CAPTURED", "COMPLETED"])
        )
    )
    captured_transactions = cap_count_res.scalar() or 0

    # 5. Active Mandates
    mandates_res = await db.execute(
        select(func.count(AuthorizationMandateModel.mandate_id)).where(
            AuthorizationMandateModel.is_executed == False,
            AuthorizationMandateModel.is_revoked == False
        )
    )
    active_mandates = mandates_res.scalar() or 0

    # 6. Active Agents Count
    agents_res = await db.execute(select(func.count(AgentModel.id)).where(AgentModel.status == "ACTIVE"))
    active_agents = agents_res.scalar() or 0

    # 7. Average Risk Score
    avg_risk_res = await db.execute(select(func.avg(TransactionModel.risk_score)))
    avg_risk = float(avg_risk_res.scalar() or 0.0)

    # 8. Risk Distribution
    risk_low_res = await db.execute(select(func.count(RiskEventModel.id)).where(RiskEventModel.risk_level == "LOW"))
    risk_med_res = await db.execute(select(func.count(RiskEventModel.id)).where(RiskEventModel.risk_level == "MEDIUM"))
    risk_high_res = await db.execute(select(func.count(RiskEventModel.id)).where(RiskEventModel.risk_level == "HIGH"))

    return {
        "total_requests": total_requests,
        "total_purchases": total_requests,
        "total_transactions": total_transactions,
        "approved_requests": approved_requests,
        "rejected_requests": blocked_attempts,
        "total_authorized_spend": round(total_authorized_spend, 2),
        "total_settled_amount": round(total_settled_spend, 2),
        "total_settled_spend": round(total_settled_spend, 2),
        "total_spend": round(total_settled_spend, 2),
        "blocked_attacks": blocked_attempts,
        "pending_human_approval": pending_approvals,
        "pending_approvals": pending_approvals,
        "blocked_attempts": blocked_attempts,
        "active_mandates": active_mandates,
        "active_agents": active_agents,
        "clean_evaluations": approved_requests,
        "policy_violations": blocked_attempts,
        "captured_transactions": max(0, captured_transactions),
        "average_risk_score": round(avg_risk, 1),
        "risk_distribution": {
            "low": risk_low_res.scalar() or 0,
            "medium": risk_med_res.scalar() or 0,
            "high": risk_high_res.scalar() or 0
        },
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
