"""
Backfill BillingConfiguration from Organization data for existing orgs.

For organizations with no BillingConfiguration row yet: creates one via
BillingConfigurationService.initialize_from_organization(), identical to what
now happens automatically for newly registered organizations.

For organizations that already HAVE a BillingConfiguration row: only fills in
individual identity/address fields that are currently blank (company_name,
billing_email, billing_phone, country, state, city, postal_code,
address_line1) directly from the Organization row. Currency, tax_label, and
every other already-initialized field are left untouched, whether they hold
the generic defaults or a Billing Admin's real customization — this script
never overwrites an existing value.

Idempotent: safe to run multiple times.

Run: python scripts/backfill_billing_from_organization.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.modules.hr.models import Organization
from app.modules.billing.repositories.settings import BillingConfigurationRepository
from app.modules.billing.services.settings_service import BillingConfigurationService

# Config fields that are safe to backfill on an EXISTING config row when
# blank — identity/address only, never currency/tax/anything the Billing
# Admin may have already configured.
BACKFILL_IF_BLANK = {
    "company_name": lambda org: org.organization_name or org.name,
    "billing_email": lambda org: org.email,
    "billing_phone": lambda org: org.phone,
    "country": lambda org: org.country,
    "state": lambda org: org.state,
    "city": lambda org: org.city,
    "postal_code": lambda org: org.postal_code,
    "address_line1": lambda org: org.address,
}


def backfill():
    db = SessionLocal()
    try:
        service = BillingConfigurationService(db)
        repo = BillingConfigurationRepository(db)

        orgs = db.query(Organization).all()
        print(f"Found {len(orgs)} organizations")

        created, backfilled, skipped = 0, 0, 0

        for org in orgs:
            existing = repo.get_by_organization(org.id)
            if not existing:
                service.initialize_from_organization(org)
                created += 1
                print(f"  Org {org.id} ({org.name}): created BillingConfiguration from org data")
                continue

            changed_fields = []
            for field, getter in BACKFILL_IF_BLANK.items():
                if getattr(existing, field, None):
                    continue  # already set — never overwrite
                value = getter(org)
                if value:
                    setattr(existing, field, value)
                    changed_fields.append(field)

            if changed_fields:
                db.commit()
                db.refresh(existing)
                backfilled += 1
                print(f"  Org {org.id} ({org.name}): backfilled {changed_fields}")
            else:
                skipped += 1

        print(f"Done. created={created} backfilled={backfilled} unchanged={skipped}")
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
