from typing import List, Optional, Dict, Any
import re
from backend.schemas.procurement_agent import CatalogProduct, ProductComparisonResult

# Seeded Internal Vendor Catalog with approved vendors and prices
INTERNAL_VENDOR_CATALOG: List[CatalogProduct] = [
    # 1. Machine Learning Datasets & AI Training Data
    CatalogProduct(
        product_id="prod_ds_001",
        name="Tabular Financial Market Historical Dataset",
        vendor_name="Kaggle, Inc.",
        vendor_domain="kaggle.com",
        category="datasets_ai",
        price=30.00,
        currency="USD",
        is_approved_vendor=True,
        description="High-frequency verified financial time-series market dataset spanning 10 years.",
        rating=4.9,
        tags=["dataset", "machine learning", "ml", "financial", "tabular", "ai"]
    ),
    CatalogProduct(
        product_id="prod_ds_002",
        name="Computer Vision Annotation Dataset (10k images)",
        vendor_name="Hugging Face, Inc.",
        vendor_domain="huggingface.co",
        category="datasets_ai",
        price=35.00,
        currency="USD",
        is_approved_vendor=True,
        description="Curated, commercially-licensed bounding box annotated image dataset for computer vision tasks.",
        rating=4.95,
        tags=["dataset", "machine learning", "ml", "computer vision", "cv", "images", "ai"]
    ),
    CatalogProduct(
        product_id="prod_ds_003",
        name="NLP Multi-Task Benchmark Corpus",
        vendor_name="Hugging Face, Inc.",
        vendor_domain="huggingface.co",
        category="datasets_ai",
        price=40.00,
        currency="USD",
        is_approved_vendor=True,
        description="Standardized NLP evaluation dataset covering question answering, reasoning and extraction.",
        rating=4.8,
        tags=["dataset", "machine learning", "ml", "nlp", "text", "benchmark", "ai"]
    ),
    CatalogProduct(
        product_id="prod_ds_004",
        name="Enterprise Multi-Lingual Speech Audio Corpus",
        vendor_name="Appen Global",
        vendor_domain="appen.com",
        category="datasets_ai",
        price=120.00,
        currency="USD",
        is_approved_vendor=True,
        description="500 hours of multi-speaker studio recorded audio for automated speech recognition training.",
        rating=4.7,
        tags=["dataset", "machine learning", "ml", "audio", "speech", "enterprise", "ai"]
    ),

    # 2. Software SaaS & Developer Tooling
    CatalogProduct(
        product_id="prod_saas_001",
        name="GitHub Enterprise Copilot 5-Seat Pack",
        vendor_name="GitHub, Inc.",
        vendor_domain="github.com",
        category="software_saas",
        price=190.00,
        currency="USD",
        is_approved_vendor=True,
        description="AI pair-programming license seats with security audit logs and PR summaries.",
        rating=4.9,
        tags=["copilot", "github", "ide", "developer", "saas", "code"]
    ),
    CatalogProduct(
        product_id="prod_saas_002",
        name="Datadog APM Pro Tier (Monthly)",
        vendor_name="Datadog",
        vendor_domain="datadoghq.com",
        category="software_saas",
        price=120.00,
        currency="USD",
        is_approved_vendor=True,
        description="Distributed tracing, telemetry collection and anomaly detection monitoring.",
        rating=4.8,
        tags=["monitoring", "telemetry", "datadog", "apm", "saas"]
    ),
    CatalogProduct(
        product_id="prod_saas_003",
        name="Postman Team Collaboration Workspace (5 users)",
        vendor_name="Postman, Inc.",
        vendor_domain="postman.com",
        category="software_saas",
        price=70.00,
        currency="USD",
        is_approved_vendor=True,
        description="Collaborative API schema design, mocking and contract testing platform.",
        rating=4.75,
        tags=["postman", "api", "testing", "saas", "collaboration"]
    ),

    # 3. Cloud Infrastructure & Compute
    CatalogProduct(
        product_id="prod_cloud_001",
        name="Google Cloud Run & Cloud SQL Starter Pack",
        vendor_name="Google Cloud",
        vendor_domain="cloud.google.com",
        category="cloud_infrastructure",
        price=75.00,
        currency="USD",
        is_approved_vendor=True,
        description="Managed container compute instances and serverless PostgreSQL starter tier.",
        rating=4.85,
        tags=["google cloud", "gcp", "compute", "cloud", "serverless", "sql"]
    ),
    CatalogProduct(
        product_id="prod_cloud_002",
        name="AWS EC2 Spot Compute Reserved Block (100 hrs)",
        vendor_name="Amazon Web Services",
        vendor_domain="aws.amazon.com",
        category="cloud_infrastructure",
        price=85.00,
        currency="USD",
        is_approved_vendor=True,
        description="Fault-tolerant spot compute capacity for batch agent worker jobs.",
        rating=4.8,
        tags=["aws", "ec2", "compute", "cloud", "spot"]
    ),

    # 4. API Credits & Model Tokens
    CatalogProduct(
        product_id="prod_api_001",
        name="Anthropic Claude API Tier-2 Credit Reload",
        vendor_name="Anthropic PBC",
        vendor_domain="anthropic.com",
        category="api_credits",
        price=50.00,
        currency="USD",
        is_approved_vendor=True,
        description="High-throughput inference tokens for Claude 3.5 Sonnet and Haiku.",
        rating=4.9,
        tags=["anthropic", "claude", "api", "llm", "tokens", "credits"]
    ),
    CatalogProduct(
        product_id="prod_api_002",
        name="OpenAI Platform Developer Credit Reload",
        vendor_name="OpenAI, Inc.",
        vendor_domain="openai.com",
        category="api_credits",
        price=50.00,
        currency="USD",
        is_approved_vendor=True,
        description="API credits for GPT-4o, embeddings and audio transcription endpoints.",
        rating=4.85,
        tags=["openai", "gpt-4", "api", "llm", "tokens", "credits"]
    )
]

class VendorCatalogService:
    def __init__(self, catalog: Optional[List[CatalogProduct]] = None):
        self._catalog = catalog or INTERNAL_VENDOR_CATALOG

    def search_catalog(
        self,
        query: str,
        category: Optional[str] = None,
        max_budget: Optional[float] = None,
        vendor_name: Optional[str] = None,
        only_approved: bool = True
    ) -> List[CatalogProduct]:
        """
        Searches internal vendor catalog matching keyword, category, budget and vendor constraints.
        """
        results: List[CatalogProduct] = []
        q_tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]

        for product in self._catalog:
            if only_approved and not product.is_approved_vendor:
                continue

            # Category filter if provided
            if category and category.lower() != "all":
                cat_match = category.lower().replace("-", "_").replace(" ", "_")
                prod_cat = product.category.lower().replace("-", "_").replace(" ", "_")
                if cat_match not in prod_cat and prod_cat not in cat_match:
                    # check semantic category match
                    if not (("dataset" in cat_match or "ml" in cat_match) and "datasets" in prod_cat):
                        continue

            # Vendor filter if provided
            if vendor_name:
                v_clean = vendor_name.lower()
                if v_clean not in product.vendor_name.lower() and v_clean not in product.vendor_domain.lower():
                    continue

            # Budget filter if provided
            if max_budget is not None and product.price > max_budget:
                continue

            # Keyword relevance score
            relevance = 0
            prod_text = f"{product.name} {product.description} {product.vendor_name} {' '.join(product.tags)}".lower()
            for token in q_tokens:
                if token in prod_text:
                    relevance += 1

            if not q_tokens or relevance > 0:
                results.append(product)

        # Sort by rating and relevance
        results.sort(key=lambda p: (p.price, -p.rating))
        return results

    def compare_and_recommend(
        self,
        candidates: List[CatalogProduct],
        user_intent: str,
        max_budget: Optional[float] = None,
        preferred_vendor: Optional[str] = None
    ) -> ProductComparisonResult:
        """
        Evaluates candidate products, validates prices against budget,
        selects the optimal product, and explains why it is recommended.
        """
        if not candidates:
            return ProductComparisonResult(
                recommended_product=None,
                considered_products=[],
                recommendation_reason="No matching verified products found in the internal vendor catalog for the requested specifications.",
                within_budget=False,
                product_verified=False
            )

        # Filter strictly within budget
        affordable = [p for p in candidates if max_budget is None or p.price <= max_budget]

        if not affordable:
            lowest_price_prod = min(candidates, key=lambda p: p.price)
            return ProductComparisonResult(
                recommended_product=None,
                considered_products=candidates,
                recommendation_reason=f"Found {len(candidates)} matching item(s), but all exceed the maximum budget of ${max_budget:.2f}. Lowest priced option was '{lowest_price_prod.name}' at ${lowest_price_prod.price:.2f} {lowest_price_prod.currency}.",
                within_budget=False,
                product_verified=True
            )

        # Prioritize preferred vendor if specified
        if preferred_vendor:
            vendor_matches = [
                p for p in affordable 
                if preferred_vendor.lower() in p.vendor_name.lower() or preferred_vendor.lower() in p.vendor_domain.lower()
            ]
            if vendor_matches:
                chosen = min(vendor_matches, key=lambda p: p.price)
                reason = (
                    f"Selected '{chosen.name}' from requested vendor '{chosen.vendor_name}'. "
                    f"At ${chosen.price:.2f} {chosen.currency}, it fully satisfies user intent and remains strictly "
                    f"within the ${max_budget:.2f} budget cap (Customer rating: {chosen.rating}/5.0)."
                )
                return ProductComparisonResult(
                    recommended_product=chosen,
                    considered_products=candidates,
                    recommendation_reason=reason,
                    within_budget=True,
                    product_verified=True
                )

        # Best value choice (best combination of price within budget and rating)
        chosen = min(affordable, key=lambda p: (p.price / p.rating))
        other_count = len(affordable) - 1
        comp_summary = f"Compared {len(affordable)} qualified catalog option(s). " if other_count > 0 else ""
        reason = (
            f"{comp_summary}Selected '{chosen.name}' from approved vendor '{chosen.vendor_name}' ({chosen.vendor_domain}). "
            f"Priced at ${chosen.price:.2f} {chosen.currency}, offering optimal value within the budget cap "
            f"(Verified approved vendor, quality rating: {chosen.rating}/5.0)."
        )

        return ProductComparisonResult(
            recommended_product=chosen,
            considered_products=candidates,
            recommendation_reason=reason,
            within_budget=True,
            product_verified=True
        )

# Global singleton catalog service
catalog_service = VendorCatalogService()
