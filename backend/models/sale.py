from extensions import db
from datetime import datetime, date


class Sale(db.Model):
    __tablename__ = 'sales'

    __table_args__ = (
        db.CheckConstraint("payment_status IN ('paid', 'partial', 'unpaid')", name='ck_sale_payment_status'),
        db.CheckConstraint("sale_type IN ('retail', 'wholesale')", name='ck_sale_type'),
    )

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sale_date = db.Column(db.Date, default=date.today)
    subtotal = db.Column(db.Numeric(12, 2), default=0)
    discount = db.Column(db.Numeric(12, 2), default=0)
    tax = db.Column(db.Numeric(12, 2), default=0)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    amount_paid = db.Column(db.Numeric(12, 2), default=0)
    change_amount = db.Column(db.Numeric(12, 2), default=0)
    balance_due = db.Column(db.Numeric(12, 2), default=0)
    payment_method = db.Column(db.String(50))
    payment_status = db.Column(db.String(20), default='paid')
    sale_type = db.Column(db.String(20), default='retail')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    customer = db.relationship('Customer', back_populates='sales')
    user = db.relationship('User', back_populates='sales')
    items = db.relationship('SaleItem', back_populates='sale', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'customer_id': self.customer_id,
            'user_id': self.user_id,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None,
            'subtotal': float(self.subtotal) if self.subtotal is not None else 0.0,
            'discount': float(self.discount) if self.discount is not None else 0.0,
            'tax': float(self.tax) if self.tax is not None else 0.0,
            'total_amount': float(self.total_amount) if self.total_amount is not None else 0.0,
            'amount_paid': float(self.amount_paid) if self.amount_paid is not None else 0.0,
            'change_amount': float(self.change_amount) if self.change_amount is not None else 0.0,
            'balance_due': float(self.balance_due) if self.balance_due is not None else 0.0,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'sale_type': self.sale_type,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
