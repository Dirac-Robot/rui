import json
from pathlib import Path
from typing import Optional

from ato.adict import ADict
from loguru import logger

_comet_instance: Optional['CoMeT'] = None


def _get_comet():
    global _comet_instance
    if _comet_instance is not None:
        return _comet_instance

    try:
        from comet import CoMeT
        from comet.config import scope

        @scope
        def _init(comet: ADict):
            return comet

        config = _init()
        _comet_instance = CoMeT(config)
        logger.info(f'CoMeT initialized (session={_comet_instance.session_id})')
        return _comet_instance
    except Exception as error:
        logger.warning(f'Failed to initialize CoMeT: {error}')
        return None


def get_comet_memory_nodes():
    """Read CoMeT memory nodes from the storage backend."""
    comet = _get_comet()
    if comet is None:
        return {'nodes': [], 'error': 'CoMeT not available'}

    try:
        all_nodes = comet.list_memories()
        result = []
        for entry in all_nodes:
            result.append({
                'node_id': entry.get('node_id', ''),
                'summary': entry.get('summary', ''),
                'trigger': entry.get('trigger', ''),
                'session_id': entry.get('session_id'),
                'recall_mode': entry.get('recall_mode', 'active'),
                'topic_tags': entry.get('topic_tags', []),
                'depth_level': entry.get('depth_level', 0),
                'created_at': entry.get('created_at', ''),
            })
        return {'nodes': result}
    except Exception as error:
        logger.warning(f'Failed to read CoMeT memory: {error}')
        return {'nodes': [], 'error': str(error)}


def get_comet_sessions():
    """List all CoMeT sessions with metadata."""
    comet = _get_comet()
    if comet is None:
        return {'sessions': [], 'error': 'CoMeT not available'}

    try:
        return {'sessions': comet.list_sessions()}
    except Exception as error:
        logger.warning(f'Failed to list CoMeT sessions: {error}')
        return {'sessions': [], 'error': str(error)}


def get_comet_session_nodes(session_id: str):
    """List nodes for a specific CoMeT session."""
    comet = _get_comet()
    if comet is None:
        return {'nodes': [], 'error': 'CoMeT not available'}

    try:
        nodes = comet.list_session_memories(session_id)
        result = []
        for entry in nodes:
            result.append({
                'node_id': entry.get('node_id', ''),
                'summary': entry.get('summary', ''),
                'trigger': entry.get('trigger', ''),
                'session_id': entry.get('session_id'),
                'recall_mode': entry.get('recall_mode', 'active'),
                'topic_tags': entry.get('topic_tags', []),
                'depth_level': entry.get('depth_level', 0),
                'created_at': entry.get('created_at', ''),
            })
        return {'nodes': result}
    except Exception as error:
        logger.warning(f'Failed to read session nodes: {error}')
        return {'nodes': [], 'error': str(error)}


def get_comet_node_detail(node_id, depth=0):
    """Get a specific CoMeT node with the requested depth."""
    comet = _get_comet()
    if comet is None:
        return {'error': 'CoMeT not available'}

    try:
        content = comet.read_memory(node_id, depth=depth)
        if content is None:
            return {'error': 'Node not found'}
        return {'node_id': node_id, 'content': content, 'depth': depth}
    except Exception as error:
        return {'error': str(error)}


def get_gcri_memory(memory_path=None):
    """Read GCRI external memory JSON."""
    if memory_path is None:
        memory_path = Path.home() / '.gcri' / 'external_memory.json'
    else:
        memory_path = Path(memory_path)

    if not memory_path.exists():
        return {
            'global_rules': [],
            'domain_rules': {},
            'knowledge': {},
        }

    try:
        with open(memory_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as error:
        logger.warning(f'Failed to read GCRI memory: {error}')
        return {
            'global_rules': [],
            'domain_rules': {},
            'knowledge': {},
            'error': str(error),
        }
