from flask import Blueprint, jsonify
from extensions import db
from models import *
from sqlalchemy import func
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from flask_jwt_extended import jwt_required
from utils import role_required
from routes import dashboard_bp


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def dashboard_stats():
    try:
        today = date.today()
        current_month_start = today.replace(day=1)
        next_month_start = (current_month_start + relativedelta(months=1))

        today_sales_count = Sale.query.filter(
            Sale.sale_date == today
        ).count()

        today_sales_revenue = db.session.query(func.sum(Sale.total_amount)).filter(
            Sale.sale_date == today
        ).scalar() or 0

        today_purchases_count = Purchase.query.filter(
            Purchase.purchase_date == today
        ).count()

        today_purchases_amount = db.session.query(func.sum(Purchase.total_amount)).filter(
            Purchase.purchase_date == today
        ).scalar() or 0

        total_products = Product.query.filter_by(is_active=True).count()

        low_stock_count = Product.query.filter(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold
        ).count()

        total_customers = Customer.query.count()
        total_suppliers = Supplier.query.count()

        monthly_revenue = db.session.query(func.sum(Sale.total_amount)).filter(
            Sale.sale_date >= current_month_start,
            Sale.sale_date < next_month_start
        ).scalar() or 0

        monthly_profit_data = db.session.query(
            func.sum((SaleItem.unit_price - Product.purchase_price) * SaleItem.quantity)
        ).join(Sale).join(Product, Product.id == SaleItem.product_id).filter(
            Sale.sale_date >= current_month_start,
            Sale.sale_date < next_month_start
        ).scalar() or 0

        monthly_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.expense_date >= current_month_start,
            Expense.expense_date < next_month_start
        ).scalar() or 0

        unread_notifications = Notification.query.filter_by(is_read=False).count()

        top_products_query = db.session.query(
            Product.id,
            Product.name,
            Product.sku,
            func.sum(SaleItem.quantity).label('total_qty')
        ).join(SaleItem, SaleItem.product_id == Product.id).join(Sale).filter(
            Sale.sale_date >= current_month_start,
            Sale.sale_date < next_month_start
        ).group_by(Product.id, Product.name, Product.sku).order_by(
            func.sum(SaleItem.quantity).desc()
        ).limit(5).all()

        top_selling_products = []
        for row in top_products_query:
            top_selling_products.append({
                'id': row.id,
                'name': row.name,
                'sku': row.sku,
                'quantity_sold': int(row.total_qty)
            })

        recent_sales_query = Sale.query.order_by(Sale.created_at.desc()).limit(5).all()
        recent_sales = []
        for sale in recent_sales_query:
            recent_sales.append({
                'id': sale.id,
                'invoice_number': sale.invoice_number,
                'customer_name': sale.customer.name if sale.customer else None,
                'total_amount': float(sale.total_amount or 0),
                'sale_date': sale.sale_date.isoformat() if sale.sale_date else None,
                'payment_status': sale.payment_status
            })

        sales_last_7_days = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_revenue = db.session.query(func.sum(Sale.total_amount)).filter(
                Sale.sale_date == day
            ).scalar() or 0
            day_count = Sale.query.filter(Sale.sale_date == day).count()
            sales_last_7_days.append({
                'date': day.isoformat(),
                'revenue': float(day_revenue),
                'count': day_count
            })

        return jsonify({
            'success': True,
            'data': {
                'today_sales_count': today_sales_count,
                'today_sales_revenue': float(today_sales_revenue),
                'today_purchases_count': today_purchases_count,
                'today_purchases_amount': float(today_purchases_amount),
                'total_products': total_products,
                'low_stock_count': low_stock_count,
                'total_customers': total_customers,
                'total_suppliers': total_suppliers,
                'monthly_revenue': float(monthly_revenue),
                'monthly_profit': float(monthly_profit_data),
                'monthly_expenses': float(monthly_expenses),
                'unread_notifications': unread_notifications,
                'top_selling_products': top_selling_products,
                'recent_sales': recent_sales,
                'sales_last_7_days': sales_last_7_days
            },
            'message': 'Dashboard stats retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
