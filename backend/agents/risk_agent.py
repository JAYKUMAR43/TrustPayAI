from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.purchase import PurchaseRequestModel, RiskLevel
from backend.schemas.purchase import PurchaseCreateRequest

class RiskAnalysisEngine:
    SUSPICIOUS_TLDS = [".xyz", ".biz", ".top", ".ru", ".su", ".click", ".party"]
    TRUSTED_DOMAINS = [
        "github.com", "aws.amazon.com", "openai.com", "anthropic.com",
        "google.com", "microsoft.com", "datadoghq.com", "figma.com",
        "slack.com", "stripe.com", "docker.com", "vercel.com", "cloudflare.com", "paypal.com"
    ]

    async def analyze_risk(
        self,
        request: PurchaseCreateRequest,
        db: AsyncSession
    ) -> Tuple[float, RiskLevel, List[str]]:
        """
        Performs multi-factor algorithmic risk assessment on the purchase request.
        Returns:
            score (float 0.0 - 100.0)
            level (RiskLevel: LOW, MEDIUM, HIGH)
            reasons (List[str])
        """
        score = 5.0 # Base operational risk
        reasons: List[str] = []

        # 1. Amount Risk (0 - 30 pts)
        if request.amount > 1000:
            score += 30.0
            reasons.append(f"High ticket purchase (${request.amount:,.2f}) > $1,000 ceiling.")
        elif request.amount > 500:
            score += 20.0
            reasons.append(f"Substantial transaction value (${request.amount:,.2f}) > $500 threshold.")
        elif request.amount > 100:
            score += 10.0
            reasons.append(f"Standard business expenditure (${request.amount:,.2f}).")
        else:
            score += 2.0
            reasons.append(f"Low nominal value (${request.amount:,.2f}).")

        # 2. Vendor Reputation & Domain Check (0 - 30 pts)
        domain = request.vendor_domain.lower().strip()
        is_trusted = any(domain == t or domain.endswith("." + t) for t in self.TRUSTED_DOMAINS)
        has_suspicious_tld = any(domain.endswith(tld) for tld in self.SUSPICIOUS_TLDS)

        if has_suspicious_tld:
            score += 30.0
            reasons.append(f"Suspicious top-level domain detected on merchant '{request.vendor_domain}'.")
        elif not is_trusted:
            score += 15.0
            reasons.append(f"Unverified or non-partner domain '{request.vendor_domain}'.")
        else:
            reasons.append(f"Verified enterprise merchant '{domain}'.")

        # 3. Duplicate and Rapid Burst Velocity (0 - 25 pts)
        if db is not None:
            ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
            recent_requests_query = await db.execute(
                select(PurchaseRequestModel).where(
                    PurchaseRequestModel.agent_id == request.agent_id,
                    PurchaseRequestModel.created_at >= ten_mins_ago
                )
            )
            recent_requests = recent_requests_query.scalars().all()

            # Check exact duplicate item or amount in last 10 mins
            duplicates = [r for r in recent_requests if (
                r.item_name.lower().strip() == request.item_name.lower().strip() and
                abs(r.amount - request.amount) < 0.01
            )]
            if duplicates:
                score += 25.0
                reasons.append(f"Potential duplicate/replay: identical purchase submitted {len(duplicates)} time(s) within 10 minutes.")
            elif len(recent_requests) >= 3:
                score += 15.0
                reasons.append(f"Burst velocity: Agent has generated {len(recent_requests)} procurement requests in the last 10 minutes.")

        # 4. Agent Justification Depth & Semantic Health (0 - 15 pts)
        justification_clean = request.justification.strip()
        if len(justification_clean) < 20:
            score += 12.0
            reasons.append("Sparse justification: Agent provided insufficient business context.")
        elif any(buzz in justification_clean.lower() for buzz in ["asap", "urgent", "bypass", "override"]):
            score += 8.0
            reasons.append("Urgency/override pressure keywords detected in agent justification.")

        # Cap score between 0 and 100
        score = min(max(score, 0.0), 100.0)

        # Categorize
        if score < 30.0:
            level = RiskLevel.LOW
        elif score < 70.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.HIGH

        return round(score, 1), level, reasons

risk_engine = RiskAnalysisEngine()
