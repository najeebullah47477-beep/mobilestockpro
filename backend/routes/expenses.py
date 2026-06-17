from datetime import datetime
from flask import request, jsonify
from extensions import db
from models.expense import Expense
from models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils import role_required, log_delete
from models.user import User
from routes import expenses_bp


@expenses_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_expenses():
    try:
        category = request.args.get('category', '').strip()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Expense.query

        if category:
            query = query.filter(Expense.category == category)
        if start_date:
            query = query.filter(Expense.expense_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        if end_date:
            query = query.filter(Expense.expense_date <= datetime.strptime(end_date, '%Y-%m-%d').date())

        query = query.order_by(Expense.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'expenses': [expense.to_dict() for expense in pagination.items],
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Expenses retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@expenses_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_expense():
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No input data provided'}), 400

        title = data.get('title', '').strip()
        category = data.get('category', '').strip()
        amount = data.get('amount')
        expense_date = data.get('expense_date', '').strip()

        if not title or not category or amount is None or not expense_date:
            return jsonify({'success': False, 'data': None, 'message': 'Title, category, amount, and expense_date are required'}), 400

        expense = Expense(
            title=title,
            category=category,
            amount=float(amount),
            expense_date=datetime.strptime(expense_date, '%Y-%m-%d').date(),
            payment_method=data.get('payment_method', '').strip(),
            notes=data.get('notes', '').strip(),
            user_id=current_user_id
        )
        db.session.add(expense)
        db.session.commit()

        return jsonify({'success': True, 'data': expense.to_dict(), 'message': 'Expense created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@expenses_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_expense(id):
    try:
        expense = Expense.query.get(id)
        if not expense:
            return jsonify({'success': False, 'data': None, 'message': 'Expense not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No input data provided'}), 400

        if 'title' in data:
            expense.title = data['title'].strip()
        if 'category' in data:
            expense.category = data['category'].strip()
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'expense_date' in data:
            expense.expense_date = datetime.strptime(data['expense_date'].strip(), '%Y-%m-%d').date()
        if 'payment_method' in data:
            expense.payment_method = data['payment_method'].strip()
        if 'notes' in data:
            expense.notes = data['notes'].strip()

        db.session.commit()

        return jsonify({'success': True, 'data': expense.to_dict(), 'message': 'Expense updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@expenses_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_expense(id):
    try:
        expense = Expense.query.get(id)
        if not expense:
            return jsonify({'success': False, 'data': None, 'message': 'Expense not found'}), 404

        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        log_delete(
            module='Expenses',
            record_id=expense.id,
            record_name=expense.title,
            record_data=expense.to_dict(),
            user_id=current_user_id,
            user_name=user.full_name if user else 'Unknown',
            can_restore=True
        )

        db.session.delete(expense)
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Expense deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
