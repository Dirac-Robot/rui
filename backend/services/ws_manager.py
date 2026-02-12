import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect


class WSManager:
    def __init__(self):
        self.connections: list[WebSocket] = []
        self.log_history: list[dict] = []
        self.max_history = 500

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)
        if self.log_history:
            await websocket.send_json({
                'type': 'history',
                'data': self.log_history,
            })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, message: dict):
        if message.get('type') in ('phase_change', 'node_update'):
            self.log_history.append(message)
            if len(self.log_history) > self.max_history:
                self.log_history = self.log_history[-self.max_history:]

        disconnected = []
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    def clear_history(self):
        self.log_history.clear()


ws_manager = WSManager()
