from extensions import db
from datetime import datetime


class Supplier(db.Model):
    __tablename__ = 'suppliers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    contact_person = db.Column(db.String(150))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(150))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    balance = db.Column(db.Numeric(12, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship('Product', back_populates='supplier', lazy='dynamic')
    purchases = db.relationship('Purchase', back_populates='supplier', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'city': self.city,
            'balance': float(self.balance) if self.balance is not None else 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
