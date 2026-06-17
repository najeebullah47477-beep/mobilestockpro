from datetime import datetime
from flask import request, jsonify
from extensions import db
from models.warranty import Warranty
from models.sale_item import SaleItem
from models.product import Product
from models.customer import Customer
from models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required
from routes import warranties_bp


@warranties_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_warranties():
    try:
        status = request.args.get('status', '').strip()
        customer_id = request.args.get('customer_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Warranty.query

        if status:
            query = query.filter(Warranty.status == status)
        if customer_id:
            query = query.filter(Warranty.customer_id == customer_id)

        query = query.order_by(Warranty.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        warranties = []
        for warranty in pagination.items:
            item = warranty.to_dict()
            if warranty.product:
                item['product_name'] = warranty.product.name
            if warranty.customer:
                item['customer_name'] = warranty.customer.name
            if warranty.sale_item and warranty.sale_item.sale:
                sale = warranty.sale_item.sale
                item['sale_info'] = {
                    'id': sale.id,
                    'invoice_number': sale.invoice_number,
                    'sale_date': sale.sale_date.isoformat() if sale.sale_date else None
                }
            warranties.append(item)

        return jsonify({
            'success': True,
            'data': {
                'warranties': warranties,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Warranties retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@warranties_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_warranty(id):
    try:
        warranty = Warranty.query.get(id)
        if not warranty:
            return jsonify({'success': False, 'data': None, 'message': 'Warranty not found'}), 404

        item = warranty.to_dict()
        if warranty.product:
            item['product'] = warranty.product.to_dict()
        if warranty.customer:
            item['customer'] = warranty.customer.to_dict()
        if warranty.sale_item:
            item['sale_item'] = warranty.sale_item.to_dict()
            if warranty.sale_item.sale:
                item['sale'] = warranty.sale_item.sale.to_dict()

        return jsonify({'success': True, 'data': item, 'message': 'Warranty retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@warranties_bp.route('', methods=['POST'])
@jwt_required()
def create_warranty():
    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No input data provided'}), 400

        sale_item_id = data.get('sale_item_id')
        product_id = data.get('product_id')
        customer_id = data.get('customer_id')
        start_date = data.get('start_date', '').strip()
        end_date = data.get('end_date', '').strip()

        if not sale_item_id or not product_id or not customer_id or not start_date or not end_date:
            return jsonify({'success': False, 'data': None, 'message': 'sale_item_id, product_id, customer_id, start_date, and end_date are required'}), 400

        warranty = Warranty(
            sale_item_id=sale_item_id,
            product_id=product_id,
            customer_id=customer_id,
            start_date=datetime.strptime(start_date, '%Y-%m-%d').date(),
            end_date=datetime.strptime(end_date, '%Y-%m-%d').date(),
            warranty_type=data.get('warranty_type', 'standard'),
            status='active'
        )
        db.session.add(warranty)
        db.session.commit()

        return jsonify({'success': True, 'data': warranty.to_dict(), 'message': 'Warranty created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@warranties_bp.route('/<int:id>/claim', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def claim_warranty(id):
    try:
        warranty = Warranty.query.get(id)
        if not warranty:
            return jsonify({'success': False, 'data': None, 'message': 'Warranty not found'}), 404

        if warranty.status == 'claimed':
            return jsonify({'success': False, 'data': None, 'message': 'Warranty has already been claimed'}), 400

        data = request.get_json()
        warranty.status = 'claimed'
        warranty.claim_notes = data.get('claim_notes', '').strip() if data else ''
        db.session.commit()

        return jsonify({'success': True, 'data': warranty.to_dict(), 'message': 'Warranty claimed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@warranties_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_warranty(id):
    try:
        warranty = Warranty.query.get(id)
        if not warranty:
            return jsonify({'success': False, 'data': None, 'message': 'Warranty not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No input data provided'}), 400

        if 'sale_item_id' in data:
            warranty.sale_item_id = data['sale_item_id']
        if 'product_id' in data:
            warranty.product_id = data['product_id']
        if 'customer_id' in data:
            warranty.customer_id = data['customer_id']
        if 'start_date' in data:
            warranty.start_date = datetime.strptime(data['start_date'].strip(), '%Y-%m-%d').date()
        if 'end_date' in data:
            warranty.end_date = datetime.strptime(data['end_date'].strip(), '%Y-%m-%d').date()
        if 'warranty_type' in data:
            warranty.warranty_type = data['warranty_type'].strip()
        if 'claim_notes' in data:
            warranty.claim_notes = data['claim_notes'].strip()
        if 'status' in data:
            warranty.status = data['status'].strip()

        db.session.commit()

        return jsonify({'success': True, 'data': warranty.to_dict(), 'message': 'Warranty updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
