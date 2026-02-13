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


def search_comet_memory(query, top_k=5):
    """Semantic search over CoMeT memory using query string."""
    comet = _get_comet()
    if comet is None:
        return {'results': [], 'error': 'CoMeT not available'}

    try:
        results = comet.retrieve(query, top_k=top_k)
        items = []
        for r in results:
            node = r.node
            items.append({
                'node_id': node.node_id,
                'summary': node.summary,
                'trigger': node.trigger,
                'topic_tags': node.topic_tags,
                'relevance_score': round(r.relevance_score, 4),
                'rank': r.rank,
            })
        return {'query': query, 'results': items}
    except Exception as error:
        logger.warning(f'CoMeT search failed: {error}')
        return {'results': [], 'error': str(error)}


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
    candidates = []
    if memory_path:
        candidates.append(Path(memory_path))
    candidates.append(Path.cwd() / '.gcri' / 'external_memory.json')
    candidates.append(Path.home() / '.gcri' / 'external_memory.json')

    for path in candidates:
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data['_source_path'] = str(path)
                return data
            except Exception as error:
                logger.warning(f'Failed to read GCRI memory at {path}: {error}')

    return {
        'global_rules': [],
        'domain_rules': {},
        'knowledge': {},
    }
