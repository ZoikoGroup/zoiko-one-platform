"""Diagnostic: verify login API returns all products for a given user.

Usage:
    python scripts/verify_login_products.py user@example.com
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database import SessionLocal


def main():
    email = sys.argv[1] if len(sys.argv) > 1 else None
    if not email:
        print("Usage: python scripts/verify_login_products.py user@example.com")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Find employee
        emp = db.execute(text(
            "SELECT id, email, organization_id, role FROM employees WHERE email = :email"
        ), {"email": email}).fetchone()
        if not emp:
            print(f"No employee found with email: {email}")
            sys.exit(1)

        emp_id, emp_email, org_id, role = emp
        print(f"Employee: id={emp_id} email='{emp_email}' org_id={org_id} role='{role}'")

        if not org_id:
            print("  No organization — products = []")
            return

        # Query products the same way login_employee does
        product_rows = db.execute(text(
            "SELECT pp.code FROM super_admin_products pp "
            "JOIN super_admin_organization_products op ON op.product_id = pp.id "
            "WHERE op.organization_id = :org_id AND op.is_enabled = true "
            "ORDER BY pp.code"
        ), {"org_id": org_id}).fetchall()

        products = [r[0] for r in product_rows]
        print(f"  Products returned by login query: {products} (count={len(products)})")

        # Also check all OrganizationProduct records for this org
        all_op = db.execute(text(
            "SELECT op.id, op.product_id, op.is_enabled, pp.code "
            "FROM super_admin_organization_products op "
            "JOIN super_admin_products pp ON pp.id = op.product_id "
            "WHERE op.organization_id = :org_id "
            "ORDER BY pp.code"
        ), {"org_id": org_id}).fetchall()
        print(f"  All OrganizationProduct records:")
        for r in all_op:
            print(f"    id={r[0]} product_id={r[1]} enabled={r[2]} code='{r[3]}'")

    finally:
        db.close()


if __name__ == "__main__":
    main()
