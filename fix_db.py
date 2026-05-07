from app import app, db

with app.app_context():
    try:
        db.engine.execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1')
        print('✅ Column is_active added successfully!')
    except Exception as e:
        print('Error:', e)
        print('If column already exists, ignore this.')
