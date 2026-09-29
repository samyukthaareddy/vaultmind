import uuid, datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from config.mongo import col
from documents.extractor import extract_memories
from memories.hindsight import retain
from security.pii import is_safe, redact
from audit.logger import log_event


class DocumentUploadView(APIView):
    def post(self, request):
        title = request.data.get('title', 'Untitled')
        content = request.data.get('content', '')
        doc_type = request.data.get('doc_type', 'TEXT')
        if not content:
            return Response({'error': 'No content provided'}, status=400)

        if request.data.get('redact'):
            content = redact(content)
        safe, findings = is_safe(content)
        if not safe:
            log_event(request.vault_user['user_id'], 'DOCUMENT_UPLOAD', '', 'DENIED', 'Sensitive data detected')
            return Response({'error': 'Sensitive data detected', 'findings': findings}, status=400)

        doc_id = str(uuid.uuid4())
        extracted = extract_memories(content, title)
        memory_ids = []

        for mem_data in extracted:
            mem_id = str(uuid.uuid4())
            mem_content = mem_data.get('content', '')
            metadata = {
                'memory_type': mem_data.get('memory_type', 'FACT'), 'title': mem_data.get('title', ''),
                'source': title, 'system': mem_data.get('system', ''),
                'people': mem_data.get('people', []), 'tags': mem_data.get('tags', []),
                'access_level': mem_data.get('access_level', 'INTERNAL'), 'date': mem_data.get('date', ''),
            }
            safe_memory, memory_findings = is_safe(mem_content)
            if not safe_memory:
                log_event(request.vault_user['user_id'], 'DOCUMENT_UPLOAD', doc_id, 'DENIED', 'Sensitive extracted memory')
                return Response({'error': 'Sensitive data detected in extracted memory', 'findings': memory_findings}, status=400)
            memory_id = str(uuid.uuid4())
            hs = retain(mem_content, metadata, user_id=request.vault_user['user_id'], memory_id=memory_id)
            if hs.get('error'):
                return Response({'error': 'Hindsight is unavailable; document was not fully stored'}, status=503)
            hindsight_id = hs.get('id') or hs.get('memory_id') or hs.get('hindsight_id')
            col('memories').insert_one({
                'memory_id': memory_id, 'hindsight_id': hindsight_id,
                'title': mem_data.get('title', ''), 'content': mem_content,
                'memory_type': mem_data.get('memory_type', 'FACT'), 'source': title,
                'source_document': doc_id, 'date': mem_data.get('date', ''),
                'system': mem_data.get('system', ''), 'department': '',
                'people': mem_data.get('people', []), 'tags': mem_data.get('tags', []),
                'access_level': mem_data.get('access_level', 'INTERNAL'),
                'confidence': mem_data.get('confidence', 'Medium'),
                'related_memories': [], 'created_by': request.vault_user['user_id'],
                'created_at': datetime.datetime.utcnow().isoformat(), 'is_deleted': False,
            })
            memory_ids.append(memory_id)

        col('documents').insert_one({
            'doc_id': doc_id, 'title': title, 'doc_type': doc_type,
            'uploaded_by': request.vault_user['user_id'],
            'memories_created': memory_ids,
            'created_at': datetime.datetime.utcnow().isoformat(),
        })
        log_event(request.vault_user['user_id'], 'DOCUMENT_UPLOAD', doc_id, 'ALLOWED')
        return Response({'document': {'doc_id': doc_id, 'title': title}, 'memories_extracted': len(memory_ids)})


class DocumentListView(APIView):
    def get(self, request):
        docs = list(col('documents').find(
            {'uploaded_by': request.vault_user['user_id']}, {'_id': 0}
        ).sort('created_at', -1))
        return Response(docs)
