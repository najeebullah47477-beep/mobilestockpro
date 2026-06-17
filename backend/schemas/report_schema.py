from marshmallow import Schema, fields, validate, ValidationError


class ReportSchema(Schema):
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    customer_id = fields.Integer()
    limit = fields.Integer(validate=validate.Range(min=1, max=100))
    format = fields.String()
