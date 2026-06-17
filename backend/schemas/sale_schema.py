from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from marshmallow import Schema, fields, validate, ValidationError
from models import Sale, SaleItem, Customer, User, Product


class ProductBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Product
        fields = ("name", "sku", "selling_price")


class CustomerBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Customer
        fields = ("name", "phone")


class UserBriefSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        fields = ("full_name",)


class SaleItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = SaleItem
        load_instance = True
        include_fk = True

    product = fields.Nested(ProductBriefSchema)


class SaleSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Sale
        load_instance = True
        include_relationships = True

    items = fields.Nested(SaleItemSchema, many=True)
    customer = fields.Nested(CustomerBriefSchema)
    user = fields.Nested(UserBriefSchema)
