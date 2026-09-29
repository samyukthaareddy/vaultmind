import json
from groq import Groq
from django.conf import settings
from config.mongo import col
from memories.hindsight import recall_with_status
from memories.rbac import ROLE_ACCESS
from audit.logger import log_event

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are VaultMind, an institutional memory agent for NovaPay.
Answer questions using ONLY the organizational memories provided.
Explain not just WHAT happened, but WHY.

Rules:
1. Base answers strictly on provided memories.
2. If insufficient, say: "I could not find sufficient historical evidence."
3. Always cite sources (memory titles).
4. Distinguish KNOWN facts from INFERRED connections.
5. Include: decision reasons, alternatives, people, related incidents.
6. Add confidence: High / Medium / Low / Insufficient evidence.
7. Never fabricate.

Return JSON only:
{
  "answer": "...",
  "reasoning": "...",
  "sources": ["title1"],
  "people_involved": ["name"],
  "related_incidents": ["INC-xxx"],
  "alternatives_considered": ["..."],
  "confidence": "High|Medium|Low|Insufficient evidence",
  "memory_trace": [{"step": "...", "memory": "...", "content": "..."}],
  "caveat": "..."
}"""


def ask(question, user):
    allowed = ROLE_ACCESS.get(user['role'], ['PUBLIC'])

    # Try Hindsight recall first, fall back to MongoDB text search
    hs_memories, unavailable = recall_with_status(question, user_id=user['user_id'], limit=12)

    accessible = []
    denied = 0
    matched_ids = set()

    if not unavailable and hs_memories:
        all_local_mems = list(col('memories').find({'is_deleted': False}))
        for hm in hs_memories:
            mem = None
            # 1. Try VaultMind memory ID from context
            context = hm.get('context', '')
            marker = 'VaultMind memory ID: '
            if marker in context:
                local_id = context.split(marker, 1)[1].split('|', 1)[0].strip()
                if local_id:
                    mem = col('memories').find_one({'memory_id': local_id, 'is_deleted': False})
            # 2. Try hindsight_id
            if not mem:
                hid = hm.get('id')
                if hid:
                    mem = col('memories').find_one({'hindsight_id': hid, 'is_deleted': False})
            # 3. Fuzzy title match
            if not mem:
                recalled_text = (hm.get('text') or hm.get('content') or '').lower()
                for lm in all_local_mems:
                    title_words = [w for w in lm['title'].lower().split() if len(w) > 4]
                    if title_words and sum(1 for w in title_words if w in recalled_text) >= max(1, len(title_words) // 2):
                        mem = lm
                        break
            if mem and mem['memory_id'] not in matched_ids:
                matched_ids.add(mem['memory_id'])
                if mem['access_level'] in allowed:
                    accessible.append(mem)
                    log_event(user['user_id'], 'MEMORY_RECALL', mem['memory_id'], 'ALLOWED')
                else:
                    denied += 1
                    log_event(user['user_id'], 'MEMORY_RECALL', mem['memory_id'], 'DENIED', 'Insufficient permissions')

    # Fallback: direct MongoDB keyword search
    if not accessible:
        keywords = [w for w in question.lower().split() if len(w) > 3]
        query_parts = []
        for kw in keywords:
            query_parts.append({'title': {'$regex': kw, '$options': 'i'}})
            query_parts.append({'content': {'$regex': kw, '$options': 'i'}})
        mongo_query = {
            'is_deleted': False,
            'access_level': {'$in': allowed},
        }
        if query_parts:
            mongo_query['$or'] = query_parts
        fallback_mems = list(col('memories').find(mongo_query, {'_id': 0}).limit(8))
        for mem in fallback_mems:
            if mem['memory_id'] not in matched_ids:
                matched_ids.add(mem['memory_id'])
                accessible.append(mem)
                log_event(user['user_id'], 'MEMORY_RECALL', mem['memory_id'], 'ALLOWED')

    if not accessible:
        return {
            'answer': 'I could not find sufficient historical evidence to answer this question.',
            'sources': [], 'confidence': 'Insufficient evidence',
            'memory_trace': [], 'denied_memories': denied,
            'reasoning': 'No accessible memories found for this query.',
            'memories_used': 0,
        }

    context = [{'title': m['title'], 'type': m['memory_type'], 'content': m['content'],
                 'date': m.get('date',''), 'system': m.get('system',''),
                 'people': m.get('people',[]), 'source': m.get('source','')}
               for m in accessible[:8]]

    prompt = f"Question: {question}\n\nOrganizational Memories from Hindsight:\n{json.dumps(context, indent=2)}\n\nAnswer using these memories. Return JSON only."

    try:
        resp = client.chat.completions.create(
            model='llama3-8b-8192',
            messages=[{'role': 'system', 'content': SYSTEM_PROMPT}, {'role': 'user', 'content': prompt}],
            temperature=0.1,
        )
        raw = resp.choices[0].message.content.strip()
        start, end = raw.find('{'), raw.rfind('}') + 1
        result = json.loads(raw[start:end]) if start >= 0 and end > start else {'answer': raw, 'sources': [], 'confidence': 'Low'}
    except Exception as e:
        result = {'answer': 'Agent encountered an error.', 'error': str(e), 'sources': [], 'confidence': 'Insufficient evidence'}

    result['memories_used'] = len(accessible)
    result['denied_memories'] = denied
    result['memory_ids'] = [m['memory_id'] for m in accessible]
    allowed_sources = {value for m in accessible for value in (m.get('title'), m.get('source')) if value}
    result['sources'] = [source for source in result.get('sources', []) if source in allowed_sources]
    result['confidence'] = 'High' if len(allowed_sources) >= 3 else 'Medium' if len(accessible) >= 2 else 'Low'
    return result
