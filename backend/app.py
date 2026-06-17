from flask import Flask, jsonify
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
    cors.init_app(app)

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

    scheduler.add_job(
        func=check_low_stock,
        trigger="interval",
        hours=1,
        id="low_stock_check",
        name="Check low stock every hour"
    )
    scheduler.start()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
