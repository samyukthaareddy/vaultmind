import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

import django
django.setup()

from config.mongo import col
from memories.hindsight import retain

mems = list(col('memories').find({'is_deleted': False}))
print(f'Found {len(mems)} memories to sync to Hindsight...\n')

ok, fail = 0, 0
for m in mems:
    metadata = {
        'memory_type': m.get('memory_type'),
        'title': m.get('title'),
        'source': m.get('source', ''),
        'system': m.get('system', ''),
        'people': m.get('people', []),
        'tags': m.get('tags', []),
        'access_level': m.get('access_level', 'INTERNAL'),
        'date': m.get('date', ''),
    }
    content = m.get('title', '') + '\n\n' + m.get('content', '')
    result = retain(content, metadata, user_id='system', memory_id=m['memory_id'])
    hindsight_id = result.get('id') or result.get('operation_id')
    if hindsight_id:
        col('memories').update_one({'memory_id': m['memory_id']}, {'$set': {'hindsight_id': hindsight_id}})
        print(f'  OK: {m["title"][:65]}')
        ok += 1
    else:
        print(f'  FAIL: {m["title"][:65]} -> {result}')
        fail += 1

print(f'\nDone. Synced: {ok}  Failed: {fail}')
