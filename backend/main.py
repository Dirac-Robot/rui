import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).parent))

from routes.chat import router as chat_router
from routes.task import router as task_router
from routes.memory import router as memory_router
from routes.keys import router as keys_router
from services.ws_manager import ws_manager

app = FastAPI(title='RUI Backend', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:5180', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5180'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(chat_router)
app.include_router(task_router)
app.include_router(memory_router)
app.include_router(keys_router)

app.state.ws_manager = ws_manager


@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get('type') == 'ping':
                await websocket.send_json({'type': 'pong'})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get('/health')
async def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
