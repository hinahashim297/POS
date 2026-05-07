from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for authentication and role management"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='cashier')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Password reset fields
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    transactions = db.relationship('Transaction', back_populates='cashier', lazy=True)
    
    def is_admin(self):
        return self.role == 'admin'
    
    def is_manager(self):
        return self.role == 'manager'
    
    def is_cashier(self):
        return self.role == 'cashier'
    
    def __repr__(self):
        return f'<User {self.username} ({self.role})>'


# ==================== CATEGORY MODEL ====================
class Category(db.Model):
    """Category model for product categories"""
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with products
    products = db.relationship('Product', backref='category_ref', lazy=True)
    
    def __repr__(self):
        return f'<Category {self.name}>'


# ==================== PRODUCT MODEL ====================
class Product(db.Model):
    """Product model for inventory management"""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=True)
    barcode = db.Column(db.String(50), unique=True, nullable=True)
    purchase_price = db.Column(db.Float, default=0.0)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    expiry_date = db.Column(db.String(20), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transaction_items = db.relationship('TransactionItem', backref='product', lazy=True)
    
    @property
    def category(self):
        if self.category_ref:
            return self.category_ref.name
        return None
    
    @category.setter
    def category(self, value):
        if value:
            cat = Category.query.filter_by(name=value).first()
            if not cat:
                cat = Category(name=value)
                db.session.add(cat)
                db.session.commit()
            self.category_id = cat.id
    
    def __repr__(self):
        return f'<Product {self.name}>'


class Transaction(db.Model):
    """Transaction model for sales records"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Float, nullable=False, default=0)
    cashier_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    
    # Payment Method and Reference
    payment_method = db.Column(db.String(50), default='cash')
    payment_reference = db.Column(db.String(100), nullable=True)
    
    # Relationships
    items = db.relationship('TransactionItem', backref='transaction', lazy=True, cascade='all, delete-orphan')
    cashier = db.relationship('User', back_populates='transactions', foreign_keys=[cashier_id])
    customer = db.relationship('Customer', backref='transactions', foreign_keys=[customer_id])
    
    def __repr__(self):
        return f'<Transaction #{self.id}>'


class TransactionItem(db.Model):
    """Transaction item model for individual items in a transaction"""
    __tablename__ = 'transaction_items'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_time = db.Column(db.Float, nullable=False)
    
    def subtotal(self):
        return self.price_at_time * self.quantity
    
    def __repr__(self):
        return f'<TransactionItem {self.id}>'


class Customer(db.Model):
    """Customer model for customer management"""
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    is_default = db.Column(db.Boolean, default=False)
    total_spent = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Customer {self.name}>'


# ==================== System Settings Model ====================
class SystemSettings(db.Model):
    """System-wide settings (singleton table)"""
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    store_name = db.Column(db.String(200), default='My POS Store')
    store_address = db.Column(db.Text, default='123 Main Street, City')
    store_phone = db.Column(db.String(50), default='+92 300 1234567')
    low_stock_limit = db.Column(db.Integer, default=5)
    tax_rate = db.Column(db.Float, default=0.0)
    currency_symbol = db.Column(db.String(5), default='$')
    auto_receipt = db.Column(db.Boolean, default=True)
    theme = db.Column(db.String(20), default='light')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return '<SystemSettings>'


# ==================== RETURNS & REFUNDS MODEL ====================
class ReturnItem(db.Model):
    """Return/Refund model for product returns"""
    __tablename__ = 'returns'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    refund_amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(200), nullable=True)
    return_date = db.Column(db.DateTime, default=datetime.utcnow)
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    transaction = db.relationship('Transaction', backref='returns', foreign_keys=[transaction_id])
    product = db.relationship('Product', backref='returns', foreign_keys=[product_id])
    user = db.relationship('User', backref='returns', foreign_keys=[processed_by])
    
    def __repr__(self):
        return f'<ReturnItem #{self.id}>'


# ==================== SUPPLIER MODEL (UPDATED WITH PAYMENT METHOD) ====================
class Supplier(db.Model):
    """Supplier model for stock procurement"""
    __tablename__ = 'suppliers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    contact_person = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    pending_balance = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50), default='cash')  # ✅ ADDED
    due_date = db.Column(db.String(20), nullable=True)  # ✅ ADDED
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with products
    products = db.relationship('Product', backref='supplier', lazy=True, foreign_keys=[Product.supplier_id])
    
    def __repr__(self):
        return f'<Supplier {self.name}>'


# ==================== EXPENSE MODEL ====================
class Expense(db.Model):
    """Expense tracker for store operational costs"""
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200), nullable=True)
    expense_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationship
    user = db.relationship('User', backref='expenses')
    
    def __repr__(self):
        return f'<Expense {self.category}>'


# ==================== LOYALTY POINTS MODEL ====================
class LoyaltyPoint(db.Model):
    """Loyalty points for customers"""
    __tablename__ = 'loyalty_points'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    points = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    customer = db.relationship('Customer', backref='loyalty')
    
    def __repr__(self):
        return f'<LoyaltyPoint Customer:{self.customer_id} Points:{self.points}>'


# ==================== PROMOTION MODEL ====================
class Promotion(db.Model):
    """Promotions and discounts for products"""
    __tablename__ = 'promotions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    discount_type = db.Column(db.String(20), default='percentage')
    discount_value = db.Column(db.Float, nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with products (many-to-many)
    products = db.relationship('Product', secondary='promotion_products', backref='promotions')
    
    def __repr__(self):
        return f'<Promotion {self.name}>'


# ==================== SHIFT REPORT MODEL ====================
class ShiftReport(db.Model):
    """Shift closure report saved when cashier ends their shift"""
    __tablename__ = 'shift_reports'

    id = db.Column(db.Integer, primary_key=True)
    cashier_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    shift_date = db.Column(db.DateTime, default=datetime.utcnow)
    system_sales = db.Column(db.Float, nullable=False, default=0)
    total_transactions = db.Column(db.Integer, default=0)
    cash_in_drawer = db.Column(db.Float, nullable=False, default=0)
    difference = db.Column(db.Float, default=0)
    variance_percent = db.Column(db.Float, default=0)
    status = db.Column(db.String(20), default='ok')  # ok / warning / large_variance

    cashier = db.relationship('User', backref='shift_reports', foreign_keys=[cashier_id])

    def __repr__(self):
        return f'<ShiftReport #{self.id} by cashier {self.cashier_id}>'


# Promotion-Product association table
promotion_products = db.Table('promotion_products',
    db.Column('promotion_id', db.Integer, db.ForeignKey('promotions.id'), primary_key=True),
    db.Column('product_id', db.Integer, db.ForeignKey('products.id'), primary_key=True)
)