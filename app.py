from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Product, Transaction, TransactionItem, Customer, SystemSettings, Category, ReturnItem, Supplier, Expense, LoyaltyPoint, Promotion, promotion_products, ShiftReport
from functools import wraps
from datetime import datetime, timedelta
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import csv
import io
import sqlite3

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ==================== EMAIL CONFIGURATION ====================
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = 'your_email@gmail.com'
MAIL_PASSWORD = 'your_app_password_16chars'
MAIL_DEFAULT_SENDER = 'your_email@gmail.com'

def send_reset_email(user_email, reset_link):
    try:
        msg = MIMEMultipart()
        msg['From'] = MAIL_DEFAULT_SENDER
        msg['To'] = user_email
        msg['Subject'] = 'Password Reset - POS System'
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #4f46e5;">Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="{reset_link}">Reset Password</a>
            <p>Link expires in 15 minutes.</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

# Initialize extensions
db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'


# ==================== ✅ NEW: CONTEXT PROCESSOR FOR SETTINGS (ADD THIS) ====================
@app.context_processor
def inject_settings():
    """Make settings available in all templates"""
    settings = SystemSettings.query.first()
    if not settings:
        settings = SystemSettings()
        db.session.add(settings)
        try:
            db.session.commit()
        except:
            db.session.rollback()
    return dict(settings=settings)


# ==================== ✅ NEW: ENSURE SETTINGS TABLE HAS ALL COLUMNS ====================
def ensure_settings_fields():
    """Add missing columns to SystemSettings table if needed"""
    try:
        db_path = os.path.join(app.instance_path, 'database.db')
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(system_settings)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'currency_symbol' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN currency_symbol VARCHAR(10) DEFAULT 'PKR'")
                print("✅ Added currency_symbol column to system_settings")
            
            if 'theme' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN theme VARCHAR(20) DEFAULT 'light'")
                print("✅ Added theme column to system_settings")
            
            if 'tax_rate' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN tax_rate FLOAT DEFAULT 0")
                print("✅ Added tax_rate column to system_settings")
            
            if 'auto_receipt' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN auto_receipt BOOLEAN DEFAULT 0")
                print("✅ Added auto_receipt column to system_settings")
            
            if 'low_stock_limit' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN low_stock_limit INTEGER DEFAULT 5")
                print("✅ Added low_stock_limit column to system_settings")
            
            if 'store_name' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN store_name VARCHAR(100) DEFAULT 'POS System'")
                print("✅ Added store_name column to system_settings")
            
            if 'store_address' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN store_address TEXT DEFAULT ''")
                print("✅ Added store_address column to system_settings")
            
            if 'store_phone' not in columns:
                cursor.execute("ALTER TABLE system_settings ADD COLUMN store_phone VARCHAR(20) DEFAULT ''")
                print("✅ Added store_phone column to system_settings")
            
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"⚠️ Settings column check warning: {e}")


# ==================== ROLE-BASED ACCESS DECORATORS ====================
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin():
            flash('Admin access required', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def manager_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please login to access', 'error')
            return redirect(url_for('login'))
        if not current_user.is_admin() and not current_user.is_manager():
            flash('Manager or Admin access required', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def cashier_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please login to access', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_or_manager_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please login to access', 'error')
            return redirect(url_for('login'))
        if not (current_user.is_admin() or current_user.is_manager()):
            flash('Admin or Manager access required', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==================== DATABASE INITIALIZATION ====================
@app.before_request
def setup_database():
    if not hasattr(app, 'database_initialized'):
        db.create_all()
        
        # ✅ ADD THIS LINE - Ensure settings table has all columns
        ensure_settings_fields()
        
        # Create default categories if none exist
        if Category.query.count() == 0:
            default_categories = ['Electronics', 'Home', 'Stationery', 'Groceries', 'Clothing']
            for cat_name in default_categories:
                cat = Category(name=cat_name)
                db.session.add(cat)
            print("✅ Default categories created")
        
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=bcrypt.generate_password_hash('admin123').decode('utf-8'),
                role='admin',
                is_active=True
            )
            db.session.add(admin)
            print("✅ Default ADMIN user created")
        
        if not User.query.filter_by(username='manager').first():
            manager = User(
                username='manager',
                password_hash=bcrypt.generate_password_hash('manager123').decode('utf-8'),
                role='manager',
                is_active=True
            )
            db.session.add(manager)
            print("✅ Default MANAGER user created")
        
        if not User.query.filter_by(username='cashier').first():
            cashier = User(
                username='cashier',
                password_hash=bcrypt.generate_password_hash('cashier123').decode('utf-8'),
                role='cashier',
                is_active=True
            )
            db.session.add(cashier)
            print("✅ Default CASHIER user created")
        
        if not Customer.query.filter_by(is_default=True).first():
            default_customer = Customer(
                name='Walk-in Customer',
                phone='0000000000',
                email='walkin@pos.com',
                is_default=True
            )
            db.session.add(default_customer)
            print("✅ Default Walk-in Customer created")
        
        if Customer.query.count() == 1:
            sample_customers = [
                Customer(name='John Doe', phone='03001234567', email='john@example.com', address='Karachi'),
                Customer(name='Jane Smith', phone='03007654321', email='jane@example.com', address='Lahore'),
                Customer(name='Ahmed Khan', phone='03009876543', email='ahmed@example.com', address='Islamabad'),
            ]
            for customer in sample_customers:
                db.session.add(customer)
            print("✅ Sample customers created")
        
        if Product.query.count() == 0:
            electronics = Category.query.filter_by(name='Electronics').first()
            home = Category.query.filter_by(name='Home').first()
            stationery = Category.query.filter_by(name='Stationery').first()
            
            sample_products = [
                Product(name='Laptop', barcode='123456789', sku='LAP-001', purchase_price=850.00, price=999.99, quantity=7, category_id=electronics.id if electronics else None, expiry_date=None),
                Product(name='Mouse', barcode='987654321', sku='MSE-002', purchase_price=15.00, price=29.99, quantity=50, category_id=electronics.id if electronics else None, expiry_date=None),
                Product(name='Keyboard', barcode='456789123', sku='KEY-003', purchase_price=35.00, price=59.99, quantity=30, category_id=electronics.id if electronics else None, expiry_date=None),
                Product(name='Monitor', barcode='555555555', sku='MON-004', purchase_price=200.00, price=299.99, quantity=15, category_id=electronics.id if electronics else None, expiry_date=None),
                Product(name='USB Cable', barcode='777777777', sku='USB-005', purchase_price=5.00, price=12.99, quantity=150, category_id=electronics.id if electronics else None, expiry_date=None),
                Product(name='Desk Lamp', barcode='666666666', sku='LMP-006', purchase_price=25.00, price=45.99, quantity=25, category_id=home.id if home else None, expiry_date=None),
                Product(name='Highlighter Yellow', barcode='888888888', sku='HIG-007', purchase_price=1.50, price=2.99, quantity=100, category_id=stationery.id if stationery else None, expiry_date='2026-12-31'),
                Product(name='Test Product', barcode='999999999', sku='TST-008', purchase_price=1499.99, price=1999.99, quantity=10, category_id=electronics.id if electronics else None, expiry_date='2025-12-31'),
            ]
            for product in sample_products:
                db.session.add(product)
            print("✅ Sample products created with purchase_price and expiry_date")
        
        if Transaction.query.count() == 0:
            admin = User.query.filter_by(username='admin').first()
            default_customer = Customer.query.filter_by(is_default=True).first()
            products = Product.query.limit(5).all()
            
            if admin and products:
                today = datetime.now()
                trans1 = Transaction(cashier_id=admin.id, total_amount=1500, transaction_date=today, customer_id=default_customer.id)
                db.session.add(trans1)
                db.session.flush()
                db.session.add(TransactionItem(transaction_id=trans1.id, product_id=products[0].id, quantity=1, price_at_time=products[0].price))
                db.session.add(TransactionItem(transaction_id=trans1.id, product_id=products[1].id, quantity=2, price_at_time=products[1].price))
                
                trans2 = Transaction(cashier_id=admin.id, total_amount=2500, transaction_date=today, customer_id=default_customer.id)
                db.session.add(trans2)
                db.session.flush()
                db.session.add(TransactionItem(transaction_id=trans2.id, product_id=products[2].id, quantity=3, price_at_time=products[2].price))
                
                trans3 = Transaction(cashier_id=admin.id, total_amount=800, transaction_date=today, customer_id=default_customer.id)
                db.session.add(trans3)
                db.session.flush()
                db.session.add(TransactionItem(transaction_id=trans3.id, product_id=products[3].id, quantity=1, price_at_time=products[3].price))
                
                trans4 = Transaction(cashier_id=admin.id, total_amount=3200, transaction_date=today, customer_id=default_customer.id)
                db.session.add(trans4)
                db.session.flush()
                db.session.add(TransactionItem(transaction_id=trans4.id, product_id=products[0].id, quantity=2, price_at_time=products[0].price))
                db.session.add(TransactionItem(transaction_id=trans4.id, product_id=products[4].id, quantity=5, price_at_time=products[4].price))
                
                trans5 = Transaction(cashier_id=admin.id, total_amount=450, transaction_date=today, customer_id=default_customer.id)
                db.session.add(trans5)
                db.session.flush()
                db.session.add(TransactionItem(transaction_id=trans5.id, product_id=products[1].id, quantity=1, price_at_time=products[1].price))
                
                print("✅ Sample transactions with items created")
        
        if SystemSettings.query.count() == 0:
            default_settings = SystemSettings()
            db.session.add(default_settings)
            print("✅ Default system settings created")
        
        # ✅ ADD MISSING COLUMNS TO SUPPLIERS TABLE
        try:
            db_path = os.path.join(app.instance_path, 'database.db')
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(suppliers)")
                columns = [col[1] for col in cursor.fetchall()]
                
                if 'pending_balance' not in columns:
                    cursor.execute("ALTER TABLE suppliers ADD COLUMN pending_balance FLOAT DEFAULT 0")
                    print("✅ Added pending_balance column to suppliers")
                
                if 'is_active' not in columns:
                    cursor.execute("ALTER TABLE suppliers ADD COLUMN is_active BOOLEAN DEFAULT 1")
                    print("✅ Added is_active column to suppliers")
                
                if 'payment_method' not in columns:
                    cursor.execute("ALTER TABLE suppliers ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'")
                    print("✅ Added payment_method column to suppliers")
                
                if 'due_date' not in columns:
                    cursor.execute("ALTER TABLE suppliers ADD COLUMN due_date VARCHAR(20)")
                    print("✅ Added due_date column to suppliers")
                
                # ✅ ADD supplier_id COLUMN TO PRODUCTS TABLE
                cursor.execute("PRAGMA table_info(products)")
                product_columns = [col[1] for col in cursor.fetchall()]
                
                if 'supplier_id' not in product_columns:
                    cursor.execute("ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)")
                    print("✅ Added supplier_id column to products")
                
                conn.commit()
                conn.close()
        except Exception as e:
            print(f"⚠️ Column check warning: {e}")
        
        db.session.commit()
        app.database_initialized = True
        print("="*50)
        print("🚀 Database initialized successfully!")
        print("👤 Admin: admin / admin123")
        print("👤 Manager: manager / manager123")
        print("👤 Cashier: cashier / cashier123")
        print("="*50)

# ==================== AUTHENTICATION ROUTES ====================
@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'GET':
        return render_template('login.html')
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    user = User.query.filter_by(username=username).first()
    if user and user.is_active and bcrypt.check_password_hash(user.password_hash, password):
        login_user(user)
        return jsonify({'success': True, 'role': user.role, 'redirect': '/dashboard'})
    return jsonify({'error': 'Invalid credentials or account deactivated'}), 401

@app.route('/api/save_shift_report', methods=['POST'])
@login_required
def save_shift_report():
    """Save cashier shift closure report to database"""
    try:
        data = request.get_json()
        system_sales      = float(data.get('system_sales', 0))
        total_transactions = int(data.get('total_transactions', 0))
        cash_in_drawer    = float(data.get('cash_in_drawer', 0))
        difference        = cash_in_drawer - system_sales
        variance_percent  = (difference / system_sales * 100) if system_sales > 0 else 0

        if abs(difference) > 100:
            status = 'large_variance'
        elif abs(difference) > 10:
            status = 'warning'
        else:
            status = 'ok'

        report = ShiftReport(
            cashier_id        = current_user.id,
            system_sales      = system_sales,
            total_transactions = total_transactions,
            cash_in_drawer    = cash_in_drawer,
            difference        = difference,
            variance_percent  = variance_percent,
            status            = status
        )
        db.session.add(report)
        db.session.commit()
        return jsonify({'success': True, 'report_id': report.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/shift_reports')
@login_required
def get_shift_reports():
    """Get shift reports — cashiers see own, managers/admins see all"""
    try:
        if current_user.role in ('admin', 'manager'):
            reports = ShiftReport.query.order_by(ShiftReport.shift_date.desc()).limit(100).all()
        else:
            reports = ShiftReport.query.filter_by(cashier_id=current_user.id)\
                        .order_by(ShiftReport.shift_date.desc()).limit(50).all()
        return jsonify([{
            'id': r.id,
            'cashier': r.cashier.username if r.cashier else 'Unknown',
            'date': r.shift_date.strftime('%Y-%m-%d %H:%M'),
            'system_sales': r.system_sales,
            'cash_in_drawer': r.cash_in_drawer,
            'difference': r.difference,
            'variance_percent': round(r.variance_percent, 2),
            'total_transactions': r.total_transactions,
            'status': r.status
        } for r in reports])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

# ==================== DASHBOARD ROUTES ====================
@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.is_admin():
        return render_template('admin_dashboard.html', user=current_user, datetime=datetime)
    elif current_user.is_manager():
        return render_template('manager_dashboard.html', user=current_user, datetime=datetime)
    else:
        return render_template('cashier_dashboard.html', user=current_user, datetime=datetime)

# ==================== API DASHBOARD STATS ====================
@app.route('/api/dashboard/stats')
@login_required
def get_dashboard_stats():
    try:
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        yesterday = today - timedelta(days=1)
        if current_user.is_admin() or current_user.is_manager():
            today_transactions = Transaction.query.filter(Transaction.transaction_date >= today, Transaction.transaction_date < tomorrow).all()
            yesterday_transactions = Transaction.query.filter(Transaction.transaction_date >= yesterday, Transaction.transaction_date < today).all()
            recent_transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).limit(10).all()
        else:
            today_transactions = Transaction.query.filter(Transaction.transaction_date >= today, Transaction.transaction_date < tomorrow, Transaction.cashier_id == current_user.id).all()
            yesterday_transactions = Transaction.query.filter(Transaction.transaction_date >= yesterday, Transaction.transaction_date < today, Transaction.cashier_id == current_user.id).all()
            recent_transactions = Transaction.query.filter_by(cashier_id=current_user.id).order_by(Transaction.transaction_date.desc()).limit(10).all()
        today_sales = sum(t.total_amount for t in today_transactions)
        today_count = len(today_transactions)
        yesterday_sales = sum(t.total_amount for t in yesterday_transactions)
        if yesterday_sales > 0:
            revenue_change = round(((today_sales - yesterday_sales) / yesterday_sales) * 100, 1)
        else:
            revenue_change = 100.0 if today_sales > 0 else 0.0
        total_products = Product.query.count()
        
        settings = SystemSettings.query.first()
        low_stock_threshold = (settings.low_stock_limit if settings and settings.low_stock_limit else 5)
        low_stock = Product.query.filter(Product.quantity <= low_stock_threshold).count()
        
        total_users = User.query.count()
        total_customers = Customer.query.count()
        top_products = db.session.query(Product.name, db.func.coalesce(db.func.sum(TransactionItem.quantity), 0).label('total_sold'), Product.price).outerjoin(TransactionItem).group_by(Product.id).order_by(db.desc('total_sold')).limit(5).all()
        return jsonify({
            'success': True,
            'stats': {
                'today_sales': float(today_sales),
                'today_count': today_count,
                'yesterday_sales': float(yesterday_sales),
                'revenue_change': revenue_change,
                'total_products': total_products,
                'low_stock': low_stock,
                'total_users': total_users,
                'total_customers': total_customers,
                'user_role': current_user.role
            },
            'recent_transactions': [{
                'id': t.id,
                'date': t.transaction_date.strftime('%Y-%m-%d %H:%M'),
                'total': float(t.total_amount),
                'items': len(t.items),
                'cashier': t.cashier.username if t.cashier else 'Unknown'
            } for t in recent_transactions],
            'top_products': [{'name': p[0], 'sold': int(p[1] or 0), 'price': float(p[2] or 0)} for p in top_products]
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/dashboard/sales-chart')
@login_required
def get_sales_chart():
    try:
        days = request.args.get('days', 7, type=int)
        sales_data = []
        labels = []
        for i in range(days-1, -1, -1):
            date = datetime.now().date() - timedelta(days=i)
            next_date = date + timedelta(days=1)
            if current_user.is_admin() or current_user.is_manager():
                daily_sales = db.session.query(db.func.coalesce(db.func.sum(Transaction.total_amount), 0)).filter(Transaction.transaction_date >= date, Transaction.transaction_date < next_date).scalar()
            else:
                daily_sales = db.session.query(db.func.coalesce(db.func.sum(Transaction.total_amount), 0)).filter(Transaction.transaction_date >= date, Transaction.transaction_date < next_date, Transaction.cashier_id == current_user.id).scalar()
            sales_data.append(float(daily_sales or 0))
            labels.append(date.strftime('%d %b'))
        return jsonify({'success': True, 'labels': labels, 'data': sales_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== INVENTORY ROUTES ====================
@app.route('/inventory')
@login_required
@manager_required
def inventory():
    return render_template('inventory.html', user=current_user)

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    stock_status = request.args.get('stock_status', '')
    expiry_filter = request.args.get('expiry_filter', '')
    query = Product.query
    
    if search:
        query = query.filter((Product.name.contains(search)) | (Product.barcode.contains(search)) | (Product.sku.contains(search)))
    
    if category and category != 'all':
        category_obj = Category.query.filter_by(name=category).first()
        if category_obj:
            query = query.filter(Product.category_id == category_obj.id)
    
    settings = SystemSettings.query.first()
    low_threshold = settings.low_stock_limit if settings else 5
    
    if stock_status == 'low':
        query = query.filter(Product.quantity < low_threshold)
    elif stock_status == 'out':
        query = query.filter(Product.quantity == 0)
    elif stock_status == 'instock':
        query = query.filter(Product.quantity > 0)
    
    if expiry_filter == 'expired':
        today = datetime.now().strftime('%Y-%m-%d')
        query = query.filter(Product.expiry_date < today, Product.expiry_date.isnot(None))
    elif expiry_filter == 'expiring_soon':
        today = datetime.now().strftime('%Y-%m-%d')
        future = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        query = query.filter(Product.expiry_date >= today, Product.expiry_date <= future, Product.expiry_date.isnot(None))
    
    products = query.all()
    
    return jsonify([{
        'id': p.id, 
        'name': p.name,
        'sku': p.sku if hasattr(p, 'sku') and p.sku else '',
        'barcode': p.barcode,
        'purchase_price': float(p.purchase_price) if hasattr(p, 'purchase_price') and p.purchase_price else 0,
        'price': float(p.price), 
        'quantity': p.quantity,
        'expiry_date': p.expiry_date if hasattr(p, 'expiry_date') and p.expiry_date else None,
        'category': p.category_ref.name if p.category_ref else 'Uncategorized',
        'supplier_id': p.supplier_id
    } for p in products])

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([c.name for c in categories if c.name])

@app.route('/api/categories/list', methods=['GET'])
@login_required
def get_categories_list():
    categories = Category.query.order_by(Category.name).all()
    return jsonify([{'id': c.id, 'name': c.name} for c in categories])

@app.route('/api/products', methods=['POST'])
@login_required
@manager_required
def create_product():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Product name is required'}), 400
    
    category_obj = None
    if data.get('category'):
        category_obj = Category.query.filter_by(name=data['category']).first()
        if not category_obj:
            category_obj = Category(name=data['category'])
            db.session.add(category_obj)
            db.session.commit()
    
    supplier_id = data.get('supplier_id')
    if supplier_id:
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            supplier_id = None
    
    product = Product(
        name=data['name'],
        sku=data.get('sku', ''),
        barcode=data.get('barcode', ''),
        purchase_price=float(data.get('purchase_price', 0)),
        price=float(data.get('price', 0)), 
        quantity=int(data.get('quantity', 0)),
        expiry_date=data.get('expiry_date') if data.get('expiry_date') else None,
        category_id=category_obj.id if category_obj else None,
        supplier_id=supplier_id
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'success': True, 'id': product.id})

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@login_required
@manager_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    if 'name' in data:
        product.name = data['name']
    if 'sku' in data:
        product.sku = data['sku']
    if 'barcode' in data:
        product.barcode = data['barcode']
    if 'purchase_price' in data:
        product.purchase_price = float(data['purchase_price'])
    if 'price' in data:
        product.price = float(data['price'])
    if 'quantity' in data:
        product.quantity = int(data['quantity'])
    if 'expiry_date' in data:
        product.expiry_date = data['expiry_date'] if data['expiry_date'] else None
    if 'category' in data:
        category_obj = Category.query.filter_by(name=data['category']).first()
        if not category_obj and data['category']:
            category_obj = Category(name=data['category'])
            db.session.add(category_obj)
        product.category_id = category_obj.id if category_obj else None
    if 'supplier_id' in data:
        product.supplier_id = data['supplier_id'] if data['supplier_id'] else None
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@login_required
@manager_required
def delete_product(product_id):
    has_sales = TransactionItem.query.filter_by(product_id=product_id).first()
    if has_sales:
        return jsonify({'error': 'Cannot delete product with sales history'}), 400
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/products/low-stock')
@login_required
def get_low_stock():
    settings = SystemSettings.query.first()
    threshold = (settings.low_stock_limit if settings and settings.low_stock_limit else 5)
    products = Product.query.filter(Product.quantity <= threshold).all()
    return jsonify([{'id': p.id, 'name': p.name, 'quantity': p.quantity, 'price': float(p.price)} for p in products])

# ==================== POS ROUTES ====================
@app.route('/pos')
@login_required
def pos():
    customers = Customer.query.all()
    settings = SystemSettings.query.first()
    categories = Category.query.order_by(Category.name).all()
    return render_template('pos.html', user=current_user, customers=customers, settings=settings, categories=[c.name for c in categories])

@app.route('/api/checkout', methods=['POST'])
@login_required
def checkout():
    data = request.get_json()
    cart_items = data.get('items', [])
    discount = float(data.get('discount', 0))
    discount_type = data.get('discount_type', 'fixed')
    customer_id = data.get('customer_id', None)
    tax_rate = float(data.get('tax_rate', 0))
    
    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400
    
    if not customer_id:
        default_customer = Customer.query.filter_by(is_default=True).first()
        if default_customer:
            customer_id = default_customer.id
    
    total_amount = 0
    transaction = Transaction(cashier_id=current_user.id, total_amount=0, customer_id=customer_id)
    db.session.add(transaction)
    db.session.flush()
    
    try:
        for item in cart_items:
            product = Product.query.get(item['product_id'])
            if not product:
                return jsonify({'error': 'Product not found'}), 400
            if product.quantity < item['quantity']:
                return jsonify({'error': f'Insufficient stock for {product.name}'}), 400
            transaction_item = TransactionItem(transaction_id=transaction.id, product_id=product.id, quantity=item['quantity'], price_at_time=product.price)
            product.quantity -= item['quantity']
            total_amount += product.price * item['quantity']
            db.session.add(transaction_item)
        
        if discount_type == 'percentage' and discount > 0:
            discount_amount = total_amount * (discount / 100)
            after_discount = total_amount - discount_amount
        else:
            discount_amount = discount
            after_discount = total_amount - discount_amount
        
        tax_amount = after_discount * (tax_rate / 100)
        final_amount = after_discount + tax_amount
        
        transaction.total_amount = final_amount
        db.session.commit()
        
        if customer_id:
            customer = Customer.query.get(customer_id)
            if customer:
                customer.total_spent += final_amount
                db.session.commit()
        
        return jsonify({
            'success': True,
            'transaction': {
                'id': transaction.id,
                'total': float(final_amount),
                'subtotal': float(total_amount),
                'discount': float(discount_amount),
                'tax': float(tax_amount),
                'tax_rate': tax_rate
            },
            'receipt_url': f'/receipt/{transaction.id}?discount={discount_amount:.2f}&tax_rate={tax_rate}&tax={tax_amount:.2f}'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== CUSTOMER MANAGEMENT ====================
@app.route('/customers')
@login_required
def customers_page():
    customers = Customer.query.order_by(Customer.name).all()
    return render_template('customers.html', customers=customers, user=current_user)

# ✅ ADD THIS: Customer List API (for sidebar link)
@app.route('/customer-list')
@login_required
def customer_list_page():
    customers = Customer.query.order_by(Customer.name).all()
    return render_template('customers.html', customers=customers, user=current_user)

@app.route('/api/customers', methods=['GET'])
@login_required
def get_customers():
    customers = Customer.query.all()
    return jsonify([{'id': c.id, 'name': c.name, 'phone': c.phone, 'email': c.email, 'address': c.address, 'total_spent': float(c.total_spent), 'is_default': c.is_default, 'created_at': c.created_at.strftime('%Y-%m-%d')} for c in customers])

@app.route('/api/customers', methods=['POST'])
@login_required
def create_customer():
    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Customer name is required'}), 400
    customer = Customer(name=data['name'], phone=data.get('phone', ''), email=data.get('email', ''), address=data.get('address', ''))
    db.session.add(customer)
    db.session.commit()
    return jsonify({'success': True, 'customer': {'id': customer.id, 'name': customer.name}})

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
@login_required
@admin_or_manager_required
def update_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    if customer.is_default:
        return jsonify({'error': 'Cannot edit default walk-in customer'}), 400
    if 'name' in data:
        customer.name = data['name']
    if 'phone' in data:
        customer.phone = data['phone']
    if 'email' in data:
        customer.email = data['email']
    if 'address' in data:
        customer.address = data['address']
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
@login_required
@admin_or_manager_required
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    if customer.is_default:
        return jsonify({'error': 'Cannot delete default walk-in customer'}), 400
    if customer.transactions:
        return jsonify({'error': 'Cannot delete customer with transaction history'}), 400
    db.session.delete(customer)
    db.session.commit()
    return jsonify({'success': True})

# ==================== SALES ROUTES ====================
@app.route('/sales')
@login_required
@manager_required
def sales():
    return render_template('sales.html', user=current_user)

@app.route('/api/transactions')
@login_required
def get_transactions():
    try:
        if current_user.is_admin() or current_user.is_manager():
            transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).all()
        else:
            transactions = Transaction.query.filter_by(cashier_id=current_user.id).order_by(Transaction.transaction_date.desc()).all()
        result = []
        for t in transactions:
            items_list = []
            for item in t.items:
                product = Product.query.get(item.product_id)
                items_list.append({'product_name': product.name if product else 'Unknown', 'quantity': item.quantity, 'unit_price': float(item.price_at_time)})
            result.append({'id': t.id, 'created_at': t.transaction_date.isoformat(), 'date': t.transaction_date.isoformat(), 'total': float(t.total_amount), 'cashier': t.cashier.username if t.cashier else 'Unknown', 'customer': t.customer.name if t.customer else 'Walk-in Customer', 'items': items_list})
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions/recent')
@login_required
def get_recent_transactions():
    if current_user.is_admin() or current_user.is_manager():
        transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).limit(10).all()
    else:
        transactions = Transaction.query.filter_by(cashier_id=current_user.id).order_by(Transaction.transaction_date.desc()).limit(10).all()
    return jsonify([{'id': t.id, 'date': t.transaction_date.isoformat(), 'total': float(t.total_amount), 'cashier': t.cashier.username if t.cashier else 'Unknown'} for t in transactions])

@app.route('/api/transactions/<int:transaction_id>/items')
@login_required
def get_transaction_items(transaction_id):
    try:
        transaction = Transaction.query.get_or_404(transaction_id)
        if not current_user.is_admin() and not current_user.is_manager():
            if transaction.cashier_id != current_user.id:
                return jsonify({'error': 'Unauthorized'}), 403
        items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
        result = []
        for item in items:
            product = Product.query.get(item.product_id)
            result.append({'id': item.id, 'name': product.name if product else 'Unknown', 'quantity': item.quantity, 'price': float(item.price_at_time), 'total': float(item.price_at_time * item.quantity)})
        return jsonify(result)
    except Exception as e:
        return jsonify([]), 500

@app.route('/receipt/<int:transaction_id>')
@login_required
def view_receipt(transaction_id):
    transaction = Transaction.query.get_or_404(transaction_id)
    items = TransactionItem.query.filter_by(transaction_id=transaction_id).all()
    receipt = {'id': transaction.id, 'date': transaction.transaction_date.strftime('%Y-%m-%d'), 'time': transaction.transaction_date.strftime('%H:%M:%S'), 'cashier': transaction.cashier.username if transaction.cashier else 'Unknown', 'customer': transaction.customer.name if transaction.customer else 'Walk-in Customer', 'items_list': [], 'subtotal': 0, 'total': float(transaction.total_amount)}
    for item in items:
        product = Product.query.get(item.product_id)
        item_subtotal = item.price_at_time * item.quantity
        receipt['subtotal'] += item_subtotal
        receipt['items_list'].append({'name': product.name if product else 'Unknown', 'quantity': item.quantity, 'price': float(item.price_at_time), 'subtotal': f"{item_subtotal:.2f}"})
    discount_amount = request.args.get('discount', 0, type=float)
    tax_rate = request.args.get('tax_rate', 0, type=float)
    tax_amount = request.args.get('tax', 0, type=float)
    cash_received = request.args.get('cash', 0, type=float)
    change_due = request.args.get('change', 0, type=float)
    receipt['subtotal'] = f"{receipt['subtotal']:.2f}"
    receipt['total'] = f"{receipt['total']:.2f}"
    return render_template('receipt.html', receipt=receipt,
                           discount_amount=discount_amount,
                           tax_rate=tax_rate,
                           tax_amount=tax_amount,
                           cash_received=cash_received,
                           change_due=change_due)

# ==================== USER MANAGEMENT ====================
@app.route('/api/users')
@login_required
@admin_or_manager_required
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'username': u.username, 'role': u.role, 'is_active': u.is_active, 'created_at': u.created_at.strftime('%Y-%m-%d') if hasattr(u, 'created_at') else datetime.now().strftime('%Y-%m-%d')} for u in users])

@app.route('/register')
@login_required
@admin_or_manager_required
def register():
    return render_template('register.html')

@app.route('/register', methods=['POST'])
@login_required
@admin_or_manager_required
def register_post():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'cashier')
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username exists'}), 400
    if not current_user.is_admin() and role == 'manager':
        return jsonify({'error': 'Only admin can create manager accounts'}), 403
    if role not in ['admin', 'manager', 'cashier']:
        role = 'cashier'
    new_user = User(username=username, password_hash=bcrypt.generate_password_hash(password).decode('utf-8'), role=role, is_active=True)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True, 'message': f'{role} created!'})

@app.route('/api/users/<int:user_id>/revoke', methods=['POST'])
@login_required
@admin_or_manager_required
def revoke_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'error': 'You cannot revoke your own account'}), 400
    if not current_user.is_admin() and user.role == 'manager':
        return jsonify({'error': 'Only admin can revoke manager accounts'}), 403
    user.is_active = False
    db.session.commit()
    return jsonify({'success': True, 'message': f'User {user.username} deactivated'})

@app.route('/api/users/<int:user_id>/activate', methods=['POST'])
@login_required
@admin_required
def activate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = True
    db.session.commit()
    return jsonify({'success': True, 'message': f'User {user.username} activated'})

@app.route('/manage-users')
@login_required
@admin_or_manager_required
def manage_users():
    users = User.query.all()
    return render_template('manage_users.html', users=users, datetime=datetime)

@app.route('/toggle-user/<int:user_id>')
@login_required
@admin_or_manager_required
def toggle_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash("You cannot change your own account status!", "danger")
    else:
        user.is_active = not user.is_active
        db.session.commit()
        status = "activated" if user.is_active else "deactivated"
        flash(f"User {user.username} has been {status}.", "success")
    return redirect(url_for('manage_users'))

# ==================== CHANGE PASSWORD ROUTE ====================
@app.route('/change-password', methods=['POST'])
@login_required
def change_password():
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        flash('All fields are required.', 'danger')
        return redirect(url_for('profile'))
    
    if not bcrypt.check_password_hash(current_user.password_hash, current_password):
        flash('Current password is incorrect.', 'danger')
        return redirect(url_for('profile'))
    
    if new_password != confirm_password:
        flash('New password and confirmation do not match.', 'danger')
        return redirect(url_for('profile'))
    
    if len(new_password) < 6:
        flash('Password must be at least 6 characters long.', 'danger')
        return redirect(url_for('profile'))
    
    current_user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()
    
    flash('Password changed successfully!', 'success')
    return redirect(url_for('profile'))

# ==================== SETTINGS ROUTE (UPDATED WITH AJAX SUPPORT) ====================
@app.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    settings_obj = SystemSettings.query.first()
    if not settings_obj:
        settings_obj = SystemSettings()
        db.session.add(settings_obj)
        db.session.commit()
    
    if request.method == 'POST':
        new_password = request.form.get('new_password')
        if new_password and len(new_password) >= 6:
            current_user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                flash('Password changed successfully!', 'success')
        
        if current_user.is_admin() or current_user.is_manager():
            if request.form.get('store_name'):
                settings_obj.store_name = request.form.get('store_name')
            if request.form.get('store_address'):
                settings_obj.store_address = request.form.get('store_address')
            if request.form.get('store_phone'):
                settings_obj.store_phone = request.form.get('store_phone')
            if request.form.get('low_stock_limit'):
                settings_obj.low_stock_limit = int(request.form.get('low_stock_limit'))
            if request.form.get('tax_rate'):
                settings_obj.tax_rate = float(request.form.get('tax_rate'))
            if request.form.get('currency_symbol'):
                settings_obj.currency_symbol = request.form.get('currency_symbol')
            if request.form.get('auto_receipt'):
                settings_obj.auto_receipt = request.form.get('auto_receipt') == 'on'
            if request.form.get('theme'):
                settings_obj.theme = request.form.get('theme')
            
            db.session.commit()
            
            # ✅ Return JSON response for AJAX request (from settings.html)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'message': 'System settings updated!'})
            
            flash('System settings updated!', 'success')
        else:
            db.session.commit()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': True, 'message': 'Password updated successfully!'})
        
        return redirect(url_for('settings'))
    
    return render_template('settings.html', user=current_user, settings=settings_obj)

# ==================== FORGOT PASSWORD ROUTES ====================
@app.route('/forgot-password', methods=['GET'])
def forgot_password():
    return render_template('forgot_password.html')

@app.route('/forgot-password', methods=['POST'])
def forgot_password_post():
    email = request.form.get('email')
    if not email:
        flash('Email address is required.', 'danger')
        return redirect(url_for('forgot_password'))
    
    user = User.query.filter_by(email=email).first()
    if not user:
        flash('If the email address exists in our system, a reset link has been sent.', 'info')
        return redirect(url_for('login'))
    
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()
    
    reset_link = url_for('reset_password', token=token, _external=True)
    email_sent = send_reset_email(email, reset_link)
    
    if email_sent:
        flash('Reset link sent to your email address.', 'success')
    else:
        print(f"\n🔗 RESET LINK FOR {user.username}: {reset_link}\n")
        flash('Unable to send email. Please contact administrator.', 'danger')
    
    return redirect(url_for('login'))

@app.route('/reset-password/<token>', methods=['GET'])
def reset_password(token):
    user = User.query.filter_by(reset_token=token).first()
    if not user or user.reset_token_expiry < datetime.utcnow():
        flash('The reset link is invalid or has expired.', 'danger')
        return redirect(url_for('forgot_password'))
    return render_template('reset_password.html', token=token)

@app.route('/reset-password/<token>', methods=['POST'])
def reset_password_post(token):
    user = User.query.filter_by(reset_token=token).first()
    if not user or user.reset_token_expiry < datetime.utcnow():
        flash('The reset link is invalid or has expired.', 'danger')
        return redirect(url_for('forgot_password'))
    
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    
    if not password or len(password) < 6:
        flash('Password must be at least 6 characters.', 'danger')
        return redirect(url_for('reset_password', token=token))
    
    if password != confirm_password:
        flash('Passwords do not match.', 'danger')
        return redirect(url_for('reset_password', token=token))
    
    user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()
    
    flash('Your password has been reset. Please login with your new password.', 'success')
    return redirect(url_for('login'))

# ==================== SALES REPORT API ====================
@app.route('/api/sales-report')
@login_required
@manager_required
def sales_report_api():
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        if not start_date or not end_date:
            return jsonify([])
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        
        if current_user.is_admin() or current_user.is_manager():
            transactions = Transaction.query.filter(
                Transaction.transaction_date >= start,
                Transaction.transaction_date < end
            ).all()
        else:
            transactions = Transaction.query.filter(
                Transaction.transaction_date >= start,
                Transaction.transaction_date < end,
                Transaction.cashier_id == current_user.id
            ).all()
        
        report = {}
        for t in transactions:
            date_str = t.transaction_date.strftime('%Y-%m-%d')
            if date_str not in report:
                report[date_str] = {'total': 0, 'items': 0}
            report[date_str]['total'] += t.total_amount
            report[date_str]['items'] += sum(item.quantity for item in t.items)
        
        result = [{'date': d, 'total': round(data['total'], 2), 'items': data['items']} 
                  for d, data in sorted(report.items())]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== SALES ANALYTICS DATA API ====================
@app.route('/api/sales-analytics-data')
@login_required
@manager_required
def sales_analytics_data():
    try:
        days = request.args.get('days', 30, type=int)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        sales_by_day = {}
        labels = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            next_day = day + timedelta(days=1)
            if current_user.is_admin() or current_user.is_manager():
                total = db.session.query(db.func.sum(Transaction.total_amount)).filter(
                    Transaction.transaction_date >= day,
                    Transaction.transaction_date < next_day
                ).scalar() or 0
            else:
                total = db.session.query(db.func.sum(Transaction.total_amount)).filter(
                    Transaction.transaction_date >= day,
                    Transaction.transaction_date < next_day,
                    Transaction.cashier_id == current_user.id
                ).scalar() or 0
            label = day.strftime('%Y-%m-%d')
            sales_by_day[label] = float(total)
            labels.append(label)
        
        if current_user.is_admin() or current_user.is_manager():
            top_products_query = db.session.query(
                Product.name, 
                db.func.sum(TransactionItem.quantity).label('total_qty')
            ).join(TransactionItem, Product.id == TransactionItem.product_id)\
             .join(Transaction, Transaction.id == TransactionItem.transaction_id)\
             .filter(Transaction.transaction_date >= start_date, Transaction.transaction_date < end_date + timedelta(days=1))\
             .group_by(Product.id).order_by(db.desc('total_qty')).limit(5).all()
        else:
            top_products_query = db.session.query(
                Product.name, 
                db.func.sum(TransactionItem.quantity).label('total_qty')
            ).join(TransactionItem, Product.id == TransactionItem.product_id)\
             .join(Transaction, Transaction.id == TransactionItem.transaction_id)\
             .filter(Transaction.cashier_id == current_user.id,
                     Transaction.transaction_date >= start_date,
                     Transaction.transaction_date < end_date + timedelta(days=1))\
             .group_by(Product.id).order_by(db.desc('total_qty')).limit(5).all()
        
        top_products = [{'name': p[0], 'sold': int(p[1])} for p in top_products_query]
        total_sales = sum(sales_by_day.values())
        sales_values = [sales_by_day[label] for label in labels]
        
        return jsonify({
            'labels': labels,
            'sales': sales_values,
            'total_sales': round(total_sales, 2),
            'top_product': top_products[0]['name'] if top_products else 'None',
            'top_products': top_products
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CATEGORIES MANAGEMENT ROUTES ====================
@app.route('/categories')
@login_required
@admin_or_manager_required
def categories_page():
    return render_template('categories.html', user=current_user)

@app.route('/api/categories/add', methods=['POST'])
@login_required
@admin_or_manager_required
def add_category():
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    existing = Category.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Category already exists'}), 400
    
    new_category = Category(name=name)
    db.session.add(new_category)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Category "{name}" added successfully'})

@app.route('/api/categories/delete', methods=['POST'])
@login_required
@admin_or_manager_required
def delete_category():
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    category = Category.query.filter_by(name=name).first()
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    if category.products:
        return jsonify({'error': f'Cannot delete: {len(category.products)} product(s) use this category'}), 400
    
    db.session.delete(category)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Category "{name}" deleted successfully'})

# ==================== EXPORT DATA ROUTE ====================
@app.route('/export-sales-data')
@login_required
@manager_required
def export_sales_data():
    if current_user.is_admin() or current_user.is_manager():
        transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).all()
    else:
        transactions = Transaction.query.filter_by(cashier_id=current_user.id).order_by(Transaction.transaction_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Transaction ID', 'Date', 'Time', 'Total Amount (PKR)', 'Cashier', 'Customer', 'Items Count'])
    
    for t in transactions:
        writer.writerow([
            t.id,
            t.transaction_date.strftime('%Y-%m-%d'),
            t.transaction_date.strftime('%H:%M:%S'),
            f"{t.total_amount:.2f}",
            t.cashier.username if t.cashier else 'Unknown',
            t.customer.name if t.customer else 'Walk-in Customer',
            len(t.items)
        ])
    
    output.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'Sales_Data_{timestamp}.csv'
    )

# ==================== SUPPLIER MANAGEMENT ROUTES (UPDATED) ====================
@app.route('/suppliers')
@login_required
@manager_required
def suppliers_page():
    return render_template('suppliers.html', user=current_user)

@app.route('/api/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    try:
        search = request.args.get('search', '')
        status = request.args.get('status', 'all')
        
        query = Supplier.query
        
        if search:
            query = query.filter(
                db.or_(
                    Supplier.name.ilike(f'%{search}%'),
                    Supplier.phone.ilike(f'%{search}%'),
                    Supplier.contact_person.ilike(f'%{search}%'),
                    Supplier.email.ilike(f'%{search}%')
                )
            )
        
        if status == 'active':
            query = query.filter(Supplier.is_active == True)
        elif status == 'inactive':
            query = query.filter(Supplier.is_active == False)
        
        suppliers = query.order_by(Supplier.name).all()
        
        result = []
        for s in suppliers:
            product_count = Product.query.filter_by(supplier_id=s.id).count()
            result.append({
                'id': s.id,
                'name': s.name,
                'contact_person': s.contact_person or '',
                'phone': s.phone or '',
                'email': s.email or '',
                'address': s.address or '',
                'pending_balance': float(s.pending_balance) if hasattr(s, 'pending_balance') and s.pending_balance else 0.0,
                'is_active': s.is_active if hasattr(s, 'is_active') else True,
                'notes': s.notes or '',
                'product_count': product_count,
                'payment_method': getattr(s, 'payment_method', 'cash'),
                'due_date': getattr(s, 'due_date', None),
                'created_at': s.created_at.strftime('%Y-%m-%d') if s.created_at else ''
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_suppliers: {e}")
        return jsonify([])

@app.route('/api/suppliers', methods=['POST'])
@login_required
@manager_required
def create_supplier():
    try:
        data = request.get_json()
        if not data.get('name'):
            return jsonify({'error': 'Supplier name is required'}), 400
        
        supplier = Supplier(
            name=data['name'],
            contact_person=data.get('contact_person', ''),
            phone=data.get('phone', ''),
            email=data.get('email', ''),
            address=data.get('address', ''),
            pending_balance=float(data.get('pending_balance', 0)),
            payment_method=data.get('payment_method', 'cash'),
            due_date=data.get('due_date'),
            is_active=data.get('is_active', True),
            notes=data.get('notes', '')
        )
        
        db.session.add(supplier)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Supplier added successfully', 'id': supplier.id})
    except Exception as e:
        db.session.rollback()
        print(f"Error creating supplier: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/suppliers/<int:supplier_id>', methods=['PUT'])
@login_required
@manager_required
def update_supplier(supplier_id):
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        data = request.get_json()
        
        if 'name' in data:
            supplier.name = data['name']
        if 'contact_person' in data:
            supplier.contact_person = data['contact_person']
        if 'phone' in data:
            supplier.phone = data['phone']
        if 'email' in data:
            supplier.email = data['email']
        if 'address' in data:
            supplier.address = data['address']
        if 'pending_balance' in data:
            supplier.pending_balance = float(data['pending_balance'])
        if 'payment_method' in data:
            supplier.payment_method = data['payment_method']
        if 'due_date' in data:
            supplier.due_date = data['due_date']
        if 'is_active' in data:
            supplier.is_active = data['is_active']
        if 'notes' in data:
            supplier.notes = data['notes']
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Supplier updated successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Error updating supplier: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/suppliers/<int:supplier_id>', methods=['DELETE'])
@login_required
@admin_or_manager_required
def delete_supplier(supplier_id):
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        
        if supplier.products:
            product_count = len(supplier.products)
            return jsonify({'error': f'Cannot delete: {product_count} product(s) are linked to this supplier'}), 400
        
        db.session.delete(supplier)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Supplier deleted successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting supplier: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/suppliers/<int:supplier_id>/products', methods=['GET'])
@login_required
def get_supplier_products(supplier_id):
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        products = Product.query.filter_by(supplier_id=supplier_id).all()
        
        result = [{
            'id': p.id,
            'name': p.name,
            'barcode': p.barcode,
            'price': float(p.price),
            'quantity': p.quantity,
            'purchase_price': float(p.purchase_price) if hasattr(p, 'purchase_price') and p.purchase_price else 0,
            'category': p.category_ref.name if p.category_ref else None
        } for p in products]
        
        return jsonify(result)
    except Exception as e:
        print(f"Error getting supplier products: {e}")
        return jsonify([])

@app.route('/api/suppliers/<int:supplier_id>/pay', methods=['POST'])
@login_required
@manager_required
def pay_supplier(supplier_id):
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        data = request.get_json()
        
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return jsonify({'error': 'Invalid payment amount'}), 400
        
        if amount > supplier.pending_balance:
            return jsonify({'error': f'Payment amount exceeds pending balance of PKR {supplier.pending_balance}'}), 400
        
        supplier.pending_balance -= amount
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Payment of PKR {amount:,.2f} recorded',
            'new_balance': supplier.pending_balance
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error processing payment: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== STOCK INWARD (PURCHASE ENTRY) ====================
@app.route('/api/stock-inward', methods=['POST'])
@login_required
@manager_required
def stock_inward():
    try:
        supplier_id = request.form.get('supplier_id')
        invoice_no = request.form.get('invoice_no', '')
        bill_date = request.form.get('bill_date', '')
        salesman = request.form.get('salesman', '')
        amount_paid = float(request.form.get('amount_paid', 0) or 0)
        payment_method = request.form.get('payment_method', 'cash')
        notes = request.form.get('notes', '')
        items_json = request.form.get('items', '[]')

        import json
        items = json.loads(items_json)

        if not items:
            return jsonify({'error': 'No items provided'}), 400

        grand_total = 0.0

        for item in items:
            product_id = item.get('product_id')
            qty = int(item.get('quantity', 0))
            price = float(item.get('purchase_price', 0))

            if not product_id or qty <= 0:
                continue

            product = Product.query.get(product_id)
            if not product:
                continue

            product.quantity += qty
            product.purchase_price = price
            if supplier_id:
                product.supplier_id = int(supplier_id)

            grand_total += qty * price

        if supplier_id:
            supplier = Supplier.query.get(int(supplier_id))
            if supplier:
                remaining = grand_total - amount_paid
                if remaining > 0:
                    supplier.pending_balance = (supplier.pending_balance or 0) + remaining

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Stock inward saved successfully',
            'grand_total': round(grand_total, 2)
        })

    except Exception as e:
        db.session.rollback()
        print(f"Stock inward error: {e}")
        return jsonify({'error': str(e)}), 500


# ==================== EXPENSES ROUTES ====================
@app.route('/expenses')
@login_required
@manager_required
def expenses_page():
    return render_template('expenses.html', user=current_user)

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    if current_user.is_admin() or current_user.is_manager():
        expenses = Expense.query.order_by(Expense.expense_date.desc()).all()
    else:
        expenses = Expense.query.filter_by(created_by=current_user.id).order_by(Expense.expense_date.desc()).all()
    return jsonify([{
        'id': e.id, 'category': e.category, 'amount': e.amount,
        'description': e.description, 'date': e.expense_date.strftime('%Y-%m-%d %H:%M'),
        'created_by': e.user.username
    } for e in expenses])

@app.route('/api/expenses', methods=['POST'])
@login_required
@manager_required
def create_expense():
    data = request.get_json()
    if not data.get('category') or not data.get('amount'):
        return jsonify({'error': 'Category and amount required'}), 400
    expense = Expense(
        category=data['category'], amount=float(data['amount']),
        description=data.get('description', ''), created_by=current_user.id
    )
    db.session.add(expense)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({'success': True})

# ==================== LOYALTY POINTS ROUTES ====================
@app.route('/loyalty')
@login_required
@admin_or_manager_required
def loyalty_page():
    return render_template('loyalty.html', user=current_user)

@app.route('/api/loyalty', methods=['GET'])
@login_required
def get_loyalty():
    customers = Customer.query.all()
    result = []
    for c in customers:
        loyalty = LoyaltyPoint.query.filter_by(customer_id=c.id).first()
        points = loyalty.points if loyalty else 0
        result.append({
            'customer_id': c.id, 'customer_name': c.name,
            'phone': c.phone, 'points': points, 'total_spent': c.total_spent
        })
    return jsonify(result)

@app.route('/api/loyalty', methods=['POST'])
@login_required
@admin_or_manager_required
def add_loyalty_points():
    data = request.get_json()
    customer_id = data.get('customer_id')
    points = data.get('points', 0)
    loyalty = LoyaltyPoint.query.filter_by(customer_id=customer_id).first()
    if loyalty:
        loyalty.points += points
    else:
        loyalty = LoyaltyPoint(customer_id=customer_id, points=points)
        db.session.add(loyalty)
    db.session.commit()
    return jsonify({'success': True, 'points': loyalty.points})

# ==================== PROMOTIONS ROUTES ====================
@app.route('/promotions')
@login_required
@admin_or_manager_required
def promotions_page():
    return render_template('promotions.html', user=current_user)

@app.route('/api/promotions', methods=['GET'])
@login_required
def get_promotions():
    promotions = Promotion.query.order_by(Promotion.start_date.desc()).all()
    return jsonify([{
        'id': p.id, 'name': p.name, 'discount_type': p.discount_type,
        'discount_value': p.discount_value, 'start_date': p.start_date.strftime('%Y-%m-%d'),
        'end_date': p.end_date.strftime('%Y-%m-%d'), 'is_active': p.is_active
    } for p in promotions])

@app.route('/api/promotions', methods=['POST'])
@login_required
@admin_or_manager_required
def create_promotion():
    data = request.get_json()
    if not data.get('name') or not data.get('discount_value'):
        return jsonify({'error': 'Name and discount value required'}), 400
    promotion = Promotion(
        name=data['name'], discount_type=data.get('discount_type', 'percentage'),
        discount_value=float(data['discount_value']),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d'),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d'),
        is_active=True
    )
    db.session.add(promotion)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/promotions/<int:promotion_id>/toggle', methods=['POST'])
@login_required
@admin_or_manager_required
def toggle_promotion(promotion_id):
    promotion = Promotion.query.get_or_404(promotion_id)
    promotion.is_active = not promotion.is_active
    db.session.commit()
    return jsonify({'success': True, 'is_active': promotion.is_active})

@app.route('/api/promotions/<int:promotion_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_promotion(promotion_id):
    promotion = Promotion.query.get_or_404(promotion_id)
    db.session.delete(promotion)
    db.session.commit()
    return jsonify({'success': True})

# ==================== PROFIT/LOSS ROUTES ====================
@app.route('/profit-loss')
@login_required
@manager_required
def profit_loss_page():
    return render_template('profit_loss.html', user=current_user)

@app.route('/api/profit-loss')
@login_required
def get_profit_loss():
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start and end date required'}), 400
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        
        sales = db.session.query(
            db.func.date(Transaction.transaction_date).label('date'),
            db.func.sum(Transaction.total_amount).label('total')
        ).filter(
            Transaction.transaction_date >= start,
            Transaction.transaction_date < end
        ).group_by(db.func.date(Transaction.transaction_date)).all()
        
        expenses = db.session.query(
            db.func.date(Expense.expense_date).label('date'),
            db.func.sum(Expense.amount).label('total')
        ).filter(
            Expense.expense_date >= start,
            Expense.expense_date < end
        ).group_by(db.func.date(Expense.expense_date)).all()
        
        # ✅ Fix: string ko seedha use karo, strftime mat lagao
        sales_dict = {str(s.date): float(s.total or 0) for s in sales}
        expenses_dict = {str(e.date): float(e.total or 0) for e in expenses}
        all_dates = sorted(set(sales_dict.keys()) | set(expenses_dict.keys()))
        
        return jsonify({
            'labels': all_dates,  # already strings hain
            'sales': [sales_dict.get(d, 0) for d in all_dates],
            'expenses': [expenses_dict.get(d, 0) for d in all_dates],
            'total_sales': sum(sales_dict.values()),
            'total_expenses': sum(expenses_dict.values()),
            'net_profit': sum(sales_dict.values()) - sum(expenses_dict.values())
        })
    except Exception as e:
        print(f"Profit/Loss Error: {str(e)}")
        return jsonify({'error': str(e)}), 500
# ==================== RETURNS & REFUNDS ROUTES ====================
@app.route('/returns')
@login_required
def returns_page():
    """Returns & Refunds page - Cashier can view, Manager/Admin can process"""
    if current_user.is_cashier():
        returns = ReturnItem.query.filter_by(processed_by=current_user.id).order_by(ReturnItem.return_date.desc()).all()
    else:
        returns = ReturnItem.query.order_by(ReturnItem.return_date.desc()).all()
    return render_template('returns.html', returns=returns, user=current_user)

@app.route('/api/returns', methods=['GET'])
@login_required
def get_returns():
    if current_user.is_admin() or current_user.is_manager():
        returns = ReturnItem.query.order_by(ReturnItem.return_date.desc()).all()
    else:
        returns = ReturnItem.query.filter_by(processed_by=current_user.id).order_by(ReturnItem.return_date.desc()).all()
    return jsonify([{
        'id': r.id, 'transaction_id': r.transaction_id,
        'product_name': r.product.name, 'quantity': r.quantity,
        'refund_amount': r.refund_amount, 'reason': r.reason,
        'return_date': r.return_date.strftime('%Y-%m-%d %H:%M'),
        'processed_by': r.user.username
    } for r in returns])

@app.route('/api/returns', methods=['POST'])
@login_required
def create_return():
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 0))
    reason = data.get('reason', '')
    
    transaction = Transaction.query.get_or_404(transaction_id)
    product = Product.query.get_or_404(product_id)
    
    original_item = TransactionItem.query.filter_by(transaction_id=transaction_id, product_id=product_id).first()
    if not original_item:
        return jsonify({'error': 'Product not found in this transaction'}), 400
    if quantity > original_item.quantity:
        return jsonify({'error': f'Cannot return more than {original_item.quantity} units'}), 400
    
    refund_amount = product.price * quantity
    return_item = ReturnItem(
        transaction_id=transaction_id, product_id=product_id,
        quantity=quantity, refund_amount=refund_amount,
        reason=reason, processed_by=current_user.id
    )
    product.quantity += quantity
    transaction.total_amount -= refund_amount
    db.session.add(return_item)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Return processed! Refund: PKR {refund_amount:.2f}', 'refund_amount': refund_amount})


# ==================== REPORTS DASHBOARD ROUTE ====================
@app.route('/reports')
@login_required
@manager_required
def reports_dashboard():
    """Reports Dashboard - Admin & Manager only (Cashier cannot access)"""
    today = datetime.now().date()
    start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
    end_date = today.strftime('%Y-%m-%d')
    return render_template('reports_dashboard.html', 
                          start_date=start_date, 
                          end_date=end_date,
                          user=current_user)


@app.route('/reports-dashboard')
@login_required
@manager_required
def reports_dashboard_alt():
    """Alternative route for reports dashboard"""
    return redirect(url_for('reports_dashboard'))


# ==================== OTHER ROUTES ====================
@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)

@app.route('/staff-management')
@login_required
@admin_or_manager_required
def staff_management():
    return redirect(url_for('manage_users'))

@app.route('/sales-reports')
@login_required
@manager_required
def sales_reports():
    return render_template('sales_reports.html', user=current_user)

@app.route('/sales-analytics')
@login_required
@manager_required
def sales_analytics():
    return render_template('sales_analytics.html', user=current_user)

@app.route('/customer-directory')
@login_required
@admin_or_manager_required
def customer_directory():
    return redirect(url_for('customers_page'))

@app.route('/inventory/low-stock')
@login_required
@manager_required
def low_stock_alerts():
    settings_obj = SystemSettings.query.first()
    threshold = settings_obj.low_stock_limit if settings_obj else 5
    low_stock_products = Product.query.filter(Product.quantity <= threshold).all()
    return render_template('low_stock.html', products=low_stock_products, user=current_user, threshold=threshold)

# ==================== FULL AUDIT & BACKUP ====================
@app.route('/shift-reports')
@login_required
def shift_reports_page():
    if current_user.role in ('admin', 'manager'):
        reports = ShiftReport.query.order_by(ShiftReport.shift_date.desc()).all()
    else:
        reports = ShiftReport.query.filter_by(cashier_id=current_user.id)\
                    .order_by(ShiftReport.shift_date.desc()).all()
    return render_template('shift_reports.html', reports=reports, datetime=datetime)


@app.route('/full-audit')
@admin_or_manager_required
def full_audit():
    all_transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).all()
    total_sales = sum(t.total_amount for t in all_transactions)
    return render_template('audit.html', transactions=all_transactions, total_sales=total_sales, count=len(all_transactions), datetime=datetime)

@app.route('/backup-database')
@admin_or_manager_required
def backup_database():
    try:
        db_path = os.path.join(app.instance_path, 'database.db')
        if not os.path.exists(db_path):
            flash("❌ Database file not found!", "danger")
            return redirect(url_for('dashboard'))
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        download_name = f"POS_Backup_{timestamp}.db"
        return send_file(db_path, as_attachment=True, download_name=download_name, mimetype='application/x-sqlite3')
    except Exception as e:
        flash(f"❌ Backup error: {str(e)}", "danger")
        return redirect(url_for('dashboard'))

# ==================== ERROR HANDLERS ====================
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# ==================== RUN APPLICATION ====================
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 POS SYSTEM STARTING...")
    print("="*60)
    print("\n📍 URL: http://localhost:5000")
    print("\n👤 LOGIN CREDENTIALS:")
    print("   • ADMIN:   admin / admin123")
    print("   • MANAGER: manager / manager123")
    print("   • CASHIER: cashier / cashier123")
    print("\n📋 FEATURES:")
    print("   • Customer Management")
    print("   • Discount System (Fixed/Percentage)")
    print("   • Search & Filter Products")
    print("   • Category Filter (with Category Table)")
    print("   • Stock Status Filter (Dynamic Low Stock Threshold)")
    print("   • Sales History with Items")
    print("   • User Management (Admin & Manager)")
    print("   • Full Audit & Database Backup")
    print("   • System Settings (Store Info, Tax, Low Stock Limit)")
    print("   • Sales Reports & Analytics APIs (with top 5 products)")
    print("   • POS with Tax Support")
    print("   • Forgot Password (Email Reset)")
    print("   • Categories Management (Add/Delete Categories)")
    print("   • Export Data to CSV")
    print("   • Supplier Management (with Pending Balance & Status)")
    print("   • Expense Tracker")
    print("   • Loyalty Points")
    print("   • Promotions & Discounts")
    print("   • Profit/Loss Report")
    print("   • Returns & Refunds")
    print("   • ✅ Purchase Price & Expiry Date Support")
    print("   • ✅ Supplier-Product Linking Complete")
    print("   • ✅ Customer List Route Added")
    print("   • ✅ Supplier Payment Method & Due Date")
    print("   • ✅ Settings Context Processor (Currency, Tax, Theme available in all templates)")
    print("\n" + "="*60 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)