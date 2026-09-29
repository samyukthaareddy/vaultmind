from djongo import models


class AuditLog(models.Model):
    user_id = models.CharField(max_length=64)
    action = models.CharField(max_length=64)
    memory_id = models.CharField(max_length=64, blank=True)
    result = models.CharField(max_length=16)
    reason = models.CharField(max_length=256, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'audit'

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'action': self.action,
            'memory_id': self.memory_id,
            'result': self.result,
            'reason': self.reason,
            'timestamp': str(self.timestamp),
        }
