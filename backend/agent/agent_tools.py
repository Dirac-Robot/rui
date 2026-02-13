TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'propose_gcri_task',
            'description': (
                'Propose a GCRI research task for the user to review. '
                'This does NOT start execution — it returns a task scheme that the user '
                'must explicitly confirm through the UI before GCRI begins. '
                'Always call this after discussing the task with the user.'
            ),
            'parameters': {
                'type': 'object',
                'properties': {
                    'task_description': {
                        'type': 'string',
                        'description': 'A clear, detailed description of the research task to solve.',
                    },
                    'commit_mode': {
                        'type': 'string',
                        'enum': ['manual', 'auto-accept'],
                        'description': (
                            'How to handle successful results. '
                            '"manual" requires user approval before committing. '
                            '"auto-accept" commits automatically.'
                        ),
                    },
                },
                'required': ['task_description'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'check_task_status',
            'description': 'Check whether a GCRI task is currently running and get its status.',
            'parameters': {
                'type': 'object',
                'properties': {},
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'abort_task',
            'description': 'Abort the currently running GCRI task. Use when the user wants to cancel.',
            'parameters': {
                'type': 'object',
                'properties': {},
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'query_memory',
            'description': (
                'Search past experiment memory. '
                'CoMeT: semantic memory from conversations. If a query is provided, performs '
                'semantic search and returns ranked results. Without query, returns all nodes. '
                'GCRI: rules and domain-specific knowledge learned from previous tasks.'
            ),
            'parameters': {
                'type': 'object',
                'properties': {
                    'source': {
                        'type': 'string',
                        'enum': ['comet', 'gcri'],
                        'description': 'Which memory system to query.',
                    },
                    'query': {
                        'type': 'string',
                        'description': 'Search query for semantic retrieval (CoMeT). Leave empty to list all.',
                    },
                },
                'required': ['source'],
            },
        },
    },
]
