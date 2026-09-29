from djongo import models

MEMORY_TYPES = [
    'FACT', 'DECISION', 'DECISION_REASON', 'INCIDENT', 'FAILURE',
    'WORKAROUND', 'CUSTOMER_REQUIREMENT', 'PROCESS', 'SYSTEM_KNOWLEDGE',
    'PERSON_KNOWLEDGE', 'LESSON_LEARNED', 'CONSTRAINT', 'PREFERENCE',
    'RISK',
]

ACCESS_LEVELS = ['PUBLIC', 'INTERNAL', 'TEAM_ONLY', 'CONFIDENTIAL', 'RESTRICTED']

ROLE_ACCESS = {
    'ADMIN':    ['PUBLIC', 'INTERNAL', 'TEAM_ONLY', 'CONFIDENTIAL', 'RESTRICTED'],
    'MANAGER':  ['PUBLIC', 'INTERNAL', 'TEAM_ONLY', 'CONFIDENTIAL'],
    'ENGINEER': ['PUBLIC', 'INTERNAL', 'TEAM_ONLY'],
    'SALES':    ['PUBLIC', 'INTERNAL'],
    'HR':       ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
}


class Memory(models.Model):
    memory_id = models.CharField(max_length=64, unique=True)
    hindsight_id = models.CharField(max_length=256, blank=True, null=True)
    title = models.CharField(max_length=256)
    content = models.TextField()
    memory_type = models.CharField(max_length=64)
    source = models.CharField(max_length=256, blank=True)
    source_document = models.CharField(max_length=256, blank=True)
    date = models.CharField(max_length=32, blank=True)
    system = models.CharField(max_length=128, blank=True)
    department = models.CharField(max_length=128, blank=True)
    people = models.JSONField(default=list)
    tags = models.JSONField(default=list)
    access_level = models.CharField(max_length=32, default='INTERNAL')
    confidence = models.CharField(max_length=32, default='High')
    related_memories = models.JSONField(default=list)
    created_by = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        app_label = 'memories'

    def to_dict(self):
        return {
            'memory_id': self.memory_id,
            'hindsight_id': self.hindsight_id,
            'title': self.title,
            'content': self.content,
            'memory_type': self.memory_type,
            'source': self.source,
            'source_document': self.source_document,
            'date': self.date,
            'system': self.system,
            'department': self.department,
            'people': self.people,
            'tags': self.tags,
            'access_level': self.access_level,
            'confidence': self.confidence,
            'related_memories': self.related_memories,
            'created_by': self.created_by,
            'created_at': str(self.created_at),
        }
