from extensions import db
from datetime import datetime


class Product(db.Model):
    __tablename__ = 'products'

    __table_args__ = (
        db.CheckConstraint("condition IN ('new', 'used', 'refurbished')", name='ck_product_condition'),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(100), unique=True, nullable=False)
    imei = db.Column(db.String(50), unique=True, nullable=True)
    barcode = db.Column(db.String(100))
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    color = db.Column(db.String(50))
    storage_capacity = db.Column(db.String(50))
    ram = db.Column(db.String(50))
    condition = db.Column(db.String(20), default='new')
    purchase_price = db.Column(db.Numeric(12, 2), nullable=False)
    selling_price = db.Column(db.Numeric(12, 2), nullable=False)
    wholesale_price = db.Column(db.Numeric(12, 2), nullable=True)
    stock_quantity = db.Column(db.Integer, default=0)
    low_stock_threshold = db.Column(db.Integer, default=5)
    location_in_store = db.Column(db.String(100))
    warranty_months = db.Column(db.Integer, default=12)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship('Category', back_populates='products')
    brand = db.relationship('Brand', back_populates='products')
    supplier = db.relationship('Supplier', back_populates='products')
    purchase_items = db.relationship('PurchaseItem', back_populates='product', lazy='dynamic')
    sale_items = db.relationship('SaleItem', back_populates='product', lazy='dynamic')
    warranties = db.relationship('Warranty', back_populates='product', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'imei': self.imei,
            'barcode': self.barcode,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'category_type': self.category.category_type if self.category else None,
            'brand_id': self.brand_id,
            'brand_name': self.brand.name if self.brand else None,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'color': self.color,
            'storage_capacity': self.storage_capacity,
            'ram': self.ram,
            'condition': self.condition,
            'purchase_price': float(self.purchase_price) if self.purchase_price else 0,
            'selling_price': float(self.selling_price) if self.selling_price else 0,
            'wholesale_price': float(self.wholesale_price) if self.wholesale_price else None,
            'stock_quantity': self.stock_quantity,
            'low_stock_threshold': self.low_stock_threshold,
            'location_in_store': self.location_in_store,
            'warranty_months': self.warranty_months,
            'description': self.description,
            'image_url': self.image_url,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
