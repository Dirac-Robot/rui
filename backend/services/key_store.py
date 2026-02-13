import json
import os
from pathlib import Path

from loguru import logger


_CACHE_PATH = Path.home() / '.rui' / 'keys.json'
_runtime_keys = {}

PROVIDER_KEY_MAP = {
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
    'google': 'GOOGLE_API_KEY',
}

MODEL_PROVIDER = {
    # OpenAI — GPT-5.x
    'gpt-5.2': 'openai',
    'gpt-5': 'openai',
    'gpt-5-mini': 'openai',
    'gpt-5-nano': 'openai',
    # OpenAI — GPT-4.x
    'gpt-4.1': 'openai',
    'gpt-4.1-mini': 'openai',
    'gpt-4.1-nano': 'openai',
    'gpt-4o': 'openai',
    'gpt-4o-mini': 'openai',
    # OpenAI — o-series
    'o3': 'openai',
    'o3-mini': 'openai',
    'o4-mini': 'openai',
    # Anthropic
    'claude-opus-4.6': 'anthropic',
    'claude-sonnet-4.5': 'anthropic',
    'claude-4-opus': 'anthropic',
    'claude-4-sonnet': 'anthropic',
    'claude-4-haiku': 'anthropic',
    'claude-3.5-sonnet': 'anthropic',
    'claude-3.5-haiku': 'anthropic',
    # Google
    'gemini-3-pro-preview': 'google',
    'gemini-3-flash-preview': 'google',
    'gemini-2.5-pro': 'google',
    'gemini-2.5-flash': 'google',
    'gemini-2.5-flash-lite': 'google',
    'gemini-2.0-flash': 'google',
}


def _mask_key(key):
    if len(key) <= 8:
        return key[:2] + '***'
    return key[:4] + '...' + key[-4:]


def _save_cache():
    _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_PATH.write_text(json.dumps(_runtime_keys, indent=2))
    _CACHE_PATH.chmod(0o600)


def _load_cached_keys():
    if not _CACHE_PATH.exists():
        return
    try:
        cached = json.loads(_CACHE_PATH.read_text())
        for env_var, key in cached.items():
            _runtime_keys[env_var] = key
            os.environ[env_var] = key
        if cached:
            providers = [p for p, ev in PROVIDER_KEY_MAP.items() if ev in cached]
            logger.info(f'Loaded cached API keys for: {providers}')
    except Exception as error:
        logger.warning(f'Failed to load cached keys: {error}')


_load_cached_keys()


def set_key(provider, key):
    env_var = PROVIDER_KEY_MAP.get(provider)
    if not env_var:
        raise ValueError(f'Unknown provider: {provider}')
    _runtime_keys[env_var] = key
    os.environ[env_var] = key
    _save_cache()
    logger.info(f'API key set for {provider} ({_mask_key(key)})')


def get_key(provider):
    env_var = PROVIDER_KEY_MAP.get(provider)
    if not env_var:
        return None
    return _runtime_keys.get(env_var) or os.environ.get(env_var)


def get_missing_providers(config):
    """Given a config dict, return list of providers that need API keys."""
    needed_providers = set()

    chat_model = config.get('chatModel', 'gpt-4o')
    provider = MODEL_PROVIDER.get(chat_model)
    if provider:
        needed_providers.add(provider)

    for branch in config.get('branches', []):
        if isinstance(branch, dict):
            for role in ('strategy', 'hypothesis', 'refiner'):
                model = branch.get(role)
                if model:
                    provider = MODEL_PROVIDER.get(model)
                    if provider:
                        needed_providers.add(provider)

    missing = []
    for provider in sorted(needed_providers):
        if not get_key(provider):
            missing.append(provider)
    return missing
