import datetime
from config.mongo import col


def log_event(user_id, action, memory_id='', result='ALLOWED', reason=''):
    try:
        col('audit_logs').insert_one({
            'user_id': user_id, 'action': action, 'memory_id': memory_id,
            'result': result, 'reason': reason,
            'timestamp': datetime.datetime.utcnow().isoformat(),
        })
    except Exception:
        pass
