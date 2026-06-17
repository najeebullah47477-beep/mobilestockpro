from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.product import Product
from models.category import Category
from models.user import User
from utils import role_required, log_delete
from datetime import datetime

products_bp = Blueprint('products', __name__)


@products_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_products():
    try:
        search = request.args.get('search', '').strip()
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        supplier_id = request.args.get('supplier_id', type=int)
        condition = request.args.get('condition')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Product.query.filter_by(is_active=True)

        if search:
            like_pattern = f'%{search}%'
            query = query.filter(
                Product.name.ilike(like_pattern) |
                Product.sku.ilike(like_pattern) |
                Product.imei.ilike(like_pattern) |
                Product.barcode.ilike(like_pattern)
            )

        if category_id:
            query = query.filter_by(category_id=category_id)
        if brand_id:
            query = query.filter_by(brand_id=brand_id)
        if supplier_id:
            query = query.filter_by(supplier_id=supplier_id)
        if condition:
            query = query.filter_by(condition=condition)

        query = query.order_by(Product.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        products = []
        for product in pagination.items:
            item = product.to_dict()
            if product.category:
                item['category_name'] = product.category.name
            if product.brand:
                item['brand_name'] = product.brand.name
            if product.supplier:
                item['supplier_name'] = product.supplier.name
            products.append(item)

        return jsonify({
            'success': True,
            'data': {
                'products': products,
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Products retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@products_bp.route('', methods=['POST'])
@jwt_required()
@role_required('admin', 'manager')
def create_product():
    try:
        print("=== CREATE PRODUCT REQUEST ===")
        print("Request JSON:", request.get_json())
        print("Request Headers:", dict(request.headers))

        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data received. Send JSON with Content-Type: application/json"
            }), 400

        print("Received data keys:", list(data.keys()))

        errors = {}

        if not data.get('name') or str(data.get('name')).strip() == '':
            errors['name'] = 'Product name is required'

        if data.get('purchase_price') is None:
            errors['purchase_price'] = 'Purchase price is required'
        elif float(data.get('purchase_price', 0)) <= 0:
            errors['purchase_price'] = 'Purchase price must be greater than 0'

        if data.get('selling_price') is None:
            errors['selling_price'] = 'Selling price is required'
        elif float(data.get('selling_price', 0)) <= 0:
            errors['selling_price'] = 'Selling price must be greater than 0'

        if data.get('stock_quantity') is None:
            errors['stock_quantity'] = 'Stock quantity is required'

        if errors:
            print("Validation errors:", errors)
            return jsonify({
                "success": False,
                "error": "Validation failed",
                "details": errors
            }), 400

        sku = data.get('sku', '').strip()
        if not sku:
            date_str = datetime.now().strftime('%Y%m%d')
            last_product = Product.query.filter(
                Product.sku.like(f'MOB-{date_str}-%')
            ).order_by(Product.id.desc()).first()

            if last_product:
                try:
                    last_num = int(last_product.sku.split('-')[-1])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1
            sku = f'MOB-{date_str}-{str(new_num).zfill(4)}'

        print("Generated/received SKU:", sku)

        existing_sku = Product.query.filter_by(sku=sku).first()
        if existing_sku:
            return jsonify({
                "success": False,
                "error": f"SKU '{sku}' already exists. Use a different SKU."
            }), 400

        imei = data.get('imei', None)
        ram = data.get('ram', None)
        storage_capacity = data.get('storage_capacity', None)

        category_id = data.get('category_id')
        if category_id:
            category = Category.query.get(category_id)
            if category and category.category_type == 'accessory':
                imei = None
                ram = None
                storage_capacity = None
                print(f"Category '{category.name}' is accessory type — clearing device fields")

        if imei and imei.strip():
            existing_imei = Product.query.filter_by(imei=imei.strip()).first()
            if existing_imei:
                return jsonify({
                    "success": False,
                    "error": f"IMEI '{imei}' already exists for another product."
                }), 400
        else:
            imei = None

        product = Product(
            name=str(data.get('name')).strip(),
            sku=sku,
            imei=imei if imei else None,
            barcode=data.get('barcode', None),
            category_id=int(category_id) if category_id else None,
            brand_id=int(data.get('brand_id')) if data.get('brand_id') else None,
            supplier_id=int(data.get('supplier_id')) if data.get('supplier_id') else None,
            color=data.get('color', None),
            storage_capacity=storage_capacity,
            ram=ram,
            condition=(data.get('condition') or 'new').lower(),
            purchase_price=float(data.get('purchase_price')),
            selling_price=float(data.get('selling_price')),
            wholesale_price=float(data.get('wholesale_price')) if data.get('wholesale_price') else None,
            stock_quantity=int(data.get('stock_quantity', 0)),
            low_stock_threshold=int(data.get('low_stock_threshold', 5)),
            location_in_store=data.get('location_in_store', None),
            warranty_months=int(data.get('warranty_months', 12)),
            description=data.get('description', None),
            image_url=data.get('image_url', None),
            is_active=True
        )

        db.session.add(product)
        db.session.commit()

        print("Product created successfully:", product.id, product.name)

        return jsonify({
            "success": True,
            "message": "Product added successfully",
            "data": product.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print("=== PRODUCT CREATE ERROR ===")
        print("Error type:", type(e).__name__)
        print("Error message:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }), 500


@products_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_product(id):
    try:
        product = Product.query.filter_by(id=id, is_active=True).first()
        if not product:
            return jsonify({'success': False, 'data': None, 'message': 'Product not found'}), 404

        item = product.to_dict()
        item['category_name'] = product.category.name if product.category else None
        item['brand_name'] = product.brand.name if product.brand else None
        item['supplier_name'] = product.supplier.name if product.supplier else None

        return jsonify({'success': True, 'data': item, 'message': 'Product retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@products_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager')
def update_product(id):
    try:
        product = Product.query.get(id)
        if not product:
            return jsonify({
                "success": False,
                "error": f"Product with id {id} not found"
            }), 404

        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data received"
            }), 400

        print("=== UPDATE PRODUCT REQUEST ===")
        print("Product ID:", id)
        print("Data:", data)

        category_id = data.get('category_id', product.category_id)
        imei = data.get('imei', product.imei)
        ram = data.get('ram', product.ram)
        storage_capacity = data.get('storage_capacity', product.storage_capacity)

        if category_id:
            category = Category.query.get(category_id)
            if category and category.category_type == 'accessory':
                imei = None
                ram = None
                storage_capacity = None

        if imei and imei.strip():
            existing_imei = Product.query.filter(
                Product.imei == imei.strip(),
                Product.id != id
            ).first()
            if existing_imei:
                return jsonify({
                    "success": False,
                    "error": f"IMEI '{imei}' already exists for another product."
                }), 400
        else:
            imei = None

        new_sku = data.get('sku', product.sku)
        if new_sku and new_sku != product.sku:
            existing_sku = Product.query.filter(
                Product.sku == new_sku,
                Product.id != id
            ).first()
            if existing_sku:
                return jsonify({
                    "success": False,
                    "error": f"SKU '{new_sku}' already exists."
                }), 400

        product.name = str(data.get('name', product.name)).strip()
        product.sku = new_sku
        product.imei = imei
        product.barcode = data.get('barcode', product.barcode)
        product.category_id = int(category_id) if category_id else None
        product.brand_id = int(data.get('brand_id')) if data.get('brand_id') else None
        product.supplier_id = int(data.get('supplier_id')) if data.get('supplier_id') else None
        product.color = data.get('color', product.color)
        product.storage_capacity = storage_capacity
        product.ram = ram
        product.condition = (data.get('condition') or product.condition).lower()
        product.purchase_price = float(data.get('purchase_price', product.purchase_price))
        product.selling_price = float(data.get('selling_price', product.selling_price))
        product.wholesale_price = float(data.get('wholesale_price')) if data.get('wholesale_price') else None
        product.stock_quantity = int(data.get('stock_quantity', product.stock_quantity))
        product.low_stock_threshold = int(data.get('low_stock_threshold', product.low_stock_threshold))
        product.location_in_store = data.get('location_in_store', product.location_in_store)
        product.warranty_months = int(data.get('warranty_months', product.warranty_months))
        product.description = data.get('description', product.description)
        product.image_url = data.get('image_url', product.image_url)

        product.updated_at = datetime.utcnow()

        db.session.commit()

        print("Product updated successfully:", product.id)

        return jsonify({
            "success": True,
            "message": "Product updated successfully",
            "data": product.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print("=== PRODUCT UPDATE ERROR ===")
        print("Error:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }), 500


@products_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_product(id):
    try:
        product = Product.query.get(id)
        if not product:
            return jsonify({'success': False, 'data': None, 'message': 'Product not found'}), 404

        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        log_delete(
            module='Products',
            record_id=product.id,
            record_name=product.name,
            record_data=product.to_dict(),
            user_id=current_user_id,
            user_name=user.full_name if user else 'Unknown',
            can_restore=True
        )

        product.is_active = False
        product.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Product deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@products_bp.route('/low-stock', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_low_stock_products():
    try:
        products = Product.query.filter(
            Product.is_active == True,
            Product.stock_quantity <= Product.low_stock_threshold
        ).order_by(Product.stock_quantity.asc()).all()

        results = []
        for product in products:
            item = product.to_dict()
            item['category_name'] = product.category.name if product.category else None
            item['brand_name'] = product.brand.name if product.brand else None
            results.append(item)

        return jsonify({'success': True, 'data': results, 'message': 'Low stock products retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@products_bp.route('/check-sku', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def check_sku():
    try:
        sku = request.args.get('sku', '').strip()
        exclude_id = request.args.get('exclude_id', type=int)
        if not sku:
            return jsonify({'available': False, 'message': 'SKU parameter required'}), 400
        query = Product.query.filter(Product.sku == sku, Product.is_active == True)
        if exclude_id:
            query = query.filter(Product.id != exclude_id)
        exists = query.first() is not None
        return jsonify({'available': not exists}), 200
    except Exception as e:
        return jsonify({'available': False, 'message': str(e)}), 500


@products_bp.route('/check-imei', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def check_imei():
    try:
        imei = request.args.get('imei', '').strip()
        exclude_id = request.args.get('exclude_id', type=int)
        if not imei:
            return jsonify({'available': False, 'message': 'IMEI parameter required'}), 400
        query = Product.query.filter(Product.imei == imei, Product.is_active == True)
        if exclude_id:
            query = query.filter(Product.id != exclude_id)
        exists = query.first() is not None
        return jsonify({'available': not exists}), 200
    except Exception as e:
        return jsonify({'available': False, 'message': str(e)}), 500


@products_bp.route('/search-barcode', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def search_by_barcode():
    try:
        barcode = request.args.get('barcode', '').strip()
        if not barcode:
            return jsonify({'success': False, 'data': None, 'message': 'Barcode parameter is required'}), 400

        product = Product.query.filter(
            (Product.barcode == barcode) | (Product.imei == barcode)
        ).first()

        if not product:
            return jsonify({'success': False, 'data': None, 'message': 'Product not found'}), 404

        item = product.to_dict()
        item['category_name'] = product.category.name if product.category else None
        item['brand_name'] = product.brand.name if product.brand else None
        item['supplier_name'] = product.supplier.name if product.supplier else None

        return jsonify({'success': True, 'data': item, 'message': 'Product found'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
