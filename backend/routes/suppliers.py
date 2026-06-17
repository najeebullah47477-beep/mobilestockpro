from flask import request, jsonify
from sqlalchemy import or_
from extensions import db
from models.supplier import Supplier
from models.product import Product
from models.purchase import Purchase
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import suppliers_bp


@suppliers_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_suppliers():
    try:
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Supplier.query

        if search:
            like_pattern = f'%{search}%'
            query = query.filter(
                or_(
                    Supplier.name.ilike(like_pattern),
                    Supplier.city.ilike(like_pattern),
                    Supplier.phone.ilike(like_pattern),
                    Supplier.contact_person.ilike(like_pattern)
                )
            )

        query = query.order_by(Supplier.name.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'suppliers': [s.to_dict() for s in pagination.items],
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Suppliers retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@suppliers_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_supplier():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'data': None, 'message': 'Supplier name is required'}), 400

        supplier = Supplier(
            name=name,
            contact_person=data.get('contact_person', '').strip(),
            phone=data.get('phone', '').strip(),
            email=data.get('email', '').strip(),
            address=data.get('address', '').strip(),
            city=data.get('city', '').strip()
        )
        db.session.add(supplier)
        db.session.commit()

        return jsonify({'success': True, 'data': supplier.to_dict(), 'message': 'Supplier created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@suppliers_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_supplier(id):
    try:
        supplier = Supplier.query.get(id)
        if not supplier:
            return jsonify({'success': False, 'data': None, 'message': 'Supplier not found'}), 404

        return jsonify({'success': True, 'data': supplier.to_dict(), 'message': 'Supplier retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@suppliers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_supplier(id):
    try:
        supplier = Supplier.query.get(id)
        if not supplier:
            return jsonify({'success': False, 'data': None, 'message': 'Supplier not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        if 'name' in data and data['name']:
            supplier.name = data['name'].strip()
        if 'contact_person' in data:
            supplier.contact_person = data['contact_person'].strip()
        if 'phone' in data:
            supplier.phone = data['phone'].strip()
        if 'email' in data:
            supplier.email = data['email'].strip()
        if 'address' in data:
            supplier.address = data['address'].strip()
        if 'city' in data:
            supplier.city = data['city'].strip()

        db.session.commit()

        return jsonify({'success': True, 'data': supplier.to_dict(), 'message': 'Supplier updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@suppliers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_supplier(id):
    try:
        supplier = Supplier.query.get(id)
        if not supplier:
            return jsonify({"success": False, "error": "Supplier not found"}), 404

        log_delete(
            module='Suppliers',
            record_id=supplier.id,
            record_name=supplier.name,
            record_data=supplier.to_dict(),
            user_id=get_jwt_identity(),
            user_name='Admin',
            can_restore=True
        )

        Product.query.filter_by(supplier_id=id).update({"supplier_id": None})
        Purchase.query.filter_by(supplier_id=id).update({"supplier_id": None})

        db.session.delete(supplier)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Supplier deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
