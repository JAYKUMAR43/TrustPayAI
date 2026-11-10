import httpx
import re

def audit_vercel():
    with httpx.Client(timeout=15.0) as client:
        res = client.get('https://trust-pay-ai-five.vercel.app')
        print('Vercel HTML Status:', res.status_code)
        scripts = re.findall(r'src="(/assets/[^"]+\.js)"', res.text)
        print('Script tags found:', scripts)
        for s in scripts:
            url = 'https://trust-pay-ai-five.vercel.app' + s
            js_res = client.get(url)
            print(f'Fetching {s}: {len(js_res.content)} bytes')
            text = js_res.text
            # Look for API URL patterns
            urls = re.findall(r'https?://[a-zA-Z0-9\.\-_:]+', text)
            filtered = [u for u in set(urls) if 'render' in u or 'localhost' in u or 'vercel' in u]
            print('Detected backend / origin URLs in bundle:', filtered)
            
            # Check for VITE_API_URL or similar patterns
            if 'localhost:8000' in text:
                print('WARNING: localhost:8000 is hardcoded or baked into this bundle!')
            if 'trustpayai.onrender.com' in text:
                print('OK: trustpayai.onrender.com is present in bundle')
            if 'trustpay-backend.onrender.com' in text:
                print('NOTICE: trustpay-backend.onrender.com is present in bundle')

if __name__ == '__main__':
    audit_vercel()
