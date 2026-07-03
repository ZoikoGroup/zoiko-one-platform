# Run from your project root with your venv active:
#     python inspect_schema.py
#
# Reads DATABASE_URL from the environment (or .env) and prints the actual
# columns + foreign keys for payroll_runs, payslip_items, payroll_employees,
# plus the current alembic_version row.

import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    try:
        with open(".env") as f:
            for line in f:
                if line.strip().startswith("DATABASE_URL"):
                    DATABASE_URL = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                    break
    except FileNotFoundError:
        pass

if not DATABASE_URL:
    print("Could not find DATABASE_URL in env or .env - set it manually at the top of this script.")
    raise SystemExit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

TABLES = ["payroll_runs", "payslip_items", "payroll_employees"]

for table in TABLES:
    print("")
    print("=" * 70)
    print("TABLE: " + table)
    print("=" * 70)
    cur.execute(
        "SELECT column_name, data_type, is_nullable, column_default "
        "FROM information_schema.columns "
        "WHERE table_name = %s "
        "ORDER BY ordinal_position;",
        (table,),
    )
    rows = cur.fetchall()
    if not rows:
        print("  (table does not exist)")
        continue
    for col_name, data_type, nullable, default in rows:
        print("  {:<25} {:<20} nullable={:<5} default={}".format(col_name, data_type, nullable, default))

    cur.execute(
        "SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name "
        "FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
        "JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name "
        "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = %s;",
        (table,),
    )
    fks = cur.fetchall()
    if fks:
        print("  -- foreign keys --")
        for name, col, ftable, fcol in fks:
            print("  {}: {} -> {}.{}".format(name, col, ftable, fcol))

print("")
print("=" * 70)
print("alembic_version")
print("=" * 70)
cur.execute("SELECT version_num FROM alembic_version;")
print(" ", cur.fetchall())

cur.close()
conn.close()