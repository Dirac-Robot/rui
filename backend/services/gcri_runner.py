import asyncio
import json
import threading

from loguru import logger

from gcri.config import scope
from gcri.graphs.callbacks import GCRICallbacks
from gcri.graphs.gcri_unit import GCRI


_gcri_task_thread = None
_abort_event = threading.Event()


def get_abort_event():
    return _abort_event


def is_running():
    return _gcri_task_thread is not None and _gcri_task_thread.is_alive()


class WebCallbacks(GCRICallbacks):
    """GCRI Callbacks that broadcast events to RUI frontend via WebSocket."""

    def __init__(self, ws_manager, loop):
        self._ws = ws_manager
        self._loop = loop

    def _send(self, data):
        asyncio.run_coroutine_threadsafe(self._ws.broadcast(data), self._loop)

    def on_commit_request(self, context):
        return True

    def on_iteration_start(self, iteration, max_iterations):
        self._send({
            'type': 'phase_change',
            'phase': 'strategy',
            'iteration': iteration,
            'maxIterations': max_iterations,
        })

    def on_iteration_complete(self, iteration, result):
        decision = result.get('decision', False)
        feedback = result.get('global_feedback', '')
        evals = result.get('branch_evaluations', [])
        safe_evals = []
        for e in evals:
            if hasattr(e, 'model_dump'):
                e = e.model_dump(mode='json')
            safe_evals.append({
                'branch_index': e.get('branch_index', 0),
                'status': str(e.get('status', '')),
                'summary_hypothesis': str(e.get('summary_hypothesis', ''))[:300],
                'summary_counter_example': str(e.get('summary_counter_example', ''))[:200],
                'failure_category': str(e.get('failure_category', '')),
            })
        self._send({
            'type': 'iteration_complete',
            'iteration': iteration,
            'decision': decision,
            'feedback': (feedback or '')[:500],
            'evaluations': safe_evals,
        })

    def on_phase_change(self, phase, iteration=0, **kwargs):
        self._send({
            'type': 'phase_change',
            'phase': phase,
            'iteration': iteration,
        })

    def on_strategies_generated(self, iteration, strategies):
        safe = []
        for s in strategies:
            safe.append({
                'name': s.get('name', ''),
                'description': str(s.get('description', ''))[:300],
                'hints': s.get('hints', [])[:5],
            })
        self._send({
            'type': 'strategies',
            'iteration': iteration,
            'strategies': safe,
        })

    def on_hypothesis_generated(self, iteration, branch, hypothesis, strategy_name):
        self._send({
            'type': 'hypothesis',
            'iteration': iteration,
            'branch': branch,
            'hypothesis': hypothesis[:300],
            'strategyName': strategy_name,
        })

    def on_verification_complete(self, iteration, branch, counter_strength, counter_example):
        self._send({
            'type': 'verification',
            'iteration': iteration,
            'branch': branch,
            'counterStrength': counter_strength,
            'counterExample': counter_example[:300],
        })

    def on_decision(self, iteration, decision, best_branch, feedback, evaluations):
        self._send({
            'type': 'decision',
            'iteration': iteration,
            'decision': decision,
            'bestBranch': best_branch,
            'feedback': (feedback or '')[:500],
        })

    def on_task_complete(self, result, elapsed_seconds):
        self._send({
            'type': 'phase_change',
            'phase': 'complete',
            'elapsed': round(elapsed_seconds, 1),
        })

    def on_task_error(self, error):
        self._send({
            'type': 'system_message',
            'content': f'GCRI task error: {str(error)}',
        })
        self._send({
            'type': 'phase_change',
            'phase': 'idle',
        })

    def on_task_abort(self, error):
        self._send({
            'type': 'system_message',
            'content': '🛑 GCRI task aborted by user.',
        })
        self._send({
            'type': 'phase_change',
            'phase': 'aborted',
        })


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
                    parameters=dict(max_completion_tokens=16384),
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

    max_iter = rui_config.get('maxIterations')
    if max_iter:
        config.protocols.max_iterations = int(max_iter)

    config.dashboard.enabled = False
    config.use_comet = True

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
            callbacks = WebCallbacks(ws_manager, loop)
            gcri = GCRI(config, abort_event=_abort_event, callbacks=callbacks)
            result = gcri(task=task_description)

            logger.info(f'GCRI result type: {type(result).__name__}')
            if isinstance(result, dict):
                logger.info(f'GCRI result keys: {list(result.keys())}')

            if result:
                final_output = ''
                if isinstance(result, dict):
                    final_output = result.get('final_output') or ''
                    if hasattr(final_output, 'model_dump'):
                        final_output = json.dumps(final_output.model_dump(), ensure_ascii=False, indent=2)
                    elif isinstance(final_output, dict):
                        final_output = json.dumps(final_output, ensure_ascii=False, indent=2)
                    elif not isinstance(final_output, str):
                        final_output = str(final_output)
                else:
                    final_output = str(result)

                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast({
                        'type': 'gcri_result',
                        'final_output': final_output,
                        'best_branch': result.get('best_branch_index') if isinstance(result, dict) else None,
                        'iterations': result.get('count') if isinstance(result, dict) else None,
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
