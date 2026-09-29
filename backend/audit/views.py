from rest_framework.views import APIView
from rest_framework.response import Response
from config.mongo import col


class AuditLogView(APIView):
    def get(self, request):
        if request.vault_user['role'] not in ('ADMIN', 'MANAGER'):
            return Response({'error': 'Forbidden'}, status=403)
        logs = list(col('audit_logs').find({}, {'_id': 0}).sort('timestamp', -1).limit(200))
        return Response(logs)
