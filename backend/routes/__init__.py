from flask import Blueprint


auth_bp = Blueprint('auth', __name__)
categories_bp = Blueprint('categories', __name__)
brands_bp = Blueprint('brands', __name__)
suppliers_bp = Blueprint('suppliers', __name__)
customers_bp = Blueprint('customers', __name__)
sales_bp = Blueprint('sales', __name__)
purchases_bp = Blueprint('purchases', __name__)
expenses_bp = Blueprint('expenses', __name__)
warranties_bp = Blueprint('warranties', __name__)
notifications_bp = Blueprint('notifications', __name__)
reports_bp = Blueprint('reports', __name__)
dashboard_bp = Blueprint('dashboard', __name__)
delete_history_bp = Blueprint('delete_history', __name__)

# Import route modules to register decorators on blueprints
from routes import auth
from routes import products
from routes import categories
from routes import brands
from routes import suppliers
from routes import customers
from routes import sales
from routes import purchases
from routes import expenses
from routes import warranties
from routes import notifications
from routes import reports
from routes import dashboard
from routes import delete_history

# products_bp is defined in routes/products.py
from routes.products import products_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(brands_bp, url_prefix='/api/brands')
    app.register_blueprint(suppliers_bp, url_prefix='/api/suppliers')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(purchases_bp, url_prefix='/api/purchases')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(warranties_bp, url_prefix='/api/warranties')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(delete_history_bp, url_prefix='/api/delete-history')
