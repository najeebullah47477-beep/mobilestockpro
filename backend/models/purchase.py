from extensions import db
from datetime import datetime, date


class Purchase(db.Model):
    __tablename__ = 'purchases'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    purchase_date = db.Column(db.Date, default=date.today)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    discount = db.Column(db.Numeric(12, 2), default=0)
    tax = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)
    balance_due = db.Column(db.Numeric(12, 2), default=0)
    payment_method = db.Column(db.String(50), default='cash')
    payment_status = db.Column(db.String(20), default='paid')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    supplier = db.relationship('Supplier', back_populates='purchases')
    user = db.relationship('User', back_populates='purchases')
    items = db.relationship('PurchaseItem', back_populates='purchase', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'supplier_id': self.supplier_id,
            'user_id': self.user_id,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'subtotal': float(self.subtotal) if self.subtotal is not None else 0.0,
            'discount': float(self.discount) if self.discount is not None else 0.0,
            'tax': float(self.tax) if self.tax is not None else 0.0,
            'total_amount': float(self.total_amount) if self.total_amount is not None else 0.0,
            'amount_paid': float(self.amount_paid) if self.amount_paid is not None else 0.0,
            'balance_due': float(self.balance_due) if self.balance_due is not None else 0.0,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
