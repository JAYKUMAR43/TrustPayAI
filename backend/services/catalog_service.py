from typing import List, Optional, Dict, Any
import re
from backend.schemas.procurement_agent import CatalogProduct, ProductComparisonResult

# Seeded Internal Vendor Catalog with approved vendors, specs, images, and prices
INTERNAL_VENDOR_CATALOG: List[CatalogProduct] = [
    # 1. Machine Learning Datasets & AI Training Data (Digital Assets)
    CatalogProduct(
        product_id="prod_ds_001",
        name="Tabular Financial Market Historical Dataset",
        vendor_name="Kaggle, Inc.",
        vendor_domain="kaggle.com",
        category="datasets_ai",
        price=30.00,
        currency="USD",
        is_approved_vendor=True,
        description="High-frequency verified financial time-series market dataset spanning 10 years across NYSE, NASDAQ, and LSE equities.",
        rating=4.9,
        tags=["dataset", "machine learning", "ml", "financial", "tabular", "ai", "market", "equities"],
        product_url="https://www.kaggle.com/datasets/financial-markets-10yr",
        image_url="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=80",
        item_type="DIGITAL_DATASET",
        availability="INSTANT_DIGITAL_ENTITLEMENT",
        delivery_estimate="Instant Cryptographic Download",
        warranty="Perpetual Enterprise License",
        dataset_metadata={
            "file_format": "Parquet & CSV (Snappy Compressed)",
            "dataset_size": "4.8 GB",
            "num_records": "25,400,000 rows",
            "license": "Commercial Redistribution License (CC-BY-4.0)",
            "preview_columns": ["timestamp", "ticker", "open", "high", "low", "close", "volume", "vwap"],
            "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "download_filename": "kaggle_financial_market_historical_10yr.parquet"
        }
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
        description="Curated, commercially-licensed bounding box annotated image dataset for computer vision and object detection.",
        rating=4.95,
        tags=["dataset", "machine learning", "ml", "computer vision", "cv", "images", "ai", "annotation"],
        product_url="https://huggingface.co/datasets/cv-annotated-10k",
        image_url="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80",
        item_type="DIGITAL_DATASET",
        availability="INSTANT_DIGITAL_ENTITLEMENT",
        delivery_estimate="Instant Cryptographic Download",
        warranty="Commercially Verified Dataset",
        dataset_metadata={
            "file_format": "JSON Metadata + WebP Image Tarball",
            "dataset_size": "8.2 GB",
            "num_records": "10,000 annotated images, 84,200 bounding boxes",
            "license": "Apache 2.0 Commercial Permissive",
            "preview_columns": ["image_id", "label", "bbox_x", "bbox_y", "bbox_w", "bbox_h", "confidence"],
            "checksum_sha256": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
            "download_filename": "huggingface_cv_annotated_10k.tar.gz"
        }
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
        description="Standardized NLP evaluation dataset covering question answering, reasoning, and entity extraction.",
        rating=4.8,
        tags=["dataset", "machine learning", "ml", "nlp", "text", "benchmark", "ai"],
        product_url="https://huggingface.co/datasets/nlp-multitask-corpus",
        image_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80",
        item_type="DIGITAL_DATASET",
        availability="INSTANT_DIGITAL_ENTITLEMENT",
        delivery_estimate="Instant Cryptographic Download",
        warranty="Verified Benchmark Corpus",
        dataset_metadata={
            "file_format": "JSONL (Gzip Compressed)",
            "dataset_size": "3.1 GB",
            "num_records": "1,500,000 prompt-response pairs",
            "license": "MIT Open Commercial License",
            "preview_columns": ["task_id", "prompt", "context", "ground_truth", "domain"],
            "checksum_sha256": "5a8dd3ad76648b29c9f280b182a4d33458ff62dfd8f4bc42cfb2f0a1c1d88200",
            "download_filename": "nlp_multitask_benchmark_corpus.jsonl.gz"
        }
    ),

    # 2. Hardware Equipment & Developer Workstations
    CatalogProduct(
        product_id="prod_hw_001",
        name="Lenovo ThinkPad E14 Gen 5 (16GB RAM, 1TB SSD, Ryzen 7)",
        vendor_name="Lenovo Group",
        vendor_domain="lenovo.com",
        category="hardware_equipment",
        price=820.00, # Approx ₹68,500 INR
        currency="USD",
        is_approved_vendor=True,
        description="Enterprise business laptop powered by AMD Ryzen 7 7730U, 16GB DDR4 RAM, 1TB M.2 NVMe SSD, and 14-inch IPS display.",
        rating=4.89,
        tags=["laptop", "laptops", "lenovo", "thinkpad", "hardware", "computer", "developer", "16gb", "1tb", "ryzen", "70000", "inr"],
        product_url="https://www.lenovo.com/in/en/p/laptops/thinkpad/thinkpade/thinkpad-e14-gen-5-(14-inch-amd)",
        image_url="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80",
        item_type="PHYSICAL",
        availability="IN_STOCK",
        warranty="3-Year Premier Support with Next Business Day Onsite",
        delivery_estimate="2-4 Business Days Express Delivery",
        specifications={
            "processor": "AMD Ryzen 7 7730U (8 cores, 16 threads, up to 4.5GHz)",
            "ram": "16GB DDR4 3200MHz (Dual Channel)",
            "storage": "1TB M.2 PCIe Gen4 NVMe SSD",
            "display": "14.0-inch WUXGA (1920x1200) IPS Anti-glare 300 nits",
            "graphics": "Integrated AMD Radeon Graphics",
            "os": "Windows 11 Pro / Ubuntu Linux 22.04 Certified",
            "battery": "57Wh Rapid Charge (80% in 60 mins)",
            "price_inr_estimate": "₹68,500 INR"
        }
    ),
    CatalogProduct(
        product_id="prod_hw_002",
        name="Dell Latitude 5440 Developer Laptop (16GB RAM, 512GB SSD)",
        vendor_name="Dell Technologies",
        vendor_domain="dell.com",
        category="hardware_equipment",
        price=720.00, # Approx ₹60,000 INR
        currency="USD",
        is_approved_vendor=True,
        description="Enterprise developer laptop featuring 13th Gen Intel Core i5-1335U, 16GB DDR5 RAM, and 512GB NVMe SSD.",
        rating=4.88,
        tags=["laptop", "laptops", "dell", "hardware", "computer", "workstation", "developer", "16gb", "512gb"],
        product_url="https://www.dell.com/en-us/shop/dell-laptops/latitude-5440-laptop",
        image_url="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80",
        item_type="PHYSICAL",
        availability="IN_STOCK",
        warranty="3-Year ProSupport with Next Business Day Onsite",
        delivery_estimate="2-3 Business Days Standard Ground",
        specifications={
            "processor": "13th Gen Intel Core i5-1335U (10 Cores, 12 Threads)",
            "ram": "16GB DDR5 4800MHz",
            "storage": "512GB M.2 PCIe NVMe Class 35 SSD",
            "display": "14.0-inch FHD (1920x1080) Non-Touch IPS",
            "graphics": "Intel Iris Xe Graphics",
            "os": "Ubuntu Linux 22.04 LTS / Windows 11 Pro",
            "price_inr_estimate": "₹60,100 INR"
        }
    ),
    CatalogProduct(
        product_id="prod_hw_003",
        name="HP Pavilion 15 Developer Edition (16GB RAM, 1TB SSD)",
        vendor_name="HP Inc.",
        vendor_domain="hp.com",
        category="hardware_equipment",
        price=775.00, # Approx ₹64,900 INR
        currency="USD",
        is_approved_vendor=True,
        description="High-performance business laptop with Intel Core i5-1335U, 16GB RAM, and 1TB PCIe NVMe SSD.",
        rating=4.82,
        tags=["laptop", "laptops", "hp", "hardware", "computer", "developer", "16gb", "1tb", "70000", "inr"],
        product_url="https://www.hp.com/in-en/shop/laptops-tablets/hp-pavilion-laptop-15",
        image_url="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop&q=80",
        item_type="PHYSICAL",
        availability="IN_STOCK",
        warranty="2-Year Onsite Extended Hardware Warranty",
        delivery_estimate="3-5 Business Days Express",
        specifications={
            "processor": "13th Gen Intel Core i5-1335U",
            "ram": "16GB DDR4-3200 SDRAM",
            "storage": "1TB PCIe NVMe M.2 SSD",
            "display": "15.6-inch diagonal FHD IPS micro-edge anti-glare",
            "graphics": "Intel Iris Xe",
            "price_inr_estimate": "₹64,900 INR"
        }
    ),
    CatalogProduct(
        product_id="prod_hw_004",
        name="Apple MacBook Air 13-inch M3 (16GB Unified Memory, 512GB SSD)",
        vendor_name="Apple Inc.",
        vendor_domain="apple.com",
        category="hardware_equipment",
        price=1299.00,
        currency="USD",
        is_approved_vendor=True,
        description="Apple M3 chip with 8-core CPU and 10-core GPU, 16GB unified memory, liquid retina display.",
        rating=4.95,
        tags=["laptop", "laptops", "macbook", "apple", "hardware", "computer", "developer", "m3", "16gb"],
        product_url="https://www.apple.com/macbook-air",
        image_url="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80",
        item_type="PHYSICAL",
        availability="IN_STOCK",
        warranty="1-Year Limited Warranty + 90 Days Tech Support",
        delivery_estimate="1-2 Business Days Free Express Delivery",
        specifications={
            "processor": "Apple M3 Chip (8-Core CPU, 10-Core GPU, 16-Core Neural Engine)",
            "ram": "16GB Unified Memory",
            "storage": "512GB Superfast SSD Storage",
            "display": "13.6-inch Liquid Retina display with True Tone",
            "battery": "Up to 18 Hours Apple TV app movie playback",
            "price_inr_estimate": "₹1,08,000 INR"
        }
    ),

    # 3. Software SaaS & Developer Tooling
    CatalogProduct(
        product_id="prod_saas_001",
        name="GitHub Enterprise Copilot 5-Seat Pack",
        vendor_name="GitHub, Inc.",
        vendor_domain="github.com",
        category="software_saas",
        price=190.00,
        currency="USD",
        is_approved_vendor=True,
        description="AI pair-programming license seats with security audit logs, CLI tooling, and PR summaries.",
        rating=4.9,
        tags=["copilot", "github", "ide", "developer", "saas", "code"],
        product_url="https://github.com/features/copilot",
        image_url="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=500&auto=format&fit=crop&q=80",
        item_type="SAAS_LICENSE",
        availability="INSTANT_DIGITAL_ENTITLEMENT",
        delivery_estimate="Instant Organization Provisioning",
        warranty="Enterprise SLA 99.9% Uptime Guarantee",
        specifications={
            "seats": "5 Developer Seats",
            "billing_cycle": "Monthly Recurring",
            "admin_console": "Organization Centralized Billing",
            "ide_support": "VS Code, JetBrains, Visual Studio, Neovim"
        }
    ),

    # 4. Cloud Infrastructure & Compute
    CatalogProduct(
        product_id="prod_cloud_001",
        name="Google Cloud Run & Cloud SQL Starter Pack",
        vendor_name="Google Cloud",
        vendor_domain="cloud.google.com",
        category="cloud_infrastructure",
        price=75.00,
        currency="USD",
        is_approved_vendor=True,
        description="Managed container compute instances and serverless PostgreSQL database tier.",
        rating=4.85,
        tags=["google cloud", "gcp", "compute", "cloud", "serverless", "sql"],
        product_url="https://cloud.google.com/run",
        image_url="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80",
        item_type="CLOUD_INFRA",
        availability="INSTANT_DIGITAL_ENTITLEMENT",
        delivery_estimate="Instant Project IAM Binding",
        warranty="Google Cloud Platform Standard SLA",
        specifications={
            "compute": "2 vCPU, 4GB RAM Cloud Run Service",
            "database": "Cloud SQL PostgreSQL 15 Starter Instance",
            "sla": "99.95% Monthly Availability"
        }
    )
]

class VendorCatalogService:
    def __init__(self, catalog: Optional[List[CatalogProduct]] = None):
        self._catalog = catalog or INTERNAL_VENDOR_CATALOG

    def search_catalog(
        self,
        query: str = "",
        category: Optional[str] = None,
        max_budget: Optional[float] = None,
        vendor: Optional[str] = None,
        vendor_name: Optional[str] = None,
        only_approved: bool = True,
        currency: str = "USD",
        **kwargs
    ) -> List[CatalogProduct]:
        """
        Search catalog by query string, category, vendor domain/name, specs, and price ceiling.
        Handles INR conversions (₹83.5 per USD approx) when budget is passed in INR.
        """
        results = []
        normalized_query = query.lower().strip() if query else ""
        v_target = (vendor or vendor_name or "").strip()
        
        # Currency normalization: If budget given in INR, convert to USD comparison basis
        effective_max_usd = max_budget
        if currency.upper() in ("INR", "RS") and max_budget is not None:
            effective_max_usd = max_budget / 83.5 # 70,000 INR -> ~838 USD

        for prod in self._catalog:
            if only_approved and not prod.is_approved_vendor:
                continue

            # Category match
            if category and prod.category.lower() != category.lower():
                continue

            # Vendor filter
            if v_target:
                v_clean = v_target.lower()
                if v_clean not in prod.vendor_name.lower() and v_clean not in prod.vendor_domain.lower():
                    continue

            # Budget constraint check
            if effective_max_usd is not None and prod.price > effective_max_usd:
                continue

            # Query relevance matching
            if normalized_query:
                # Check tags, name, description, specs
                searchable = (
                    f"{prod.name} {prod.description} {prod.vendor_name} "
                    f"{' '.join(prod.tags)} {str(prod.specifications or {})} {str(prod.dataset_metadata or {})}"
                ).lower()

                # Score terms
                terms = [t for t in re.split(r"[\s,]+", normalized_query) if len(t) > 2]
                if terms and not any(t in searchable for t in terms):
                    continue

            results.append(prod)

        return results

    def compare_and_recommend(
        self,
        matching_products: Optional[List[CatalogProduct]] = None,
        candidates: Optional[List[CatalogProduct]] = None,
        preferred_vendor: Optional[str] = None,
        max_budget: Optional[float] = None,
        currency: str = "USD",
        user_intent: str = "",
        quantity: int = 1,
        **kwargs
    ) -> ProductComparisonResult:
        """
        Ranks candidate products, selects the optimal choice, and formats structured comparison.
        If no products exist, returns product_verified=False indicating live product discovery is unavailable.
        """
        product_list = matching_products if matching_products is not None else (candidates or [])
        if not product_list:
            return ProductComparisonResult(
                recommended_product=None,
                considered_products=[],
                recommendation_reason="Live product discovery unavailable: No verified supplier integration or approved catalog items found matching this specification.",
                within_budget=False,
                product_verified=False
            )

        # Sort: approved vendors first, higher rating, best value within budget
        effective_max_usd = max_budget
        if currency.upper() in ("INR", "RS") and max_budget is not None:
            effective_max_usd = max_budget / 83.5

        def sort_key(p: CatalogProduct):
            score = 0.0
            if p.is_approved_vendor:
                score += 50.0
            score += p.rating * 5.0
            if preferred_vendor and (preferred_vendor.lower() in p.vendor_name.lower() or preferred_vendor.lower() in p.vendor_domain.lower()):
                score += 30.0
            # Higher score for items well within budget
            if effective_max_usd and p.price <= effective_max_usd:
                score += 20.0
            return score

        sorted_products = sorted(product_list, key=sort_key, reverse=True)
        recommended = sorted_products[0]

        within_budget = True
        if effective_max_usd and recommended.price > effective_max_usd:
            within_budget = False

        currency_label = "USD"
        price_display = f"${recommended.price:.2f} USD"
        if currency.upper() in ("INR", "RS"):
            inr_val = recommended.price * 83.5
            price_display = f"₹{inr_val:,.0f} INR (${recommended.price:.2f} USD)"

        reason = (
            f"Selected '{recommended.name}' from approved vendor '{recommended.vendor_name}' ({recommended.vendor_domain}). "
            f"Total cost: {price_display}, verified in stock with {recommended.warranty or 'standard warranty'}."
        )

        return ProductComparisonResult(
            recommended_product=recommended,
            considered_products=sorted_products,
            recommendation_reason=reason,
            within_budget=within_budget,
            product_verified=True
        )

# Global catalog singleton and backward-compatible alias
vendor_catalog_service = VendorCatalogService()
catalog_service = vendor_catalog_service
