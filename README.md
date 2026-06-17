# MobileStock Pro — Mobile Shop Inventory System

A full-stack inventory management system designed for mobile phone shops. Manage products, sales, purchases, customers, suppliers, warranties, expenses, and generate detailed reports.

## Features

- **Dashboard** — Real-time stats: daily sales, monthly revenue/profit, low stock alerts, 7-day sales trend chart
- **Product Management** — Full CRUD with SKU/IMEI/barcode tracking, stock management, low-stock thresholds, categories and brands
- **Sales & Invoices** — Multi-item sales with automatic warranty creation, payment tracking (paid/partial/unpaid), printable invoices
- **Purchases** — Purchase order management with automatic stock updates and supplier balance tracking
- **Customer Management** — Loyalty points, purchase history, warranty tracking
- **Supplier Management** — Balance tracking, purchase history
- **Expense Tracking** — Categorized expense recording
- **Warranty Management** — Auto-generated warranties on sale, claim processing, status tracking
- **Notifications** — Low-stock alerts, mark-as-read functionality
- **Reports** — Sales summary, purchase summary, profit & loss, top products, stock valuation, customer reports; Excel export
- **Role-Based Access** — Admin, Manager, Staff roles with different permissions
- **Barcode/IMEI Search** — Quick product lookup by barcode or IMEI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Zustand, Recharts, React Hook Form, React Hot Toast, Day.js |
| Backend | Python 3.11+, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-CORS, Marshmallow, APScheduler |
| Database | PostgreSQL |
| Reporting | openpyxl (Excel export) |

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL 15 or higher
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mobile-shop-inventory
```

### 2. Create PostgreSQL Database

```bash
createdb mobile_db
```

Or via pgAdmin: create a database named `mobile_db`.

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env .env  # Windows
cp .env .env    # macOS/Linux

# Edit .env if needed (database URL, JWT secret)

# Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Seed data
python seed.py

# Run server
flask run --port=5000
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env .env  # Windows
cp .env .env    # macOS/Linux

# Run development server
npm run dev
```

### 5. Access the Application

- Backend API: http://localhost:5000/api
- Frontend: http://localhost:5173

### Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/change-password | Change password |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products (paginated, filterable) |
| POST | /api/products | Create product |
| GET | /api/products/:id | Get product details |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Soft delete product (admin) |
| GET | /api/products/low-stock | List low stock products |
| GET | /api/products/search-barcode | Find by barcode/IMEI |

### Categories, Brands, Suppliers, Customers
Standard CRUD endpoints for each resource.

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sales | List sales (paginated, filterable) |
| POST | /api/sales | Create sale (with items, warranties) |
| GET | /api/sales/:id | Get sale details |
| DELETE | /api/sales/:id | Delete sale (admin, reverses stock) |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/purchases | List purchases (paginated, filterable) |
| POST | /api/purchases | Create purchase (with items) |
| GET | /api/purchases/:id | Get purchase details |
| DELETE | /api/purchases/:id | Delete purchase (admin, reverses stock) |

### Expenses, Warranties, Notifications
Standard CRUD endpoints.

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Comprehensive dashboard statistics |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/sales-summary | Sales summary with date range |
| GET | /api/reports/purchase-summary | Purchase summary |
| GET | /api/reports/profit-loss | Profit & loss statement |
| GET | /api/reports/top-products | Top selling products |
| GET | /api/reports/stock-valuation | Current stock valuation |
| GET | /api/reports/customer-report | Customer purchase report |
| GET | /api/reports/export-sales | Export sales to Excel |
| GET | /api/reports/export-stock | Export stock to Excel |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |

## Project Structure

```
mobile-shop-inventory/
├── backend/
│   ├── app.py                 # Flask application factory
│   ├── config.py              # Configuration
│   ├── extensions.py          # Flask extensions
│   ├── seed.py                # Database seeder
│   ├── requirements.txt
│   ├── .env
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py, category.py, brand.py, supplier.py
│   │   ├── customer.py, product.py, purchase.py
│   │   ├── purchase_item.py, sale.py, sale_item.py
│   │   └── expense.py, warranty.py, notification.py
│   ├── schemas/               # Marshmallow schemas
│   │   ├── user_schema.py, product_schema.py
│   │   ├── sale_schema.py, purchase_schema.py
│   │   └── report_schema.py
│   └── routes/                # API route handlers
│       ├── auth.py, products.py, categories.py, brands.py
│       ├── suppliers.py, customers.py, sales.py, purchases.py
│       ├── expenses.py, warranties.py, notifications.py
│       ├── reports.py, dashboard.py
│       └── __init__.py
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── main.jsx, App.jsx, index.css
│       ├── store/             # Zustand stores
│       │   ├── authStore.js
│       │   └── notificationStore.js
│       ├── api/               # Axios configuration
│       │   └── axios.js
│       ├── hooks/             # Custom React hooks
│       │   ├── useProducts.js
│       │   ├── useSales.js
│       │   └── useReports.js
│       ├── components/        # Shared components
│       │   ├── Layout.jsx, Sidebar.jsx, Navbar.jsx
│       │   ├── ProtectedRoute.jsx, Modal.jsx
│       │   ├── ConfirmDialog.jsx, DataTable.jsx
│       │   ├── SearchFilter.jsx, Pagination.jsx
│       │   ├── StatCard.jsx, BarcodeScanner.jsx
│       │   └── PrintButton.jsx
│       └── pages/             # Page components
│           ├── Login.jsx, Dashboard.jsx
│           ├── Products.jsx, ProductDetail.jsx
│           ├── Categories.jsx, Brands.jsx
│           ├── Suppliers.jsx, Customers.jsx
│           ├── Sales.jsx, SaleDetail.jsx
│           ├── Purchases.jsx, PurchaseDetail.jsx
│           ├── Expenses.jsx, Warranties.jsx
│           ├── Notifications.jsx, Reports.jsx
│           └── Settings.jsx
├── .gitignore
└── README.md
```

## License

MIT
