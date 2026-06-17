from datetime import datetime, date
from decimal import Decimal
from flask import request, jsonify
from extensions import db
from models.purchase import Purchase
from models.purchase_item import PurchaseItem
from models.product import Product
from models.supplier import Supplier
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import purchases_bp


@purchases_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_purchases():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        payment_status = request.args.get('payment_status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = Purchase.query

        if supplier_id:
            query = query.filter_by(supplier_id=supplier_id)
        if payment_status:
            query = query.filter_by(payment_status=payment_status)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Purchase.purchase_date >= start)
            except ValueError:
                pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Purchase.purchase_date <= end)
            except ValueError:
                pass

        query = query.order_by(Purchase.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        purchases = []
        for purchase in pagination.items:
            item = purchase.to_dict()
            if purchase.supplier:
                item['supplier_name'] = purchase.supplier.name
            if purchase.user:
                item['user_name'] = purchase.user.username
            purchases.append(item)

        return jsonify({
            'success': True,
            'data': {
                'purchases': purchases,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Purchases retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@purchases_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_purchase():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        items_data = data.get('items', [])
        if not items_data:
            return jsonify({'success': False, 'data': None, 'message': 'At least one item is required'}), 400

        supplier_id = data.get('supplier_id')
        if not supplier_id:
            return jsonify({'success': False, 'data': None, 'message': 'Supplier ID is required'}), 400

        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({'success': False, 'data': None, 'message': 'Supplier not found'}), 404

        current_user_id = int(get_jwt_identity())
        purchase_date_str = data.get('purchase_date')
        if purchase_date_str:
            try:
                purchase_date = datetime.strptime(purchase_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'data': None, 'message': 'Invalid date format, use YYYY-MM-DD'}), 400
        else:
            purchase_date = date.today()

        invoice_date_str = purchase_date.strftime('%Y%m%d')
        today_count = Purchase.query.filter(
            db.func.date(Purchase.created_at) == date.today()
        ).count()
        seq = today_count + 1
        invoice_number = f'PUR-{invoice_date_str}-{seq:04d}'

        subtotal = Decimal('0.00')
        purchase_items_to_create = []

        for idx, item_data in enumerate(items_data):
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity', 1)
            unit_cost = Decimal(str(item_data.get('unit_cost', 0)))

            if not product_id:
                return jsonify({'success': False, 'data': None, 'message': f'Item {idx + 1}: product_id is required'}), 400

            product = Product.query.get(product_id)
            if not product:
                return jsonify({'success': False, 'data': None, 'message': f'Item {idx + 1}: Product with ID {product_id} not found'}), 404

            line_total = Decimal(str(quantity)) * unit_cost
            subtotal += line_total

            purchase_items_to_create.append({
                'product': product,
                'quantity': quantity,
                'unit_cost': unit_cost,
                'total_cost': line_total
            })

        purchase_discount = Decimal(str(data.get('discount', 0)))
        purchase_tax = Decimal(str(data.get('tax', 0)))
        total_amount = subtotal - purchase_discount + purchase_tax
        if total_amount < 0:
            total_amount = Decimal('0.00')

        amount_paid = Decimal(str(data.get('amount_paid', 0)))
        balance_due = total_amount - amount_paid
        if balance_due < 0:
            balance_due = Decimal('0.00')

        if amount_paid >= total_amount:
            payment_status = 'paid'
        elif amount_paid > 0:
            payment_status = 'partial'
        else:
            payment_status = 'unpaid'

        purchase = Purchase(
            invoice_number=invoice_number,
            supplier_id=supplier_id,
            user_id=current_user_id,
            purchase_date=purchase_date,
            subtotal=float(subtotal),
            discount=float(purchase_discount),
            tax=float(purchase_tax),
            total_amount=float(total_amount),
            amount_paid=float(amount_paid),
            balance_due=float(balance_due),
            payment_method=data.get('payment_method', 'cash'),
            payment_status=payment_status,
            notes=data.get('notes', '')
        )
        db.session.add(purchase)
        db.session.flush()

        created_items = []
        for pi in purchase_items_to_create:
            purchase_item = PurchaseItem(
                purchase_id=purchase.id,
                product_id=pi['product'].id,
                quantity=pi['quantity'],
                unit_cost=float(pi['unit_cost']),
                total_cost=float(pi['total_cost'])
            )
            db.session.add(purchase_item)

            pi['product'].stock_quantity += pi['quantity']

            item_dict = purchase_item.to_dict()
            item_dict['product_name'] = pi['product'].name
            item_dict['product_sku'] = pi['product'].sku
            created_items.append(item_dict)

        if amount_paid > 0:
            supplier.balance = float(Decimal(str(supplier.balance or 0)) + amount_paid)

        db.session.commit()

        result = purchase.to_dict()
        result['items'] = created_items
        result['supplier_name'] = supplier.name
        from models.user import User
        user = User.query.get(current_user_id)
        result['user_name'] = user.username if user else None

        return jsonify({'success': True, 'data': result, 'message': 'Purchase created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@purchases_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_purchase(id):
    try:
        purchase = Purchase.query.get(id)
        if not purchase:
            return jsonify({'success': False, 'data': None, 'message': 'Purchase not found'}), 404

        result = purchase.to_dict()
        result['supplier_name'] = purchase.supplier.name if purchase.supplier else None
        result['user_name'] = purchase.user.username if purchase.user else None

        items = []
        for pi in purchase.items.all():
            item_dict = pi.to_dict()
            if pi.product:
                item_dict['product_name'] = pi.product.name
                item_dict['product_sku'] = pi.product.sku
            items.append(item_dict)
        result['items'] = items

        return jsonify({'success': True, 'data': result, 'message': 'Purchase retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@purchases_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_purchase(id):
    try:
        purchase = Purchase.query.get(id)
        if not purchase:
            return jsonify({'success': False, 'data': None, 'message': 'Purchase not found'}), 404

        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        log_delete(
            module='Purchases',
            record_id=purchase.id,
            record_name=purchase.invoice_number,
            record_data=purchase.to_dict(),
            user_id=current_user_id,
            user_name=user.full_name if user else 'Unknown',
            can_restore=True
        )

        supplier = purchase.supplier

        for pi in purchase.items.all():
            product = pi.product
            if product:
                product.stock_quantity -= pi.quantity

        if supplier:
            rev_amount = Decimal(str(purchase.amount_paid))
            supplier.balance = float(max(Decimal(str(supplier.balance or 0)) - rev_amount, Decimal('0.00')))

        db.session.delete(purchase)
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Purchase deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
