from extensions import db
from datetime import datetime


class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(150))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    cnic = db.Column(db.String(50))
    total_purchases = db.Column(db.Numeric(12, 2), default=0)
    loyalty_points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sales = db.relationship('Sale', back_populates='customer', lazy='dynamic')
    warranties = db.relationship('Warranty', back_populates='customer', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'city': self.city,
            'cnic': self.cnic,
            'total_purchases': float(self.total_purchases) if self.total_purchases is not None else 0.0,
            'loyalty_points': self.loyalty_points if self.loyalty_points is not None else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
