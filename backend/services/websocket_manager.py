import logging
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("trustpay.websocket")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")
        # Send initial connection handshake
        try:
            await websocket.send_text(json.dumps({
                "type": "CONNECTION_ESTABLISHED",
                "message": "Connected to TRUSTPAY AI Real-Time Financial Feed",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "active_subscribers": len(self.active_connections)
            }))
        except Exception as e:
            logger.warning(f"Failed to send handshake: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcasts structured activity events to all connected clients.
        Cleans up dead sockets safely.
        """
        if not self.active_connections:
            return

        payload = json.dumps(message)
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.debug(f"Error broadcasting to client, removing: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any], actor: str = "system"):
        """
        Standardized activity feed broadcaster.
        """
        event = {
            "type": event_type,
            "actor": actor,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast(event)

# Global singleton
ws_manager = WebSocketManager()
