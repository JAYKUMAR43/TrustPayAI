import pytest
from backend.services.audit_service import AuditService, GENESIS_HASH

def test_hash_chain_calculation():
    service = AuditService()
    
    # Block 0
    b0_hash = service.compute_block_hash(
        block_index=0,
        event_id="evt_0",
        event_type="GENESIS",
        actor="system",
        timestamp_iso="2026-11-09T00:00:00Z",
        details_json='{"status": "init"}',
        prev_hash=GENESIS_HASH
    )
    assert len(b0_hash) == 64

    # Block 1 links to Block 0
    b1_hash = service.compute_block_hash(
        block_index=1,
        event_id="evt_1",
        event_type="MANDATE_ISSUED",
        actor="agent_1",
        timestamp_iso="2026-11-09T00:01:00Z",
        details_json='{"amount": 100.0}',
        prev_hash=b0_hash
    )
    assert len(b1_hash) == 64

    # Tampering with Block 0 details changes its hash, which breaks Block 1's link
    b0_tampered_hash = service.compute_block_hash(
        block_index=0,
        event_id="evt_0",
        event_type="GENESIS",
        actor="system",
        timestamp_iso="2026-11-09T00:00:00Z",
        details_json='{"status": "TAMPERED"}',
        prev_hash=GENESIS_HASH
    )
    assert b0_tampered_hash != b0_hash
