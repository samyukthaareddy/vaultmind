from rest_framework.views import APIView
from rest_framework.response import Response
from config.mongo import col

VALID_ROLES = {'ADMIN', 'ENGINEER', 'MANAGER', 'SALES', 'HR'}


class UserListView(APIView):
    def get(self, request):
        if request.vault_user['role'] != 'ADMIN':
            return Response({'error': 'Forbidden'}, status=403)
        users = list(col('users').find({'is_active': True}, {'_id': 0, 'password_hash': 0}))
        return Response(users)


class UserRoleView(APIView):
    def patch(self, request, user_id):
        if request.vault_user['role'] != 'ADMIN':
            return Response({'error': 'Forbidden'}, status=403)
        role = request.data.get('role')
        if role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=400)
        result = col('users').find_one_and_update(
            {'user_id': user_id},
            {'$set': {'role': role}},
            return_document=True,
        )
        if not result:
            return Response({'error': 'User not found'}, status=404)
        return Response({k: result[k] for k in ('user_id','email','name','role','department') if k in result})
