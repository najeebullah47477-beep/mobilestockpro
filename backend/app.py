from flask import Flask, jsonify, request
from config import Config
from extensions import db, migrate, jwt, cors, scheduler
from routes import register_blueprints
from datetime import datetime


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
    )

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin and origin in Config.CORS_ORIGINS:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        if request.method == 'OPTIONS':
            response.status_code = 200
        return response

    register_blueprints(app)

    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok"})

    def check_low_stock():
        with app.app_context():
            from models.product import Product
            from models.notification import Notification
            from extensions import db
            from datetime import date
            from sqlalchemy import func
            today = date.today()
            low_stock_products = Product.query.filter(
                Product.stock_quantity <= Product.low_stock_threshold,
                Product.is_active == True
            ).all()
            for product in low_stock_products:
                existing = Notification.query.filter(
                    Notification.type == 'low_stock',
                    Notification.related_id == product.id,
                    func.date(Notification.created_at) == today
                ).first()
                if not existing:
                    notif = Notification(
                        type='low_stock',
                        title='Low Stock Alert',
                        message=f'Product "{product.name}" (SKU: {product.sku}) has only {product.stock_quantity} units remaining. Threshold: {product.low_stock_threshold}',
                        related_id=product.id
                    )
                    db.session.add(notif)
            db.session.commit()

    # Scheduler ko double initialization se bachane ke liye safe check
    if not scheduler.running:
        scheduler.add_job(
            func=check_low_stock,
            trigger="interval",
            hours=1,
            id="low_stock_check",
            name="Check low stock every hour",
            replace_existing=True
        )
        scheduler.start()

    return app


# --- RAILWAY / GUNICORN FIX ---
# Ye global instance Gunicorn ko direct mil jayega jab wo 'app:app' run karega
app = create_app()

if __name__ == '__main__':
    # Jab aap VS Code me locally chalayein ge, tu ye port 5000 pe run hoga
    app.run(debug=True, port=5000)