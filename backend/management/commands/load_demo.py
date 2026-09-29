import uuid, datetime, sys, os
from django.core.management.base import BaseCommand
from users.passwords import hash_password

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'demo'))
from demo_data import DEMO_MEMORIES, DEMO_USERS


class Command(BaseCommand):
    help = 'Load NovaPay demo data into VaultMind'

    def handle(self, *args, **kwargs):
        from config.mongo import col
        from memories.hindsight import retain

        self.stdout.write('Loading NovaPay demo data...\n')

        for u in DEMO_USERS:
            if not col('users').find_one({'email': u['email']}):
                col('users').insert_one({
                    'user_id': str(uuid.uuid4()), 'email': u['email'], 'name': u['name'],
                    'password_hash': hash_password(u['password']), 'role': u['role'],
                    'department': u['department'], 'is_active': True,
                    'created_at': datetime.datetime.utcnow().isoformat(),
                })
                self.stdout.write(f'  ✓ User: {u["name"]} ({u["role"]})')
            else:
                self.stdout.write(f'  - Skip: {u["email"]}')

        self.stdout.write('')
        for mem_data in DEMO_MEMORIES:
            if col('memories').find_one({'title': mem_data['title']}):
                self.stdout.write(f'  - Skip: {mem_data["title"][:55]}')
                continue
            content = mem_data['content']
            metadata = {
                'memory_type': mem_data['memory_type'], 'title': mem_data['title'],
                'source': mem_data.get('source', ''), 'system': mem_data.get('system', ''),
                'people': mem_data.get('people', []), 'tags': mem_data.get('tags', []),
                'access_level': mem_data.get('access_level', 'INTERNAL'), 'date': mem_data.get('date', ''),
            }
            hs = retain(content, metadata, user_id='system')
            hindsight_id = hs.get('id') or hs.get('hindsight_id')
            col('memories').insert_one({
                'memory_id': str(uuid.uuid4()), 'hindsight_id': hindsight_id,
                'title': mem_data['title'], 'content': content,
                'memory_type': mem_data['memory_type'], 'source': mem_data.get('source', ''),
                'source_document': '', 'date': mem_data.get('date', ''),
                'system': mem_data.get('system', ''), 'department': '',
                'people': mem_data.get('people', []), 'tags': mem_data.get('tags', []),
                'access_level': mem_data.get('access_level', 'INTERNAL'),
                'confidence': mem_data.get('confidence', 'High'),
                'related_memories': [], 'created_by': 'system',
                'created_at': datetime.datetime.utcnow().isoformat(), 'is_deleted': False,
            })
            self.stdout.write(f'  ✓ [{mem_data["memory_type"]}] {mem_data["title"][:60]}')

        self.stdout.write(f'\n{"="*50}')
        self.stdout.write(f'Users:    {col("users").count_documents({})}')
        self.stdout.write(f'Memories: {col("memories").count_documents({"is_deleted": False})}')
        self.stdout.write('\nLogin credentials:')
        for u in DEMO_USERS:
            self.stdout.write(f'  {u["email"]:40s} / {u["password"]:10s} ({u["role"]})')
