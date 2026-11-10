import httpx
import time

def check_deployment():
    endpoints = [
        ("Root Health", "GET", "https://trustpayai.onrender.com/health"),
        ("API Health", "GET", "https://trustpayai.onrender.com/api/health"),
        ("Dashboard Stats", "GET", "https://trustpayai.onrender.com/api/dashboard/stats"),
        ("Procurement History", "GET", "https://trustpayai.onrender.com/api/procurement/history"),
        ("Procurement Requests", "GET", "https://trustpayai.onrender.com/api/procurement/requests?skip=0&limit=10"),
        ("Policies", "GET", "https://trustpayai.onrender.com/api/policies"),
        ("Transactions", "GET", "https://trustpayai.onrender.com/api/transactions?skip=0&limit=10"),
        ("Audit Logs", "GET", "https://trustpayai.onrender.com/api/audit/logs?skip=0&limit=10"),
        ("Auth Me", "GET", "https://trustpayai.onrender.com/api/auth/me"),
        ("Current Organization", "GET", "https://trustpayai.onrender.com/api/organizations/current"),
        ("PayPal Webhook Status", "GET", "https://trustpayai.onrender.com/api/webhooks/paypal/status"),
    ]

    headers = {
        "Origin": "https://trust-pay-ai-five.vercel.app",
        "Accept": "application/json"
    }

    print("[*] Testing all endpoints on https://trustpayai.onrender.com ...\n")
    all_ok = True
    with httpx.Client(timeout=15.0) as client:
        for name, method, url in endpoints:
            try:
                res = client.get(url, headers=headers)
                status = res.status_code
                print(f"[{status}] {method} {url.replace('https://trustpayai.onrender.com', '')} - {name}")
                if status != 200:
                    all_ok = False
                    print(f"       Response: {res.text[:120]}")
            except Exception as e:
                all_ok = False
                print(f"[ERR] {method} {url} - {name}: {e}")

    return all_ok

if __name__ == "__main__":
    check_deployment()
