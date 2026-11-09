# TRUSTPAY AI — Production Deployment Guide

This guide details the step-by-step instructions for deploying TRUSTPAY AI to production cloud infrastructure:
- **Frontend:** Vercel (Static Single Page Application)
- **Backend:** Render (FastAPI ASGI Web Service with Uvicorn)
- **Database:** Managed PostgreSQL (Render Postgres, Neon, or Supabase)

---

## 1. Architecture Deployment Topology

```
+-------------------------------------------------------------------------------+
|                             CLIENT / BROWSER                                  |
|            https://trustpay-ai.vercel.app  (Vite + React SPA)                 |
+-------------------------------------------------------------------------------+
                                    |
          HTTPS REST Calls          |         WSS Real-Time Events
         (/api/* endpoints)         |         (/api/ws/activity)
                                    v
+-------------------------------------------------------------------------------+
|                             RENDER BACKEND                                    |
|            https://trustpay-backend.onrender.com (FastAPI)                    |
+-------------------------------------------------------------------------------+
           |                                             |
           | SQLAlchemy Async Engine                     | REST v2 APIs
           v                                             v
+------------------------+                    +------------------------+
|   MANAGED POSTGRES     |                    |  PAYPAL SANDBOX API    |
|   (PostgreSQL 16)      |                    |  api-m.sandbox.paypal  |
+------------------------+                    +------------------------+
```

---

## 2. Database Provisioning (PostgreSQL)

You can provision a free PostgreSQL instance using Render, Neon, or Supabase.

### Option A: Render Managed PostgreSQL
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **PostgreSQL**.
3. Set:
   - **Name:** `trustpay-postgres`
   - **Database:** `trustpay_db`
   - **User:** `trustpay_user`
   - **Region:** Oregon (US West) or closest to your users.
   - **Plan:** Free
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (or External Database URL if deploying backend outside Render).

### Option B: Neon Serverless Postgres
1. Sign up at [neon.tech](https://neon.tech).
2. Create a project `trustpay-ai`.
3. Copy the async connection string:
   `postgresql+asyncpg://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require`

---

## 3. Backend Deployment (Render)

### Step 1: Connect Repository to Render
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository: `your-username/TrustPayAI`.
3. Configure settings:
   - **Name:** `trustpay-backend`
   - **Region:** Same region as your database.
   - **Branch:** `main`
   - **Root Directory:** Leave empty (root of repo).
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

### Step 2: Configure Production Environment Variables
In the Render Service dashboard under **Environment**, add the following environment variables:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enforces production CORS and security rules |
| `DEBUG` | `false` | Disables debug stack traces in responses |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Connection string to your PostgreSQL instance |
| `TRUSTPAY_MASTER_SECRET` | *(Random 64-char hex)* | Master HMAC key (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini API key from AI Studio |
| `PAYPAL_MODE` | `sandbox` | Set to `sandbox` for hackathon evaluation |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` | Official PayPal Sandbox REST v2 endpoint |
| `PAYPAL_CLIENT_ID` | *(Your Sandbox Client ID)* | From PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | *(Your Sandbox Secret)* | From PayPal Developer Dashboard |
| `CORS_ORIGINS` | `https://trustpay-ai.vercel.app,http://localhost:5173` | Allowed frontend origins (no trailing slashes) |

### Step 3: Deploy & Verify Health Check
Click **Manual Deploy** -> **Deploy latest commit**. Once build succeeds:
```bash
curl -I https://trustpay-backend.onrender.com/api/health
```
Expected output: `HTTP/2 200` with `status: "healthy"`.

---

## 4. Frontend Deployment (Vercel)

### Step 1: Import Project to Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your repository `your-username/TrustPayAI`.
4. Configure framework preset:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and choose `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 2: Configure Frontend Environment Variables
Under **Environment Variables**, add:

| Name | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://trustpay-backend.onrender.com` | URL of your deployed Render backend |
| `VITE_WS_URL` | `wss://trustpay-backend.onrender.com/api/ws/activity` | Secure WebSocket URL for real-time events |

### Step 3: Deploy & Verify
Click **Deploy**. Vercel will build and assign a domain (e.g., `https://trustpay-ai.vercel.app`).

---

## 5. Post-Deployment Verification Checklist

Verify the entire system using the following checklist:

- [ ] **HTTPS Health Check:** Verify `GET /api/health` returns `200 OK` over HTTPS.
- [ ] **Database Connection:** Check Render logs to verify `TRUSTPAY AI Database and Cryptographic Modules initialized`.
- [ ] **CORS Verification:** Open browser DevTools on your Vercel URL and check that `/api/dashboard/stats` loads without CORS errors.
- [ ] **WebSocket Connectivity:** Observe the live event feed pill in the top-right corner displays `LIVE ACTIVITY (CONNECTED)`.
- [ ] **Procurement Flow:** In the Procurement Console, submit:
  > *"Purchase a machine learning dataset for $35 from Approved Data Portal."*
  Verify:
  1. Intent parsed successfully.
  2. All 10 policy guardrails pass.
  3. HMAC-SHA256 mandate is generated.
  4. Dual-custody approval activates.
  5. PayPal Sandbox order is generated with CAPTURE intent.
- [ ] **Audit Ledger Integrity:** Click **Verify Chain Integrity** in the Audit Logs page to confirm zero block tampering.
