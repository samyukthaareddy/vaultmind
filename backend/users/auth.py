import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from config.mongo import col


class VaultUser(dict):
    """A dict subclass that also satisfies DRF's IsAuthenticated check."""
    is_authenticated = True
    is_active = True


class VaultJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return None
        token = auth.split(' ', 1)[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_data = col('users').find_one({'user_id': payload['user_id'], 'is_active': True})
            if not user_data:
                raise AuthenticationFailed('User not found')
            user_data.pop('_id', None)
            user = VaultUser(user_data)
            request.vault_user = user
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
