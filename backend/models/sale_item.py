from extensions import db


class SaleItem(db.Model):
    __tablename__ = 'sale_items'

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    discount = db.Column(db.Numeric(12, 2), default=0)
    total_price = db.Column(db.Numeric(12, 2), nullable=False)

    sale = db.relationship('Sale', back_populates='items')
    product = db.relationship('Product', back_populates='sale_items')
    warranties = db.relationship('Warranty', back_populates='sale_item', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'sale_id': self.sale_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price) if self.unit_price is not None else 0.0,
            'discount': float(self.discount) if self.discount is not None else 0.0,
            'total_price': float(self.total_price) if self.total_price is not None else 0.0
        }
