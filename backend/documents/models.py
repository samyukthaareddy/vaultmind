from djongo import models


class Document(models.Model):
    doc_id = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=256)
    content = models.TextField()
    doc_type = models.CharField(max_length=64, default='TEXT')
    uploaded_by = models.CharField(max_length=64)
    memories_created = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'documents'

    def to_dict(self):
        return {
            'doc_id': self.doc_id,
            'title': self.title,
            'doc_type': self.doc_type,
            'uploaded_by': self.uploaded_by,
            'memories_created': self.memories_created,
            'created_at': str(self.created_at),
        }
