from datetime import datetime, date
from decimal import Decimal
from flask import request, jsonify
from sqlalchemy import or_
from extensions import db
from models.sale import Sale
from models.sale_item import SaleItem
from models.product import Product
from models.customer import Customer
from models.warranty import Warranty
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import sales_bp


def add_months(source_date, months):
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    day = min(source_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                                31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


@sales_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_sales():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        customer_id = request.args.get('customer_id', type=int)
        payment_status = request.args.get('payment_status')
        sale_type = request.args.get('sale_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = Sale.query

        if customer_id:
            query = query.filter_by(customer_id=customer_id)
        if payment_status:
            query = query.filter_by(payment_status=payment_status)
        if sale_type:
            query = query.filter_by(sale_type=sale_type)
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Sale.sale_date >= start)
            except ValueError:
                pass
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Sale.sale_date <= end)
            except ValueError:
                pass

        query = query.order_by(Sale.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        sales = []
        for sale in pagination.items:
            item = sale.to_dict()
            if sale.customer:
                item['customer_name'] = sale.customer.name
            if sale.user:
                item['user_name'] = sale.user.username
            sales.append(item)

        return jsonify({
            'success': True,
            'data': {
                'sales': sales,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Sales retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@sales_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def create_sale():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        items_data = data.get('items', [])
        if not items_data:
            return jsonify({'success': False, 'data': None, 'message': 'At least one item is required'}), 400

        customer_id = data.get('customer_id')
        if not customer_id:
            return jsonify({'success': False, 'data': None, 'message': 'Customer ID is required'}), 400

        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'success': False, 'data': None, 'message': 'Customer not found'}), 404

        current_user_id = int(get_jwt_identity())
        sale_date_str = data.get('sale_date')
        if sale_date_str:
            try:
                sale_date = datetime.strptime(sale_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'data': None, 'message': 'Invalid date format, use YYYY-MM-DD'}), 400
        else:
            sale_date = date.today()

        invoice_date_str = sale_date.strftime('%Y%m%d')
        today_count = Sale.query.filter(
            db.func.date(Sale.created_at) == date.today()
        ).count()
        seq = today_count + 1
        invoice_number = f'SAL-{invoice_date_str}-{seq:04d}'

        subtotal = Decimal('0.00')
        sale_items_to_create = []

        for idx, item_data in enumerate(items_data):
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity', 1)
            unit_price = Decimal(str(item_data.get('unit_price', 0)))
            item_discount = Decimal(str(item_data.get('discount', 0)))

            if not product_id:
                return jsonify({'success': False, 'data': None, 'message': f'Item {idx + 1}: product_id is required'}), 400

            product = Product.query.get(product_id)
            if not product:
                return jsonify({'success': False, 'data': None, 'message': f'Item {idx + 1}: Product with ID {product_id} not found'}), 404

            if product.stock_quantity < quantity:
                return jsonify({
                    'success': False,
                    'data': None,
                    'message': f'Item {idx + 1}: Insufficient stock for {product.name}. Available: {product.stock_quantity}, requested: {quantity}'
                }), 400

            line_total = (Decimal(str(quantity)) * unit_price) - item_discount
            if line_total < 0:
                line_total = Decimal('0.00')
            subtotal += Decimal(str(quantity)) * unit_price

            sale_items_to_create.append({
                'product': product,
                'quantity': quantity,
                'unit_price': unit_price,
                'discount': item_discount,
                'total_price': line_total
            })

        sale_discount = Decimal(str(data.get('discount', 0)))
        sale_tax = Decimal(str(data.get('tax', 0)))
        total_amount = subtotal - sale_discount + sale_tax
        if total_amount < 0:
            total_amount = Decimal('0.00')

        amount_paid = Decimal(str(data.get('amount_paid', 0)))
        change_amount = Decimal('0.00')
        balance_due = Decimal('0.00')

        if amount_paid >= total_amount:
            change_amount = amount_paid - total_amount
            payment_status = 'paid'
        elif amount_paid > 0:
            balance_due = total_amount - amount_paid
            payment_status = 'partial'
        else:
            balance_due = total_amount
            payment_status = 'unpaid'

        sale = Sale(
            invoice_number=invoice_number,
            customer_id=customer_id,
            user_id=current_user_id,
            sale_date=sale_date,
            subtotal=float(subtotal),
            discount=float(sale_discount),
            tax=float(sale_tax),
            total_amount=float(total_amount),
            amount_paid=float(amount_paid),
            change_amount=float(change_amount),
            balance_due=float(balance_due),
            payment_method=data.get('payment_method', 'cash'),
            payment_status=payment_status,
            sale_type=data.get('sale_type', 'retail'),
            notes=data.get('notes', '')
        )
        db.session.add(sale)
        db.session.flush()

        created_items = []
        for si in sale_items_to_create:
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=si['product'].id,
                quantity=si['quantity'],
                unit_price=float(si['unit_price']),
                discount=float(si['discount']),
                total_price=float(si['total_price'])
            )
            db.session.add(sale_item)
            db.session.flush()

            si['product'].stock_quantity -= si['quantity']

            if si['product'].warranty_months and si['product'].warranty_months > 0:
                warranty_start = sale_date
                warranty_end = add_months(sale_date, si['product'].warranty_months)
                warranty = Warranty(
                    sale_item_id=sale_item.id,
                    product_id=si['product'].id,
                    customer_id=customer_id,
                    start_date=warranty_start,
                    end_date=warranty_end,
                    warranty_type='standard',
                    status='active'
                )
                db.session.add(warranty)

            item_dict = sale_item.to_dict()
            item_dict['product_name'] = si['product'].name
            item_dict['product_sku'] = si['product'].sku
            created_items.append(item_dict)

        customer.total_purchases = float(Decimal(str(customer.total_purchases or 0)) + total_amount)
        points_earned = int(total_amount // Decimal('100'))
        customer.loyalty_points = (customer.loyalty_points or 0) + points_earned

        db.session.commit()

        result = sale.to_dict()
        result['items'] = created_items
        result['customer_name'] = customer.name
        from models.user import User
        user = User.query.get(current_user_id)
        result['user_name'] = user.username if user else None

        return jsonify({'success': True, 'data': result, 'message': 'Sale created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@sales_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_sale(id):
    try:
        sale = Sale.query.get(id)
        if not sale:
            return jsonify({'success': False, 'data': None, 'message': 'Sale not found'}), 404

        result = sale.to_dict()
        result['customer_name'] = sale.customer.name if sale.customer else None
        result['user_name'] = sale.user.username if sale.user else None

        items = []
        for si in sale.items.all():
            item_dict = si.to_dict()
            if si.product:
                item_dict['product_name'] = si.product.name
                item_dict['product_sku'] = si.product.sku
            items.append(item_dict)
        result['items'] = items

        return jsonify({'success': True, 'data': result, 'message': 'Sale retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@sales_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_sale(id):
    try:
        sale = Sale.query.get(id)
        if not sale:
            return jsonify({"success": False, "error": "Sale not found"}), 404

        for item in sale.items:
            product = Product.query.get(item.product_id)
            if product:
                product.stock_quantity += item.quantity

        if sale.customer_id:
            customer = Customer.query.get(sale.customer_id)
            if customer:
                customer.total_purchases -= float(sale.total_amount or 0)
                if customer.total_purchases < 0:
                    customer.total_purchases = 0

        log_delete(
            module='Sales',
            record_id=sale.id,
            record_name=sale.invoice_number,
            record_data=sale.to_dict(),
            user_id=get_jwt_identity(),
            user_name=sale.user.full_name if sale.user else 'Unknown',
            can_restore=True
        )

        db.session.delete(sale)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Sale deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
