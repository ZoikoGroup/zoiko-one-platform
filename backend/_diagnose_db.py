"""Diagnose current DB state vs Alembic migration state."""
from sqlalchemy import create_engine, text, inspect
from app.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)
inspector = inspect(engine)

print("=" * 60)
print("DATABASE DIAGNOSTIC REPORT")
print("=" * 60)

# 1. Alembic version applied
with engine.connect() as conn:
    result = conn.execute(text("SELECT version_num FROM alembic_version"))
    rows = result.fetchall()
    print(f"\nApplied DB revision(s): {[r[0] for r in rows]}")

# 2. Check employees table for legacy_code
cols = [c['name'] for c in inspector.get_columns('employees')]
print(f"\nemployees table columns ({len(cols)}): {sorted(cols)}")
print(f"  Has 'legacy_code': {'legacy_code' in cols}")

# 3. Check all tables for new code columns
tables_to_check = {
    'organizations': ['uuid', 'organization_code', 'organization_name', 'display_name', 'language', 'website', 'logo_url'],
    'departments': ['department_code'],
    'designations': ['designation_code'],
    'employees': ['legacy_code'],
    'payroll_employees': ['legacy_code'],
    'payroll_runs': ['run_code'],
    'payslip_items': ['payslip_number'],
    'payroll_attendance_records': ['batch_code'],
    'payroll_leave_requests': ['request_code'],
    'super_admin_organization_products': ['tenant_code'],
}

print(f"\n{'=' * 60}")
print("New code columns status:")
print(f"{'=' * 60}")
for table, expected_cols in tables_to_check.items():
    table_cols = {c['name'] for c in inspector.get_columns(table)}
    for col in expected_cols:
        status = "✓ EXISTS" if col in table_cols else "✗ MISSING"
        print(f"  {table}.{col}: {status}")

# 4. Check if merge head migration exists
print(f"\n{'=' * 60}")
print("Alembic head files check:")
print(f"{'=' * 60}")
import os
versions_dir = os.path.join(os.path.dirname(__file__), 'alembic', 'versions')
for f in sorted(os.listdir(versions_dir)):
    if f.endswith('.py') and not f.startswith('__'):
        print(f"  {f}")

print(f"\n{'=' * 60}")
print("Check if p1b_sub_prov migration file exists:")
print(f"{'=' * 60}")
p1b_files = [f for f in os.listdir(versions_dir) if 'p1b' in f.lower()]
if p1b_files:
    for f in p1b_files:
        print(f"  Found: {f}")
else:
    print("  NOT FOUND - no migration file for revision 'p1b_sub_prov'")

# 5. Check if p1a_price_provenance_foundation exists
print(f"\n{'=' * 60}")
print("Other relevant migration files:")
print(f"{'=' * 60}")
for f in sorted(os.listdir(versions_dir)):
    if 'p1a' in f.lower() or 'price_provenance' in f.lower() or 'c4d5e6f7a8b9' in f.lower() or '7457adf23cff' in f.lower():
        print(f"  {f}")

