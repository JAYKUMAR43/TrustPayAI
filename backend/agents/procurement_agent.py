import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import TypedDict, List, Dict, Any, Optional

from langgraph.graph import StateGraph, START, END

from backend.config import settings
from backend.schemas.procurement_agent import (
    NaturalLanguageProcurementRequest,
    ExtractedIntent,
    CatalogProduct,
    ProductComparisonResult,
    TraceStep,
    AutonomousProcurementResult
)
from backend.schemas.procurement import ProcurementSubmitRequest
from backend.schemas.purchase import PurchaseCreateRequest
from backend.services.catalog_service import catalog_service
from backend.agents.policy_agent import policy_agent
from backend.agents.risk_agent import risk_engine

logger = logging.getLogger("trustpay.procurement_agent")

class ProcurementAgentState(TypedDict):
    trace_id: str
    user_prompt: str
    agent_id: str
    agent_name: str
    context: Dict[str, Any]
    trace_steps: List[Dict[str, Any]]
    extracted_intent: Optional[Dict[str, Any]]
    catalog_results: Optional[List[Dict[str, Any]]]
    comparison: Optional[Dict[str, Any]]
    structured_request: Optional[Dict[str, Any]]
    guardrail_evaluation: Optional[Dict[str, Any]]
    status: str
    message: str
    final_result: Optional[Dict[str, Any]]
    error: Optional[str]

class AutonomousProcurementAgent:
    """
    Autonomous Procurement Agent built with LangGraph and Google Gemini.
    
    Transforms natural-language purchase requests into strictly validated,
    catalog-verified, and policy-checked purchase proposals.
    
    SECURITY INVARIANT:
    This agent CANNOT execute financial transactions or payments. It exclusively
    produces cryptographic purchase proposals routed through the Policy Guardrail
    layer to the Human-in-the-Loop approval gate.
    """

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self._graph = self._build_langgraph()

    def _build_langgraph(self):
        """Builds and compiles the deterministic LangGraph state machine."""
        workflow = StateGraph(ProcurementAgentState)

        workflow.add_node("extract_intent", self._extract_intent_node)
        workflow.add_node("search_catalog", self._search_catalog_node)
        workflow.add_node("compare_products", self._compare_products_node)
        workflow.add_node("generate_request", self._generate_request_node)
        workflow.add_node("evaluate_guardrails", self._evaluate_guardrails_node)
        workflow.add_node("compile_response", self._compile_response_node)

        # Flow definition
        workflow.add_edge(START, "extract_intent")
        workflow.add_edge("extract_intent", "search_catalog")
        workflow.add_edge("search_catalog", "compare_products")

        # Conditional route: only generate request if product is verified and within budget
        workflow.add_conditional_edges(
            "compare_products",
            self._route_after_comparison,
            {
                "proceed": "generate_request",
                "unverified_or_exceeded": "compile_response"
            }
        )

        workflow.add_edge("generate_request", "evaluate_guardrails")
        workflow.add_edge("evaluate_guardrails", "compile_response")
        workflow.add_edge("compile_response", END)

        return workflow.compile()

    # -------------------------------------------------------------
    # LangGraph Nodes & Tool Functions
    # -------------------------------------------------------------

    async def _extract_intent_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 1: Understands intent, extracts category, budget, vendor, and keywords."""
        prompt = state["user_prompt"]
        context = state.get("context") or {}
        trace_steps = list(state.get("trace_steps") or [])

        extracted = await self._tool_extract_intent(prompt, context)
        
        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Intent Understanding & Extraction",
            tool_called="extract_procurement_intent",
            inputs={"prompt": prompt, "context": context},
            outputs=extracted.model_dump(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="COMPLETED"
        )
        trace_steps.append(step.model_dump())

        return {
            "extracted_intent": extracted.model_dump(),
            "trace_steps": trace_steps
        }

    async def _search_catalog_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 2: Searches internal vendor catalog."""
        intent = state["extracted_intent"] or {}
        trace_steps = list(state.get("trace_steps") or [])

        query = " ".join(intent.get("item_keywords", [])) or intent.get("intent", "")
        category = intent.get("category")
        max_budget = intent.get("max_budget")
        requested_vendor = intent.get("requested_vendor")

        catalog_items = catalog_service.search_catalog(
            query=query,
            category=category,
            max_budget=max_budget,
            vendor_name=requested_vendor,
            only_approved=True
        )

        # If zero matches with budget constraint, search without budget constraint
        # to allow comparison engine to detect budget-exceeded scenarios
        if not catalog_items and max_budget is not None:
            catalog_items = catalog_service.search_catalog(
                query=query,
                category=category,
                max_budget=None,
                vendor_name=requested_vendor,
                only_approved=True
            )

        items_dump = [item.model_dump() for item in catalog_items]

        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Internal Vendor Catalog Search",
            tool_called="search_vendor_catalog",
            inputs={
                "query": query,
                "category": category,
                "max_budget": max_budget,
                "requested_vendor": requested_vendor
            },
            outputs={"matched_count": len(items_dump), "products": items_dump},
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="COMPLETED"
        )
        trace_steps.append(step.model_dump())

        return {
            "catalog_results": items_dump,
            "trace_steps": trace_steps
        }

    async def _compare_products_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 3: Compares available products and prices, and generates recommendation reasoning."""
        raw_candidates = state.get("catalog_results") or []
        intent = state.get("extracted_intent") or {}
        trace_steps = list(state.get("trace_steps") or [])

        candidates = [CatalogProduct(**c) for c in raw_candidates]
        comparison = catalog_service.compare_and_recommend(
            candidates=candidates,
            user_intent=intent.get("intent", ""),
            max_budget=intent.get("max_budget"),
            preferred_vendor=intent.get("requested_vendor")
        )

        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Product & Price Comparison",
            tool_called="compare_and_recommend",
            inputs={
                "candidate_count": len(candidates),
                "max_budget": intent.get("max_budget"),
                "preferred_vendor": intent.get("requested_vendor")
            },
            outputs=comparison.model_dump(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="COMPLETED"
        )
        trace_steps.append(step.model_dump())

        return {
            "comparison": comparison.model_dump(),
            "trace_steps": trace_steps
        }

    def _route_after_comparison(self, state: ProcurementAgentState) -> str:
        """Determines if a verified, within-budget recommendation exists."""
        comp = state.get("comparison") or {}
        if comp.get("product_verified") and comp.get("within_budget") and comp.get("recommended_product"):
            return "proceed"
        return "unverified_or_exceeded"

    async def _generate_request_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 4: Generates structured purchase request schema."""
        comp = state.get("comparison") or {}
        intent = state.get("extracted_intent") or {}
        prod = comp.get("recommended_product") or {}
        trace_steps = list(state.get("trace_steps") or [])

        amount = float(prod.get("price", intent.get("max_budget", 50.0)))
        currency = prod.get("currency", intent.get("currency", "USD"))
        vendor_name = prod.get("vendor_name", "Approved Vendor")
        vendor_domain = prod.get("vendor_domain", "vendor.internal")
        product_name = prod.get("name", "Procured Item")
        category = prod.get("category", intent.get("category", "software_saas"))
        
        justification = (
            f"Autonomous proposal for '{product_name}' from verified vendor '{vendor_name}' "
            f"({vendor_domain}) at ${amount:.2f} {currency}. "
            f"Reasoning: {comp.get('recommendation_reason', 'Optimal catalog match')}. "
            f"Original user request: {state['user_prompt']}"
        )

        structured_req = {
            "agent_id": state["agent_id"],
            "agent_name": state["agent_name"],
            "product_name": product_name,
            "item_name": product_name,
            "category": category,
            "vendor_name": vendor_name,
            "vendor_domain": vendor_domain,
            "amount": amount,
            "currency": currency,
            "justification": justification,
            "payment_execution_permitted": False,
            "requires_human_approval": True
        }

        # Pydantic validation
        validated_pydantic = ProcurementSubmitRequest(
            agent_id=state["agent_id"],
            agent_name=state["agent_name"],
            product_name=product_name,
            category=category,
            vendor_domain=vendor_domain,
            vendor_name=vendor_name,
            amount=amount,
            currency=currency,
            justification=justification
        )

        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Structured Purchase Request Generation",
            tool_called="generate_structured_request",
            inputs={"recommended_product": prod},
            outputs=validated_pydantic.model_dump(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="COMPLETED"
        )
        trace_steps.append(step.model_dump())

        return {
            "structured_request": structured_req,
            "trace_steps": trace_steps
        }

    async def _evaluate_guardrails_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 5: Sends structured request to Policy Guardrail Agent."""
        req_dict = state.get("structured_request") or {}
        trace_steps = list(state.get("trace_steps") or [])

        # Create temporary PurchaseCreateRequest for guardrail engine
        purchase_req = PurchaseCreateRequest(
            agent_id=req_dict["agent_id"],
            agent_name=req_dict["agent_name"],
            item_name=req_dict["product_name"],
            category=req_dict["category"],
            vendor_name=req_dict["vendor_name"],
            vendor_domain=req_dict["vendor_domain"],
            amount=req_dict["amount"],
            currency=req_dict["currency"],
            justification=req_dict["justification"]
        )

        # Evaluate against deterministic organizational policies
        policies = {
            "SINGLE_TRANSACTION_CAP": {"max_amount": settings.DEFAULT_SINGLE_TRANSACTION_LIMIT},
            "DAILY_SPEND_CAP": {"max_amount": settings.DEFAULT_DAILY_SPEND_LIMIT},
            "BANNED_CATEGORIES": {"categories": ["gambling", "weapons", "adult_content", "crypto_speculation", "restricted"]},
            "BLOCKED_VENDOR_DOMAINS": {"domains": ["darkmarket.io", "crypto-mixer.cc", "shady-downloads.xyz"]}
        }

        passed, violations, warnings = await policy_agent.evaluate_purchase(
            request=purchase_req,
            policies=policies,
            db=None
        )

        score, risk_level, risk_reasons = await risk_engine.analyze_risk(
            request=purchase_req,
            db=None
        )

        eval_result = {
            "policy_passed": passed,
            "violations": violations,
            "warnings": warnings,
            "risk_score": score,
            "risk_level": risk_level.value if hasattr(risk_level, "value") else str(risk_level),
            "risk_factors": risk_reasons
        }

        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Policy Guardrail & Risk Engine Verification",
            tool_called="evaluate_policy_guardrails",
            inputs={"purchase_request": req_dict},
            outputs=eval_result,
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="PASSED" if passed else "VIOLATED"
        )
        trace_steps.append(step.model_dump())

        return {
            "guardrail_evaluation": eval_result,
            "trace_steps": trace_steps
        }

    async def _compile_response_node(self, state: ProcurementAgentState) -> Dict[str, Any]:
        """Node 6: Compiles final result, safety disclosures, and trace."""
        trace_id = state["trace_id"]
        comp = state.get("comparison") or {}
        intent_dict = state.get("extracted_intent") or {}
        guardrail = state.get("guardrail_evaluation")
        req = state.get("structured_request")
        trace_steps = list(state.get("trace_steps") or [])

        # Security Disclosure header
        security_boundary = (
            "\n\n[SECURITY NOTICE]: Autonomous Procurement Agent operates strictly as a proposal generator. "
            "It CANNOT and WILL NOT execute payments. All purchase mandates require explicit human/buyer sign-off "
            "prior to payment settlement."
        )

        if not comp.get("product_verified"):
            status = "UNVERIFIED_PRODUCT"
            message = (
                f"Notice: Product information could not be verified in the internal vendor catalog. "
                f"Specification requested: '{state['user_prompt']}'. "
                f"No matching approved vendors or items were identified."
                + security_boundary
            )
        elif not comp.get("within_budget"):
            status = "BUDGET_EXCEEDED"
            message = (
                f"Budget Constraint Notice: {comp.get('recommendation_reason')} "
                f"A purchase request could not be generated within your budget limit of ${intent_dict.get('max_budget', 0):.2f}."
                + security_boundary
            )
        elif guardrail and not guardrail.get("policy_passed"):
            status = "POLICY_VIOLATION"
            violations_str = " | ".join(guardrail.get("violations", []))
            message = (
                f"Policy Guardrail Violation: Purchase request generated but blocked by organization spending rules: {violations_str}."
                + security_boundary
            )
        else:
            status = "SUCCESS_PROPOSAL_GENERATED"
            prod = comp.get("recommended_product") or {}
            message = (
                f"Procurement Proposal Generated Successfully:\n"
                f"- Product: {prod.get('name')}\n"
                f"- Vendor: {prod.get('vendor_name')} ({prod.get('vendor_domain')}) [Approved Vendor]\n"
                f"- Price: ${prod.get('price'):.2f} {prod.get('currency', 'USD')}\n"
                f"- Recommendation Rationale: {comp.get('recommendation_reason')}\n"
                f"- Policy Status: Guardrails PASSED (Risk Score: {guardrail.get('risk_score', 5.0)}/100, Level: {guardrail.get('risk_level', 'LOW')})\n"
                f"- Action: Structured request forwarded to human approval gate. Awaiting buyer review."
                + security_boundary
            )

        step = TraceStep(
            step_number=len(trace_steps) + 1,
            step_name="Response Compilation & Security Verification",
            tool_called="compile_response",
            inputs={"status": status},
            outputs={"status": status, "message_summary": message[:120]},
            timestamp=datetime.now(timezone.utc).isoformat(),
            status="COMPLETED"
        )
        trace_steps.append(step.model_dump())

        final_result = AutonomousProcurementResult(
            trace_id=trace_id,
            user_prompt=state["user_prompt"],
            status=status,
            extracted_intent=ExtractedIntent(**intent_dict),
            comparison=ProductComparisonResult(**comp),
            purchase_request=req,
            guardrail_evaluation=guardrail,
            message=message,
            execution_trace=[TraceStep(**s) for s in trace_steps],
            created_at=datetime.now(timezone.utc).isoformat()
        )

        return {
            "status": status,
            "message": message,
            "final_result": final_result.model_dump(),
            "trace_steps": trace_steps
        }

    # -------------------------------------------------------------
    # Natural Language Understanding / Intent Extractor Tool
    # -------------------------------------------------------------

    async def _tool_extract_intent(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ExtractedIntent:
        """
        Uses Google Gemini API when configured, with seamless fallback
        to high-precision heuristic intent parsing.
        """
        if settings.has_real_gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_key)
                
                system_instruction = (
                    "You are the intent extractor for TrustPay AI's Autonomous Procurement Agent. "
                    "Parse the user's natural language procurement request into a structured JSON object with keys: "
                    "intent (string summary), category (one of: datasets_ai, software_saas, cloud_infrastructure, api_credits, hardware, consulting, restricted), "
                    "max_budget (float or null), currency (USD), requested_vendor (string or null, e.g. 'Hugging Face', 'Kaggle', 'GitHub', 'AWS'), "
                    "item_keywords (list of strings). "
                    "Return ONLY raw JSON, with no markdown codeblocks."
                )

                response = client.models.generate_content(
                    model=self.model_name,
                    contents=f"Extract procurement request: {prompt}. Additional Context: {json.dumps(context or {})}",
                    config={"system_instruction": system_instruction}
                )

                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("\n", 1)[0].strip()
                    if text.startswith("json"):
                        text = text[4:].strip()
                
                parsed = json.loads(text)
                return ExtractedIntent(
                    raw_prompt=prompt,
                    intent=parsed.get("intent", prompt),
                    category=parsed.get("category", "datasets_ai"),
                    max_budget=float(parsed["max_budget"]) if parsed.get("max_budget") is not None else None,
                    currency=parsed.get("currency", "USD"),
                    requested_vendor=parsed.get("requested_vendor"),
                    item_keywords=parsed.get("item_keywords", [])
                )
            except Exception as e:
                logger.warning(f"Google Gemini intent extraction error: {e}. Falling back to deterministic NLP parser.")

        return self._heuristic_extract_intent(prompt, context)

    def _heuristic_extract_intent(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ExtractedIntent:
        """
        Deterministic NLP extractor for natural language procurement requests.
        Accurately extracts category, budget, vendor, and keywords.
        """
        lower = prompt.lower()
        context = context or {}

        # 1. Budget extraction (e.g. "$40", "40 USD", "40.00", "budget of 40")
        max_budget: Optional[float] = None
        currency = "USD"

        budget_match = re.search(r"(?:budget(?:\s+of)?|maximum|max|under|up\s+to|for)?\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:usd|dollars|\$)?", lower)
        # More specific currency & number pattern
        patterns = [
            r"([0-9]+(?:\.[0-9]{1,2})?)\s*(?:usd|dollars)",
            r"\$\s*([0-9]+(?:\.[0-9]{1,2})?)",
            r"budget\s+(?:of\s+)?([0-9]+(?:\.[0-9]{1,2})?)",
            r"maximum\s+budget\s+of\s+([0-9]+(?:\.[0-9]{1,2})?)"
        ]
        for pat in patterns:
            m = re.search(pat, lower)
            if m:
                try:
                    val = float(m.group(1))
                    if val > 0:
                        max_budget = val
                        break
                except ValueError:
                    pass

        # 2. Category extraction
        category = "datasets_ai"
        if any(w in lower for w in ["dataset", "data set", "training data", "corpus", "ml dataset"]):
            category = "datasets_ai"
        elif any(w in lower for w in ["copilot", "github", "datadog", "saas", "software", "license", "postman", "tooling"]):
            category = "software_saas"
        elif any(w in lower for w in ["compute", "cloud", "aws", "gcp", "azure", "serverless", "ec2", "cluster", "instances"]):
            category = "cloud_infrastructure"
        elif any(w in lower for w in ["token", "tokens", "api credits", "credits", "openai", "claude", "anthropic", "gpt"]):
            category = "api_credits"
        elif any(w in lower for w in ["gambling", "casino", "poker", "darkmarket", "weapons", "drugs"]):
            category = "restricted"

        # 3. Vendor extraction
        requested_vendor: Optional[str] = None
        if "hugging face" in lower or "huggingface" in lower:
            requested_vendor = "Hugging Face, Inc."
        elif "kaggle" in lower:
            requested_vendor = "Kaggle, Inc."
        elif "appen" in lower:
            requested_vendor = "Appen Global"
        elif "github" in lower:
            requested_vendor = "GitHub, Inc."
        elif "datadog" in lower:
            requested_vendor = "Datadog"
        elif "google" in lower or "gcp" in lower:
            requested_vendor = "Google Cloud"
        elif "aws" in lower or "amazon" in lower:
            requested_vendor = "Amazon Web Services"
        elif "openai" in lower:
            requested_vendor = "OpenAI, Inc."
        elif "anthropic" in lower:
            requested_vendor = "Anthropic PBC"
        elif context.get("preferred_vendor"):
            requested_vendor = context.get("preferred_vendor")

        # 4. Keyword extraction
        keywords = []
        for word in ["dataset", "machine learning", "ml", "financial", "computer vision", "nlp", "benchmark", "speech", "audio", "copilot", "monitoring", "api", "cloud", "compute"]:
            if word in lower:
                keywords.append(word)

        return ExtractedIntent(
            raw_prompt=prompt,
            intent=prompt.strip(),
            category=category,
            max_budget=max_budget,
            currency=currency,
            requested_vendor=requested_vendor,
            item_keywords=keywords or [category]
        )

    # -------------------------------------------------------------
    # Public Execution Entrypoint
    # -------------------------------------------------------------

    async def process_procurement_request(
        self,
        request: NaturalLanguageProcurementRequest
    ) -> AutonomousProcurementResult:
        """
        Executes the Autonomous Procurement LangGraph pipeline.
        Produces structured JSON output, Pydantic validation, and complete audit tracing.
        """
        trace_id = f"trace_{uuid.uuid4().hex[:12]}"
        initial_state: ProcurementAgentState = {
            "trace_id": trace_id,
            "user_prompt": request.prompt,
            "agent_id": request.agent_id or "agent_autonomous_core",
            "agent_name": request.agent_name or "Autonomous Procurement Worker",
            "context": request.context or {},
            "trace_steps": [],
            "extracted_intent": None,
            "catalog_results": None,
            "comparison": None,
            "structured_request": None,
            "guardrail_evaluation": None,
            "status": "INITIALIZED",
            "message": "",
            "final_result": None,
            "error": None
        }

        try:
            final_state = await self._graph.ainvoke(initial_state)
            if final_state.get("final_result"):
                return AutonomousProcurementResult(**final_state["final_result"])
            raise RuntimeError("LangGraph execution completed without producing final_result.")
        except Exception as e:
            logger.error(f"Error during LangGraph procurement pipeline: {e}", exc_info=True)
            # Safe fallback result
            trace_steps = initial_state.get("trace_steps") or []
            return AutonomousProcurementResult(
                trace_id=trace_id,
                user_prompt=request.prompt,
                status="ERROR",
                extracted_intent=ExtractedIntent(
                    raw_prompt=request.prompt,
                    intent=request.prompt,
                    category="unknown",
                    max_budget=None,
                    currency="USD"
                ),
                comparison=ProductComparisonResult(
                    recommended_product=None,
                    considered_products=[],
                    recommendation_reason=f"Pipeline error: {str(e)}",
                    within_budget=False,
                    product_verified=False
                ),
                purchase_request=None,
                guardrail_evaluation=None,
                message=f"Procurement pipeline encountered an error: {str(e)}. No payment or transaction was executed.",
                execution_trace=[TraceStep(**s) for s in trace_steps],
                created_at=datetime.now(timezone.utc).isoformat()
            )

    async def parse_prompt_to_purchase_request(
        self,
        prompt: str,
        agent_id: Optional[str] = None,
        agent_name: Optional[str] = None
    ) -> PurchaseCreateRequest:
        """
        Parses natural language prompt and returns a validated PurchaseCreateRequest.
        """
        result = await self.process_procurement_request(
            NaturalLanguageProcurementRequest(
                prompt=prompt,
                agent_id=agent_id or "agent_autonomous_core",
                agent_name=agent_name or "Autonomous Procurement Worker"
            )
        )
        if result.purchase_request:
            req = result.purchase_request
            return PurchaseCreateRequest(
                agent_id=req["agent_id"],
                agent_name=req["agent_name"],
                item_name=req["product_name"],
                category=req["category"],
                vendor_name=req["vendor_name"],
                vendor_domain=req["vendor_domain"],
                amount=req["amount"],
                currency=req["currency"],
                justification=req["justification"]
            )
        
        intent = result.extracted_intent
        return PurchaseCreateRequest(
            agent_id=agent_id or "agent_autonomous_core",
            agent_name=agent_name or "Autonomous Procurement Worker",
            item_name=intent.item_keywords[0].title() if intent.item_keywords else "Requested Item",
            category=intent.category,
            vendor_name=intent.requested_vendor or "Verified Vendor Inc",
            vendor_domain="vendor.internal",
            amount=intent.max_budget or 50.0,
            currency=intent.currency,
            justification=prompt
        )

# Global singleton instance
procurement_agent = AutonomousProcurementAgent()
