import hashlib
import hmac

from django.contrib.auth.hashers import check_password, make_password


def hash_password(password: str) -> str:
    return make_password(password)


def verify_password(password: str, encoded: str) -> tuple[bool, bool]:
    if check_password(password, encoded):
        return True, False

    if len(encoded) == 64 and all(char in '0123456789abcdef' for char in encoded.lower()):
        legacy_hash = hashlib.sha256(password.encode()).hexdigest()
        if hmac.compare_digest(legacy_hash, encoded.lower()):
            return True, True

    return False, False