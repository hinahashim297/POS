# reset_db.py
from app import app, db
from models import Category

with app.app_context():
    # Drop all tables
    db.drop_all()
    print("✅ All tables dropped")
    
    # Create all tables
    db.create_all()
    print("✅ All tables created")
    
    # Add default categories
    default_categories = ['Electronics', 'Home', 'Stationery', 'Groceries', 'Clothing']
    for cat_name in default_categories:
        cat = Category(name=cat_name)
        db.session.add(cat)
    db.session.commit()
    print("✅ Default categories added")
    
    print("\n🎉 Database reset complete!")