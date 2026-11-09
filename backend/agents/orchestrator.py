import json
import uuid
from typing import TypedDict, Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, END
from backend.schemas.purchase import PurchaseCreateRequest
from backend.models.purchase import PurchaseRequestModel, PurchaseStatus, RiskLevel
from backend.models.mandate import CryptographicMandateModel
from backend.agents.policy_agent import policy_agent
from backend.agents.risk_agent import risk_engine
from backend.security.crypto_engine import crypto_engine
from backend.services.policy_service import policy_service
from backend.services.audit_service import audit_service

class ProcurementState(TypedDict):
    purchase_id: str
    request: Dict[str, Any]
    policy_passed: bool
    policy_violations: List[str]
    policy_warnings: List[str]
    risk_score: float
    risk_level: str
    risk_reasons: List[str]
    mandate_data: Optional[Dict[str, Any]]
    final_status: str
    status_reason: Optional[str]

class LangGraphProcurementOrchestrator:
    def __init__(self):
        self.workflow = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(ProcurementState)

        # Nodes
        graph.add_node("evaluate_policy", self._node_evaluate_policy)
        graph.add_node("analyze_risk", self._node_analyze_risk)
        graph.add_node("issue_mandate", self._node_issue_mandate)
        graph.add_node("reject_purchase", self._node_reject_purchase)

        # Edges
        graph.set_entry_point("evaluate_policy")

        # Conditional branch from policy evaluation
        graph.add_conditional_edges(
            "evaluate_policy",
            self._route_after_policy,
            {
                "proceed_to_risk": "analyze_risk",
                "reject": "reject_purchase"
            }
        )

        graph.add_edge("analyze_risk", "issue_mandate")
        graph.add_edge("issue_mandate", END)
        graph.add_edge("reject_purchase", END)

        return graph.compile()

    def _route_after_policy(self, state: ProcurementState) -> str:
        if state.get("policy_passed", False):
            return "proceed_to_risk"
        return "reject"

    async def _node_evaluate_policy(self, state: ProcurementState) -> Dict[str, Any]:
        # Helper to run synchronous/state parts in graph node
        return state

    async def _node_analyze_risk(self, state: ProcurementState) -> Dict[str, Any]:
        return state

    async def _node_issue_mandate(self, state: ProcurementState) -> Dict[str, Any]:
        return state

    async def _node_reject_purchase(self, state: ProcurementState) -> Dict[str, Any]:
        return state

    async def execute_procurement_flow(
        self,
        request: PurchaseCreateRequest,
        db: AsyncSession
    ) -> PurchaseRequestModel:
        """
        Executes the full pipeline:
        1. Persist initial request (PENDING_EVALUATION)
        2. Policy Guardrail Evaluation
        3. Risk Analysis
        4. Cryptographic Mandate Issuance (if passed)
        5. Audit Ledger Commit
        """
        purchase_id = str(uuid.uuid4())
        
        # 1. Fetch active policies
        policies = await policy_service.get_policy_dict(db)

        # 2. Evaluate Policy Guardrails
        policy_passed, violations, warnings = await policy_agent.evaluate_purchase(request, policies, db)

        # 3. Assess Risk
        risk_score, risk_level, risk_reasons = await risk_engine.analyze_risk(request, db)

        mandate_model = None
        if not policy_passed:
            status = PurchaseStatus.REJECTED.value
            status_reason = " | ".join(violations)
        elif risk_level == RiskLevel.HIGH and request.amount > 1000:
            status = PurchaseStatus.REJECTED.value
            status_reason = f"Automated Policy Exception: Critical Risk ({risk_score}/100) on unauthorized high-ticket procurement."
        else:
            status = PurchaseStatus.PENDING_HUMAN_APPROVAL.value
            status_reason = "Mandate generated. Awaiting authorized human buyer approval before PayPal execution."

            # 4. Generate Cryptographic Mandate
            mandate_dict = crypto_engine.generate_mandate(
                purchase_id=purchase_id,
                agent_id=request.agent_id,
                item_name=request.item_name,
                vendor_name=request.vendor_name,
                vendor_domain=request.vendor_domain,
                amount=request.amount,
                currency=request.currency
            )
            
            mandate_model = CryptographicMandateModel(
                mandate_id=mandate_dict["mandate_id"],
                purchase_id=purchase_id,
                agent_id=request.agent_id,
                intent_hash=mandate_dict["intent_hash"],
                nonce=mandate_dict["nonce"],
                issued_at=mandate_dict["issued_at"],
                expires_at=mandate_dict["expires_at"],
                max_authorized_amount=mandate_dict["max_authorized_amount"],
                currency=mandate_dict["currency"],
                signature=mandate_dict["signature"]
            )
            db.add(mandate_model)

        # 5. Persist Purchase Model
        all_reasons = risk_reasons + warnings
        purchase_model = PurchaseRequestModel(
            id=purchase_id,
            agent_id=request.agent_id,
            agent_name=request.agent_name,
            item_name=request.item_name,
            category=request.category,
            vendor_name=request.vendor_name,
            vendor_domain=request.vendor_domain,
            amount=request.amount,
            currency=request.currency,
            justification=request.justification,
            status=status,
            status_reason=status_reason,
            risk_score=risk_score,
            risk_level=risk_level.value,
            risk_reasons=json.dumps(all_reasons),
            mandate_id=mandate_model.mandate_id if mandate_model else None
        )
        db.add(purchase_model)
        await db.commit()
        await db.refresh(purchase_model)

        # 6. Append Immutable Audit Ledger Block
        event_type = "MANDATE_ISSUED" if mandate_model else "REQUEST_REJECTED"
        await audit_service.log_event(
            db=db,
            event_type=event_type,
            actor=request.agent_id,
            details={
                "purchase_id": purchase_id,
                "amount": request.amount,
                "currency": request.currency,
                "vendor": request.vendor_domain,
                "policy_passed": policy_passed,
                "risk_score": risk_score,
                "mandate_id": mandate_model.mandate_id if mandate_model else None,
                "status": status,
                "status_reason": status_reason
            },
            purchase_id=purchase_id,
            mandate_id=mandate_model.mandate_id if mandate_model else None
        )

        return purchase_model

orchestrator = LangGraphProcurementOrchestrator()
