import json
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models.user import User

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or user.role not in roles:
                return jsonify({
                    "success": False,
                    "error": "Access denied. You do not have permission."
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def log_delete(module, record_id, record_name, record_data, user_id,
               user_name, can_restore=False):
    from models.delete_history import DeleteHistory
    from extensions import db

    history = DeleteHistory(
        module=module,
        record_id=record_id,
        record_name=record_name,
        record_data=json.dumps(record_data),
        deleted_by_id=user_id,
        deleted_by_name=user_name,
        can_restore=can_restore
    )
    db.session.add(history)
