import pytest
import hmac
import hashlib
import time
from datetime import datetime, timezone, timedelta
from backend.security.crypto_engine import (
    CryptographicSpendingMandateEngine,
    create_mandate,
    sign_mandate,
    verify_mandate,
    check_expiry,
    check_nonce,
    consume_mandate
)

@pytest.fixture
def engine():
    return CryptographicSpendingMandateEngine(master_secret="test_crypto_secret_32bytes_minimum!!")

def test_valid_mandate_creation_and_verification(engine):
    """
    Test creation of mandate with all 10 mandatory fields and successful verification.
    """
    mandate = engine.create_mandate(
        agent_id="agent_alpha_procure",
        vendor_id="vendor_snowflake_inc",
        approved_amount=450.00,
        currency="USD",
        product_category="data_warehousing",
        transaction_request_id="tx_req_9921_abc",
        allowed_payment_purpose="Snowflake Q3 Compute Credits",
        duration_seconds=300
    )

    # 1. Verify all 10 mandatory fields are present
    assert "mandate_id" in mandate
    assert "agent_id" in mandate
    assert "vendor_id" in mandate
    assert "approved_amount" in mandate
    assert "currency" in mandate
    assert "product_category" in mandate
    assert "expiry_timestamp" in mandate
    assert "nonce" in mandate
    assert "transaction_request_id" in mandate
    assert "allowed_payment_purpose" in mandate
    assert "signature" in mandate

    assert mandate["agent_id"] == "agent_alpha_procure"
    assert mandate["vendor_id"] == "vendor_snowflake_inc"
    assert mandate["approved_amount"] == 450.00
    assert mandate["currency"] == "USD"
    assert len(mandate["signature"]) == 64  # SHA-256 hex digest

    # 2. Verify check_expiry and check_nonce on fresh mandate
    assert engine.check_expiry(mandate["expiry_timestamp"]) is True
    assert engine.check_nonce(mandate["nonce"]) is True

    # 3. Verify mandate against transaction matching authorized parameters
    is_valid, reason, tampered = engine.verify_mandate(
        mandate=mandate,
        current_transaction={
            "agent_id": "agent_alpha_procure",
            "vendor_id": "vendor_snowflake_inc",
            "amount": 450.00,
            "currency": "USD",
            "product_category": "data_warehousing",
            "transaction_request_id": "tx_req_9921_abc"
        }
    )
    assert is_valid is True
    assert reason is None
    assert tampered is False

def test_expired_mandate_rejection(engine):
    """
    Test that expired mandates are unconditionally rejected.
    """
    mandate = engine.create_mandate(
        agent_id="agent_beta",
        vendor_id="vendor_aws",
        approved_amount=100.00,
        currency="USD",
        product_category="cloud_compute",
        transaction_request_id="tx_req_expired",
        allowed_payment_purpose="AWS EC2 Spot Instances",
        duration_seconds=-60  # Expired 60 seconds ago
    )

    # check_expiry must return False
    assert engine.check_expiry(mandate["expiry_timestamp"]) is False

    is_valid, reason, tampered = engine.verify_mandate(
        mandate=mandate,
        current_transaction={"vendor_id": "vendor_aws", "amount": 100.00, "currency": "USD"}
    )
    assert is_valid is False
    assert "expired" in reason.lower()
    assert tampered is False

def test_modified_amount_tamper_rejection(engine):
    """
    Test that modifying approved_amount or attempting payment above approved cap is rejected.
    """
    mandate = engine.create_mandate(
        agent_id="agent_gamma",
        vendor_id="vendor_datadog",
        approved_amount=250.00,
        currency="USD",
        product_category="observability",
        transaction_request_id="tx_req_tamper_amt",
        allowed_payment_purpose="Datadog APM Monthly Plan"
    )

    # Attacker directly alters the signed mandate amount
    tampered_mandate = dict(mandate)
    tampered_mandate["approved_amount"] = 250.01

    is_valid, reason, tampered = engine.verify_mandate(tampered_mandate)
    assert is_valid is False
    assert tampered is True
    assert "signature mismatch" in reason.lower()

    # Attacker attempts transaction amount higher than authorized cap
    is_valid_tx, reason_tx, tampered_tx = engine.verify_mandate(
        mandate=mandate,
        current_transaction={"vendor_id": "vendor_datadog", "amount": 250.01, "currency": "USD"}
    )
    assert is_valid_tx is False
    assert tampered_tx is True
    assert "exceeds authorized spending ceiling" in reason_tx.lower()

def test_modified_vendor_rejection(engine):
    """
    Test that altering vendor_id in the signed mandate or passing a rogue vendor is rejected.
    """
    mandate = engine.create_mandate(
        agent_id="agent_delta",
        vendor_id="vendor_openai",
        approved_amount=120.00,
        currency="USD",
        product_category="ai_api",
        transaction_request_id="tx_req_vendor_tamper",
        allowed_payment_purpose="OpenAI API Credits"
    )

    # 1. Attacker alters vendor_id inside mandate dict
    tampered_mandate = dict(mandate)
    tampered_mandate["vendor_id"] = "vendor_hacker_corp"
    is_valid, reason, tampered = engine.verify_mandate(tampered_mandate)
    assert is_valid is False
    assert tampered is True
    assert "signature mismatch" in reason.lower()

    # 2. Payment executed targeting a different vendor
    is_valid_vendor, reason_vendor, tampered_vendor = engine.verify_mandate(
        mandate=mandate,
        current_transaction={"vendor_id": "vendor_phishing_domain", "amount": 120.00, "currency": "USD"}
    )
    assert is_valid_vendor is False
    assert tampered_vendor is True
    assert "vendor id mismatch" in reason_vendor.lower()

def test_invalid_signature_rejection(engine):
    """
    Test that invalid or forged signatures are rejected using constant-time comparison.
    """
    mandate = engine.create_mandate(
        agent_id="agent_sec",
        vendor_id="vendor_github",
        approved_amount=80.00,
        currency="USD",
        product_category="developer_tools",
        transaction_request_id="tx_sec_001",
        allowed_payment_purpose="GitHub Enterprise"
    )

    tampered_mandate = dict(mandate)
    tampered_mandate["signature"] = "deadbeef" * 8  # 64-char fake signature

    is_valid, reason, tampered = engine.verify_mandate(tampered_mandate)
    assert is_valid is False
    assert tampered is True
    assert "signature mismatch" in reason.lower()

def test_reused_nonce_rejection(engine):
    """
    Test that nonces cannot be reused (replay attack prevention).
    """
    mandate = engine.create_mandate(
        agent_id="agent_replay",
        vendor_id="vendor_pagerduty",
        approved_amount=99.00,
        currency="USD",
        product_category="incident_management",
        transaction_request_id="tx_replay_001",
        allowed_payment_purpose="PagerDuty Monthly"
    )

    nonce = mandate["nonce"]
    assert engine.check_nonce(nonce) is True

    # First consumption succeeds
    consumed_first = engine.consume_mandate(mandate["mandate_id"], nonce)
    assert consumed_first is True

    # Nonce is now recorded as consumed
    assert engine.check_nonce(nonce) is False

    # Attempting to verify mandate with reused nonce fails
    is_valid, reason, tampered = engine.verify_mandate(mandate)
    assert is_valid is False
    assert tampered is True
    assert "replay attack detected" in reason.lower()

def test_duplicate_payment_attempt_rejection(engine):
    """
    Test that duplicate mandate consumption is strictly rejected (single-use constraint).
    """
    mandate = engine.create_mandate(
        agent_id="agent_finance",
        vendor_id="vendor_stripe",
        approved_amount=50.00,
        currency="USD",
        product_category="fintech_api",
        transaction_request_id="tx_single_use",
        allowed_payment_purpose="Stripe Terminal Testing"
    )

    # First payment execution consumes mandate
    success_1 = engine.consume_mandate(mandate["mandate_id"], mandate["nonce"], transaction_id="pay_001")
    assert success_1 is True

    # Duplicate payment attempt using same mandate and nonce MUST fail
    success_2 = engine.consume_mandate(mandate["mandate_id"], mandate["nonce"], transaction_id="pay_002")
    assert success_2 is False

def test_module_level_helpers():
    """
    Test module-level convenience functions.
    """
    m = create_mandate(
        agent_id="agent_mod",
        vendor_id="vendor_mod",
        approved_amount=30.00,
        currency="USD",
        product_category="software",
        transaction_request_id="tx_mod",
        allowed_payment_purpose="Module test"
    )
    assert check_expiry(m["expiry_timestamp"]) is True
    assert check_nonce(m["nonce"]) is True

    is_valid, reason, tampered = verify_mandate(m)
    assert is_valid is True

    consumed = consume_mandate(m["mandate_id"], m["nonce"])
    assert consumed is True
    assert check_nonce(m["nonce"]) is False
