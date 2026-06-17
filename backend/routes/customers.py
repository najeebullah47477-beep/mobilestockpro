from flask import request, jsonify
from sqlalchemy import or_
from extensions import db
from models.customer import Customer
from models.sale import Sale
from models.warranty import Warranty
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import customers_bp


@customers_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_customers():
    try:
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Customer.query

        if search:
            like_pattern = f'%{search}%'
            query = query.filter(
                or_(
                    Customer.name.ilike(like_pattern),
                    Customer.phone.ilike(like_pattern),
                    Customer.email.ilike(like_pattern),
                    Customer.cnic.ilike(like_pattern)
                )
            )

        query = query.order_by(Customer.name.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'customers': [c.to_dict() for c in pagination.items],
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Customers retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@customers_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def create_customer():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'data': None, 'message': 'Customer name is required'}), 400

        phone = data.get('phone', '').strip()
        if not phone:
            return jsonify({'success': False, 'data': None, 'message': 'Phone number is required'}), 400

        existing = Customer.query.filter_by(phone=phone).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'A customer with this phone number already exists'}), 409

        customer = Customer(
            name=name,
            phone=phone,
            email=data.get('email', '').strip(),
            address=data.get('address', '').strip(),
            city=data.get('city', '').strip(),
            cnic=data.get('cnic', '').strip()
        )
        db.session.add(customer)
        db.session.commit()

        return jsonify({'success': True, 'data': customer.to_dict(), 'message': 'Customer created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@customers_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_customer(id):
    try:
        customer = Customer.query.get(id)
        if not customer:
            return jsonify({'success': False, 'data': None, 'message': 'Customer not found'}), 404

        data = customer.to_dict()
        recent_sales = Sale.query.filter_by(customer_id=id).order_by(Sale.created_at.desc()).limit(10).all()
        data['recent_sales'] = [s.to_dict() for s in recent_sales]

        return jsonify({'success': True, 'data': data, 'message': 'Customer retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@customers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_customer(id):
    try:
        customer = Customer.query.get(id)
        if not customer:
            return jsonify({'success': False, 'data': None, 'message': 'Customer not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        if 'phone' in data and data['phone']:
            phone = data['phone'].strip()
            existing = Customer.query.filter(Customer.phone == phone, Customer.id != id).first()
            if existing:
                return jsonify({'success': False, 'data': None, 'message': 'Phone number already in use by another customer'}), 409
            customer.phone = phone

        if 'name' in data and data['name']:
            customer.name = data['name'].strip()
        if 'email' in data:
            customer.email = data['email'].strip()
        if 'address' in data:
            customer.address = data['address'].strip()
        if 'city' in data:
            customer.city = data['city'].strip()
        if 'cnic' in data:
            customer.cnic = data['cnic'].strip()

        db.session.commit()

        return jsonify({'success': True, 'data': customer.to_dict(), 'message': 'Customer updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@customers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_customer(id):
    try:
        customer = Customer.query.get(id)
        if not customer:
            return jsonify({"success": False, "error": "Customer not found"}), 404

        log_delete(
            module='Customers',
            record_id=customer.id,
            record_name=customer.name,
            record_data=customer.to_dict(),
            user_id=get_jwt_identity(),
            user_name='Admin',
            can_restore=True
        )

        Sale.query.filter_by(customer_id=id).update({"customer_id": None})
        Warranty.query.filter_by(customer_id=id).update({"customer_id": None})

        db.session.delete(customer)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Customer deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
