from extensions import db
from datetime import datetime

class DeleteHistory(db.Model):
    __tablename__ = 'delete_history'

    id = db.Column(db.Integer, primary_key=True)
    module = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    record_name = db.Column(db.String(200), nullable=False)
    record_data = db.Column(db.Text, nullable=False)
    deleted_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    deleted_by_name = db.Column(db.String(150))
    deleted_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_restored = db.Column(db.Boolean, default=False)
    restored_at = db.Column(db.DateTime, nullable=True)
    restored_by_name = db.Column(db.String(150), nullable=True)
    can_restore = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'module': self.module,
            'record_id': self.record_id,
            'record_name': self.record_name,
            'record_data': self.record_data,
            'deleted_by_name': self.deleted_by_name,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'is_restored': self.is_restored,
            'restored_at': self.restored_at.isoformat() if self.restored_at else None,
            'restored_by_name': self.restored_by_name,
            'can_restore': self.can_restore
        }
