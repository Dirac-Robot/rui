import asyncio
import json
import threading

from loguru import logger

from gcri.config import scope
from gcri.graphs.gcri_unit import GCRI


_gcri_task_thread = None
_abort_event = threading.Event()


def get_abort_event():
    return _abort_event


def is_running():
    return _gcri_task_thread is not None and _gcri_task_thread.is_alive()


@scope
def _build_config(config, rui_config=None):
    """Get GCRI scope config with RUI sidebar overrides applied."""
    from gcri.config import AGENT_NAMES_IN_BRANCH
    from ato.adict import ADict

    if rui_config is None:
        return config

    num_branches = rui_config.get('branchCount', config.num_branches)
    config.num_branches = num_branches

    branches = rui_config.get('branches', [])
    if branches:
        branch_agents = []
        for branch in branches[:num_branches]:
            model = branch.get('model', 'gpt-5-mini') if isinstance(branch, dict) else 'gpt-5-mini'
            branch_agents.append({
                agent_name: ADict(
                    model_id=model,
                    parameters=dict(max_tokens=25600, reasoning_effort='low'),
                    gcri_options=ADict(
                        use_code_tools=True,
                        use_web_search=True,
                        max_recursion_depth=None
                    )
                ) for agent_name in AGENT_NAMES_IN_BRANCH
            })
        while len(branch_agents) < num_branches:
            branch_agents.append(branch_agents[-1])
        config.agents.branches = branch_agents

    config.dashboard.enabled = False

    return config


async def run_gcri_task(task_description, rui_config, ws_manager):
    global _gcri_task_thread

    if is_running():
        raise RuntimeError('A GCRI task is already running')

    _abort_event.clear()
    ws_manager.clear_history()

    loop = asyncio.get_event_loop()

    def execute():
        try:
            config = _build_config(rui_config=rui_config)

            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    'type': 'phase_change',
                    'phase': 'strategy',
                    'iteration': 0,
                }),
                loop,
            )

            gcri = GCRI(config, abort_event=_abort_event)
            result = gcri(task=task_description)

            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    'type': 'phase_change',
                    'phase': 'complete',
                }),
                loop,
            )

            if result:
                final_output = ''
                if isinstance(result, dict):
                    final_output = result.get('final_output', json.dumps(result, ensure_ascii=False, indent=2))
                else:
                    final_output = str(result)

                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast({
                        'type': 'chat_response',
                        'content': final_output,
                    }),
                    loop,
                )

        except Exception as error:
            logger.error(f'GCRI task failed: {error}')
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    'type': 'system_message',
                    'content': f'GCRI task error: {str(error)}',
                }),
                loop,
            )
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    'type': 'phase_change',
                    'phase': 'idle',
                }),
                loop,
            )
        finally:
            global _gcri_task_thread
            _gcri_task_thread = None

    _gcri_task_thread = threading.Thread(target=execute, daemon=True)
    _gcri_task_thread.start()

    return {'status': 'started', 'task': task_description}


def abort_gcri_task():
    _abort_event.set()
    return {'status': 'abort_requested'}
