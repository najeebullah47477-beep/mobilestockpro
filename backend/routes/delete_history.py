from datetime import datetime
from flask import request, jsonify
from sqlalchemy import or_, func
from extensions import db
from models.delete_history import DeleteHistory
from models.product import Product
from models.customer import Customer
from models.supplier import Supplier
from models.category import Category
from models.brand import Brand
from models.expense import Expense
from models.sale import Sale
from models.purchase import Purchase
from models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required
from routes import delete_history_bp


@delete_history_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_delete_history():
    try:
        module = request.args.get('module')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        is_restored = request.args.get('is_restored')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = DeleteHistory.query

        if module:
            query = query.filter(DeleteHistory.module == module)

        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(DeleteHistory.deleted_at >= start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                query = query.filter(DeleteHistory.deleted_at <= end)
            except ValueError:
                pass

        if search:
            like_pattern = f'%{search}%'
            query = query.filter(
                or_(
                    DeleteHistory.record_name.ilike(like_pattern),
                    DeleteHistory.deleted_by_name.ilike(like_pattern)
                )
            )

        if is_restored is not None:
            val = is_restored.lower()
            if val == 'true':
                query = query.filter(DeleteHistory.is_restored == True)
            elif val == 'false':
                query = query.filter(DeleteHistory.is_restored == False)

        query = query.order_by(DeleteHistory.deleted_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'records': [r.to_dict() for r in pagination.items],
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Delete history retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@delete_history_bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_delete_stats():
    try:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)

        total_deletions = DeleteHistory.query.count()
        deletions_today = DeleteHistory.query.filter(DeleteHistory.deleted_at >= today_start).count()
        deletions_this_month = DeleteHistory.query.filter(DeleteHistory.deleted_at >= month_start).count()

        by_module = db.session.query(
            DeleteHistory.module,
            func.count(DeleteHistory.id).label('count')
        ).group_by(DeleteHistory.module).order_by(func.count(DeleteHistory.id).desc()).all()

        by_user = db.session.query(
            DeleteHistory.deleted_by_name,
            func.count(DeleteHistory.id).label('count')
        ).group_by(DeleteHistory.deleted_by_name).order_by(func.count(DeleteHistory.id).desc()).all()

        restorable_count = DeleteHistory.query.filter_by(can_restore=True, is_restored=False).count()

        return jsonify({
            'success': True,
            'data': {
                'total_deletions': total_deletions,
                'deletions_today': deletions_today,
                'deletions_this_month': deletions_this_month,
                'restorable_count': restorable_count,
                'by_module': [{'module': m, 'count': c} for m, c in by_module],
                'by_user': [{'user': u, 'count': c} for u, c in by_user]
            },
            'message': 'Delete stats retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@delete_history_bp.route('/<int:id>/restore', methods=['POST'])
@jwt_required()
@role_required('admin')
def restore_record(id):
    try:
        history = DeleteHistory.query.get(id)

        if not history:
            return jsonify({
                "success": False,
                "error": "History record not found"
            }), 404

        if history.is_restored:
            return jsonify({
                "success": False,
                "error": "This record has already been restored"
            }), 400

        if not history.can_restore:
            return jsonify({
                "success": False,
                "error": "This record cannot be restored"
            }), 400

        # Get current user
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)

        import json
        record_data = json.loads(history.record_data)

        restored = False
        message = ""

        # ── PRODUCTS ──
        if history.module == 'Products':
            product = Product.query.get(history.record_id)
            if product:
                product.is_active = True
                message = f"Product '{history.record_name}' restored"
                restored = True
            else:
                return jsonify({
                    "success": False,
                    "error": "Product record not found in database"
                }), 404

        # ── CUSTOMERS ──
        elif history.module == 'Customers':
            existing = Customer.query.get(history.record_id)
            if existing:
                # Record still exists, just re-activate if has is_active
                if hasattr(existing, 'is_active'):
                    existing.is_active = True
                message = f"Customer '{history.record_name}' restored"
                restored = True
            else:
                # Re-create from saved record_data
                new_customer = Customer(
                    id=record_data.get('id'),
                    name=record_data.get('name'),
                    phone=record_data.get('phone'),
                    email=record_data.get('email'),
                    address=record_data.get('address'),
                    city=record_data.get('city'),
                    cnic=record_data.get('cnic'),
                    total_purchases=record_data.get('total_purchases', 0),
                    loyalty_points=record_data.get('loyalty_points', 0),
                )
                db.session.add(new_customer)
                message = f"Customer '{history.record_name}' restored"
                restored = True

        # ── SUPPLIERS ──
        elif history.module == 'Suppliers':
            existing = Supplier.query.get(history.record_id)
            if existing:
                if hasattr(existing, 'is_active'):
                    existing.is_active = True
                message = f"Supplier '{history.record_name}' restored"
                restored = True
            else:
                new_supplier = Supplier(
                    id=record_data.get('id'),
                    name=record_data.get('name'),
                    contact_person=record_data.get('contact_person'),
                    phone=record_data.get('phone'),
                    email=record_data.get('email'),
                    address=record_data.get('address'),
                    city=record_data.get('city'),
                    balance=record_data.get('balance', 0),
                )
                db.session.add(new_supplier)
                message = f"Supplier '{history.record_name}' restored"
                restored = True

        # ── CATEGORIES ──
        elif history.module == 'Categories':
            existing = Category.query.get(history.record_id)
            if existing:
                message = f"Category '{history.record_name}' already exists"
                restored = True
            else:
                new_category = Category(
                    id=record_data.get('id'),
                    name=record_data.get('name'),
                    category_type=record_data.get('category_type', 'accessory'),
                    description=record_data.get('description'),
                )
                db.session.add(new_category)
                message = f"Category '{history.record_name}' restored"
                restored = True

        # ── BRANDS ──
        elif history.module == 'Brands':
            existing = Brand.query.get(history.record_id)
            if existing:
                message = f"Brand '{history.record_name}' already exists"
                restored = True
            else:
                new_brand = Brand(
                    id=record_data.get('id'),
                    name=record_data.get('name'),
                    country_of_origin=record_data.get('country_of_origin'),
                )
                db.session.add(new_brand)
                message = f"Brand '{history.record_name}' restored"
                restored = True

        # ── EXPENSES ──
        elif history.module == 'Expenses':
            existing = Expense.query.get(history.record_id)
            if existing:
                message = f"Expense '{history.record_name}' already exists"
                restored = True
            else:
                from datetime import datetime
                new_expense = Expense(
                    id=record_data.get('id'),
                    title=record_data.get('title'),
                    category=record_data.get('category'),
                    amount=record_data.get('amount'),
                    expense_date=record_data.get('expense_date'),
                    payment_method=record_data.get('payment_method', 'cash'),
                    notes=record_data.get('notes'),
                    user_id=record_data.get('user_id'),
                )
                db.session.add(new_expense)
                message = f"Expense '{history.record_name}' restored"
                restored = True

        # ── SALES ──
        elif history.module == 'Sales':
            existing = Sale.query.get(history.record_id)
            if existing:
                message = f"Sale '{history.record_name}' already exists"
                restored = True
            else:
                new_sale = Sale(
                    id=record_data.get('id'),
                    invoice_number=record_data.get('invoice_number'),
                    customer_id=record_data.get('customer_id'),
                    user_id=record_data.get('user_id'),
                    sale_date=record_data.get('sale_date'),
                    subtotal=record_data.get('subtotal', 0),
                    discount=record_data.get('discount', 0),
                    tax=record_data.get('tax', 0),
                    total_amount=record_data.get('total_amount', 0),
                    amount_paid=record_data.get('amount_paid', 0),
                    balance_due=record_data.get('balance_due', 0),
                    payment_method=record_data.get('payment_method', 'cash'),
                    payment_status=record_data.get('payment_status', 'paid'),
                    sale_type=record_data.get('sale_type', 'retail'),
                    notes=record_data.get('notes'),
                )
                db.session.add(new_sale)
                message = f"Sale '{history.record_name}' restored"
                restored = True

        # ── PURCHASES ──
        elif history.module == 'Purchases':
            existing = Purchase.query.get(history.record_id)
            if existing:
                message = f"Purchase '{history.record_name}' already exists"
                restored = True
            else:
                new_purchase = Purchase(
                    id=record_data.get('id'),
                    invoice_number=record_data.get('invoice_number'),
                    supplier_id=record_data.get('supplier_id'),
                    user_id=record_data.get('user_id'),
                    purchase_date=record_data.get('purchase_date'),
                    subtotal=record_data.get('subtotal', 0),
                    discount=record_data.get('discount', 0),
                    tax=record_data.get('tax', 0),
                    total_amount=record_data.get('total_amount', 0),
                    amount_paid=record_data.get('amount_paid', 0),
                    balance_due=record_data.get('balance_due', 0),
                    payment_method=record_data.get('payment_method', 'cash'),
                    payment_status=record_data.get('payment_status', 'paid'),
                    notes=record_data.get('notes'),
                )
                db.session.add(new_purchase)
                message = f"Purchase '{history.record_name}' restored"
                restored = True

        else:
            return jsonify({
                "success": False,
                "error": f"Restore not supported for module: {history.module}"
            }), 400

        if restored:
            # Update history record
            from datetime import datetime
            history.is_restored = True
            history.restored_at = datetime.utcnow()
            history.restored_by_name = current_user.full_name

            db.session.commit()

            return jsonify({
                "success": True,
                "message": message
            }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@delete_history_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_history_record(id):
    try:
        history = DeleteHistory.query.get(id)
        if not history:
            return jsonify({'success': False, 'data': None, 'message': 'History record not found'}), 404

        db.session.delete(history)
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'History record deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@delete_history_bp.route('/clear', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def clear_history():
    try:
        data = request.get_json() or {}
        module = data.get('module', 'all')

        query = DeleteHistory.query
        if module and module != 'all':
            query = query.filter(DeleteHistory.module == module)

        count = query.count()
        query.delete()
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {'cleared_count': count},
            'message': f'{count} history record(s) cleared successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
