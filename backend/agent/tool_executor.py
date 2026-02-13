import json

from loguru import logger

from services import gcri_runner
from services.comet_bridge import get_comet_memory_nodes, search_comet_memory, get_gcri_memory


async def execute_tool(tool_name, arguments, config, ws_manager):
    """Execute a tool call from the LLM and return the result as a string."""
    logger.info(f'Executing tool: {tool_name}({arguments})')

    if tool_name == 'propose_gcri_task':
        task_description = arguments.get('task_description', '')
        commit_mode = arguments.get('commit_mode', 'manual')

        if gcri_runner.is_running():
            return json.dumps({'error': 'A GCRI task is already running. Abort it first or wait.'})

        branches = config.get('branches', [])
        branch_count = config.get('branchCount', 3)
        branch_models = []
        for branch in branches[:branch_count]:
            if isinstance(branch, dict):
                model = branch.get('model', 'gpt-4o')
                branch_models.append(model)
            else:
                branch_models.append('gpt-4o')

        scheme = {
            'type': 'gcri_proposal',
            'task_description': task_description,
            'commit_mode': commit_mode,
            'branch_count': branch_count,
            'branch_models': branch_models,
            'global_roles': config.get('globalRoles', {}),
        }
        return json.dumps(scheme, ensure_ascii=False)

    elif tool_name == 'check_task_status':
        running = gcri_runner.is_running()
        return json.dumps({
            'running': running,
            'message': 'GCRI task is currently running.' if running else 'No active task.',
        })

    elif tool_name == 'abort_task':
        if not gcri_runner.is_running():
            return json.dumps({'message': 'No task is running to abort.'})
        gcri_runner.abort_gcri_task()
        return json.dumps({'message': 'Abort signal sent. The task will stop after the current phase.'})

    elif tool_name == 'query_memory':
        source = arguments.get('source', 'gcri')
        query = arguments.get('query', '')
        if source == 'comet':
            if query:
                data = search_comet_memory(query)
            else:
                data = get_comet_memory_nodes()
        else:
            data = get_gcri_memory()
        return json.dumps(data, ensure_ascii=False, default=str)

    else:
        return json.dumps({'error': f'Unknown tool: {tool_name}'})
