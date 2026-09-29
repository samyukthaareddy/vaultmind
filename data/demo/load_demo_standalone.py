"""
Load NovaPay demo data into VaultMind.
Run from: vaultmind/backend/  ->  python ../data/demo/load_demo_standalone.py
"""
import os, sys, uuid, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'))

import django
django.setup()

from config.mongo import col
from memories.hindsight import retain
from users.passwords import hash_password

# Import demo data from same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo_data import DEMO_MEMORIES, DEMO_USERS


print("Loading NovaPay demo data into VaultMind...\n")

# Users
for u in DEMO_USERS:
    if not col('users').find_one({'email': u['email']}):
        col('users').insert_one({
            'user_id': str(uuid.uuid4()), 'email': u['email'], 'name': u['name'],
            'password_hash': hash_password(u['password']), 'role': u['role'],
            'department': u['department'], 'is_active': True,
            'created_at': datetime.datetime.utcnow().isoformat(),
        })
        print(f"  ✓ User: {u['name']} ({u['role']})")
    else:
        print(f"  - Skip existing user: {u['email']}")

print()

# Memories
for mem_data in DEMO_MEMORIES:
    if col('memories').find_one({'title': mem_data['title']}):
        print(f"  - Skip: {mem_data['title'][:55]}")
        continue

    content = mem_data['content']
    metadata = {
        'memory_type': mem_data['memory_type'], 'title': mem_data['title'],
        'source': mem_data.get('source', ''), 'system': mem_data.get('system', ''),
        'people': mem_data.get('people', []), 'tags': mem_data.get('tags', []),
        'access_level': mem_data.get('access_level', 'INTERNAL'), 'date': mem_data.get('date', ''),
    }
    hs = retain(content, metadata, user_id='system')
    hindsight_id = hs.get('id') or hs.get('memory_id') or hs.get('hindsight_id')

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
    print(f"  ✓ [{mem_data['memory_type']}] {mem_data['title'][:60]}")

print(f"\n{'='*50}")
print(f"Users loaded:    {col('users').count_documents({})}")
print(f"Memories loaded: {col('memories').count_documents({'is_deleted': False})}")
print(f"\nDemo login credentials:")
for u in DEMO_USERS:
    print(f"  {u['email']:40s} / {u['password']:10s}  ({u['role']})")
