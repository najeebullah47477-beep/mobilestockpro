from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import Schema, fields, validate, ValidationError
from models import Product, Category, Brand, Supplier


class CategorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Category
        fields = ("name",)


class BrandSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Brand
        fields = ("name",)


class SupplierSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Supplier
        fields = ("name",)


class ProductSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Product
        load_instance = True
        include_fk = True
        include_relationships = True

    category = fields.Nested(CategorySchema)
    brand = fields.Nested(BrandSchema)
    supplier = fields.Nested(SupplierSchema)


class ProductUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=3))
    sku = fields.String()
    imei = fields.String()
    barcode = fields.String()
    color = fields.String()
    storage_capacity = fields.String()
    ram = fields.String()
    condition = fields.String()
    purchase_price = fields.Decimal(validate=validate.Range(min=0))
    selling_price = fields.Decimal(validate=validate.Range(min=0))
    wholesale_price = fields.Decimal(allow_none=True)
    stock_quantity = fields.Integer(validate=validate.Range(min=0))
    low_stock_threshold = fields.Integer(allow_none=True)
    location_in_store = fields.String()
    warranty_months = fields.Integer(allow_none=True)
    description = fields.String()
    image_url = fields.String()
    is_active = fields.Boolean()
    category_id = fields.Integer()
    brand_id = fields.Integer()
    supplier_id = fields.Integer(allow_none=True)


class ProductCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=3))
    sku = fields.String()
    imei = fields.String()
    barcode = fields.String()
    color = fields.String()
    storage_capacity = fields.String()
    ram = fields.String()
    condition = fields.String()
    purchase_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    selling_price = fields.Decimal(required=True, validate=validate.Range(min=0))
    wholesale_price = fields.Decimal(allow_none=True)
    stock_quantity = fields.Integer(validate=validate.Range(min=0))
    low_stock_threshold = fields.Integer(allow_none=True)
    location_in_store = fields.String()
    warranty_months = fields.Integer(allow_none=True)
    description = fields.String()
    image_url = fields.String()
    is_active = fields.Boolean()
    category_id = fields.Integer()
    brand_id = fields.Integer()
    supplier_id = fields.Integer(allow_none=True)
