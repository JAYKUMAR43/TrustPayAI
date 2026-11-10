from fastapi import APIRouter
from backend.api import agents, procurement, transactions, policies, risk, audit, dashboard, organizations, auth, webhooks
from backend.routers import mandates, payments
from backend.paypal.mcp_adapter import paypal_mcp_adapter
from backend.config import settings

api_router = APIRouter()

# Mount all core modules
api_router.include_router(auth.router)
api_router.include_router(webhooks.router)
api_router.include_router(agents.router)
api_router.include_router(procurement.router)
api_router.include_router(transactions.router)
api_router.include_router(policies.router)
api_router.include_router(risk.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(mandates.router)
api_router.include_router(payments.router)
api_router.include_router(organizations.router)

# PayPal MCP Control Endpoints
@api_router.get("/mcp/tools", tags=["mcp"])
async def list_mcp_tools():
    """
    Returns the secure, read-only PayPal tools exposed to AI agents.
    """
    return {
        "mcp_server": "PayPal Official MCP Adapter",
        "environment": "SANDBOX",
        "tools": paypal_mcp_adapter.get_supported_tools_schema()
    }

@api_router.post("/mcp/invoke", tags=["mcp"])
async def invoke_mcp_tool(payload: dict):
    """
    Executes an authorized PayPal MCP tool with strict policy filtering.
    """
    tool_name = payload.get("tool_name", "")
    arguments = payload.get("arguments", {})
    agent_id = payload.get("agent_id", "agent_procurement")
    result = await paypal_mcp_adapter.execute_tool(tool_name, arguments, agent_id=agent_id)
    return result

@api_router.get("/mcp/logs", tags=["mcp"])
async def get_mcp_logs():
    """
    Retrieves audit logs of all MCP tool invocations.
    """
    return {
        "count": len(paypal_mcp_adapter.get_invocation_logs()),
        "logs": paypal_mcp_adapter.get_invocation_logs()
    }

@api_router.get("/health", tags=["system"])
async def api_health():
    return {
        "status": "healthy",
        "service": "TRUSTPAY AI Control Layer",
        "environment": settings.ENVIRONMENT,
        "paypal_mode": settings.PAYPAL_MODE,
        "paypal_configured": settings.has_real_paypal_credentials,
        "gemini_configured": settings.has_real_gemini_key,
        "version": "1.0.0"
    }
