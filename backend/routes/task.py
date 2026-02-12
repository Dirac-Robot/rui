from fastapi import APIRouter
from pydantic import BaseModel

from services.gcri_runner import run_gcri_task, abort_gcri_task, is_running
from services.ws_manager import ws_manager

router = APIRouter(prefix='/api/task', tags=['task'])


class RunTaskRequest(BaseModel):
    task: str
    config: dict = {}


class ConfirmTaskRequest(BaseModel):
    task_description: str
    commit_mode: str = 'manual'
    branch_count: int = 3
    branch_models: list = []
    global_roles: dict = {}


@router.post('/run')
async def start_task(request: RunTaskRequest):
    if is_running():
        return {'status': 'error', 'message': 'A task is already running'}
    result = await run_gcri_task(request.task, request.config, ws_manager)
    return result


@router.post('/confirm')
async def confirm_task(request: ConfirmTaskRequest):
    """Start GCRI execution from a confirmed proposal scheme."""
    if is_running():
        return {'status': 'error', 'message': 'A task is already running'}

    config = {
        'branchCount': request.branch_count,
        'branches': [{'model': m} for m in request.branch_models],
        'globalRoles': request.global_roles,
        'commit_mode': request.commit_mode,
    }
    result = await run_gcri_task(request.task_description, config, ws_manager)
    return result


@router.post('/abort')
async def abort_task():
    return abort_gcri_task()


@router.get('/status')
async def task_status():
    return {
        'running': is_running(),
    }
