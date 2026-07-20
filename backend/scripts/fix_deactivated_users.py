"""One-time migration: seed PlatformProduct records, create OrganizationProduct links for all orgs,
and activate all deactivated users."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.database import SessionLocal
from app.modules.employee.models import Employee
from app.modules.hr.models import Organization
from app.modules.super_admin.models import PlatformProduct, OrganizationProduct, ProductStatus
from datetime import datetime

def main():
    db = SessionLocal()
    try:
        # 1. Activate all deactivated users
        fixed_users = db.query(Employee).filter(Employee.is_active == False).all()
        for emp in fixed_users:
            emp.is_active = True
            print(f"  Activated user: {emp.email} (id={emp.id})")
        db.flush()
        print(f"Fixed {len(fixed_users)} users.")

        # 2. Seed PlatformProduct records if they don't exist
        seed_products = [
            {"code": "hr",        "name": "Zoiko HR",        "description": "HR management, attendance, leaves & more"},
            {"code": "time",      "name": "ZoikoTime",       "description": "Time tracking and attendance"},
            {"code": "payroll",   "name": "Zoiko Payroll",   "description": "Payroll processing, payslips, compliance"},
            {"code": "billing",   "name": "Zoiko Billing",   "description": "Invoicing and billing management"},
            {"code": "projects",  "name": "Zoiko Projects",  "description": "Project management and tracking"},
            {"code": "comply",    "name": "Zoiko Comply",    "description": "Compliance and regulatory management"},
            {"code": "insights",  "name": "Zoiko Insights",  "description": "Analytics and business intelligence"},
            {"code": "spend",     "name": "Zoiko Spend",     "description": "Spend management and purchase requests"},
            {"code": "inventory", "name": "Zoiko Inventory", "description": "Inventory management and tracking"},
            {"code": "docs",      "name": "Zoiko Docs Pro",  "description": "Document management system"},
        ]
        for sp in seed_products:
            existing = db.query(PlatformProduct).filter(PlatformProduct.code == sp["code"]).first()
            if not existing:
                prod = PlatformProduct(
                    code=sp["code"],
                    name=sp["name"],
                    description=sp["description"],
                    status=ProductStatus.ACTIVE,
                )
                db.add(prod)
                print(f"  Seeded product: {sp['code']}")
        db.flush()

        # 3. Fetch all active products
        products = db.query(PlatformProduct).filter(
            PlatformProduct.status == ProductStatus.ACTIVE,
        ).all()
        print(f"Active products available: {[p.code for p in products]}")

        # 4. Create OrganizationProduct records for orgs that have none
        all_orgs = db.query(Organization).all()
        created_count = 0
        for org in all_orgs:
            existing = db.query(OrganizationProduct).filter(
                OrganizationProduct.organization_id == org.id
            ).count()
            if existing == 0:
                for prod in products:
                    db.add(OrganizationProduct(
                        organization_id=org.id,
                        product_id=prod.id,
                        is_enabled=True,
                        enabled_at=datetime.utcnow(),
                    ))
                    created_count += 1

        db.commit()
        print(f"Created {created_count} OrganizationProduct records across {len(all_orgs)} orgs.")
        print("Migration complete.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
