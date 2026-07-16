"""One-shot script: completely delete organizations by name.

Usage:
    python scripts/delete_orgs.py "mini" "varma" "harshith"

Deletes ALL child records (employees, departments, attendance, etc.)
from every table that references organizations.id, then removes the org rows.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import inspect, text
from app.database import SessionLocal, engine
from app.modules.hr.models import Organization


def get_org_id_column_tables(inspector):
    """Return list of (table_name, column_name) for every table that has organization_id."""
    result = []
    for table_name in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns(table_name)}
        if "organization_id" in columns:
            result.append(table_name)
    return result


def main():
    org_names = sys.argv[1:]
    if not org_names:
        print("Usage: python scripts/delete_orgs.py 'org1' 'org2' ...")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Find matching organizations
        orgs = db.query(Organization).filter(
            Organization.name.ilike(org_names[0]) if len(org_names) == 1
            else Organization.name.in_([n.strip() for n in org_names])
        ).all()

        # Fallback: try partial match if exact match found nothing
        if not orgs:
            from sqlalchemy import or_
            conditions = [Organization.name.ilike(f"%{n.strip()}%") for n in org_names]
            orgs = db.query(Organization).filter(or_(*conditions)).all()

        if not orgs:
            print(f"No organizations found matching: {org_names}")
            sys.exit(1)

        org_ids = [o.id for o in orgs]
        print(f"Found {len(orgs)} organization(s):")
        for o in orgs:
            print(f"  id={o.id}  name='{o.name}'  code='{o.code}'  status={o.status}")

        # Confirm (auto-confirm with --yes flag or piped input)
        if "--yes" in sys.argv or "-y" in sys.argv:
            confirm = "y"
        else:
            confirm = input(f"\nDelete these {len(orgs)} organization(s) and ALL related data? [y/N] ").strip().lower()
        if confirm != "y":
            print("Aborted.")
            sys.exit(0)

        inspector = inspect(engine)
        tables_with_org_fk = get_org_id_column_tables(inspector)

        # Also handle the employees table which references organizations.id via FK
        total_deleted = 0
        with engine.begin() as conn:
            for table in tables_with_org_fk:
                # Skip the organizations table itself — delete it last
                if table == "organizations":
                    continue
                result = conn.execute(
                    text(f'DELETE FROM "{table}" WHERE organization_id IN :ids'),
                    {"ids": tuple(org_ids)},
                )
                if result.rowcount > 0:
                    print(f"  Deleted {result.rowcount} row(s) from {table}")
                    total_deleted += result.rowcount

            # Also handle tables that reference employees (which belong to the org)
            # and any other indirect references
            # Delete employees for these orgs
            result = conn.execute(
                text("DELETE FROM employees WHERE organization_id IN :ids"),
                {"ids": tuple(org_ids)},
            )
            if result.rowcount > 0:
                print(f"  Deleted {result.rowcount} row(s) from employees")
                total_deleted += result.rowcount

            # Delete audit logs referencing these orgs (entity_type = 'Organization')
            for table in ["super_admin_audit_logs", "super_admin_notifications",
                          "super_admin_organization_products", "super_admin_subscriptions",
                          "super_admin_approval_history"]:
                try:
                    result = conn.execute(
                        text(f'DELETE FROM "{table}" WHERE organization_id IN :ids'),
                        {"ids": tuple(org_ids)},
                    )
                    if result.rowcount > 0:
                        print(f"  Deleted {result.rowcount} row(s) from {table}")
                        total_deleted += result.rowcount
                except Exception:
                    pass  # Table might not exist or column might not exist

            # Delete organization product links
            try:
                result = conn.execute(
                    text("DELETE FROM super_admin_organization_products WHERE organization_id IN :ids"),
                    {"ids": tuple(org_ids)},
                )
                if result.rowcount > 0:
                    print(f"  Deleted {result.rowcount} row(s) from super_admin_organization_products")
                    total_deleted += result.rowcount
            except Exception:
                pass

            # Delete subscriptions
            try:
                result = conn.execute(
                    text("DELETE FROM super_admin_subscriptions WHERE organization_id IN :ids"),
                    {"ids": tuple(org_ids)},
                )
                if result.rowcount > 0:
                    print(f"  Deleted {result.rowcount} row(s) from super_admin_subscriptions")
                    total_deleted += result.rowcount
            except Exception:
                pass

            # Finally delete the organizations themselves
            result = conn.execute(
                text("DELETE FROM organizations WHERE id IN :ids"),
                {"ids": tuple(org_ids)},
            )
            print(f"  Deleted {result.rowcount} organization(s)")
            total_deleted += result.rowcount

        print(f"\nDone. Total rows deleted: {total_deleted}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
