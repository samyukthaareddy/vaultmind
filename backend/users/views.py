import uuid, datetime
import jwt
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from config.mongo import col
from users.passwords import hash_password, verify_password


def make_token(user):
    payload = {
        'user_id': user['user_id'], 'email': user['email'],
        'role': user['role'], 'name': user['name'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def user_dict(u):
    return {k: u[k] for k in ('user_id','email','name','role','department','is_active') if k in u}


class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        d = request.data
        email = d.get('email', '').strip().lower()
        name = d.get('name', '').strip()
        password = d.get('password', '')
        if not email or not name or not isinstance(password, str) or len(password) < 8:
            return Response({'error': 'Email, name, and a password of at least 8 characters are required'}, status=400)
        if col('users').find_one({'email': email}):
            return Response({'error': 'Email already registered'}, status=400)
        user = {
            'user_id': str(uuid.uuid4()), 'email': email, 'name': name,
            'password_hash': hash_password(password), 'role': 'ENGINEER',
            'department': d.get('department', ''), 'is_active': True,
            'created_at': datetime.datetime.utcnow().isoformat(),
        }
        col('users').insert_one(user)
        return Response({'token': make_token(user), 'user': user_dict(user)})


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user = col('users').find_one({'email': email, 'is_active': True})
        if not user or not isinstance(password, str):
            return Response({'error': 'Invalid credentials'}, status=401)
        valid, needs_upgrade = verify_password(password, user.get('password_hash', ''))
        if not valid:
            return Response({'error': 'Invalid credentials'}, status=401)
        if needs_upgrade:
            user['password_hash'] = hash_password(password)
            col('users').update_one({'user_id': user['user_id']}, {'$set': {'password_hash': user['password_hash']}})
        return Response({'token': make_token(user), 'user': user_dict(user)})


class MeView(APIView):
    def get(self, request):
        return Response(user_dict(request.vault_user))
