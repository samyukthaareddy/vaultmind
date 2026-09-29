# VaultMind Demo Script (3 minutes)

## 0:00–0:20 — The Problem

> "When an experienced engineer leaves a company, we don't just lose a person.
> We lose the context behind thousands of decisions.
> Why was Redis chosen? Why does this retry logic look unusual? What happened in that incident last year?
> That knowledge lives in people's heads — and when they leave, it's gone."

**Show**: Alex Morgan's profile — Senior Backend Engineer, 4 years at NovaPay, left June 2025.

---

## 0:20–0:45 — Without Memory

**Login as**: `new.engineer@novapay.com`

**Go to**: Ask Memory

**Ask**: "Why do we use Redis instead of Kafka?"

**Show**: Generic answer — no historical context, no reasons, no incidents.

> "A standard AI agent has no memory of what the organization has learned."

---

## 0:45–1:00 — Introducing VaultMind

**Go to**: Ingest page

> "VaultMind ingests organizational documents — handover notes, incident reports, architecture decisions —
> extracts meaningful memories, and stores them in Hindsight, a persistent memory layer."

**Show**: The document ingestion form with Alex Morgan's handover notes template.

---

## 1:00–1:40 — With Institutional Memory

**Go to**: Ask Memory

**Ask**: "Why do we use Redis instead of Kafka?"

**Show the answer**:
- Decision: ADR-017
- Reason: Kafka caused 340ms latency during INC-184
- Alternatives considered: Kafka, RabbitMQ, Redis
- Related incident: INC-184
- People: Alex Morgan, Sarah Chen
- Source: ADR-017, Incident Report INC-184
- Confidence: High

> "VaultMind doesn't just answer WHAT — it answers WHY, with sources and historical context."

**Expand memory trace** to show the reasoning chain.

---

## 1:40–2:10 — Lessons from the Past

**Ask**: "What mistakes should I avoid when modifying the payment service?"

**Show**:
- Alex Morgan's explicit warnings
- The exponential backoff jitter pattern and why it exists
- The dual-write pattern and why it's not dead code
- The Meridian Bank settlement schedule

> "Alex left 6 months ago. But his knowledge is still here."

---

## 2:10–2:30 — Security Demo

**Logout → Login as**: `sales.rep@novapay.com` (SALES role)

**Ask**: "What are the contract terms with Meridian Bank?"

**Show**: ACCESS DENIED — insufficient permissions.

> "Authorization is enforced before the LLM ever sees the memory.
> The Sales team can't access confidential customer contracts."

---

## 2:30–2:50 — Memory Timeline

**Go to**: Timeline

**Show**: NovaPay organizational history — 2024 to 2025.

Click on INC-184 → see the incident detail, related decision, people involved.

> "Every event is connected. Click any point in history to see what happened and why."

---

## 2:50–3:00 — Close

**Go to**: Dashboard

> "We aren't building an AI that knows everything.
> We're building an AI that remembers what the organization has learned.
> VaultMind — when people leave, their knowledge shouldn't."

---

## Key Demo Questions

1. "Why do we use Redis instead of Kafka?"
2. "What happened during Incident 184?"
3. "What mistakes should I avoid when modifying the payment service?"
4. "Who was Alex Morgan and what did he warn us about?"
5. "Have we had any fraud detection failures?"
6. "What should I know before modifying the notification service?"
