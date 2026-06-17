from datetime import datetime, date, timedelta
from decimal import Decimal
from werkzeug.security import generate_password_hash
from dateutil.relativedelta import relativedelta
from app import create_app
from extensions import db
from models import *

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    print("Seeding database...")

    # --- Users ---
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            full_name='Admin User',
            email='admin@shop.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            is_active=True
        )
        db.session.add(admin)
    else:
        admin = User.query.filter_by(username='admin').first()

    if not User.query.filter_by(username='manager').first():
        manager = User(
            username='manager',
            full_name='Store Manager',
            email='manager@shop.com',
            password_hash=generate_password_hash('manager123'),
            role='manager',
            is_active=True
        )
        db.session.add(manager)
    else:
        manager = User.query.filter_by(username='manager').first()

    if not User.query.filter_by(username='staff').first():
        staff_user = User(
            username='staff',
            full_name='Staff Member',
            email='staff@mobileshop.com',
            password_hash=generate_password_hash('staff123'),
            role='staff',
            is_active=True
        )
        db.session.add(staff_user)

    db.session.flush()

    # --- Categories ---
    cat_smartphones = Category(name='Smartphones', description='Mobile smartphones', category_type='device')
    cat_feature = Category(name='Feature Phones', description='Basic feature phones', category_type='device')
    cat_tablets = Category(name='Tablets', description='Tablet devices', category_type='device')
    cat_refurbished = Category(name='Refurbished Phones', description='Refurbished mobile phones', category_type='device')
    cat_smart_watches = Category(name='Smart Watches', description='Smartwatch devices', category_type='device')
    cat_accessories = Category(name='Accessories', description='Phone accessories', category_type='accessory')
    cat_chargers = Category(name='Chargers', description='Phone chargers', category_type='accessory')
    cat_spare_parts = Category(name='Spare Parts', description='Replacement spare parts', category_type='accessory')
    cat_cables = Category(name='Cables', description='USB cables and data cables', category_type='accessory')
    cat_cases = Category(name='Cases & Covers', description='Phone cases and covers', category_type='accessory')
    cat_screen_protectors = Category(name='Screen Protectors', description='Screen protection', category_type='accessory')
    cat_earphones = Category(name='Earphones & Headphones', description='Audio accessories', category_type='accessory')
    cat_power_banks = Category(name='Power Banks', description='Portable chargers', category_type='accessory')
    cat_memory_cards = Category(name='Memory Cards', description='Storage expansion', category_type='accessory')
    cat_other = Category(name='Other', description='Other miscellaneous items', category_type='accessory')
    db.session.add_all([
        cat_smartphones, cat_feature, cat_tablets, cat_refurbished, cat_smart_watches,
        cat_accessories, cat_chargers, cat_spare_parts, cat_cables, cat_cases,
        cat_screen_protectors, cat_earphones, cat_power_banks, cat_memory_cards, cat_other
    ])
    db.session.flush()

    # --- Brands ---
    brand_samsung = Brand(name='Samsung', country_of_origin='South Korea')
    brand_apple = Brand(name='Apple', country_of_origin='USA')
    brand_infinix = Brand(name='Infinix', country_of_origin='China')
    brand_vivo = Brand(name='Vivo', country_of_origin='China')
    db.session.add_all([brand_samsung, brand_apple, brand_infinix, brand_vivo])
    db.session.flush()

    # --- Suppliers ---
    supplier_mw = Supplier(name='Mobile World', contact_person='Ali Ahmed', phone='0300-1234567', city='Karachi')
    supplier_td = Supplier(name='Tech Distributors', contact_person='Sara Khan', phone='0301-7654321', city='Lahore')
    supplier_ph = Supplier(name='Phone Hub', contact_person='Usman Ali', phone='0302-9876543', city='Islamabad')
    db.session.add_all([supplier_mw, supplier_td, supplier_ph])
    db.session.flush()

    # --- Customers ---
    cust1 = Customer(name='Ahmed Hassan', phone='0311-1111111')
    cust2 = Customer(name='Fatima Bibi', phone='0311-2222222')
    cust3 = Customer(name='Muhammad Ali', phone='0311-3333333')
    cust4 = Customer(name='Ayesha Khan', phone='0311-4444444')
    cust5 = Customer(name='Imran Khan', phone='0311-5555555')
    db.session.add_all([cust1, cust2, cust3, cust4, cust5])
    db.session.flush()

    # --- Products ---
    products_data = [
        # (name, sku, category, brand, supplier, condition, purchase_price, selling_price, stock, threshold, warranty, color, storage, ram)
        ('Samsung Galaxy S24', 'MOB-S24-001', cat_smartphones, brand_samsung, supplier_mw, 'new', 150000, 180000, 10, 3, 24, 'Titanium Gray', '256GB', '8GB'),
        ('iPhone 15 Pro', 'MOB-IP15P-002', cat_smartphones, brand_apple, supplier_td, 'new', 180000, 200000, 8, 2, 24, 'Natural Titanium', '256GB', '8GB'),
        ('Infinix Note 40', 'MOB-IN40-003', cat_smartphones, brand_infinix, supplier_ph, 'new', 35000, 45000, 15, 5, 12, 'Sunset Gold', '256GB', '8GB'),
        ('Vivo V30', 'MOB-VV30-004', cat_smartphones, brand_vivo, supplier_ph, 'new', 40000, 50000, 12, 5, 12, 'Peacock Green', '256GB', '8GB'),
        ('Samsung Galaxy A14', 'MOB-SA14-005', cat_smartphones, brand_samsung, supplier_mw, 'new', 25000, 32000, 20, 5, 12, 'Black', '64GB', '4GB'),
        ('iPhone 14', 'MOB-IP14-006', cat_smartphones, brand_apple, supplier_td, 'new', 140000, 160000, 5, 2, 24, 'Midnight', '128GB', '6GB'),
        ('Infinix Hot 40', 'MOB-IH40-007', cat_smartphones, brand_infinix, supplier_ph, 'new', 20000, 27000, 2, 5, 12, 'Racing Black', '128GB', '8GB'),
        ('Vivo Y17s', 'MOB-VY17-008', cat_smartphones, brand_vivo, supplier_ph, 'new', 18000, 22000, 3, 5, 12, 'Forest Green', '128GB', '6GB'),
        ('Samsung Galaxy Tab S9', 'MOB-STABS9-009', cat_tablets, brand_samsung, supplier_mw, 'new', 120000, 145000, 7, 3, 24, 'Graphite', '128GB', '8GB'),
        ('Apple iPad', 'MOB-AIPAD-010', cat_tablets, brand_apple, supplier_td, 'new', 100000, 130000, 6, 2, 24, 'Silver', '64GB', '4GB'),
        ('Samsung Galaxy Buds', 'MOB-SGBUDS-011', cat_accessories, brand_samsung, supplier_mw, 'new', 15000, 20000, 25, 5, 12, 'White', None, None),
        ('iPhone Case', 'MOB-IPCASE-012', cat_accessories, brand_apple, supplier_td, 'new', 1500, 3000, 50, 10, 12, 'Clear', None, None),
        ('Infinix Charger', 'MOB-INCHARG-013', cat_spare_parts, brand_infinix, supplier_ph, 'new', 800, 1500, 50, 10, 12, 'White', None, None),
        ('Vivo Screen Protector', 'MOB-VSP-014', cat_accessories, brand_vivo, supplier_ph, 'new', 300, 800, 60, 20, 12, 'Transparent', None, None),
        ('Samsung USB Cable', 'MOB-SUSBC-015', cat_spare_parts, brand_samsung, supplier_mw, 'used', 500, 1200, 1, 10, 12, 'Black', None, None),
    ]

    products = []
    for pd in products_data:
        p = Product(
            name=pd[0],
            sku=pd[1],
            category_id=pd[2].id,
            brand_id=pd[3].id,
            supplier_id=pd[4].id,
            condition=pd[5],
            purchase_price=pd[6],
            selling_price=pd[7],
            stock_quantity=pd[8],
            low_stock_threshold=pd[9],
            warranty_months=pd[10],
            color=pd[11],
            storage_capacity=pd[12],
            ram=pd[13],
            is_active=True
        )
        products.append(p)

    db.session.add_all(products)
    db.session.flush()

    product_map = {p.name: p for p in products}

    today = date.today()

    # --- Purchases ---
    purchases_data = [
        {
            'supplier': supplier_mw,
            'user': admin,
            'date': today - timedelta(days=45),
            'items': [
                (product_map['Samsung Galaxy S24'], 10, 150000),
                (product_map['Samsung Galaxy A14'], 20, 25000),
                (product_map['Samsung Galaxy Buds'], 25, 15000),
            ]
        },
        {
            'supplier': supplier_td,
            'user': admin,
            'date': today - timedelta(days=40),
            'items': [
                (product_map['iPhone 15 Pro'], 8, 180000),
                (product_map['iPhone 14'], 5, 140000),
                (product_map['Apple iPad'], 6, 100000),
            ]
        },
        {
            'supplier': supplier_ph,
            'user': manager,
            'date': today - timedelta(days=35),
            'items': [
                (product_map['Infinix Note 40'], 15, 35000),
                (product_map['Vivo V30'], 12, 40000),
                (product_map['Infinix Hot 40'], 10, 20000),
            ]
        },
        {
            'supplier': supplier_mw,
            'user': manager,
            'date': today - timedelta(days=30),
            'items': [
                (product_map['Samsung Galaxy Tab S9'], 7, 120000),
                (product_map['Samsung USB Cable'], 50, 500),
            ]
        },
        {
            'supplier': supplier_ph,
            'user': admin,
            'date': today - timedelta(days=25),
            'items': [
                (product_map['Vivo Y17s'], 10, 18000),
                (product_map['Vivo Screen Protector'], 60, 300),
                (product_map['Infinix Charger'], 50, 800),
            ]
        },
    ]

    for pd in purchases_data:
        subtotal = sum(item[1] * item[2] for item in pd['items'])
        total_amount = subtotal
        invoice_num = f'PO-{pd["date"].strftime("%Y%m%d")}-{pd["supplier"].id}{pd["user"].id}'
        purchase = Purchase(
            invoice_number=invoice_num,
            supplier_id=pd['supplier'].id,
            user_id=pd['user'].id,
            purchase_date=pd['date'],
            subtotal=float(subtotal),
            discount=0,
            tax=0,
            total_amount=float(total_amount),
            amount_paid=float(total_amount),
            balance_due=0,
            payment_method='bank_transfer',
            payment_status='paid',
            notes=f'Purchase from {pd["supplier"].name}'
        )
        db.session.add(purchase)
        db.session.flush()

        for product_item, qty, unit_cost in pd['items']:
            total_cost = qty * unit_cost
            pi = PurchaseItem(
                purchase_id=purchase.id,
                product_id=product_item.id,
                quantity=qty,
                unit_cost=float(unit_cost),
                total_cost=float(total_cost)
            )
            db.session.add(pi)

    db.session.flush()

    # --- Sales ---
    sale_dates = [
        today - timedelta(days=20),
        today - timedelta(days=18),
        today - timedelta(days=15),
        today - timedelta(days=14),
        today - timedelta(days=12),
        today - timedelta(days=10),
        today - timedelta(days=8),
        today - timedelta(days=5),
        today - timedelta(days=3),
        today - timedelta(days=1),
    ]

    sales_data = [
        {'customer': cust1, 'user': admin, 'items': [(product_map['Samsung Galaxy S24'], 1, 180000, 0)]},
        {'customer': cust2, 'user': manager, 'items': [(product_map['iPhone 15 Pro'], 1, 200000, 0)]},
        {'customer': cust3, 'user': admin, 'items': [(product_map['Infinix Note 40'], 1, 45000, 0), (product_map['Samsung Galaxy Buds'], 2, 20000, 0)]},
        {'customer': cust4, 'user': manager, 'items': [(product_map['Vivo V30'], 1, 50000, 0)]},
        {'customer': cust5, 'user': admin, 'items': [(product_map['Samsung Galaxy A14'], 2, 32000, 0), (product_map['iPhone Case'], 1, 3000, 0)]},
        {'customer': cust1, 'user': manager, 'items': [(product_map['iPhone 14'], 1, 160000, 0)]},
        {'customer': cust2, 'user': admin, 'items': [(product_map['Infinix Hot 40'], 1, 27000, 0), (product_map['Vivo Y17s'], 1, 22000, 0)]},
        {'customer': cust3, 'user': manager, 'items': [(product_map['Samsung Galaxy Tab S9'], 1, 145000, 0), (product_map['Samsung USB Cable'], 2, 1200, 0)]},
        {'customer': cust4, 'user': admin, 'items': [(product_map['Apple iPad'], 1, 130000, 0)]},
        {'customer': cust5, 'user': manager, 'items': [(product_map['Vivo Screen Protector'], 3, 800, 0), (product_map['Infinix Charger'], 2, 1500, 0)]},
    ]

    for idx, sd in enumerate(sales_data):
        sale_date = sale_dates[idx]
        subtotal = Decimal('0.00')
        sale_items_list = []

        for prod_item, qty, unit_price, discount in sd['items']:
            line_subtotal = Decimal(str(qty)) * Decimal(str(unit_price))
            subtotal += line_subtotal
            sale_items_list.append({
                'product': prod_item,
                'quantity': qty,
                'unit_price': Decimal(str(unit_price)),
                'discount': Decimal(str(discount)),
                'total_price': line_subtotal
            })

        discount = Decimal('0.00')
        tax = Decimal('0.00')
        if idx % 3 == 0:
            discount = Decimal('500.00')
        if idx % 4 == 0:
            tax = Decimal(str(float(subtotal) * 0.05))

        total_amount = subtotal - discount + tax
        amount_paid = total_amount

        invoice_num = f'SAL-{sale_date.strftime("%Y%m%d")}-{idx + 1:04d}'

        sale = Sale(
            invoice_number=invoice_num,
            customer_id=sd['customer'].id,
            user_id=sd['user'].id,
            sale_date=sale_date,
            subtotal=float(subtotal),
            discount=float(discount),
            tax=float(tax),
            total_amount=float(total_amount),
            amount_paid=float(amount_paid),
            change_amount=0,
            balance_due=0,
            payment_method='cash',
            payment_status='paid',
            sale_type='retail',
            notes=f'Sale to {sd["customer"].name}'
        )
        db.session.add(sale)
        db.session.flush()

        for sli in sale_items_list:
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=sli['product'].id,
                quantity=sli['quantity'],
                unit_price=float(sli['unit_price']),
                discount=float(sli['discount']),
                total_price=float(sli['total_price'])
            )
            db.session.add(sale_item)
            db.session.flush()

            sli['product'].stock_quantity -= sli['quantity']

            if sli['product'].warranty_months and sli['product'].warranty_months > 0:
                warranty_start = sale_date
                warranty_end_date = warranty_start + relativedelta(months=sli['product'].warranty_months)
                warranty = Warranty(
                    sale_item_id=sale_item.id,
                    product_id=sli['product'].id,
                    customer_id=sd['customer'].id,
                    start_date=warranty_start,
                    end_date=warranty_end_date,
                    warranty_type='standard',
                    status='active'
                )
                db.session.add(warranty)

        sd['customer'].total_purchases = float(Decimal(str(sd['customer'].total_purchases or 0)) + total_amount)
        points_earned = int(total_amount // Decimal('100'))
        sd['customer'].loyalty_points = (sd['customer'].loyalty_points or 0) + points_earned

    db.session.flush()

    # --- Expenses ---
    expenses_data = [
        {'title': 'Shop Rent', 'category': 'Rent', 'amount': 50000, 'date': today - timedelta(days=5), 'user': admin, 'payment_method': 'bank_transfer'},
        {'title': 'Electricity Bill', 'category': 'Utilities', 'amount': 12000, 'date': today - timedelta(days=3), 'user': admin, 'payment_method': 'bank_transfer'},
        {'title': 'Employee Salary', 'category': 'Salary', 'amount': 45000, 'date': today - timedelta(days=2), 'user': manager, 'payment_method': 'bank_transfer'},
        {'title': 'Internet & Phone', 'category': 'Utilities', 'amount': 5000, 'date': today - timedelta(days=1), 'user': manager, 'payment_method': 'cash'},
        {'title': 'Marketing', 'category': 'Marketing', 'amount': 15000, 'date': today, 'user': admin, 'payment_method': 'cash'},
    ]

    for ed in expenses_data:
        expense = Expense(
            title=ed['title'],
            category=ed['category'],
            amount=ed['amount'],
            expense_date=ed['date'],
            payment_method=ed['payment_method'],
            notes='',
            user_id=ed['user'].id
        )
        db.session.add(expense)

    db.session.commit()
    print("Database seeded successfully!")
