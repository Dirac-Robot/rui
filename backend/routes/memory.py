from fastapi import APIRouter

from services.comet_bridge import (
    get_comet_memory_nodes,
    get_comet_node_detail,
    get_comet_sessions,
    get_comet_session_nodes,
    get_gcri_memory,
)

router = APIRouter(prefix='/api/memory', tags=['memory'])


@router.get('/comet')
async def list_comet_memory():
    return get_comet_memory_nodes()


@router.get('/comet/sessions')
async def list_comet_sessions():
    return get_comet_sessions()


@router.get('/comet/sessions/{session_id}')
async def list_session_nodes(session_id: str):
    return get_comet_session_nodes(session_id)


@router.get('/comet/{node_id}')
async def get_comet_node(node_id: str, depth: int = 0):
    return get_comet_node_detail(node_id, depth=depth)


@router.get('/gcri')
async def list_gcri_memory():
    return get_gcri_memory()
