from extensions import db
from datetime import datetime


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50))
    notes = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='expenses')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'category': self.category,
            'amount': float(self.amount) if self.amount is not None else 0.0,
            'expense_date': self.expense_date.isoformat() if self.expense_date else None,
            'payment_method': self.payment_method,
            'notes': self.notes,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
