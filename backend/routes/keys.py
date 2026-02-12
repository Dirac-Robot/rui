from fastapi import APIRouter
from pydantic import BaseModel
from loguru import logger

from services.key_store import set_key, get_missing_providers

router = APIRouter(prefix='/api/keys', tags=['keys'])


class SetKeysRequest(BaseModel):
    keys: dict


class CheckKeysRequest(BaseModel):
    config: dict = {}


@router.post('/set')
async def set_keys(request: SetKeysRequest):
    """Set API keys at runtime. Keys: {provider: key_value}."""
    for provider, key in request.keys.items():
        if key:
            set_key(provider, key)
    return {'status': 'ok'}


@router.post('/check')
async def check_keys(request: CheckKeysRequest):
    """Check which providers are missing keys for the given config."""
    missing = get_missing_providers(request.config)
    return {'missing': missing}
