import psycopg2
from app.config import Settings

s = Settings()
conn = psycopg2.connect(s.DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# Drop unique constraint if exists
cur.execute("SELECT conname FROM pg_constraint WHERE conname = 'uq_org_employee_id'")
if cur.fetchone():
    cur.execute("ALTER TABLE employees DROP CONSTRAINT uq_org_employee_id")
    print("Dropped uq_org_employee_id")
else:
    print("Constraint already gone")

# Make employee_id nullable
cur.execute("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'employee_id'")
row = cur.fetchone()
if row and row[0] == 'NO':
    cur.execute("ALTER TABLE employees ALTER COLUMN employee_id DROP NOT NULL")
    print("Made employee_id nullable")
else:
    print("employee_id already nullable")

# Stamp alembic
cur.execute("INSERT INTO alembic_version (version_num) VALUES ('d2e4f6a8c0b2') ON CONFLICT DO NOTHING")
print("Stamped d2e4f6a8c0b2")

cur.close()
conn.close()
print("Done")
