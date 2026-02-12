import asyncio
import json
import os
import threading
from pathlib import Path

from loguru import logger


_gcri_task_thread = None
_abort_event = threading.Event()


def get_abort_event():
    return _abort_event


def is_running():
    return _gcri_task_thread is not None and _gcri_task_thread.is_alive()


async def run_gcri_task(task_description, config, ws_manager):
    global _gcri_task_thread

    if is_running():
        raise RuntimeError('A GCRI task is already running')

    _abort_event.clear()
    ws_manager.clear_history()

    loop = asyncio.get_event_loop()

    def execute():
        try:
            from gcri.graphs.gcri_unit import GCRI
            from ato.adict import ADict

            gcri_config = ADict()
            gcri_config.num_branches = config.get('branchCount', 3)

            branches = config.get('branches', [])
            if branches:
                branch_models = []
                for branch in branches:
                    if isinstance(branch, dict) and 'strategy' in branch:
                        branch_models.append(ADict(
                            strategy=branch.get('strategy', 'gpt-4o'),
                            hypothesis=branch.get('hypothesis', 'gpt-4o'),
                            refiner=branch.get('refiner', 'gpt-4o'),
                        ))
                    else:
                        model = branch.get('model', 'gpt-4o') if isinstance(branch, dict) else 'gpt-4o'
                        branch_models.append(ADict(
                            strategy=model, hypothesis=model, refiner=model,
                        ))
                gcri_config.branch_models = branch_models

            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    'type': 'phase_change',
                    'phase': 'strategy',
                    'iteration': 0,
                }),
                loop,
            )

            gcri = GCRI(gcri_config)

            # TODO: Hook into GCRI's logger to bridge events to WS
            # For now, simulate phase progression
            result = gcri(task=task_description, abort_event=_abort_event)

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
