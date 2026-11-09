import pytest
import httpx
import uuid
from unittest.mock import patch, AsyncMock
from backend.paypal.config import PayPalConfig
from backend.paypal.client import PayPalClient
from backend.paypal.mcp_adapter import PayPalMCPClientAdapter
from backend.config import settings

@pytest.fixture
def test_config():
    class TestPayPalConfig:
        mode = "sandbox"
        client_id = "test_paypal_client_id_123"
        client_secret = "test_paypal_client_secret_456"
        base_url = "https://api-m.sandbox.paypal.com"
        is_configured = True

    return TestPayPalConfig()

@pytest.fixture
def paypal_client_instance(test_config):
    return PayPalClient(config=test_config)

# ============================================================================
# 1. OAuth2 Access Token Tests & Expiration Handling
# ============================================================================

@pytest.mark.asyncio
async def test_oauth2_token_generation_and_caching(paypal_client_instance):
    """
    Test OAuth2 token generation and caching.
    """
    mock_response = httpx.Response(
        200,
        json={
            "scope": "https://api-m.paypal.com/v1/payments/.*",
            "access_token": "A21AAI_fake_sandbox_access_token_12345",
            "token_type": "Bearer",
            "app_id": "APP-80W284485P519543T",
            "expires_in": 3600
        },
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v1/oauth2/token")
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        # First call: fetch token from PayPal
        token1 = await paypal_client_instance.get_access_token()
        assert token1 == "A21AAI_fake_sandbox_access_token_12345"
        assert mock_post.call_count == 1

        # Second call immediately after: should return cached token without HTTP call
        token2 = await paypal_client_instance.get_access_token()
        assert token2 == token1
        assert mock_post.call_count == 1

        # Force refresh: should make a new HTTP call
        token3 = await paypal_client_instance.get_access_token(force_refresh=True)
        assert token3 == token1
        assert mock_post.call_count == 2

@pytest.mark.asyncio
async def test_oauth2_token_failure_handling(paypal_client_instance):
    """
    Test error handling when PayPal OAuth credentials fail.
    """
    mock_err_response = httpx.Response(
        401,
        json={
            "error": "invalid_client",
            "error_description": "Client Authentication failed"
        },
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v1/oauth2/token")
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_err_response

        token = await paypal_client_instance.get_access_token(force_refresh=True)
        assert token is None

# ============================================================================
# 2. PayPal Order Creation, Retrieval & Capture (Orders v2)
# ============================================================================

@pytest.mark.asyncio
async def test_create_paypal_order_v2_success(paypal_client_instance):
    """
    Test creating an order via PayPal Orders v2 with idempotency header.
    """
    token_response = httpx.Response(
        200,
        json={"access_token": "mock_token", "expires_in": 3600},
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v1/oauth2/token")
    )
    order_response = httpx.Response(
        201,
        json={
            "id": "5O190127TN364715T",
            "status": "CREATED",
            "links": [
                {
                    "href": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
                    "rel": "approve",
                    "method": "GET"
                }
            ]
        },
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v2/checkout/orders")
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        # First call is token, second call is create order
        mock_post.side_effect = [token_response, order_response]

        order_payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": "mandate_123",
                    "amount": {"currency_code": "USD", "value": "190.00"}
                }
            ]
        }
        idempotency_key = "idem_req_abc_123"

        success, res_data, code = await paypal_client_instance.create_order_v2(order_payload, idempotency_key)
        assert success is True
        assert code == 201
        assert res_data["id"] == "5O190127TN364715T"
        assert res_data["status"] == "CREATED"
        assert mock_post.call_count == 2
        # Check header
        headers = mock_post.call_args_list[1].kwargs.get("headers", {})
        assert headers.get("PayPal-Request-Id") == idempotency_key

@pytest.mark.asyncio
async def test_retrieve_paypal_order_v2(paypal_client_instance):
    """
    Test retrieving PayPal order status to verify buyer approval before capture.
    """
    token_response = httpx.Response(
        200,
        json={"access_token": "mock_token", "expires_in": 3600},
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v1/oauth2/token")
    )
    get_response = httpx.Response(
        200,
        json={
            "id": "5O190127TN364715T",
            "status": "APPROVED",
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": "mandate_123",
                    "custom_id": "purch_123",
                    "amount": {"currency_code": "USD", "value": "190.00"}
                }
            ]
        },
        request=httpx.Request("GET", "https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T")
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post, \
         patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_post.return_value = token_response
        mock_get.return_value = get_response

        success, res_data, code = await paypal_client_instance.get_order_v2("5O190127TN364715T")
        assert success is True
        assert code == 200
        assert res_data["status"] == "APPROVED"

@pytest.mark.asyncio
async def test_capture_paypal_order_v2(paypal_client_instance):
    """
    Test capturing an approved order with PayPal-Request-Id idempotency.
    """
    token_response = httpx.Response(
        200,
        json={"access_token": "mock_token", "expires_in": 3600},
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v1/oauth2/token")
    )
    cap_response = httpx.Response(
        201,
        json={
            "id": "5O190127TN364715T",
            "status": "COMPLETED",
            "purchase_units": [
                {
                    "payments": {
                        "captures": [
                            {
                                "id": "70W190127TN364715T",
                                "status": "COMPLETED",
                                "amount": {"currency_code": "USD", "value": "190.00"}
                            }
                        ]
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture")
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [token_response, cap_response]

        success, res_data, code = await paypal_client_instance.capture_order_v2("5O190127TN364715T", "idem_cap_999")
        assert success is True
        assert code == 201
        assert res_data["status"] == "COMPLETED"
        headers = mock_post.call_args_list[1].kwargs.get("headers", {})
        assert headers.get("PayPal-Request-Id") == "idem_cap_999"

# ============================================================================
# 3. Official PayPal MCP Server Adapter Security Invariants
# ============================================================================

@pytest.mark.asyncio
async def test_mcp_adapter_blocks_direct_payment_execution():
    """
    CRITICAL SECURITY RULE:
    AI agents cannot directly execute payments via MCP tools.
    Attempts to call 'pay_order' or 'capture_order' via MCP must be strictly rejected.
    """
    adapter = PayPalMCPClientAdapter()

    # Attempt direct payment
    result = await adapter.execute_tool(
        tool_name="pay_order",
        arguments={"order_id": "5O190127TN364715T"},
        agent_id="rogue_agent_007"
    )

    assert result["success"] is False
    assert "Security Boundary Violation" in result["error"]

    # Verify blocked invocation was logged in audit history
    logs = adapter.get_invocation_logs()
    assert len(logs) >= 1
    assert logs[-1]["status"] == "BLOCKED"
    assert logs[-1]["agent_id"] == "rogue_agent_007"

@pytest.mark.asyncio
async def test_mcp_adapter_allows_read_only_inquiries():
    """
    Agent inquiry operations (list_products, check_disputes) are safely allowed through MCP.
    """
    adapter = PayPalMCPClientAdapter()

    # Query catalog
    cat_res = await adapter.execute_tool(
        tool_name="paypal_list_products",
        arguments={},
        agent_id="agent_procurement"
    )
    assert cat_res["success"] is True
    assert len(cat_res["products"]) >= 1

    # Check disputes
    disp_res = await adapter.execute_tool(
        tool_name="paypal_check_merchant_disputes",
        arguments={"vendor_id": "vendor_github"},
        agent_id="agent_procurement"
    )
    assert disp_res["success"] is True
    assert disp_res["risk_rating"] == "LOW"
