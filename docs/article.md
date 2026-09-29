# I Built an AI That Remembers Why We Made Decisions

Every engineering team has a version of this story.

A senior engineer leaves. A new hire joins. They look at an unusual piece of code — an exponential backoff with random jitter, a dual-write to two databases, a custom ISO 20022 translator — and they ask: *why does this exist?*

Nobody knows. The person who built it is gone. The Slack thread is buried. The ticket is closed. The decision was never written down.

This is the institutional knowledge problem. And it's not a documentation problem — it's a memory problem.

## Why Ordinary RAG Wasn't Enough

My first instinct was to build a RAG system. Upload documents, chunk them, embed them, retrieve them. Standard stuff.

But RAG answers *what*. It retrieves text that matches a query. It doesn't understand *why* a decision was made, *what alternatives were considered*, or *what incident led to this architecture*.

When a new engineer asks "why do we use Redis instead of Kafka?", they don't want a paragraph from a document. They want:

- The decision
- The reason behind it
- The incident that triggered it
- The alternatives that were rejected
- The person who made the call
- Whether those reasons are still valid

That's not retrieval. That's institutional memory.

## Hindsight as the Memory Layer

The central technical decision was to use **Hindsight** as the persistent memory layer rather than a vector database.

The difference matters. A vector database stores embeddings and retrieves similar chunks. Hindsight stores *memories* — structured, persistent, associated with a user context — and recalls them semantically.

Here's how the retain call looks in practice:

```python
# memories/hindsight.py
def retain(content: str, metadata: dict, user_id: str = 'system') -> dict:
    payload = {
        'content': content,
        'metadata': metadata,
        'user_id': user_id,
    }
    resp = requests.post(
        f'{HINDSIGHT_URL}/memories',
        json=payload,
        headers=_headers(),
        timeout=10,
    )
    return resp.json()
```

And the recall:

```python
def recall(query: str, user_id: str = 'system', limit: int = 10) -> list:
    payload = {'query': query, 'user_id': user_id, 'limit': limit}
    resp = requests.post(
        f'{HINDSIGHT_URL}/memories/search',
        json=payload,
        headers=_headers(),
        timeout=10,
    )
    data = resp.json()
    return data.get('memories', data) if isinstance(data, dict) else data
```

Every memory extracted from a document goes through `retain()`. Every question triggers `recall()`. The system becomes more useful as organizational knowledge accumulates.

## Memory Classification

Not all organizational knowledge is equal. I classified memories into 14 types:

```
FACT, DECISION, DECISION_REASON, INCIDENT, FAILURE,
WORKAROUND, CUSTOMER_REQUIREMENT, PROCESS, SYSTEM_KNOWLEDGE,
PERSON_KNOWLEDGE, LESSON_LEARNED, CONSTRAINT, PREFERENCE, RISK
```

This classification matters for the Why Engine. When someone asks "why did we choose Redis?", the system looks for DECISION and DECISION_REASON memories, not just any text that mentions Redis.

A memory looks like this:

```json
{
  "type": "DECISION",
  "title": "ADR-017: Redis selected over Kafka for Notification Service",
  "content": "After evaluating Kafka, RabbitMQ, and Redis...",
  "system": "Notification Service",
  "people": ["Alex Morgan", "Sarah Chen"],
  "date": "2025-03",
  "related_incident": "INC-184",
  "access_level": "INTERNAL",
  "confidence": "High"
}
```

## The Why Engine

The core agent — what I call the Why Engine — works in three steps:

1. **Recall from Hindsight**: retrieve relevant memories for the question
2. **RBAC filter**: remove memories the user isn't authorized to see
3. **LLM generation**: generate a grounded answer from accessible memories only

The critical detail is step 2. Authorization happens *before* the LLM sees any content. The system doesn't retrieve confidential information and then hide it — it never passes it to the LLM in the first place.

```python
# agent/engine.py
def ask(question: str, user) -> dict:
    allowed_levels = ROLE_ACCESS.get(user.role, ['PUBLIC'])

    # Step 1: Recall from Hindsight
    hs_memories = recall(question, user_id=user.user_id, limit=12)

    # Step 2: Filter by RBAC — enforce BEFORE LLM
    accessible_memories = []
    for hm in hs_memories:
        mem = Memory.objects.get(hindsight_id=hm['id'])
        if mem.access_level in allowed_levels:
            accessible_memories.append(mem)
            log_event(user.user_id, 'MEMORY_RECALL', mem.memory_id, 'ALLOWED')
        else:
            log_event(user.user_id, 'MEMORY_RECALL', mem.memory_id, 'DENIED')

    # Step 3: Generate grounded answer
    # ... LLM call with only accessible_memories
```

## Before vs After

The before/after comparison is the clearest demonstration of why persistent memory matters.

**Without VaultMind** — ask a standard LLM: "Why do we use Redis instead of Kafka?"

The answer is generic. It explains Redis and Kafka in general terms. It has no knowledge of NovaPay's specific history.

**With VaultMind** — ask the same question:

```
Redis was selected for the Notification Service in March 2025.

Why:
Kafka was evaluated but introduced 340ms latency during the notification
migration (INC-184), violating the <200ms SLA.

Alternatives considered:
• Kafka — rejected due to latency
• RabbitMQ — rejected due to lack of team expertise
• Redis — selected

Related incident: INC-184
Original decision: ADR-017
Historical owner: Alex Morgan
Confidence: High

Sources: ADR-017, Incident Report INC-184, Alex Morgan Handover
```

The memory fundamentally changes the answer. That's the point.

## The "Ask the Person Who Left" Scenario

The most compelling demo scenario: Alex Morgan, a senior backend engineer, leaves NovaPay after 4 years. His knowledge exists across architecture decisions, incident reports, and handover notes — all ingested into VaultMind.

A new engineer asks: "What mistakes should I avoid when modifying the payment service?"

VaultMind retrieves Alex's explicit warnings from his handover notes:

1. The exponential backoff with jitter is not over-engineering — it prevents thundering herd (learned from INC-201)
2. The dual-write to MongoDB is a safety net, not dead code
3. The Meridian Bank settlement queue runs at 3pm/5pm EST — don't change without notifying them
4. The idempotency key check uses a DB unique constraint — don't replace with application-level check

Alex left 6 months ago. But his knowledge is still there.

## Security: What's Real and What's Not

I implemented realistic security, not claimed enterprise-grade guarantees.

**What's real:**
- JWT authentication with 8-hour expiry
- RBAC with 5 roles and 5 access levels
- Pre-LLM authorization (memories never reach the LLM if unauthorized)
- Regex-based sensitive data detection (API keys, passwords, PII)
- Audit logging for every memory access

**What's a prototype:**
- Sensitive data detection is regex-based, not ML-based
- No rate limiting
- No encryption at rest

The honest limitation: regex catches obvious patterns. A sophisticated attacker could encode sensitive data in ways that bypass detection. I documented this clearly rather than claiming complete protection.

## What I Learned

The most important lesson: **memory changes agent behavior fundamentally**.

A stateless agent answers questions from its training data. An agent with organizational memory answers from the organization's actual history. These are qualitatively different products.

The second lesson: **classification matters more than storage**. Storing everything as undifferentiated text produces mediocre retrieval. Classifying memories by type — DECISION, INCIDENT, LESSON_LEARNED — lets the agent reason about *what kind* of knowledge it's working with.

The third lesson: **security must be pre-LLM**. If you retrieve confidential information and then decide not to show it, you've already failed. The authorization check must happen before the LLM sees anything.

## What's Next

- Streaming responses for the Why Engine
- Memory graph visualization (connecting related memories visually)
- Slack/Jira integration for automatic memory ingestion
- Memory staleness detection (flagging decisions that may no longer be valid)
- Multi-organization support

The core loop — experience → memory → future question → recall → better decision → new experience — is the product. Everything else is polish.

---

*VaultMind is built with Django, React, MongoDB, Hindsight, and Groq. The full source is available on GitHub.*
