"""Diagnostic: check product assignment state for all organizations.

Usage:
    python scripts/diagnose_products.py

Shows:
  - All PlatformProduct records
  - All organizations and their OrganizationProduct records
  - Any mismatches (org has products that don't exist in PlatformProduct, etc.)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database import SessionLocal, engine


def main():
    db = SessionLocal()
    try:
        print("=" * 70)
        print("PLATFORM PRODUCTS (super_admin_products)")
        print("=" * 70)
        rows = db.execute(text("SELECT id, code, name, status FROM super_admin_products ORDER BY id")).fetchall()
        if not rows:
            print("  (none)")
        for r in rows:
            print(f"  id={r[0]}  code='{r[1]}'  name='{r[2]}'  status='{r[3]}'")

        print()
        print("=" * 70)
        print("ORGANIZATIONS + THEIR PRODUCTS")
        print("=" * 70)
        orgs = db.execute(text(
            "SELECT id, name, code, status FROM organizations ORDER BY id"
        )).fetchall()
        if not orgs:
            print("  (no organizations)")
        for org in orgs:
            org_id, org_name, org_code, org_status = org
            print(f"\n  Organization: id={org_id}  name='{org_name}'  code='{org_code}'  status='{org_status}'")

            prods = db.execute(text(
                "SELECT op.id, op.product_id, op.is_enabled, pp.code, pp.name "
                "FROM super_admin_organization_products op "
                "JOIN super_admin_products pp ON pp.id = op.product_id "
                "WHERE op.organization_id = :oid "
                "ORDER BY pp.code"
            ), {"oid": org_id}).fetchall()
            if prods:
                for p in prods:
                    print(f"    OrgProduct id={p[0]}  product_id={p[1]}  enabled={p[2]}  code='{p[3]}'  name='{p[4]}'")
            else:
                print("    (no products assigned)")

        print()
        print("=" * 70)
        print("PRODUCT COUNT SUMMARY")
        print("=" * 70)
        summary = db.execute(text(
            "SELECT o.id, o.name, COUNT(op.id) as product_count "
            "FROM organizations o "
            "LEFT JOIN super_admin_organization_products op ON op.organization_id = o.id "
            "GROUP BY o.id, o.name "
            "ORDER BY o.id"
        )).fetchall()
        for s in summary:
            print(f"  org={s[1]} (id={s[0]}): {s[2]} product(s)")

    finally:
        db.close()


if __name__ == "__main__":
    main()
