from extensions import db


class PurchaseItem(db.Model):
    __tablename__ = 'purchase_items'

    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey('purchases.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(12, 2), nullable=False)
    total_cost = db.Column(db.Numeric(12, 2), nullable=False)

    purchase = db.relationship('Purchase', back_populates='items')
    product = db.relationship('Product', back_populates='purchase_items')

    def to_dict(self):
        return {
            'id': self.id,
            'purchase_id': self.purchase_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'unit_cost': float(self.unit_cost) if self.unit_cost is not None else 0.0,
            'total_cost': float(self.total_cost) if self.total_cost is not None else 0.0
        }
