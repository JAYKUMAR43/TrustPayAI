import pytest
from datetime import datetime, timezone, timedelta
from backend.security.crypto_engine import CryptographicEngine

@pytest.fixture
def crypto():
    return CryptographicEngine(master_secret="test_secret_key_1234567890_trustpay")

def test_intent_hash_deterministic(crypto):
    h1 = crypto.compute_intent_hash("agent_1", "AWS EC2", "AWS", "aws.amazon.com", 250.00, "USD")
    h2 = crypto.compute_intent_hash("agent_1", "AWS EC2", "AWS", "aws.amazon.com", 250.00, "USD")
    assert h1 == h2
    assert len(h1) == 64

def test_intent_hash_changes_on_tamper(crypto):
    h1 = crypto.compute_intent_hash("agent_1", "AWS EC2", "AWS", "aws.amazon.com", 250.00, "USD")
    # Attacker alters amount by 1 cent
    h2 = crypto.compute_intent_hash("agent_1", "AWS EC2", "AWS", "aws.amazon.com", 250.01, "USD")
    assert h1 != h2

def test_mandate_generation_and_valid_verification(crypto):
    mandate = crypto.generate_mandate(
        purchase_id="purch_123",
        agent_id="agent_copilot",
        item_name="Copilot License",
        vendor_name="GitHub",
        vendor_domain="github.com",
        amount=190.00,
        currency="USD"
    )

    assert mandate["mandate_id"].startswith("mandate_")
    assert len(mandate["signature"]) == 64
    assert mandate["max_authorized_amount"] == 190.00

    # Verify with matching purchase details
    is_valid, reason, tampered = crypto.verify_mandate(
        mandate_id=mandate["mandate_id"],
        purchase_id=mandate["purchase_id"],
        agent_id=mandate["agent_id"],
        intent_hash=mandate["intent_hash"],
        nonce=mandate["nonce"],
        max_authorized_amount=mandate["max_authorized_amount"],
        currency=mandate["currency"],
        expires_at=mandate["expires_at"],
        signature=mandate["signature"],
        current_purchase_details={
            "agent_id": "agent_copilot",
            "item_name": "Copilot License",
            "vendor_name": "GitHub",
            "vendor_domain": "github.com",
            "amount": 190.00,
            "currency": "USD"
        }
    )
    assert is_valid is True
    assert reason is None
    assert tampered is False

def test_mandate_rejects_amount_tamper(crypto):
    mandate = crypto.generate_mandate(
        purchase_id="purch_123",
        agent_id="agent_copilot",
        item_name="Copilot License",
        vendor_name="GitHub",
        vendor_domain="github.com",
        amount=190.00,
        currency="USD"
    )

    # Attacker inflates price to $9,000.00
    is_valid, reason, tampered = crypto.verify_mandate(
        mandate_id=mandate["mandate_id"],
        purchase_id=mandate["purchase_id"],
        agent_id=mandate["agent_id"],
        intent_hash=mandate["intent_hash"],
        nonce=mandate["nonce"],
        max_authorized_amount=mandate["max_authorized_amount"],
        currency=mandate["currency"],
        expires_at=mandate["expires_at"],
        signature=mandate["signature"],
        current_purchase_details={
            "agent_id": "agent_copilot",
            "item_name": "Copilot License",
            "vendor_name": "GitHub",
            "vendor_domain": "github.com",
            "amount": 9000.00,
            "currency": "USD"
        }
    )
    assert is_valid is False
    assert tampered is True
    assert "Intent hash discrepancy" in reason or "exceeds authorized cap" in reason

def test_mandate_rejects_expired_token(crypto):
    mandate = crypto.generate_mandate(
        purchase_id="purch_123",
        agent_id="agent_copilot",
        item_name="Copilot License",
        vendor_name="GitHub",
        vendor_domain="github.com",
        amount=190.00,
        currency="USD",
        duration_minutes=-5 # Expired in the past
    )

    is_valid, reason, tampered = crypto.verify_mandate(
        mandate_id=mandate["mandate_id"],
        purchase_id=mandate["purchase_id"],
        agent_id=mandate["agent_id"],
        intent_hash=mandate["intent_hash"],
        nonce=mandate["nonce"],
        max_authorized_amount=mandate["max_authorized_amount"],
        currency=mandate["currency"],
        expires_at=mandate["expires_at"],
        signature=mandate["signature"]
    )
    assert is_valid is False
    assert "expired" in reason.lower()
