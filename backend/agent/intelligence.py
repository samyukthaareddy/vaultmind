"""
Intelligence analytics — computed from existing MongoDB memories.
Powers: Risk Radar, Gap Detector, Conflict Detector, Freshness, Who Knows This, What Changed.
No new external dependencies. Reuses existing col() and ROLE_ACCESS.
"""
import re
from collections import defaultdict
from config.mongo import col
from memories.rbac import ROLE_ACCESS

SYSTEMS = ['Payment Service', 'Notification Service', 'Authentication Service', 'Fraud Detection', 'Customer Portal']


def _get_memories(role='ADMIN'):
    allowed = ROLE_ACCESS.get(role, ['PUBLIC'])
    return list(col('memories').find({'is_deleted': False, 'access_level': {'$in': allowed}}, {'_id': 0}))


# ── Risk Radar ────────────────────────────────────────────────────────────────

def compute_risk_radar(role='ADMIN'):
    mems = _get_memories(role)
    risks = []
    system_mems = defaultdict(list)
    for m in mems:
        s = m.get('system', '')
        if s:
            system_mems[s].append(m)

    for system, smems in system_mems.items():
        person_counts = defaultdict(int)
        for m in smems:
            for p in m.get('people', []):
                person_counts[p] += 1

        total = len(smems)
        if total == 0:
            continue

        top_person = max(person_counts, key=person_counts.get) if person_counts else None
        top_count = person_counts[top_person] if top_person else 0
        concentration = round(top_count / total * 100) if total else 0
        other_holders = [p for p in person_counts if p != top_person and person_counts[p] >= 2]

        workarounds = [m for m in smems if m.get('memory_type') == 'WORKAROUND']
        incidents = [m for m in smems if m.get('memory_type') == 'INCIDENT']
        lessons = [m for m in smems if m.get('memory_type') == 'LESSON_LEARNED']
        decisions = [m for m in smems if m.get('memory_type') == 'DECISION']

        # Determine risk level
        risk_level = 'LOW'
        reasons = []
        if concentration >= 70 and top_person:
            risk_level = 'HIGH'
            reasons.append(f'Critical knowledge is {concentration}% concentrated in {top_person}')
        elif concentration >= 50 and top_person:
            risk_level = 'MEDIUM'
            reasons.append(f'Knowledge is {concentration}% concentrated in {top_person}')
        if len(workarounds) >= 2:
            if risk_level == 'LOW':
                risk_level = 'MEDIUM'
            reasons.append(f'{len(workarounds)} undocumented workarounds depend on tribal knowledge')
        if incidents and not lessons:
            if risk_level == 'LOW':
                risk_level = 'MEDIUM'
            reasons.append(f'{len(incidents)} incidents with no documented lessons learned')
        if total < 3:
            if risk_level == 'LOW':
                risk_level = 'MEDIUM'
            reasons.append('Very few memories documented for this system')

        risks.append({
            'system': system,
            'risk_level': risk_level,
            'primary_holder': top_person,
            'concentration_pct': concentration,
            'total_memories': total,
            'other_holders': other_holders,
            'workarounds': len(workarounds),
            'incidents': len(incidents),
            'decisions': len(decisions),
            'reasons': reasons,
            'evidence': [m['title'] for m in smems[:5]],
        })

    risks.sort(key=lambda r: {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}[r['risk_level']])
    return risks


# ── Knowledge Gap Detector ────────────────────────────────────────────────────

def compute_knowledge_gaps(role='ADMIN'):
    mems = _get_memories(role)
    gaps = []
    system_mems = defaultdict(list)
    for m in mems:
        s = m.get('system', '')
        if s:
            system_mems[s].append(m)

    for system, smems in system_mems.items():
        system_gaps = []
        types_present = {m['memory_type'] for m in smems}

        if 'INCIDENT' in types_present and 'LESSON_LEARNED' not in types_present:
            incidents = [m['title'] for m in smems if m['memory_type'] == 'INCIDENT']
            system_gaps.append({
                'gap': f'System has {len(incidents)} incident(s) but no documented lessons learned',
                'evidence': incidents[:3], 'severity': 'HIGH'
            })

        if 'DECISION' in types_present and 'DECISION_REASON' not in types_present:
            decisions = [m['title'] for m in smems if m['memory_type'] == 'DECISION']
            system_gaps.append({
                'gap': f'{len(decisions)} decision(s) have no documented reasoning',
                'evidence': decisions[:3], 'severity': 'MEDIUM'
            })

        if 'WORKAROUND' in types_present and 'PROCESS' not in types_present:
            wks = [m['title'] for m in smems if m['memory_type'] == 'WORKAROUND']
            system_gaps.append({
                'gap': f'{len(wks)} workaround(s) exist with no formal process documentation',
                'evidence': wks[:3], 'severity': 'MEDIUM'
            })

        if 'RISK' in types_present:
            risks = [m for m in smems if m['memory_type'] == 'RISK']
            unowned = [r['title'] for r in risks if not r.get('people')]
            if unowned:
                system_gaps.append({
                    'gap': f'{len(unowned)} risk(s) have no identified owner',
                    'evidence': unowned[:3], 'severity': 'HIGH'
                })

        all_people = {p for m in smems for p in m.get('people', [])}
        if len(all_people) <= 1:
            system_gaps.append({
                'gap': 'No secondary knowledge owner identified — single point of failure',
                'evidence': [f'Only {list(all_people)[0] if all_people else "unknown"} associated with this system'],
                'severity': 'HIGH'
            })

        if system_gaps:
            gaps.append({'system': system, 'gaps': system_gaps, 'total_gaps': len(system_gaps)})

    gaps.sort(key=lambda g: g['total_gaps'], reverse=True)
    return gaps


# ── Memory Conflict Detector ──────────────────────────────────────────────────

def compute_conflicts(role='ADMIN'):
    mems = _get_memories(role)
    conflicts = []

    # Look for numeric contradictions and keyword conflicts
    CONFLICT_PATTERNS = [
        (r'retri(?:es|ed?)\s+(\d+)\s+times?', 'Retry count'),
        (r'expires?\s+in\s+(\d+)\s+hours?', 'Token expiry'),
        (r'(\d+)ms\s+(?:latency|timeout|sla)', 'Latency/SLA value'),
        (r'version\s+(\d+)', 'Version number'),
        (r'(\d+)\s+(?:retries|attempts)', 'Retry attempts'),
    ]

    for pattern, topic in CONFLICT_PATTERNS:
        matches = []
        for m in mems:
            found = re.findall(pattern, m['content'], re.IGNORECASE)
            if found:
                matches.append({'memory': m, 'values': found})

        if len(matches) >= 2:
            unique_values = set()
            for match in matches:
                unique_values.update(match['values'])
            if len(unique_values) >= 2:
                conflicts.append({
                    'topic': topic,
                    'conflict_type': 'NUMERIC_CONTRADICTION',
                    'memories': [{
                        'title': match['memory']['title'],
                        'values': match['values'],
                        'source': match['memory'].get('source', ''),
                        'date': match['memory'].get('date', ''),
                        'memory_type': match['memory']['memory_type'],
                        'system': match['memory'].get('system', ''),
                        'memory_id': match['memory']['memory_id'],
                    } for match in matches[:3]],
                    'unique_values': list(unique_values),
                    'suggested_interpretation': (
                        'The most recent source may represent the current state, '
                        'but verification is recommended before making changes.'
                    ),
                    'status': 'CONFLICTING_INFORMATION',
                })

    return conflicts


# ── Memory Freshness ──────────────────────────────────────────────────────────

def compute_freshness(role='ADMIN'):
    mems = _get_memories(role)
    results = []

    for m in mems:
        date_str = m.get('date', '')
        if not date_str:
            continue
        try:
            year, month = int(date_str[:4]), int(date_str[5:7]) if len(date_str) >= 7 else 1
        except (ValueError, IndexError):
            continue

        # Age in months (approximate, relative to 2026-01)
        age_months = (2026 - year) * 12 + (1 - month)

        if age_months <= 3:
            status = 'FRESH'
        elif age_months <= 9:
            status = 'AGING'
        elif age_months <= 18:
            status = 'STALE'
        else:
            status = 'NEEDS_VERIFICATION'

        # Check for newer conflicting memories on same system
        newer_related = []
        if m.get('system'):
            for other in mems:
                if other['memory_id'] == m['memory_id']:
                    continue
                if other.get('system') == m.get('system') and other.get('date', '') > date_str:
                    newer_related.append(other['title'])

        if status in ('STALE', 'NEEDS_VERIFICATION') or newer_related:
            results.append({
                'memory_id': m['memory_id'],
                'title': m['title'],
                'date': date_str,
                'age_months': age_months,
                'status': status,
                'system': m.get('system', ''),
                'memory_type': m['memory_type'],
                'newer_related': newer_related[:2],
                'recommended_action': 'Verify this memory is still accurate' if status != 'FRESH' else None,
            })

    results.sort(key=lambda r: {'NEEDS_VERIFICATION': 0, 'STALE': 1, 'AGING': 2, 'FRESH': 3}[r['status']])
    return results


# ── Who Knows This ────────────────────────────────────────────────────────────

def compute_who_knows(system, role='ADMIN'):
    mems = _get_memories(role)
    system_mems = [m for m in mems if m.get('system', '').lower() == system.lower()]
    if not system_mems:
        # fuzzy match
        system_mems = [m for m in mems if system.lower() in m.get('system', '').lower()]

    total = len(system_mems)
    person_scores = defaultdict(lambda: {'count': 0, 'decisions': 0, 'incidents': 0, 'workarounds': 0})

    for m in system_mems:
        for p in m.get('people', []):
            person_scores[p]['count'] += 1
            if m['memory_type'] == 'DECISION':
                person_scores[p]['decisions'] += 1
            elif m['memory_type'] == 'INCIDENT':
                person_scores[p]['incidents'] += 1
            elif m['memory_type'] == 'WORKAROUND':
                person_scores[p]['workarounds'] += 1

    people = []
    for person, scores in person_scores.items():
        pct = round(scores['count'] / total * 100) if total else 0
        people.append({
            'name': person,
            'percentage': pct,
            'memory_count': scores['count'],
            'decisions': scores['decisions'],
            'incidents': scores['incidents'],
            'workarounds': scores['workarounds'],
            'explanation': f"{scores['count']} memories, {scores['decisions']} decisions, {scores['incidents']} incidents",
        })

    people.sort(key=lambda p: p['percentage'], reverse=True)
    doc_types = {'SYSTEM_KNOWLEDGE', 'PROCESS', 'DECISION', 'DECISION_REASON'}
    doc_mems = [m for m in system_mems if m['memory_type'] in doc_types]
    doc_coverage = round(len(doc_mems) / total * 100) if total else 0

    return {
        'system': system,
        'total_memories': total,
        'people': people,
        'documentation_coverage': doc_coverage,
        'risk': 'HIGH' if people and people[0]['percentage'] >= 70 else 'MEDIUM' if people and people[0]['percentage'] >= 50 else 'LOW',
    }


# ── What Changed ──────────────────────────────────────────────────────────────

def compute_what_changed(from_date, to_date, role='ADMIN'):
    mems = _get_memories(role)
    changed = [m for m in mems if from_date <= m.get('date', '') <= to_date]
    by_type = defaultdict(list)
    for m in changed:
        by_type[m['memory_type']].append({'title': m['title'], 'date': m.get('date'), 'system': m.get('system'), 'memory_id': m['memory_id']})
    return {
        'from_date': from_date,
        'to_date': to_date,
        'total_changes': len(changed),
        'by_type': dict(by_type),
        'systems_affected': list({m.get('system') for m in changed if m.get('system')}),
    }


# ── Knowledge Health Score ────────────────────────────────────────────────────

def compute_health(role='ADMIN'):
    mems = _get_memories(role)
    if not mems:
        return {'overall': 0, 'metrics': {}}

    total = len(mems)
    systems = {m.get('system') for m in mems if m.get('system')}

    # Decision documentation: decisions with reasons
    decisions = [m for m in mems if m['memory_type'] == 'DECISION']
    reasons = [m for m in mems if m['memory_type'] == 'DECISION_REASON']
    decision_doc = round(min(len(reasons) / max(len(decisions), 1), 1) * 100)

    # Incident knowledge: incidents with lessons
    incidents = [m for m in mems if m['memory_type'] == 'INCIDENT']
    lessons = [m for m in mems if m['memory_type'] == 'LESSON_LEARNED']
    incident_knowledge = round(min(len(lessons) / max(len(incidents), 1), 1) * 100)

    # Knowledge distribution: avg people per memory
    people_counts = [len(m.get('people', [])) for m in mems]
    avg_people = sum(people_counts) / total if total else 0
    distribution = round(min(avg_people / 3, 1) * 100)

    # Memory freshness: % not stale
    fresh_count = sum(1 for m in mems if m.get('date', '') >= '2025-01')
    freshness = round(fresh_count / total * 100)

    # Conflict rate: inverse of conflicts found
    conflicts = compute_conflicts(role)
    conflict_rate = round(max(0, 100 - len(conflicts) * 15))

    # Memory coverage: systems with >3 memories
    covered = sum(1 for s in systems if sum(1 for m in mems if m.get('system') == s) >= 3)
    coverage = round(covered / max(len(systems), 1) * 100)

    overall = round((decision_doc + incident_knowledge + distribution + freshness + conflict_rate + coverage) / 6)

    return {
        'overall': overall,
        'metrics': {
            'memory_coverage': coverage,
            'decision_documentation': decision_doc,
            'incident_knowledge': incident_knowledge,
            'knowledge_distribution': distribution,
            'memory_freshness': freshness,
            'conflict_rate': conflict_rate,
        },
        'total_memories': total,
        'systems': len(systems),
    }


# ── Proactive Insights ────────────────────────────────────────────────────────

def compute_proactive_insights(role='ADMIN'):
    insights = []
    risks = compute_risk_radar(role)
    gaps = compute_knowledge_gaps(role)
    conflicts = compute_conflicts(role)
    freshness = compute_freshness(role)

    for r in risks:
        if r['risk_level'] == 'HIGH':
            insights.append({
                'type': 'RISK',
                'severity': 'HIGH',
                'message': f"{r['system']}: knowledge {r['concentration_pct']}% concentrated in {r['primary_holder']}",
                'system': r['system'],
                'action': 'Consider knowledge transfer sessions',
            })

    for g in gaps[:3]:
        for gap in g['gaps']:
            if gap['severity'] == 'HIGH':
                insights.append({
                    'type': 'GAP',
                    'severity': 'HIGH',
                    'message': f"{g['system']}: {gap['gap']}",
                    'system': g['system'],
                    'action': 'Document missing knowledge',
                })

    for c in conflicts[:2]:
        insights.append({
            'type': 'CONFLICT',
            'severity': 'MEDIUM',
            'message': f"Conflicting information detected: {c['topic']}",
            'action': 'Verify and resolve conflicting memories',
        })

    stale = [f for f in freshness if f['status'] == 'NEEDS_VERIFICATION'][:2]
    for s in stale:
        insights.append({
            'type': 'STALENESS',
            'severity': 'LOW',
            'message': f"Memory may be outdated ({s['age_months']} months old): {s['title'][:60]}",
            'system': s.get('system', ''),
            'action': 'Verify this memory is still accurate',
        })

    return insights
