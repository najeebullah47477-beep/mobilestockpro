from extensions import db
from datetime import datetime


class Brand(db.Model):
    __tablename__ = 'brands'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    country_of_origin = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship('Product', back_populates='brand', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'country_of_origin': self.country_of_origin,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
