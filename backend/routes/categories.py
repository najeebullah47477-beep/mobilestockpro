from flask import request, jsonify
from marshmallow import Schema, fields, validate
from extensions import db
from models.category import Category
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import categories_bp


class CategorySchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String()
    category_type = fields.String(validate=validate.OneOf(['device', 'accessory']))


@categories_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_categories():
    try:
        categories = Category.query.order_by(Category.name.asc()).all()
        return jsonify({
            'success': True,
            'data': [c.to_dict() for c in categories],
            'message': 'Categories retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@categories_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_category():
    try:
        schema = CategorySchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())

        existing = Category.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Category already exists'}), 409

        category = Category(
            name=data['name'],
            description=data.get('description', ''),
            category_type=data.get('category_type', 'accessory')
        )
        db.session.add(category)
        db.session.commit()

        return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@categories_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_category(id):
    try:
        category = Category.query.get(id)
        if not category:
            return jsonify({'success': False, 'data': None, 'message': 'Category not found'}), 404

        schema = CategorySchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())

        existing = Category.query.filter(Category.name == data['name'], Category.id != id).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Category name already exists'}), 409

        category.name = data['name']
        category.description = data.get('description', category.description)
        if 'category_type' in data:
            category.category_type = data['category_type']
        db.session.commit()

        return jsonify({'success': True, 'data': category.to_dict(), 'message': 'Category updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@categories_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_category(id):
    try:
        category = Category.query.get(id)
        if not category:
            return jsonify({'success': False, 'data': None, 'message': 'Category not found'}), 404

        from models.product import Product

        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        Product.query.filter_by(category_id=id).update({"category_id": None})

        log_delete(
            module='Categories',
            record_id=category.id,
            record_name=category.name,
            record_data=category.to_dict(),
            user_id=current_user_id,
            user_name=user.full_name if user else 'Unknown',
            can_restore=True
        )

        db.session.delete(category)
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Category deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
