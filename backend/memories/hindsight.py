"""
Hindsight persistent memory integration.
API: https://api.hindsight.vectorize.io
Uses bank-scoped retain/recall endpoints.
"""
import requests
from django.conf import settings

BASE = settings.HINDSIGHT_URL
KEY = settings.HINDSIGHT_API_KEY
BANK_ID = getattr(settings, 'HINDSIGHT_BANK_ID', 'vaultmind')


def _headers():
    return {'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}


def _get_or_create_bank() -> str:
    global BANK_ID
    if BANK_ID:
        return BANK_ID
    # List existing banks
    r = requests.get(f'{BASE}/v1/default/banks', headers=_headers(), timeout=10)
    r.raise_for_status()
    banks = r.json().get('banks', [])
    for b in banks:
        if b.get('name') == 'vaultmind':
            BANK_ID = b.get('bank_id') or b.get('id') or 'vaultmind'
            return BANK_ID
    # Create bank
    r = requests.put(
        f'{BASE}/v1/default/banks/vaultmind',
        json={
            'name': 'vaultmind',
            'background': 'NovaPay institutional memory: decisions, incidents, workarounds, lessons learned, and architectural knowledge.',
        },
        headers=_headers(),
        timeout=15,
    )
    r.raise_for_status()
    BANK_ID = r.json().get('bank_id') or r.json().get('id') or BANK_ID
    return BANK_ID


def retain(content: str, metadata: dict, user_id: str = 'system', memory_id: str = '') -> dict:
    """Store a memory in Hindsight."""
    try:
        bank_id = _get_or_create_bank()
        tags = metadata.get('tags', [])
        # Add memory_type and system as tags for filtering
        if metadata.get('memory_type'):
            tags = list(set(tags + [metadata['memory_type'].lower()]))
        if metadata.get('system'):
            tags = list(set(tags + [metadata['system'].lower().replace(' ', '-')]))

        context = (
            f"Type: {metadata.get('memory_type', 'FACT')} | "
            f"Source: {metadata.get('source', '')} | "
            f"System: {metadata.get('system', '')} | "
            f"People: {', '.join(metadata.get('people', []))} | "
            f"Date: {metadata.get('date', '')}"
        )
        if memory_id:
            context += f' | VaultMind memory ID: {memory_id}'

        item = {
            'content': content,
            'context': context,
        }
        r = requests.post(
            f'{BASE}/v1/default/banks/{bank_id}/memories',
            json={'items': [item], 'async': False},
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        if data.get('success') is False:
            return {'error': 'Hindsight retain failed', 'hindsight_id': None}
        return {
            'id': data.get('id'),
            'operation_id': data.get('operation_id'),
            'bank_id': bank_id,
            'raw': data,
        }
    except Exception:
        return {'error': 'Hindsight retain failed', 'hindsight_id': None}


def recall_with_status(query: str, user_id: str = 'system', limit: int = 10):
    """Return recalled memories and whether the Hindsight request failed."""
    try:
        bank_id = _get_or_create_bank()
        r = requests.post(
            f'{BASE}/v1/default/banks/{bank_id}/memories/recall',
            json={'query': query, 'budget': 'mid', 'limit': limit},
            headers=_headers(),
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        results = data.get('results', [])
        return results, False
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f'Hindsight recall error: {e}')
        return [], True


def recall(query: str, user_id: str = 'system', limit: int = 10) -> list:
    """Retrieve relevant memories from Hindsight."""
    memories, _ = recall_with_status(query, user_id=user_id, limit=limit)
    return memories


def delete_memory(hindsight_id: str) -> bool:
    """Invalidate a memory in Hindsight."""
    try:
        bank_id = _get_or_create_bank()
        r = requests.patch(
            f'{BASE}/v1/default/banks/{bank_id}/memories/{hindsight_id}',
            json={'state': 'invalidated', 'reason': 'Deleted by VaultMind admin'},
            headers=_headers(),
            timeout=10,
        )
        return r.status_code in (200, 204)
    except Exception:
        return False
