from app import app, db
import sqlite3
import os

db_path = os.path.join('instance', 'database.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN email VARCHAR(120)")
        print("✅ email column added")
    except:
        print("email column already exists or error")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN reset_token VARCHAR(100)")
        print("✅ reset_token column added")
    except:
        print("reset_token column already exists or error")
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME")
        print("✅ reset_token_expiry column added")
    except:
        print("reset_token_expiry column already exists or error")
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("Database not found. Run app first to create it.")