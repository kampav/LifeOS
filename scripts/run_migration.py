"""
Run DB migrations against Supabase via direct PostgreSQL connection.
Usage: python scripts/run_migration.py

Requires: pip install psycopg2-binary
DB password: found in Supabase → Project Settings → Database → Connection string
"""
import sys
import os

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary -q")
    import psycopg2

DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
DB_HOST = "db.lvbbiosduocqtvdywzan.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

if not DB_PASSWORD:
    print("\nSUPABASE_DB_PASSWORD not set.")
    print("Find it at: Supabase Dashboard → Project Settings → Database → Connection string")
    print("\nThen run:")
    print("  set SUPABASE_DB_PASSWORD=your_password && python scripts/run_migration.py")
    sys.exit(1)

migration_file = os.path.join(os.path.dirname(__file__), "../backend/app/db/migrations/001_initial_schema.sql")

print(f"Connecting to {DB_HOST}...")
conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, sslmode="require")
conn.autocommit = True
cur = conn.cursor()

with open(migration_file, "r") as f:
    sql = f.read()

print("Running 001_initial_schema.sql...")
try:
    cur.execute(sql)
    print("✅ Migration complete! All tables, RLS policies, and triggers created.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    cur.close()
    conn.close()
