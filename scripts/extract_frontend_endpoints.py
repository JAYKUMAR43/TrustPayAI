import httpx
import re

with httpx.Client(timeout=15.0) as client:
    res = client.get('https://trust-pay-ai-five.vercel.app/assets/index-CX3Gpa0i.js')
    text = res.text
    # Find all /api/... occurrences
    api_paths = set(re.findall(r'["\'](/api/[a-zA-Z0-9_\-\/]+)["\']', text))
    print('Total API paths in deployed Vercel bundle:', len(api_paths))
    for p in sorted(api_paths):
        print('  ', p)
