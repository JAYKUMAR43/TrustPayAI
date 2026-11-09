import logging
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import init_db, AsyncSessionLocal
from backend.services.policy_service import policy_service
from backend.services.websocket_manager import ws_manager
from backend.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("trustpay")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TRUSTPAY AI Database and Cryptographic Modules...")
    await init_db()
    async with AsyncSessionLocal() as session:
        # Seed only system guardrail policies - NO fake transactions
        await policy_service.seed_default_policies(session)
    logger.info("TRUSTPAY AI startup complete. Financial Control Layer is ACTIVE.")
    yield
    logger.info("TRUSTPAY AI shutdown.")

app = FastAPI(
    title="TRUSTPAY AI API",
    description="Secure Financial Control Layer for Autonomous AI Agents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration supporting local dev and Vercel production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list if settings.ENVIRONMENT == "production" else ["*"],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if settings.ENVIRONMENT == "production" else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount Unified API Router
app.include_router(api_router)

# Root Health Check API
@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"])
async def root_health():
    return {
        "status": "healthy",
        "service": "TRUSTPAY AI Control Layer",
        "environment": settings.ENVIRONMENT,
        "paypal_mode": settings.PAYPAL_MODE,
        "paypal_credentials_configured": settings.has_real_paypal_credentials,
        "gemini_configured": settings.has_real_gemini_key,
        "version": "1.0.0"
    }

# Real-Time WebSocket Activity Feeds
@app.websocket("/ws/activity")
@app.websocket("/api/ws/activity")
async def websocket_activity_feed(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and allow client ping/heartbeats
            data = await websocket.receive_text()
            try:
                msg = json.loads(data) if data else {}
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket connection terminated: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
