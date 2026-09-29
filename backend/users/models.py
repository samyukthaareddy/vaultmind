from djongo import models

ROLES = ['ADMIN', 'ENGINEER', 'MANAGER', 'SALES', 'HR']

class User(models.Model):
    user_id = models.CharField(max_length=64, unique=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=128)
    password_hash = models.CharField(max_length=256)
    role = models.CharField(max_length=32, default='ENGINEER')
    department = models.CharField(max_length=64, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'users'

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'department': self.department,
            'is_active': self.is_active,
        }
