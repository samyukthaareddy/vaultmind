import uuid, datetime, re
from rest_framework.views import APIView
from rest_framework.response import Response
from config.mongo import col
from memories.hindsight import retain, recall_with_status
from memories.rbac import ROLE_ACCESS
from audit.logger import log_event
from security.pii import is_safe

ACCESS_LEVELS = {'PUBLIC', 'INTERNAL', 'TEAM_ONLY', 'CONFIDENTIAL', 'RESTRICTED'}


def _local_memory_id(hindsight_memory):
    context = hindsight_memory.get('context', '')
    match = re.search(r'VaultMind memory ID: ([0-9a-fA-F-]+)', context)
    if match:
        return match.group(1)
    return None


class MemoryRetainView(APIView):
    def post(self, request):
        d = request.data
        memory_id = str(uuid.uuid4())
        content = d.get('content', '')
        if not isinstance(content, str) or not content.strip():
            return Response({'error': 'Memory content is required'}, status=400)
        safe, findings = is_safe(content)
        if not safe:
            return Response({'error': 'Sensitive data detected', 'findings': findings}, status=400)
        user = request.vault_user
        access_level = d.get('access_level', 'INTERNAL')
        if access_level not in ACCESS_LEVELS or access_level not in ROLE_ACCESS.get(user['role'], []):
            return Response({'error': 'You cannot assign this access level'}, status=403)
        metadata = {
            'memory_type': d.get('memory_type', 'FACT'), 'title': d.get('title', ''),
            'source': d.get('source', ''), 'system': d.get('system', ''),
            'people': d.get('people', []), 'tags': d.get('tags', []),
            'access_level': access_level, 'date': d.get('date', ''),
        }
        hs = retain(content, metadata, user_id=user['user_id'], memory_id=memory_id)
        if hs.get('error'):
            return Response({'error': 'Hindsight is unavailable; memory was not stored'}, status=503)
        hindsight_id = hs.get('id') or hs.get('memory_id') or hs.get('hindsight_id')
        mem = {
            'memory_id': memory_id, 'hindsight_id': hindsight_id,
            'title': d.get('title', ''), 'content': content,
            'memory_type': d.get('memory_type', 'FACT'), 'source': d.get('source', ''),
            'source_document': d.get('source_document', ''), 'date': d.get('date', ''),
            'system': d.get('system', ''), 'department': d.get('department', ''),
            'people': d.get('people', []), 'tags': d.get('tags', []),
            'access_level': access_level,
            'confidence': d.get('confidence', 'High'),
            'related_memories': d.get('related_memories', []),
            'created_by': request.vault_user['user_id'],
            'created_at': datetime.datetime.utcnow().isoformat(),
            'is_deleted': False,
        }
        col('memories').insert_one(mem)
        log_event(request.vault_user['user_id'], 'MEMORY_RETAIN', memory_id, 'ALLOWED')
        mem.pop('_id', None)
        return Response({'memory': mem, 'hindsight': hs})


class MemoryRecallView(APIView):
    def post(self, request):
        query = request.data.get('query', '')
        user = request.vault_user
        allowed = ROLE_ACCESS.get(user['role'], ['PUBLIC'])
        hs_memories, unavailable = recall_with_status(query, user_id=user['user_id'], limit=15)
        if unavailable:
            return Response({'error': 'Hindsight is temporarily unavailable', 'memories': []}, status=503)
        results = []
        seen = set()
        for hm in hs_memories:
            hid = hm.get('id') or hm.get('memory_id') or hm.get('hindsight_id')
            local_id = _local_memory_id(hm)
            mem = col('memories').find_one({'memory_id': local_id, 'is_deleted': False, 'access_level': {'$in': allowed}}) if local_id else None
            if not mem:
                mem = col('memories').find_one({'hindsight_id': hid, 'is_deleted': False, 'access_level': {'$in': allowed}}) if hid else None
            if not mem:
                continue
            if mem and mem['memory_id'] not in seen:
                seen.add(mem['memory_id'])
                mem.pop('_id', None)
                mem['relevance_score'] = hm.get('score', 1.0)
                results.append(mem)
                log_event(user['user_id'], 'MEMORY_RECALL', mem['memory_id'], 'ALLOWED')
        return Response({'memories': results, 'query': query})


class MemoryListView(APIView):
    def get(self, request):
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mems = list(col('memories').find({'is_deleted': False, 'access_level': {'$in': allowed}}, {'_id': 0}))
        return Response(mems)


class MemoryDetailView(APIView):
    def get(self, request, memory_id):
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mem = col('memories').find_one({'memory_id': memory_id, 'is_deleted': False})
        if not mem:
            return Response({'error': 'Memory not found'}, status=404)
        if mem['access_level'] not in allowed:
            log_event(request.vault_user['user_id'], 'MEMORY_RECALL', memory_id, 'DENIED', 'Insufficient permissions')
            return Response({'error': 'ACCESS DENIED', 'reason': 'Insufficient permissions'}, status=403)
        log_event(request.vault_user['user_id'], 'MEMORY_RECALL', memory_id, 'ALLOWED')
        mem.pop('_id', None)
        return Response(mem)

    def delete(self, request, memory_id):
        if request.vault_user['role'] != 'ADMIN':
            return Response({'error': 'Forbidden'}, status=403)
        mem = col('memories').find_one({'memory_id': memory_id})
        if not mem:
            return Response({'error': 'Not found'}, status=404)
        col('memories').update_one({'memory_id': memory_id}, {'$set': {'is_deleted': True}})
        log_event(request.vault_user['user_id'], 'MEMORY_DELETE', memory_id, 'ALLOWED')
        return Response({'deleted': True, 'hindsight_status': 'retained_in_external_bank'})


class TimelineView(APIView):
    def get(self, request):
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mems = col('memories').find(
            {'is_deleted': False, 'access_level': {'$in': allowed}, 'date': {'$ne': ''}},
            {'_id': 0, 'memory_id': 1, 'title': 1, 'date': 1, 'memory_type': 1, 'system': 1, 'people': 1, 'access_level': 1}
        ).sort('date', 1)
        return Response(list(mems))
