"""
Backfill the global multi-country tax catalogue for existing organizations.

For every organization, calls TaxService.initialize_global_tax_catalogue(),
which is idempotent (matches on the existing (organization_id, code) unique
constraint) and never overwrites an existing default or any manually-created
tax rate — it only adds rows for countries/rates not already present.

Safe to re-run.

Run: python scripts/backfill_global_tax_catalogue.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.modules.hr.models import Organization
from app.modules.billing.services.tax_service import TaxService


def backfill():
    db = SessionLocal()
    try:
        service = TaxService(db)
        orgs = db.query(Organization).all()
        print(f"Found {len(orgs)} organizations")

        seeded, unchanged = 0, 0
        for org in orgs:
            created = service.initialize_global_tax_catalogue(org)
            if created:
                seeded += 1
                print(f"  Org {org.id} ({org.name}): added {len(created)} tax rate(s) "
                      f"[{', '.join(r.code for r in created)}]")
            else:
                unchanged += 1

        print(f"Done. seeded={seeded} unchanged={unchanged}")
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
