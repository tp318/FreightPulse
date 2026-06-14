"""
WebSocket manager — broadcasts engine.stage-updates to all connected browser clients.
"""
import logging
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect
from fastapi import APIRouter
import json

logger = logging.getLogger(__name__)

ws_router = APIRouter()

# Set of active WebSocket connections
_clients: Set[WebSocket] = set()


async def broadcast_stage_update(message: dict):
    """Send a stage update message to all connected WebSocket clients."""
    if not _clients:
        return
    payload = json.dumps(message)
    dead = set()
    for ws in _clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


@ws_router.websocket("/ws/engine")
async def engine_ws(websocket: WebSocket):
    """
    WebSocket endpoint for Engine pipeline visualization.
    Clients connect here and receive all engine.stage-updates in real time.
    """
    await websocket.accept()
    _clients.add(websocket)
    logger.info(f"WS client connected. Total: {len(_clients)}")

    # Send a welcome/connected message
    await websocket.send_text(json.dumps({
        "stage": "connected",
        "status": "ready",
        "data": {"message": "FreightPulse Engine WebSocket connected"},
    }))

    try:
        while True:
            # Keep connection alive — wait for any client message (ping/close)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"stage": "pong", "status": "ok"}))
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
        logger.info(f"WS client disconnected. Remaining: {len(_clients)}")
