"""
Sensitive data detection.
Detects API keys, passwords, tokens, PII, financial info.
Limitation: regex-based; not a complete enterprise DLP solution.
"""
import re

PATTERNS = {
    'api_key':    r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\']?[\w\-]{16,}',
    'password':   r'(?i)(password|passwd|pwd)\s*[:=]\s*["\']?\S+',
    'token':      r'(?i)(token|secret|bearer)\s*[:=]\s*["\']?[\w\-\.]{16,}',
    'aws_key':    r'AKIA[0-9A-Z]{16}',
    'email':      r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
    'phone':      r'\b(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?\d{4})\b',
    'ssn':        r'\b\d{3}-\d{2}-\d{4}\b',
    'credit_card':r'\b(?:\d[ -]?){13,16}\b',
    'private_key':r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
    'financial_data': r'(?i)\b(?:salary|compensation|account balance|contract value|bank account)\b[^\n]{0,50}(?:\$|USD\s*)\s?\d[\d,.]*',
}


def scan(text: str) -> dict:
    """Returns dict of detected sensitive data types."""
    findings = {}
    for name, pattern in PATTERNS.items():
        count = sum(1 for _ in re.finditer(pattern, text))
        if count:
            findings[name] = count
    return findings


def redact(text: str) -> str:
    """Redact sensitive patterns from text."""
    result = text
    for name, pattern in PATTERNS.items():
        result = re.sub(pattern, f'[REDACTED:{name.upper()}]', result)
    return result


def is_safe(text: str) -> tuple[bool, dict]:
    """Returns (is_safe, findings). Safe if no high-risk patterns found."""
    findings = scan(text)
    return len(findings) == 0, findings
