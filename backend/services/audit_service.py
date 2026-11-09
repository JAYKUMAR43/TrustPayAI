import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.audit import AuditLogModel

GENESIS_HASH = "0" * 64

class AuditService:
    @staticmethod
    def compute_block_hash(
        block_index: int,
        event_id: str,
        event_type: str,
        actor: str,
        timestamp_iso: str,
        details_json: str,
        prev_hash: str
    ) -> str:
        payload = f"{block_index}|{event_id}|{event_type}|{actor}|{timestamp_iso}|{details_json}|{prev_hash}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    async def log_event(
        self,
        db: AsyncSession,
        event_type: str,
        actor: str,
        details: Dict[str, Any],
        purchase_id: Optional[str] = None,
        mandate_id: Optional[str] = None
    ) -> AuditLogModel:
        """
        Appends an event to the tamper-evident hash-chained audit ledger.
        """
        # Fetch the latest block to get prev_hash and block_index
        result = await db.execute(
            select(AuditLogModel).order_by(desc(AuditLogModel.block_index)).limit(1)
        )
        last_block = result.scalar_one_or_none()
        
        if last_block is None:
            new_block_index = 0
            prev_hash = GENESIS_HASH
        else:
            new_block_index = last_block.block_index + 1
            prev_hash = last_block.curr_hash

        event_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        details_json = json.dumps(details, sort_keys=True)
        
        curr_hash = self.compute_block_hash(
            block_index=new_block_index,
            event_id=event_id,
            event_type=event_type,
            actor=actor,
            timestamp_iso=now.isoformat(),
            details_json=details_json,
            prev_hash=prev_hash
        )

        log_entry = AuditLogModel(
            block_index=new_block_index,
            event_id=event_id,
            event_type=event_type,
            purchase_id=purchase_id,
            mandate_id=mandate_id,
            actor=actor,
            details=details_json,
            timestamp=now,
            prev_hash=prev_hash,
            curr_hash=curr_hash
        )

        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        return log_entry

    async def verify_chain_integrity(self, db: AsyncSession) -> Tuple[bool, int, Optional[int], str]:
        """
        Validates the entire audit chain from genesis to the head.
        Returns: (is_valid, total_blocks, broken_block_index, message)
        """
        result = await db.execute(select(AuditLogModel).order_by(AuditLogModel.block_index.asc()))
        blocks: List[AuditLogModel] = result.scalars().all()

        if not blocks:
            return True, 0, None, "Ledger is empty, chain intact."

        expected_prev_hash = GENESIS_HASH

        for i, block in enumerate(blocks):
            # 1. Verify sequence
            if block.block_index != i:
                return False, len(blocks), block.block_index, f"Sequence gap at block {block.block_index}, expected {i}"

            # 2. Verify prev_hash link
            if block.prev_hash != expected_prev_hash:
                return False, len(blocks), block.block_index, f"Broken link at block #{block.block_index}: prev_hash does not match parent's curr_hash"

            # 3. Re-calculate curr_hash
            ts_iso = block.timestamp.isoformat() if block.timestamp.tzinfo else block.timestamp.replace(tzinfo=timezone.utc).isoformat()
            recomputed = self.compute_block_hash(
                block_index=block.block_index,
                event_id=block.event_id,
                event_type=block.event_type,
                actor=block.actor,
                timestamp_iso=ts_iso,
                details_json=block.details,
                prev_hash=block.prev_hash
            )

            if recomputed != block.curr_hash:
                return False, len(blocks), block.block_index, f"Hash mismatch at block #{block.block_index}. Block payload was tampered!"

            expected_prev_hash = block.curr_hash

        return True, len(blocks), None, f"All {len(blocks)} blocks verified cryptographically intact. Hash chain valid."

audit_service = AuditService()
