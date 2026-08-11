import logging
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import AlreadyExistsException, BadRequestException, NotFoundException
from app.core.global_tax_catalogue import get_ordered_catalogue_for_org, resolve_country_code
from app.modules.billing.models import BillingAuditAction, Tax, TaxRate
from app.modules.billing.repositories.tax import TaxRateRepository, TaxRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed, safe_commit
from app.modules.billing.utils.currency_utils import percentage_of

logger = logging.getLogger("zoiko")

TAX_RATE_ALLOWED_FIELDS = {
    "name", "code", "rate", "tax_type", "jurisdiction",
    "is_compound", "is_recoverable",
    "effective_from", "effective_to", "applies_to", "is_active",
    "country_code", "currency_code", "tax_type_label", "is_default", "priority",
}
TAX_ALLOWED_FIELDS = {
    "invoice_id", "credit_note_id", "tax_rate_id",
    "tax_name", "tax_percentage", "tax_amount",
    "jurisdiction", "tax_type", "is_active",
}


class TaxService:
    def __init__(self, db: Session):
        self.db = db
        self.rate_repo = TaxRateRepository(db)
        self.tax_repo = TaxRepository(db)
        self.audit = BillingAuditService(db)

    # ── Tax Rates ──────────────────────────────────────────────────────────

    def _demote_other_defaults(self, organization_id: int, exclude_id: Optional[int] = None) -> None:
        """Ensures at most one TaxRate is marked is_default for this org.
        Called before persisting a new/updated is_default=True row so the
        DB's partial unique index on (organization_id) WHERE is_default
        never raises during normal create/update flows."""
        query = self.db.query(TaxRate).filter(
            TaxRate.organization_id == organization_id,
            TaxRate.is_default == True,
        )
        if exclude_id is not None:
            query = query.filter(TaxRate.id != exclude_id)
        query.update({TaxRate.is_default: False}, synchronize_session=False)

    def create_tax_rate(self, organization_id: int, created_by: int, **data: Any) -> TaxRate:
        data = filter_allowed(data, TAX_RATE_ALLOWED_FIELDS)
        if self.rate_repo.exists(organization_id, code=data.get("code")):
            raise AlreadyExistsException("TaxRate", "code")
        if data.get("is_default"):
            self._demote_other_defaults(organization_id)
        rate = self.rate_repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "TaxRate", rate.id, new_values=data)
        return rate

    def update_tax_rate(self, rate_id: int, organization_id: int, updated_by: int, **data: Any) -> TaxRate:
        data = filter_allowed(data, TAX_RATE_ALLOWED_FIELDS)
        self.rate_repo.get_by_id(rate_id, organization_id)
        if data.get("code"):
            existing = self.rate_repo.get_by_code(organization_id, data["code"])
            if existing and existing.id != rate_id:
                raise AlreadyExistsException("TaxRate", "code")
        if data.get("is_default"):
            self._demote_other_defaults(organization_id, exclude_id=rate_id)
        updated = self.rate_repo.update(rate_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "TaxRate", rate_id)
        return updated

    def get_tax_rate(self, rate_id: int, organization_id: int) -> TaxRate:
        return self.rate_repo.get_by_id(rate_id, organization_id)

    def get_tax_rate_by_code(self, organization_id: int, code: str) -> Optional[TaxRate]:
        return self.rate_repo.get_by_code(organization_id, code)

    def list_tax_rates(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, tax_type: Optional[str] = None,
        currency_code: Optional[str] = None, country_code: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort_by: str = "name", sort_order: str = "asc",
    ) -> Dict[str, Any]:
        # If is_active is True, return active rates only.
        # If is_active is False, return inactive rates only.
        # If is_active is None, return all rates (both active and inactive).
        active_only = True if is_active is True else False
        extra: Dict[str, Any] = {}
        if is_active is not None:
            extra["is_active"] = is_active
        if country_code:
            extra["country_code"] = country_code.upper()
        return self.rate_repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, tax_type=tax_type,
            currency_code=currency_code,
            active_only=active_only,
            **extra,
        )

    def list_tax_rates_by_currency(
        self, organization_id: int, currency_code: str,
    ) -> List[TaxRate]:
        return self.rate_repo.list_by_currency(organization_id, currency_code)

    def get_default_tax_rate(self, organization_id: int) -> Optional[TaxRate]:
        return self.rate_repo.get_default(organization_id)

    def get_default_tax_rate_by_currency(
        self, organization_id: int, currency_code: str,
    ) -> Optional[TaxRate]:
        return self.rate_repo.get_default_by_currency(organization_id, currency_code)

    def delete_tax_rate(self, rate_id: int, organization_id: int, updated_by: int) -> None:
        self.rate_repo.soft_delete(rate_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "TaxRate", rate_id)

    def get_applicable_rates(self, organization_id: int, taxable_type: str = "both") -> List[TaxRate]:
        rates = self.rate_repo.list_all(organization_id, active_only=True)
        return [r for r in rates if r.applies_to.value == taxable_type or r.applies_to.value == "both"]

    # ── Global Tax Catalogue ───────────────────────────────────────────────

    def initialize_global_tax_catalogue(self, organization) -> List[TaxRate]:
        """Get-or-create the global multi-country tax catalogue for an
        organization, seeded from GLOBAL_TAX_CATALOGUE. Idempotent: rows are
        matched by their deterministic `code` (the existing (organization_id,
        code) unique constraint), so re-running only fills in countries that
        are still missing - never touches or duplicates existing rows,
        whether seeded previously or created manually by a Billing Admin.

        Exactly one newly-inserted row is marked is_default=True (the
        organization's own country's standard rate) - and only if the org
        currently has no default at all, so an existing custom default is
        never overridden.
        """
        organization_id = organization.id
        existing_codes = {
            code for (code,) in self.db.query(TaxRate.code).filter(
                TaxRate.organization_id == organization_id,
            ).all()
        }
        has_default = self.db.query(TaxRate.id).filter(
            TaxRate.organization_id == organization_id,
            TaxRate.is_default == True,
        ).first() is not None

        catalogue = get_ordered_catalogue_for_org(organization.country)
        created: List[TaxRate] = []
        for spec in catalogue:
            if spec["code"] in existing_codes:
                continue
            rate = TaxRate(
                organization_id=organization_id,
                name=spec["name"],
                code=spec["code"],
                jurisdiction=spec["jurisdiction"],
                rate=Decimal(str(spec["rate"])),
                tax_type=spec["tax_type"],
                country_code=spec["country_code"],
                currency_code=spec["currency_code"],
                tax_type_label=spec["tax_type_label"],
                priority=spec["priority"],
                is_default=bool(spec["is_default"] and not has_default),
                is_active=True,
                effective_from=date.today(),
            )
            self.db.add(rate)
            if rate.is_default:
                has_default = True
            created.append(rate)

        if created:
            safe_commit(self.db)
            for rate in created:
                self.db.refresh(rate)
        return created

    def resync_default_for_country(self, organization) -> Optional[TaxRate]:
        """Re-resolves which catalogue row should be the organization's
        default after organization.country changes, without touching the
        rest of the catalogue or any historical data. Demotes the current
        default (if any) and promotes the new country's standard rate (if
        it exists and isn't jurisdiction-required). Not wired into any
        organization-update endpoint automatically - callers decide when a
        country change warrants a resync."""
        organization_id = organization.id
        country_code = resolve_country_code(organization.country)
        if not country_code:
            return None

        catalogue = get_ordered_catalogue_for_org(organization.country)
        target_spec = next(
            (s for s in catalogue if s["country_code"] == country_code and s["is_default"]),
            None,
        )
        if not target_spec:
            return None

        target = self.rate_repo.get_by_code(organization_id, target_spec["code"])
        if not target:
            return None

        self._demote_other_defaults(organization_id, exclude_id=target.id)
        target.is_default = True
        safe_commit(self.db)
        self.db.refresh(target)
        return target

    # ── Tax Calculation ────────────────────────────────────────────────────

    def calculate_taxes(
        self, organization_id: int, taxable_amount: Decimal, jurisdiction: Optional[str] = None,
        tax_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # Compound taxes (is_compound=True) apply on top of every rate already
        # processed, so the processing order determines the result — sort by
        # the rate's own `priority` column (which exists for exactly this
        # purpose) rather than relying on the DB's undefined default row order.
        rates = sorted(
            self.rate_repo.list_all(organization_id, active_only=True),
            key=lambda r: (r.priority or 0),
        )
        results = []
        for rate in rates:
            if jurisdiction and rate.jurisdiction != jurisdiction:
                continue
            if tax_type_filter and rate.tax_type.value != tax_type_filter:
                continue
            amount = percentage_of(taxable_amount, rate.rate)
            if rate.is_compound:
                for prev in results:
                    amount += percentage_of(prev["tax_amount"], rate.rate)
            results.append({
                "tax_rate_id": rate.id,
                "tax_percentage": rate.rate,
                "tax_amount": amount,
                "jurisdiction": rate.jurisdiction,
                "tax_type": rate.tax_type.value,
            })
        return results

    # ── Transaction Taxes ──────────────────────────────────────────────────

    def record_taxes(self, organization_id: int, created_by: int, taxes: List[Dict[str, Any]]) -> List[Tax]:
        records = []
        for tax_data in taxes:
            tax_data = filter_allowed(tax_data, TAX_ALLOWED_FIELDS)
            record = self.tax_repo.create(organization_id, **tax_data)
            records.append(record)
        return records

    def list_taxes_for_invoice(self, organization_id: int, invoice_id: int) -> List[Tax]:
        return self.tax_repo.list_by_invoice(organization_id, invoice_id)

    def list_taxes_for_credit_note(self, organization_id: int, credit_note_id: int) -> List[Tax]:
        return self.tax_repo.list_by_credit_note(organization_id, credit_note_id)

    def get_total_tax_for_invoice(self, organization_id: int, invoice_id: int) -> float:
        return self.tax_repo.get_total_tax_for_invoice(organization_id, invoice_id)

    def get_tax_summary(self, organization_id: int, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        taxes = self.tax_repo.list_all(organization_id, active_only=True)
        if date_from:
            taxes = [t for t in taxes if str(t.created_at.date() if hasattr(t.created_at, 'date') else t.created_at) >= date_from]
        if date_to:
            taxes = [t for t in taxes if str(t.created_at.date() if hasattr(t.created_at, 'date') else t.created_at) <= date_to]
        total_tax = sum(t.tax_amount for t in taxes)
        by_type = {}
        for t in taxes:
            key = t.tax_type.value if t.tax_type else "unknown"
            by_type[key] = by_type.get(key, 0) + t.tax_amount
        return {
            "total_tax": float(total_tax),
            "total_records": len(taxes),
            "breakdown_by_type": {k: float(v) for k, v in by_type.items()},
        }
