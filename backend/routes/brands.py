from flask import request, jsonify
from marshmallow import Schema, fields, validate
from extensions import db
from models.brand import Brand
from models.product import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import brands_bp


class BrandSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    country_of_origin = fields.String()


@brands_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_brands():
    try:
        brands = Brand.query.order_by(Brand.name.asc()).all()
        return jsonify({
            'success': True,
            'data': [b.to_dict() for b in brands],
            'message': 'Brands retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@brands_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_brand():
    try:
        schema = BrandSchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())

        existing = Brand.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Brand already exists'}), 409

        brand = Brand(
            name=data['name'],
            country_of_origin=data.get('country_of_origin', '')
        )
        db.session.add(brand)
        db.session.commit()

        return jsonify({'success': True, 'data': brand.to_dict(), 'message': 'Brand created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@brands_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_brand(id):
    try:
        brand = Brand.query.get(id)
        if not brand:
            return jsonify({'success': False, 'data': None, 'message': 'Brand not found'}), 404

        schema = BrandSchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())

        existing = Brand.query.filter(Brand.name == data['name'], Brand.id != id).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Brand name already exists'}), 409

        brand.name = data['name']
        brand.country_of_origin = data.get('country_of_origin', brand.country_of_origin)
        db.session.commit()

        return jsonify({'success': True, 'data': brand.to_dict(), 'message': 'Brand updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@brands_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_brand(id):
    try:
        brand = Brand.query.get(id)
        if not brand:
            return jsonify({"success": False, "error": "Brand not found"}), 404

        log_delete(
            module='Brands',
            record_id=brand.id,
            record_name=brand.name,
            record_data=brand.to_dict(),
            user_id=get_jwt_identity(),
            user_name='Admin',
            can_restore=True
        )

        Product.query.filter_by(brand_id=id).update({"brand_id": None})

        db.session.delete(brand)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Brand deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
