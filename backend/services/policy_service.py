import json
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.policy import SpendingPolicyModel, PolicyRuleModel
from backend.config import settings

DEFAULT_POLICIES = [
    {
        "rule_name": "SINGLE_TRANSACTION_CAP",
        "rule_type": "SPEND_LIMIT",
        "description": f"Maximum single purchase limit allowed without executive override (${settings.DEFAULT_SINGLE_TRANSACTION_LIMIT:,.2f})",
        "rule_value": {"max_amount": settings.DEFAULT_SINGLE_TRANSACTION_LIMIT, "currency": "USD"},
        "is_active": True
    },
    {
        "rule_name": "DAILY_VELOCITY_CAP",
        "rule_type": "SPEND_LIMIT",
        "description": f"Maximum cumulative spend allowed in a 24-hour window (${settings.DEFAULT_DAILY_SPEND_LIMIT:,.2f})",
        "rule_value": {"daily_cap": settings.DEFAULT_DAILY_SPEND_LIMIT, "currency": "USD"},
        "is_active": True
    },
    {
        "rule_name": "ALLOWED_VENDOR_DOMAINS",
        "rule_type": "ALLOWED_VENDORS",
        "description": "Pre-approved enterprise technology and infrastructure vendor domains",
        "rule_value": {
            "domains": [
                "github.com", "aws.amazon.com", "openai.com", "anthropic.com",
                "google.com", "microsoft.com", "datadoghq.com", "figma.com",
                "slack.com", "stripe.com", "docker.com", "vercel.com", "cloudflare.com", "paypal.com"
            ]
        },
        "is_active": True
    },
    {
        "rule_name": "BLOCKED_VENDOR_DOMAINS",
        "rule_type": "BLOCKED_VENDORS",
        "description": "Blacklisted suspicious or unverified merchant domains",
        "rule_value": {
            "domains": [
                "evil-hacker.com", "unknown-crypto-vendor.xyz", "shady-downloads.biz", "darknet-market.io"
            ]
        },
        "is_active": True
    },
    {
        "rule_name": "BANNED_CATEGORIES",
        "rule_type": "BANNED_CATEGORIES",
        "description": "High-liability product categories that autonomous agents are strictly forbidden to procure",
        "rule_value": {
            "categories": [
                "gambling", "cryptocurrency", "prepaid_gift_cards", "weapons", "restricted", "adult"
            ]
        },
        "is_active": True
    },
    {
        "rule_name": "HUMAN_APPROVAL_THRESHOLD",
        "rule_type": "APPROVAL_GATE",
        "description": "Purchases above this amount require human approval even if all other guardrails pass",
        "rule_value": {"threshold": 200.00, "currency": "USD"},
        "is_active": True
    }
]

class PolicyService:
    async def seed_default_policies(self, db: AsyncSession):
        from backend.models.policy import SpendingPolicyModel
        for policy_data in DEFAULT_POLICIES:
            existing = await db.execute(
                select(SpendingPolicyModel).where(SpendingPolicyModel.name == policy_data["rule_name"])
            )
            if not existing.scalar_one_or_none():
                rule = SpendingPolicyModel(
                    name=policy_data["rule_name"],
                    policy_type=policy_data["rule_type"],
                    description=policy_data["description"],
                    rule_value=json.dumps(policy_data["rule_value"]),
                    is_active=policy_data["is_active"]
                )
                db.add(rule)
        await db.commit()

    async def get_all_policies(self, db: AsyncSession) -> List[SpendingPolicyModel]:
        from backend.models.policy import SpendingPolicyModel
        result = await db.execute(select(SpendingPolicyModel).order_by(SpendingPolicyModel.id.asc()))
        return result.scalars().all()

    async def get_policy_dict(self, db: AsyncSession) -> Dict[str, Dict[str, Any]]:
        policies = await self.get_all_policies(db)
        out = {}
        for p in policies:
            if p.is_active:
                try:
                    val = json.loads(p.rule_value)
                except Exception:
                    val = p.rule_value
                out[p.rule_name] = val
        return out

policy_service = PolicyService()
