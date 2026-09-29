"""VaultMind test suite — run: python -m pytest tests/ -v"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import django
django.setup()

from unittest.mock import patch, MagicMock


# ── PII / Security ────────────────────────────────────────────────────────────
from security.pii import scan, redact, is_safe

def test_api_key_detected():
    assert 'api_key' in scan("api_key = 'sk-abc123def456ghi789jkl'")

def test_password_detected():
    assert 'password' in scan("password = 'supersecret123'")

def test_aws_key_detected():
    assert 'aws_key' in scan("AKIAIOSFODNN7EXAMPLE")

def test_email_detected():
    assert 'email' in scan("Contact user@example.com for details")

def test_pii_is_unsafe():
    assert is_safe("Contact user@example.com")[0] is False
    assert is_safe("Call +1 (415) 555-0198")[0] is False

def test_clean_text_is_safe():
    safe, _ = is_safe("Redis was selected for the Notification Service due to lower latency.")
    assert safe is True

def test_api_key_makes_unsafe():
    safe, _ = is_safe("api_key = 'sk-realkey12345678901234'")
    assert safe is False

def test_redact_removes_password():
    redacted = redact("password = 'mysecret'")
    assert 'mysecret' not in redacted
    assert 'REDACTED' in redacted


# ── RBAC ──────────────────────────────────────────────────────────────────────
from memories.rbac import ROLE_ACCESS

def test_admin_can_access_all():
    for level in ['PUBLIC','INTERNAL','TEAM_ONLY','CONFIDENTIAL','RESTRICTED']:
        assert level in ROLE_ACCESS['ADMIN']

def test_sales_limited_access():
    assert 'PUBLIC' in ROLE_ACCESS['SALES']
    assert 'CONFIDENTIAL' not in ROLE_ACCESS['SALES']
    assert 'RESTRICTED' not in ROLE_ACCESS['SALES']

def test_engineer_no_confidential():
    assert 'CONFIDENTIAL' not in ROLE_ACCESS['ENGINEER']
    assert 'RESTRICTED' not in ROLE_ACCESS['ENGINEER']

def test_hr_can_access_confidential():
    assert 'CONFIDENTIAL' in ROLE_ACCESS['HR']
    assert 'RESTRICTED' not in ROLE_ACCESS['HR']


# ── Hindsight integration (mocked) ───────────────────────────────────────────
from memories.hindsight import retain, recall

def test_retain_calls_hindsight():
    with patch('memories.hindsight._get_or_create_bank', return_value='vaultmind'), patch('memories.hindsight.requests.post') as mock:
        mock.return_value = MagicMock(status_code=200, json=lambda: {'success': True, 'operation_id': None})
        mock.return_value.raise_for_status = lambda: None
        result = retain("Test memory", {'memory_type': 'FACT'}, user_id='u1', memory_id='vm-123')
        assert mock.called
        assert result.get('id') is None
        payload = mock.call_args.kwargs['json']
        assert payload['items'][0]['context'].endswith('VaultMind memory ID: vm-123')

def test_recall_returns_list():
    with patch('memories.hindsight._get_or_create_bank', return_value='vaultmind'), patch('memories.hindsight.requests.post') as mock:
        mock.return_value = MagicMock(status_code=200, json=lambda: {'results': [{'id': 'hs-1', 'text': 'Memory text', 'context': 'source'}]})
        mock.return_value.raise_for_status = lambda: None
        results = recall("Why Redis?", user_id='u1')
        assert results == [{'id': 'hs-1', 'text': 'Memory text', 'context': 'source'}]

def test_recall_empty_on_error():
    with patch('memories.hindsight._get_or_create_bank', return_value='vaultmind'), patch('memories.hindsight.requests.post', side_effect=Exception("Network error")):
        assert recall("test") == []

def test_retain_handles_error():
    with patch('memories.hindsight._get_or_create_bank', return_value='vaultmind'), patch('memories.hindsight.requests.post', side_effect=Exception("Timeout")):
        result = retain("content", {})
        assert 'error' in result
        assert result['hindsight_id'] is None


# ── Auth ──────────────────────────────────────────────────────────────────────
import hashlib, jwt
from django.conf import settings

def test_password_hash_uses_salted_django_hash():
    from users.passwords import hash_password, verify_password
    encoded = hash_password('a-strong-password')
    assert encoded != hash_password('a-strong-password')
    assert verify_password('a-strong-password', encoded) == (True, False)
    assert verify_password('wrong-password', encoded) == (False, False)

def test_legacy_password_is_accepted_for_upgrade():
    from users.passwords import verify_password
    legacy = hashlib.sha256(b'legacy-password').hexdigest()
    assert verify_password('legacy-password', legacy) == (True, True)

def test_jwt_contains_user_id():
    payload = {'user_id': 'uid-1', 'email': 'x@x.com', 'role': 'ENGINEER', 'name': 'X',
               'exp': __import__('datetime').datetime.utcnow() + __import__('datetime').timedelta(hours=1)}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    assert decoded['user_id'] == 'uid-1'
    assert decoded['role'] == 'ENGINEER'


# ── Extractor ─────────────────────────────────────────────────────────────────
from documents.extractor import extract_memories

def test_extractor_handles_llm_error():
    with patch('documents.extractor.client') as mock:
        mock.chat.completions.create.side_effect = Exception("LLM error")
        assert extract_memories("content", "doc") == []

def test_extractor_parses_json():
    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = '[{"title":"T","content":"C","memory_type":"DECISION","system":"S","people":[],"tags":[],"date":"2025-01","confidence":"High","access_level":"INTERNAL"}]'
    with patch('documents.extractor.client') as mock:
        mock.chat.completions.create.return_value = mock_resp
        result = extract_memories("content", "doc")
        assert len(result) == 1
        assert result[0]['title'] == 'T'
