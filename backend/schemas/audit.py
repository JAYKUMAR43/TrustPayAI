from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime

class AuditLogResponse(BaseModel):
    block_index: int
    event_id: str
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    actor: str
    details: Dict[str, Any]
    prev_hash: str
    curr_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
