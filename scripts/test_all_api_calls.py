import httpx
import json

BASE_URL = "https://trustpayai.onrender.com"
ORIGIN = "https://trust-pay-ai-five.vercel.app"

tests = [
    # System & Health
    ("Health Check", "GET", "/api/health", None),
    ("Root Health", "GET", "/health", None),
    ("Dashboard Stats", "GET", "/api/dashboard/stats", None),
    
    # Procurement & History
    ("Procurement Scenarios", "GET", "/api/procurement/scenarios", None),
    ("Procurement Catalog", "GET", "/api/procurement/catalog", None),
    ("Procurement History Alias", "GET", "/api/procurement/history", None),
    ("Procurement Requests (Paginated)", "GET", "/api/procurement/requests?skip=0&limit=10", None),
    ("Parse Prompt", "POST", "/api/procurement/parse-prompt", {"prompt": "Buy 1 laptop under 1000"}),
    ("Agent Autonomous Process", "POST", "/api/procurement/agent/process", {"prompt": "Buy 1 laptop under 1000"}),
    
    # Agents
    ("Fetch Agents", "GET", "/api/agents", None),
    
    # Policies
    ("Fetch Policies", "GET", "/api/policies", None),
    
    # Transactions
    ("Fetch Transactions", "GET", "/api/transactions?skip=0&limit=10", None),
    
    # Risk Events
    ("Fetch Risk Events", "GET", "/api/risk-events?skip=0&limit=10", None),
    ("Fetch Risk Metrics", "GET", "/api/risk/metrics", None),
    
    # Audit Logs
    ("Fetch Audit Logs", "GET", "/api/audit/logs?skip=0&limit=10", None),
    ("Verify Audit Chain", "GET", "/api/audit/verify", None),
    
    # MCP
    ("Fetch MCP Tools", "GET", "/api/mcp/tools", None),
    ("Fetch MCP Logs", "GET", "/api/mcp/logs", None),
    
    # Organizations
    ("Fetch Organizations", "GET", "/api/organizations", None),
    ("Fetch Current Organization", "GET", "/api/organizations/current", None),
    
    # Auth & Multi-tenant (New)
    ("Auth Me", "GET", "/api/auth/me", None),
    ("Auth Payment Modes", "GET", "/api/auth/payment-modes", None),
    ("Auth Members", "GET", "/api/auth/members", None),
    
    # PayPal Webhook
    ("PayPal Webhook Status", "GET", "/api/webhooks/paypal/status", None),
]

results = []

with httpx.Client(timeout=15.0) as client:
    for name, method, path, payload in tests:
        url = f"{BASE_URL}{path}"
        headers = {
            "Origin": ORIGIN,
            "Accept": "application/json"
        }
        if payload:
            headers["Content-Type"] = "application/json"
            
        try:
            if method == "GET":
                res = client.get(url, headers=headers)
            elif method == "POST":
                res = client.post(url, headers=headers, json=payload)
            elif method == "OPTIONS":
                res = client.options(url, headers=headers)
                
            status = res.status_code
            error_preview = ""
            if status >= 400:
                try:
                    error_preview = json.dumps(res.json())[:150]
                except Exception:
                    error_preview = res.text[:150]
            results.append({
                "name": name,
                "method": method,
                "path": path,
                "status": status,
                "error": error_preview
            })
            print(f"[{status}] {method} {path} - {name} {error_preview}")
        except Exception as e:
            results.append({
                "name": name,
                "method": method,
                "path": path,
                "status": "EXCEPTION",
                "error": str(e)
            })
            print(f"[ERR] {method} {path} - {name}: {e}")

with open("scripts/audit_results.json", "w") as f:
    json.dump(results, f, indent=2)
