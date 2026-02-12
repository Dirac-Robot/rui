import asyncio
import json
import os
import threading

from loguru import logger


_gcri_task_thread = None
_abort_event = threading.Event()


def get_abort_event():
    return _abort_event


def is_running():
    return _gcri_task_thread is not None and _gcri_task_thread.is_alive()


def _build_gcri_config(rui_config):
    """Build GCRI config using ato scope with RUI sidebar overrides."""
    from gcri.config import scope, AGENT_NAMES_IN_BRANCH
    from ato.adict import ADict

    config = scope.build()

    num_branches = rui_config.get('branchCount', config.get('num_branches', 2))
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

    global_roles = rui_config.get('globalRoles', {})
    role_map = {
        'strategy_generator': 'strategy_generator',
        'aggregator': 'aggregator',
        'verifier': 'decision',
        'decision': 'decision',
        'memory': 'memory',
    }
    for ui_role, config_key in role_map.items():
        if ui_role in global_roles and hasattr(config.agents, config_key):
            agent_cfg = config.agents[config_key]
            if isinstance(agent_cfg, dict):
                agent_cfg['model_id'] = global_roles[ui_role]
            else:
                agent_cfg.model_id = global_roles[ui_role]

    commit_mode = rui_config.get('commit_mode', 'manual')
    if commit_mode == 'auto-accept':
        config.protocols.accept_all = True

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
            from gcri.graphs.gcri_unit import GCRI

            config = _build_gcri_config(rui_config)

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
