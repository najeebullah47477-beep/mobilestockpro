from extensions import db
from datetime import datetime


class Warranty(db.Model):
    __tablename__ = 'warranties'

    __table_args__ = (
        db.CheckConstraint("status IN ('active', 'claimed', 'expired')", name='ck_warranty_status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    sale_item_id = db.Column(db.Integer, db.ForeignKey('sale_items.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    warranty_type = db.Column(db.String(50), default='standard')
    status = db.Column(db.String(20), default='active')
    claim_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sale_item = db.relationship('SaleItem', back_populates='warranties')
    product = db.relationship('Product', back_populates='warranties')
    customer = db.relationship('Customer', back_populates='warranties')

    def to_dict(self):
        return {
            'id': self.id,
            'sale_item_id': self.sale_item_id,
            'product_id': self.product_id,
            'customer_id': self.customer_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'warranty_type': self.warranty_type,
            'status': self.status,
            'claim_notes': self.claim_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
