"""
Knowledge extraction pipeline:
Document → Text → Chunks → LLM extraction → Memory classification → Hindsight retain
"""
import json
from groq import Groq
from django.conf import settings

client = Groq(api_key=settings.GROQ_API_KEY)

EXTRACTION_PROMPT = """You are an institutional memory extraction engine.

Given the following organizational document, extract all meaningful memories.
For each memory, output a JSON object with these fields:
- title: short descriptive title
- content: the full memory content
- memory_type: one of FACT, DECISION, DECISION_REASON, INCIDENT, FAILURE, WORKAROUND, CUSTOMER_REQUIREMENT, PROCESS, SYSTEM_KNOWLEDGE, PERSON_KNOWLEDGE, LESSON_LEARNED, CONSTRAINT, PREFERENCE, RISK
- system: the system/service this relates to (empty if general)
- people: list of people mentioned
- tags: list of relevant tags
- date: approximate date if mentioned (YYYY-MM format)
- confidence: High, Medium, or Low
- access_level: PUBLIC, INTERNAL, TEAM_ONLY, CONFIDENTIAL, or RESTRICTED

Return a JSON array of memory objects. Extract 3-10 memories per document.
Only extract genuinely useful organizational knowledge.

Document:
{content}

Return ONLY valid JSON array, no other text."""


def extract_memories(content: str, doc_title: str) -> list:
    try:
        resp = client.chat.completions.create(
            model='llama3-8b-8192',
            messages=[{
                'role': 'user',
                'content': EXTRACTION_PROMPT.format(content=content[:4000])
            }],
            temperature=0.1,
        )
        raw = resp.choices[0].message.content.strip()
        # Extract JSON array from response
        start = raw.find('[')
        end = raw.rfind(']') + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
        return []
    except Exception as e:
        return []
