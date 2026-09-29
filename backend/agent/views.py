import json
from groq import Groq
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from agent.engine import ask
from agent.intelligence import (
    compute_risk_radar, compute_knowledge_gaps, compute_conflicts,
    compute_freshness, compute_who_knows, compute_what_changed,
    compute_health, compute_proactive_insights, SYSTEMS
)
from config.mongo import col
from memories.rbac import ROLE_ACCESS
from audit.logger import log_event

client = Groq(api_key=settings.GROQ_API_KEY)


class AskView(APIView):
    def post(self, request):
        question = request.data.get('question', '').strip()
        if not question:
            return Response({'error': 'Question is required'}, status=400)
        log_event(request.vault_user['user_id'], 'AGENT_ASK', '', 'ALLOWED')
        return Response(ask(question, request.vault_user))


class DashboardView(APIView):
    def get(self, request):
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mems = list(col('memories').find({'is_deleted': False, 'access_level': {'$in': allowed}}, {'memory_type': 1}))
        type_counts = {}
        for m in mems:
            t = m.get('memory_type', 'FACT')
            type_counts[t] = type_counts.get(t, 0) + 1
        recent = list(col('audit_logs').find({}, {'_id': 0}).sort('timestamp', -1).limit(5))
        return Response({
            'total_memories': len(mems),
            'decisions': type_counts.get('DECISION', 0),
            'incidents': type_counts.get('INCIDENT', 0),
            'lessons': type_counts.get('LESSON_LEARNED', 0),
            'workarounds': type_counts.get('WORKAROUND', 0),
            'documents': col('documents').count_documents({}),
            'memory_types': type_counts,
            'recent_activity': recent,
        })


# ── Why Chain ─────────────────────────────────────────────────────────────────

class WhyChainView(APIView):
    def post(self, request):
        """Continue a why chain. chain_history is list of {question, answer}."""
        question = request.data.get('question', '').strip()
        chain_history = request.data.get('chain_history', [])
        if not question:
            return Response({'error': 'Question required'}, status=400)

        # Build context from chain so far
        history_context = ''
        if chain_history:
            history_context = '\n\nPrevious chain:\n' + '\n'.join(
                f"Q: {h['question']}\nA: {h['answer']}" for h in chain_history[-3:]
            )

        full_question = question + history_context
        result = ask(full_question, request.vault_user)
        result['chain_step'] = len(chain_history) + 1
        result['can_go_deeper'] = result.get('confidence') not in ('Insufficient evidence',) and result.get('memories_used', 0) > 0
        return Response(result)


# ── Risk Radar ────────────────────────────────────────────────────────────────

class RiskRadarView(APIView):
    def get(self, request):
        role = request.vault_user['role']
        risks = compute_risk_radar(role)
        return Response({'risks': risks, 'total': len(risks)})


# ── Knowledge Gaps ────────────────────────────────────────────────────────────

class KnowledgeGapsView(APIView):
    def get(self, request):
        role = request.vault_user['role']
        gaps = compute_knowledge_gaps(role)
        return Response({'gaps': gaps, 'total_systems': len(gaps)})


# ── Conflict Detector ─────────────────────────────────────────────────────────

class ConflictsView(APIView):
    def get(self, request):
        role = request.vault_user['role']
        conflicts = compute_conflicts(role)
        return Response({'conflicts': conflicts, 'total': len(conflicts)})


# ── Memory Freshness ──────────────────────────────────────────────────────────

class FreshnessView(APIView):
    def get(self, request):
        role = request.vault_user['role']
        results = compute_freshness(role)
        return Response({'memories': results, 'total': len(results)})


# ── Who Knows This ────────────────────────────────────────────────────────────

class WhoKnowsView(APIView):
    def get(self, request):
        system = request.query_params.get('system', '')
        if not system:
            return Response({'error': 'system parameter required'}, status=400)
        result = compute_who_knows(system, request.vault_user['role'])
        return Response(result)


# ── What Changed ──────────────────────────────────────────────────────────────

class WhatChangedView(APIView):
    def get(self, request):
        from_date = request.query_params.get('from', '2024-01')
        to_date = request.query_params.get('to', '2026-12')
        result = compute_what_changed(from_date, to_date, request.vault_user['role'])
        return Response(result)


# ── Knowledge Health ──────────────────────────────────────────────────────────

class HealthView(APIView):
    def get(self, request):
        health = compute_health(request.vault_user['role'])
        insights = compute_proactive_insights(request.vault_user['role'])
        risks = compute_risk_radar(request.vault_user['role'])
        gaps = compute_knowledge_gaps(request.vault_user['role'])
        conflicts = compute_conflicts(request.vault_user['role'])
        freshness = compute_freshness(request.vault_user['role'])
        stale = [f for f in freshness if f['status'] in ('STALE', 'NEEDS_VERIFICATION')]
        return Response({
            'health': health,
            'insights': insights[:6],
            'top_risks': risks[:3],
            'gap_count': sum(g['total_gaps'] for g in gaps),
            'conflict_count': len(conflicts),
            'stale_count': len(stale),
        })


# ── Onboarding Mode ───────────────────────────────────────────────────────────

class OnboardingView(APIView):
    def post(self, request):
        role = request.data.get('role', 'Engineer')
        system = request.data.get('system', '')
        team = request.data.get('team', '')

        if not system:
            return Response({'error': 'system is required'}, status=400)

        # Pull relevant memories from MongoDB directly (no Hindsight round-trip needed)
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mems = list(col('memories').find({
            'is_deleted': False,
            'access_level': {'$in': allowed},
            'system': {'$regex': system, '$options': 'i'},
        }, {'_id': 0}))

        if not mems:
            return Response({'error': f'No memories found for system: {system}'}, status=404)

        context = [{'title': m['title'], 'type': m['memory_type'], 'content': m['content'],
                    'date': m.get('date', ''), 'people': m.get('people', []), 'source': m.get('source', '')}
                   for m in mems[:12]]

        prompt = f"""You are generating an onboarding briefing for a new {role} joining the {team} team who will work on {system}.

Using ONLY the organizational memories below, generate a structured briefing.

Include:
1. System overview
2. Important historical decisions and WHY they were made
3. Major incidents and what was learned
4. Known workarounds (and why they exist)
5. Common mistakes to avoid
6. Current risks
7. People associated with this system
8. Recommended reading (source documents)

Memories:
{json.dumps(context, indent=2)}

Return JSON:
{{
  "system": "{system}",
  "role": "{role}",
  "overview": "...",
  "key_decisions": [{{"decision": "...", "reason": "...", "source": "..."}}],
  "major_incidents": [{{"incident": "...", "lesson": "...", "source": "..."}}],
  "workarounds": [{{"workaround": "...", "reason": "...", "warning": "..."}}],
  "mistakes_to_avoid": ["..."],
  "current_risks": ["..."],
  "people": ["..."],
  "recommended_reading": ["..."],
  "knowledge_risk": "HIGH|MEDIUM|LOW",
  "confidence": "High|Medium|Low"
}}"""

        try:
            resp = client.chat.completions.create(
                model='llama3-8b-8192',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.1,
            )
            raw = resp.choices[0].message.content.strip()
            start, end = raw.find('{'), raw.rfind('}') + 1
            result = json.loads(raw[start:end]) if start >= 0 and end > start else {}
        except Exception as e:
            result = {'error': str(e)}

        result['memories_used'] = len(mems)
        log_event(request.vault_user['user_id'], 'ONBOARDING_BRIEFING', system, 'ALLOWED')
        return Response(result)


# ── Handover Generator ────────────────────────────────────────────────────────

class HandoverView(APIView):
    def post(self, request):
        employee = request.data.get('employee', '')
        systems = request.data.get('systems', [])

        if not employee:
            return Response({'error': 'employee is required'}, status=400)

        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        query = {'is_deleted': False, 'access_level': {'$in': allowed},
                 'people': {'$regex': employee, '$options': 'i'}}
        mems = list(col('memories').find(query, {'_id': 0}))

        if not mems:
            return Response({'error': f'No memories found for employee: {employee}'}, status=404)

        context = [{'title': m['title'], 'type': m['memory_type'], 'content': m['content'],
                    'date': m.get('date', ''), 'system': m.get('system', ''), 'source': m.get('source', '')}
                   for m in mems[:15]]

        prompt = f"""Generate a knowledge handover document for {employee} who is leaving the organization.

Using ONLY the memories below, create a comprehensive handover.

Memories:
{json.dumps(context, indent=2)}

Return JSON:
{{
  "employee": "{employee}",
  "systems_owned": ["..."],
  "architecture_decisions": [{{"decision": "...", "reason": "...", "system": "...", "source": "..."}}],
  "known_incidents": [{{"incident": "...", "resolution": "...", "lesson": "..."}}],
  "workarounds": [{{"workaround": "...", "system": "...", "warning": "..."}}],
  "warnings": ["..."],
  "current_risks": ["..."],
  "knowledge_gaps": ["..."],
  "recommended_documentation": ["..."],
  "confidence": "High|Medium|Low",
  "caveat": "Information labeled [INFERRED] is based on related memories, not direct statements."
}}"""

        try:
            resp = client.chat.completions.create(
                model='llama3-8b-8192',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.1,
            )
            raw = resp.choices[0].message.content.strip()
            start, end = raw.find('{'), raw.rfind('}') + 1
            result = json.loads(raw[start:end]) if start >= 0 and end > start else {}
        except Exception as e:
            result = {'error': str(e)}

        result['memories_used'] = len(mems)
        log_event(request.vault_user['user_id'], 'HANDOVER_GENERATED', employee, 'ALLOWED')
        return Response(result)


# ── Decision Evolution ────────────────────────────────────────────────────────

class DecisionEvolutionView(APIView):
    def get(self, request):
        topic = request.query_params.get('topic', '')
        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])

        query = {'is_deleted': False, 'access_level': {'$in': allowed},
                 'memory_type': {'$in': ['DECISION', 'DECISION_REASON', 'INCIDENT', 'WORKAROUND', 'LESSON_LEARNED']}}
        if topic:
            query['$or'] = [
                {'title': {'$regex': topic, '$options': 'i'}},
                {'content': {'$regex': topic, '$options': 'i'}},
                {'tags': {'$regex': topic, '$options': 'i'}},
            ]

        mems = list(col('memories').find(query, {'_id': 0}).sort('date', 1))
        events = []
        for m in mems:
            if m.get('date'):
                events.append({
                    'memory_id': m['memory_id'],
                    'title': m['title'],
                    'date': m['date'],
                    'memory_type': m['memory_type'],
                    'system': m.get('system', ''),
                    'people': m.get('people', []),
                    'source': m.get('source', ''),
                    'summary': m['content'][:200],
                })
        return Response({'events': events, 'topic': topic, 'total': len(events)})


# ── Impact Analysis ───────────────────────────────────────────────────────────

class ImpactAnalysisView(APIView):
    def post(self, request):
        topic = request.data.get('topic', '').strip()
        if not topic:
            return Response({'error': 'topic is required'}, status=400)

        allowed = ROLE_ACCESS.get(request.vault_user['role'], ['PUBLIC'])
        mems = list(col('memories').find({
            'is_deleted': False,
            'access_level': {'$in': allowed},
            '$or': [
                {'content': {'$regex': topic, '$options': 'i'}},
                {'title': {'$regex': topic, '$options': 'i'}},
                {'tags': {'$regex': topic, '$options': 'i'}},
            ]
        }, {'_id': 0}))

        systems = list({m.get('system') for m in mems if m.get('system')})
        incidents = [m['title'] for m in mems if m['memory_type'] == 'INCIDENT']
        decisions = [m['title'] for m in mems if m['memory_type'] in ('DECISION', 'DECISION_REASON')]
        workarounds = [m['title'] for m in mems if m['memory_type'] == 'WORKAROUND']
        people = list({p for m in mems for p in m.get('people', [])})

        risk = 'HIGH' if len(mems) >= 6 else 'MEDIUM' if len(mems) >= 3 else 'LOW'

        return Response({
            'topic': topic,
            'affected_systems': systems,
            'related_decisions': decisions[:5],
            'related_incidents': incidents[:5],
            'related_workarounds': workarounds[:5],
            'people_involved': people[:6],
            'total_related_memories': len(mems),
            'risk': risk,
            'reason': f'{topic} is referenced in {len(mems)} memories across {len(systems)} systems.',
            'evidence': [m['title'] for m in mems[:6]],
        })
