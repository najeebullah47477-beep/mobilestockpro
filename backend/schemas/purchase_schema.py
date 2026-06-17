from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import Schema, fields, validate, ValidationError
from models import Purchase, PurchaseItem, Supplier, User, Product


class ProductBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Product
        fields = ("name", "sku")


class SupplierBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Supplier
        fields = ("name", "phone")


class UserBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        fields = ("full_name",)


class PurchaseItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PurchaseItem
        load_instance = True
        include_fk = True

    product = fields.Nested(ProductBriefSchema)


class PurchaseSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Purchase
        load_instance = True
        include_relationships = True

    items = fields.Nested(PurchaseItemSchema, many=True)
    supplier = fields.Nested(SupplierBriefSchema)
    user = fields.Nested(UserBriefSchema)
