# VaultMind — Institutional Memory Agent

> **When people leave, their knowledge shouldn't.**

VaultMind is an AI-powered institutional memory system that preserves organizational knowledge — decisions, incidents, workarounds, and lessons — and lets employees retrieve not just *what* happened, but *why*.

---

## The Problem

When an experienced engineer leaves, the company loses more than a person. It loses:

- The reasoning behind architectural decisions
- Undocumented workarounds and why they exist
- Lessons from past incidents
- Customer-specific requirements
- The context behind thousands of small choices

This knowledge is scattered across Slack threads, tickets, documents, and people's memories. When those people leave, it's gone.

---

## The Solution

VaultMind ingests organizational documents, extracts meaningful memories using an LLM, stores them in **Hindsight** (persistent memory), and answers questions like:

> Why do we use Redis instead of Kafka?
> What mistakes should I avoid when modifying the payment service?
> What happened during Incident 184?
> Who was Alex Morgan and what did he warn us about?

The answer includes: the decision, the reason, alternatives considered, related incidents, people involved, and source documents.

---

## Features

- **Why Engine** — answers not just what, but why decisions were made
- **Hindsight persistent memory** — central memory layer for all organizational knowledge
- **Memory classification** — DECISION, INCIDENT, WORKAROUND, LESSON_LEARNED, RISK, and more
- **Role-based access control** — ADMIN, ENGINEER, MANAGER, SALES, HR with memory access levels
- **Sensitive data detection** — API keys, passwords, PII, financial data blocked before storage
- **Memory timeline** — visual organizational history
- **Source attribution** — every answer cites its sources
- **Confidence scoring** — High / Medium / Low / Insufficient evidence
- **Audit logging** — every memory access logged with result
- **Document ingestion** — LLM extracts memories from uploaded documents

---

## Architecture

```
React UI (Vite + Tailwind)
        │
        ▼
Django REST API
        │
   ┌────┴────┐
   │         │
Security   Memory Manager
Layer      (Hindsight retain/recall)
   │         │
RBAC      Groq LLM
PII scan      │
Audit      MongoDB
           (metadata)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Django 4.2, Django REST Framework |
| Database | MongoDB (via Djongo) |
| Memory | **Hindsight** (retain + recall) |
| LLM | Groq (llama3-8b-8192) |
| Auth | JWT (custom implementation) |

---

## Hindsight Integration

Hindsight is the **central memory layer** — not a decorative feature.

Every memory extracted from a document is stored via `hindsight.retain()`.
Every question triggers `hindsight.recall()` to retrieve relevant memories.
RBAC filtering happens **after** recall but **before** the LLM sees any content.

Key files:
- `backend/memories/hindsight.py` — retain, recall, delete
- `backend/memories/views.py` — MemoryRetainView, MemoryRecallView
- `backend/agent/engine.py` — the Why Engine using Hindsight recall

---

## Security Architecture

### Authentication
JWT tokens, 8-hour expiry, custom middleware.

### RBAC
| Role | PUBLIC | INTERNAL | TEAM_ONLY | CONFIDENTIAL | RESTRICTED |
|------|--------|----------|-----------|--------------|------------|
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✓ | ✓ | ✓ | ✗ |
| ENGINEER | ✓ | ✓ | ✓ | ✗ | ✗ |
| HR | ✓ | ✓ | ✗ | ✓ | ✗ |
| SALES | ✓ | ✓ | ✗ | ✗ | ✗ |

Authorization is enforced **before** memories are passed to the LLM.

### Sensitive Data Detection
Regex-based detection of: API keys, passwords, tokens, AWS keys, emails, phone numbers, SSNs, credit cards, private keys.

**Limitation**: regex-based only; not a complete enterprise DLP solution.

---

## Demo Company: NovaPay

Fictional fintech company with:
- 10+ employees across Engineering, Sales, HR, Management
- 5 systems: Payment Service, Notification Service, Auth Service, Fraud Detection, Customer Portal
- 20+ memories: decisions, incidents, workarounds, lessons, customer requirements
- Alex Morgan — senior engineer who left, whose knowledge lives in VaultMind

---

## Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB 6+
- Hindsight API key
- Groq API key

### Backend

```bash
cd vaultmind/backend
cp .env.example .env
# Edit .env with your API keys
pip install -r requirements.txt
python manage.py migrate
python ../data/demo/load_demo_standalone.py
python manage.py runserver
```

### Frontend

```bash
cd vaultmind/frontend
npm install
npm run dev
```

### Docker

```bash
cp vaultmind/backend/.env.example vaultmind/backend/.env
# Edit .env
docker-compose up
```

---

## Environment Variables

```
DJANGO_SECRET_KEY=     # Django secret key
MONGODB_URI=           # MongoDB connection string
MONGODB_DB=            # Database name (default: vaultmind)
HINDSIGHT_API_KEY=     # Hindsight API key
HINDSIGHT_URL=         # Hindsight API base URL
GROQ_API_KEY=          # Groq API key
```

---

## API Endpoints

```
POST /api/auth/login           Login
POST /api/auth/register        Register
GET  /api/auth/me              Current user

POST /api/documents/upload     Ingest document → extract memories → Hindsight retain
GET  /api/documents/           List documents

POST /api/memory/retain        Store a memory in Hindsight
POST /api/memory/recall        Recall memories from Hindsight
GET  /api/memory/              List accessible memories
GET  /api/memory/<id>          Memory detail (RBAC enforced)
DELETE /api/memory/<id>        Delete memory (ADMIN only)
GET  /api/memory/timeline/events  Timeline events

POST /api/agent/ask            Ask the Why Engine
GET  /api/agent/dashboard      Dashboard stats

GET  /api/audit/               Audit log (ADMIN/MANAGER)
GET  /api/admin/users          User list (ADMIN)
PATCH /api/admin/users/<id>/role  Update role (ADMIN)
```

---

## Running Tests

```bash
cd vaultmind/backend
pip install pytest
python -m pytest tests/ -v
```

---

## Limitations

- Sensitive data detection is regex-based, not ML-based
- Hindsight deletion support depends on the actual API capabilities
- Memory extraction quality depends on Groq LLM response quality
- No real-time collaboration or streaming responses
- Demo data is synthetic

---

## Demo Flow

1. Login as `new.engineer@novapay.com` (ENGINEER role)
2. Go to **Ask Memory** → ask "Why do we use Redis instead of Kafka?"
3. See the historical answer with decision, reason, incident, sources
4. Ask "What mistakes should I avoid when modifying the payment service?"
5. See Alex Morgan's warnings preserved in memory
6. Login as `sales.rep@novapay.com` (SALES role)
7. Ask about confidential customer contracts → ACCESS DENIED
8. Go to **Timeline** → see NovaPay organizational history
9. Login as `admin@novapay.com` → check **Audit Log**
