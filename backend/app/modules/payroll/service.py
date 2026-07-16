"""
modules/payroll/service.py
--------------------------
Business logic for the Zoiko Payroll module.

Replaces all client-side mock computation (the old `generatePayslips()` in
PayslipsPage.jsx) with real, server-side, persisted calculations. Contribution
rates and tax slabs are stored per-organization in the database (seeded with
sensible defaults on first access) so they are genuinely configurable data,
not hardcoded constants baked into the frontend.

IMPORTANT — payroll tax accuracy disclaimer:
The PF/ESI/PT/TDS calculations below implement the standard *simplified*
formulas (flat percentages of basic/gross, progressive slab tax on an
annualized gross with no deductions/exemptions modeled). Real statutory
payroll (especially TDS, which depends on regime, Section 80C/80D
declarations, HRA exemption rules, etc., and Professional Tax, which is
state-specific) is genuinely complex. Before going live, either replace
`_calculate_annual_tax` / `_generate_single_payslip` with a certified
payroll engine, or have these formulas reviewed by a payroll/compliance
specialist for your jurisdiction.
"""

import os
import os as _os
import re
from typing import List, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date, timedelta
from calendar import month_name

from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.modules.payroll.models import (
    PayrollEmployee, EmploymentType, EmployeeStatus,
    PayrollRun, PayslipItem, PayrollAttendanceRecord, PayrollLeaveAllocation,
    ContributionRate, TaxSlab, CompanyComplianceDetails, ComplianceDocument, PayrollActivityLog,
    JurisdictionPack, PayrollHoliday,
    PayrollStatus, PayslipStatus, ActivityStatus, ComplianceDocumentStatus,
    PAYROLL_STATUS_ORDER,
)
from app.modules.payroll.schemas import (
    PayrollRunCreate, PayrollRunUpdate, PayslipItemCreate, CompanyDetailsUpdate,
    EmployeeCreate, EmployeeUpdate, BulkEmployeeItem, BulkEmployeeRequest,
    BulkDeleteRequest,
    AttendanceRecordCreate, BulkAttendanceRequest,
    JurisdictionPackUpsert,
)
from app.core.exceptions import NotFoundException
from fastapi import HTTPException, status as http_status


ESI_MONTHLY_WAGE_CEILING = Decimal("21000")  # employees above this gross are ESI-exempt
MONTHS_PER_YEAR = Decimal("12")


# ── Country code normalization ──────────────────────────────────────────
# CompanyComplianceDetails.jurisdiction_country stores full names ("India"),
# but the engine uses 2-letter codes ("IN"). This mapping handles both.

_COUNTRY_NAME_TO_CODE = {
    "india": "IN", "in": "IN",
    "united states": "US", "us": "US", "usa": "US", "united states of america": "US",
    "united kingdom": "UK", "uk": "UK", "great britain": "UK", "gb": "UK",
}


def _normalize_country(country: str) -> str:
    """Normalize a jurisdiction country to a 2-letter code (IN/US/UK).
    Accepts full names, 2-letter codes, or mixed case."""
    if not country:
        return "IN"
    key = country.strip().lower()
    return _COUNTRY_NAME_TO_CODE.get(key, country.strip().upper()[:2])


def _round2(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ── Org-scoping helpers ─────────────────────────────────────────────────

def _apply_org_filter(query, model, organization_id: int = None):
    if organization_id:
        return query.filter(model.organization_id == organization_id)
    return query


def log_activity(db: Session, organization_id: int, description: str,
                  status: ActivityStatus = ActivityStatus.INFO, actor_id: int = None):
    entry = PayrollActivityLog(
        organization_id=organization_id,
        description=description,
        status=status,
        actor_id=actor_id,
    )
    db.add(entry)
    db.commit()
    return entry


# ── Contribution rates / tax slabs (seeded, then DB-backed) ────────────

_CONTRIBUTION_RATES_BY_COUNTRY = {
    "IN": [
        dict(component_key="pf", label="Employee Provident Fund (EPF)",
             employee_share="12% of Basic", employer_share="12% of Basic", total="24% of Basic",
             employee_rate_pct=Decimal("12.00"), employer_rate_pct=Decimal("12.00"), sort_order=1),
        dict(component_key="esi", label="Employee State Insurance (ESI)",
             employee_share="0.75% of Gross", employer_share="3.25% of Gross", total="4% of Gross",
             employee_rate_pct=Decimal("0.75"), employer_rate_pct=Decimal("3.25"), sort_order=2),
        dict(component_key="pt", label="Professional Tax (PT)",
             employee_share="₹200/month (fixed)", employer_share="—", total="₹200",
             flat_amount=Decimal("200.00"), sort_order=3),
        dict(component_key="tds", label="TDS / Income Tax",
             employee_share="As per income slab", employer_share="—", total="As per slab",
             sort_order=4),
    ],
    "US": [
        dict(component_key="social-security", label="Social Security",
             employee_share="6.2%", employer_share="6.2%", total="12.4%",
             employee_rate_pct=Decimal("6.20"), employer_rate_pct=Decimal("6.20"), sort_order=1),
        dict(component_key="medicare", label="Medicare",
             employee_share="1.45%", employer_share="1.45%", total="2.9%",
             employee_rate_pct=Decimal("1.45"), employer_rate_pct=Decimal("1.45"), sort_order=2),
        dict(component_key="futa", label="Federal Unemployment (FUTA)",
             employee_share="—", employer_share="6.0%", total="6.0%",
             employer_rate_pct=Decimal("6.00"), sort_order=3),
        dict(component_key="federal-income-tax", label="Federal Income Tax",
             employee_share="As per W-4", employer_share="—", total="As per W-4",
             sort_order=4),
    ],
    "UK": [
        dict(component_key="national-insurance", label="National Insurance",
             employee_share="8% (primary) / 2% (upper)", employer_share="13.8%", total="21.8% (employee) + 13.8%",
             employee_rate_pct=Decimal("8.00"), employer_rate_pct=Decimal("13.80"), sort_order=1),
        dict(component_key="employer-pension", label="Workplace Pension (Employer)",
             employee_share="—", employer_share="3% minimum", total="3%",
             employer_rate_pct=Decimal("3.00"), sort_order=2),
    ],
}


def _seed_contribution_rates(db: Session, organization_id: int, country: str = "IN") -> List[ContributionRate]:
    defaults = _CONTRIBUTION_RATES_BY_COUNTRY.get(country, _CONTRIBUTION_RATES_BY_COUNTRY["IN"])
    rows = []
    for d in defaults:
        row = ContributionRate(organization_id=organization_id, jurisdiction_country=country, **d)
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_contribution_rates(db: Session, organization_id: int = None, country: str = "IN") -> List[ContributionRate]:
    query = db.query(ContributionRate)
    query = _apply_org_filter(query, ContributionRate, organization_id)
    query = query.filter(ContributionRate.jurisdiction_country == country)
    rows = query.order_by(ContributionRate.sort_order).all()
    if not rows and organization_id:
        rows = _seed_contribution_rates(db, organization_id, country)
    return rows


_TAX_SLABS_BY_COUNTRY = {
    "IN": [
        # FY 2025-26 New Regime — standard deduction of ₹75,000 already
        # factored into the effective taxable income passed to the engine.
        dict(min_amount=Decimal("0"),        max_amount=Decimal("400000"),   rate_pct=Decimal("0"),   rate_label="Nil",  tax_formula="Basic exemption (up to ₹4L)", sort_order=1),
        dict(min_amount=Decimal("400000"),   max_amount=Decimal("800000"),   rate_pct=Decimal("5"),   rate_label="5%",   tax_formula="5% of income over ₹4L", sort_order=2),
        dict(min_amount=Decimal("800000"),   max_amount=Decimal("1200000"),  rate_pct=Decimal("10"),  rate_label="10%",  tax_formula="₹20,000 + 10% over ₹8L", sort_order=3),
        dict(min_amount=Decimal("1200000"),  max_amount=Decimal("1600000"),  rate_pct=Decimal("15"),  rate_label="15%",  tax_formula="₹60,000 + 15% over ₹12L", sort_order=4),
        dict(min_amount=Decimal("1600000"),  max_amount=Decimal("2000000"),  rate_pct=Decimal("20"),  rate_label="20%",  tax_formula="₹1,20,000 + 20% over ₹16L", sort_order=5),
        dict(min_amount=Decimal("2000000"),  max_amount=Decimal("2400000"),  rate_pct=Decimal("25"),  rate_label="25%",  tax_formula="₹2,00,000 + 25% over ₹20L", sort_order=6),
        dict(min_amount=Decimal("2400000"),  max_amount=None,                rate_pct=Decimal("30"),  rate_label="30%",  tax_formula="₹3,00,000 + 30% over ₹24L", sort_order=7),
    ],
    "US": [
        # Tax Year 2025 — Single filer. Standard deduction $15,000 is
        # applied by _calculate_annual_tax_us before these brackets.
        dict(min_amount=Decimal("0"),       max_amount=Decimal("11925"),    rate_pct=Decimal("10"),  rate_label="10%",  tax_formula="10% of income", sort_order=1),
        dict(min_amount=Decimal("11925"),   max_amount=Decimal("48475"),    rate_pct=Decimal("12"),  rate_label="12%",  tax_formula="$1,192.50 + 12% over $11,925", sort_order=2),
        dict(min_amount=Decimal("48475"),   max_amount=Decimal("103350"),   rate_pct=Decimal("22"),  rate_label="22%",  tax_formula="$5,570.50 + 22% over $48,475", sort_order=3),
        dict(min_amount=Decimal("103350"),  max_amount=Decimal("197300"),   rate_pct=Decimal("24"),  rate_label="24%",  tax_formula="$17,645 + 24% over $103,350", sort_order=4),
        dict(min_amount=Decimal("197300"),  max_amount=Decimal("250525"),   rate_pct=Decimal("32"),  rate_label="32%",  tax_formula="$40,199 + 32% over $197,300", sort_order=5),
        dict(min_amount=Decimal("250525"),  max_amount=Decimal("626350"),   rate_pct=Decimal("35"),  rate_label="35%",  tax_formula="$57,131 + 35% over $250,525", sort_order=6),
        dict(min_amount=Decimal("626350"),  max_amount=None,                rate_pct=Decimal("37"),  rate_label="37%",  tax_formula="$188,364.75 + 37% over $626,350", sort_order=7),
    ],
    "UK": [
        # Tax Year 2025-26. Personal allowance £12,570 (tapered above
        # £100k — handled in _calculate_annual_tax_uk).
        dict(min_amount=Decimal("0"),       max_amount=Decimal("12570"),    rate_pct=Decimal("0"),   rate_label="0%",   tax_formula="Personal allowance", sort_order=1),
        dict(min_amount=Decimal("12570"),   max_amount=Decimal("50270"),    rate_pct=Decimal("20"),  rate_label="20%",  tax_formula="20% of income above £12,570", sort_order=2),
        dict(min_amount=Decimal("50270"),   max_amount=Decimal("125140"),   rate_pct=Decimal("40"),  rate_label="40%",  tax_formula="£7,540 + 40% above £50,270", sort_order=3),
        dict(min_amount=Decimal("125140"),  max_amount=None,                rate_pct=Decimal("45"),  rate_label="45%",  tax_formula="£37,488 + 45% above £125,140", sort_order=4),
    ],
}


def _seed_tax_slabs(db: Session, organization_id: int, country: str = "IN") -> List[TaxSlab]:
    defaults = _TAX_SLABS_BY_COUNTRY.get(country, _TAX_SLABS_BY_COUNTRY["IN"])
    rows = []
    for d in defaults:
        row = TaxSlab(organization_id=organization_id, jurisdiction_country=country, **d)
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_tax_slabs(db: Session, organization_id: int = None, country: str = "IN") -> List[TaxSlab]:
    query = db.query(TaxSlab)
    query = _apply_org_filter(query, TaxSlab, organization_id)
    query = query.filter(TaxSlab.jurisdiction_country == country)
    rows = query.order_by(TaxSlab.sort_order).all()
    if not rows and organization_id:
        rows = _seed_tax_slabs(db, organization_id, country)
    return rows


# Known contribution components get a stable key so re-applying the same
# component (e.g. re-uploading a corrected PF notice) updates the existing
# row instead of creating a duplicate. Anything else falls back to a
# slugified label — good enough to avoid exact-duplicate rows, but two
# differently-worded labels for the same real-world component will still
# create two rows; that requires the label matching used at extraction
# time to be more consistent, which is a document-parsing concern, not
# something this function can fix.
_KNOWN_COMPONENT_KEYS = {
    "provident fund": "pf", "epf": "pf",
    "esi": "esi", "employee state insurance": "esi",
    "professional tax": "pt", "pt": "pt",
    "tds": "tds", "income tax": "tds",
    "gratuity": "gratuity",
    # US-specific
    "social security": "social_security", "ss": "social_security",
    "medicare": "medicare",
    # UK-specific
    "national insurance": "ni_employee", "ni": "ni_employee",
    "pension": "employer_pension", "workplace pension": "employer_pension",
}


def _component_key_for_label(label: str) -> str:
    normalized = (label or "").strip().lower()
    for phrase, key in _KNOWN_COMPONENT_KEYS.items():
        if phrase in normalized:
            return key
    slug = "".join(c if c.isalnum() else "-" for c in normalized).strip("-")
    return slug[:20] or "custom"


def _parse_rate_value(text: str) -> dict:
    """Parses an extracted rate's display text ("12%", "0.75%",
    "₹200/month (fixed)", "—") into the numeric field the calculation
    engine actually reads. Percentage text becomes `rate_pct`; a bare
    currency/number becomes `flat_amount` (e.g. Professional Tax, which
    is a fixed amount, not a percentage). Unparseable text (e.g. "—",
    "As per slab") returns {} — deliberately NOT zero, since a missing
    rate should be treated as "not yet configured", not "configured at
    0%", by the caller."""
    if not text:
        return {}
    cleaned = text.strip()
    if "%" in cleaned:
        match = re.search(r"[\d.]+", cleaned)
        if match:
            return {"rate_pct": Decimal(match.group())}
        return {}
    # No percentage sign — look for a plain number (possibly with a
    # currency symbol/commas) and treat it as a flat amount.
    match = re.search(r"[\d,]+(?:\.\d+)?", cleaned)
    if match:
        return {"flat_amount": Decimal(match.group().replace(",", ""))}
    return {}


def apply_extracted_rate(db: Session, organization_id: int, kind: str, row: dict, country_code: str = "IN") -> dict:
    """Promote a single row from ComplianceDocumentUpload's extracted
    preview into the org's active ContributionRate/TaxSlab configuration —
    the tables get_contribution_rates()/get_tax_slabs() actually read from
    for real payslip calculation. `row` is the same dict shape the
    frontend already renders (see ApplyExtractedRateRequest).

    IMPORTANT: get_contribution_rates()/get_tax_slabs() filter on
    `jurisdiction_country`, and the calculation engine reads the numeric
    `employee_rate_pct`/`employer_rate_pct`/`flat_amount` fields — NOT the
    display-text `employee_share`/`employer_share` fields. A row saved
    without both of these is invisible to real payroll runs even though
    it appears "applied" in the UI — this was a real bug (rates vanishing
    from payroll runs after being applied) fixed here."""
    if kind == "contributionRate":
        label = row.get("label", "")
        component_key = _component_key_for_label(label)
        existing = (
            db.query(ContributionRate)
            .filter(ContributionRate.organization_id == organization_id,
                    ContributionRate.component_key == component_key,
                    ContributionRate.jurisdiction_country == country_code)
            .first()
        )

        employee_parsed = _parse_rate_value(row.get("employee", ""))
        employer_parsed = _parse_rate_value(row.get("employer", ""))

        fields = dict(
            label=label,
            employee_share=row.get("employee", ""),
            employer_share=row.get("employer", ""),
            total=row.get("total", ""),
            jurisdiction_country=country_code,
        )
        # Percentage-based components (PF, ESI, etc.) — employee/employer
        # sides are independent, so set whichever parsed.
        if "rate_pct" in employee_parsed:
            fields["employee_rate_pct"] = employee_parsed["rate_pct"]
        if "rate_pct" in employer_parsed:
            fields["employer_rate_pct"] = employer_parsed["rate_pct"]
        # Flat-amount components (Professional Tax) — only one side is
        # normally populated; prefer whichever side actually parsed.
        flat = employee_parsed.get("flat_amount") or employer_parsed.get("flat_amount")
        if flat is not None:
            fields["flat_amount"] = flat

        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
        else:
            db.add(ContributionRate(organization_id=organization_id, component_key=component_key, **fields))
        db.commit()
        return {"applied": True, "componentKey": component_key,
                "message": f"Applied to active contribution rates ({component_key})."}

    if kind == "taxSlab":
        try:
            min_amount = Decimal(str(row.get("min", "0")))
        except Exception:
            min_amount = Decimal("0")
        max_raw = row.get("max")
        max_amount = None
        if max_raw not in (None, "", "—"):
            try:
                max_amount = Decimal(str(max_raw))
            except Exception:
                max_amount = None

        existing = (
            db.query(TaxSlab)
            .filter(TaxSlab.organization_id == organization_id,
                    TaxSlab.jurisdiction_country == country_code,
                    TaxSlab.min_amount == min_amount,
                    TaxSlab.max_amount == max_amount)
            .first()
        )
        rate_label = row.get("rate", "")
        # rate_pct actually drives _calculate_annual_tax — rate_label is
        # display-only. Parse it best-effort from "5%" style labels rather
        # than defaulting to 0, which would silently zero out tax on this
        # band. "Nil"/unparseable labels correctly fall back to 0%.
        try:
            rate_pct = Decimal(rate_label.strip().rstrip("%")) if "%" in rate_label else Decimal("0")
        except Exception:
            rate_pct = Decimal("0")
        fields = dict(rate_label=rate_label, tax_formula=row.get("tax", ""), rate_pct=rate_pct,
                      jurisdiction_country=country_code)
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
        else:
            next_sort = db.query(TaxSlab).filter(TaxSlab.organization_id == organization_id).count() + 1
            db.add(TaxSlab(organization_id=organization_id, min_amount=min_amount, max_amount=max_amount,
                            sort_order=next_sort, **fields))
        db.commit()
        return {"applied": True, "componentKey": None, "message": "Applied to active tax slabs."}

    return {"applied": False, "componentKey": None, "message": f"Unknown kind: {kind!r}"}


def list_jurisdiction_packs(db: Session, country: str, state: str = None) -> List[JurisdictionPack]:
    """Packs for a given jurisdiction. state=None returns country-level
    packs only — it does NOT also return every state-level pack under that
    country, since those are meant to layer on top of (not replace) the
    country pack. Callers needing the full stack should request both."""
    query = db.query(JurisdictionPack).filter(JurisdictionPack.jurisdiction_country == country)
    if state:
        query = query.filter(JurisdictionPack.jurisdiction_state == state)
    else:
        query = query.filter(JurisdictionPack.jurisdiction_state.is_(None))
    return query.order_by(JurisdictionPack.version.desc()).all()


def upsert_jurisdiction_pack(db: Session, data: "JurisdictionPackUpsert") -> JurisdictionPack:
    """Create or update a pack, matched by (pack_id, version) — matches
    the UniqueConstraint on JurisdictionPack. This intentionally does NOT
    silently bump the version on every save: per the spec's lifecycle
    model (Section 17), a new version should be a deliberate act, not an
    accidental side effect of editing metadata."""
    existing = (
        db.query(JurisdictionPack)
        .filter(JurisdictionPack.pack_id == data.packId, JurisdictionPack.version == data.version)
        .first()
    )
    fields = dict(
        jurisdiction_country=data.jurisdictionCountry,
        jurisdiction_state=data.jurisdictionState,
        status=data.status,
        effective_from=data.effectiveFrom,
        effective_to=data.effectiveTo,
        compliance_owner=data.complianceOwner,
        engineering_owner=data.engineeringOwner,
        source_references=data.sourceReferences,
    )
    if existing:
        for k, v in fields.items():
            setattr(existing, k, v)
        row = existing
    else:
        row = JurisdictionPack(pack_id=data.packId, version=data.version, **fields)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _calculate_annual_tax(annual_income: Decimal, slabs: List[TaxSlab]) -> Decimal:
    """Progressive slab-based tax on the full annual income. See module
    docstring for the accuracy disclaimer."""
    tax = Decimal("0")
    for slab in sorted(slabs, key=lambda s: s.min_amount):
        lower = slab.min_amount
        upper = slab.max_amount if slab.max_amount is not None else annual_income
        if annual_income <= lower:
            continue
        taxable_in_band = min(annual_income, upper) - lower
        if taxable_in_band > 0:
            tax += taxable_in_band * (slab.rate_pct / Decimal("100"))
    return tax


# ── FY 2025-26 constants (India, New Regime) ────────────────────────────

_IN_STANDARD_DEDUCTION = Decimal("75000")   # ₹75,000 standard deduction
_IN_REBATE_87A_LIMIT = Decimal("1200000")   # Nil tax up to ₹12L taxable income
_IN_REBATE_87A_MAX = Decimal("60000")       # Max rebate = tax on ₹12L = ₹60,000
_IN_SURCHARGE_THRESHOLD = Decimal("50000000")  # 50L — not applied here

# ── Tax Year 2025 constants (US, Single filer) ──────────────────────────

_US_STANDARD_DEDUCTION = Decimal("15000")   # $15,000 standard deduction (single)
_US_SOCIAL_SECURITY_WAGE_BASE = Decimal("176100")  # SS tax only on first $176,100
_US_SOCIAL_SECURITY_RATE = Decimal("6.2")
_US_MEDICARE_RATE = Decimal("1.45")
_US_MEDICARE_ADDITIONAL_RATE = Decimal("0.9")  # Additional Medicare on > $200k

# ── Tax Year 2025-26 constants (UK) ─────────────────────────────────────

_UK_PERSONAL_ALLOWANCE = Decimal("12570")
_UK_PA_TAPER_THRESHOLD = Decimal("100000")  # PA reduces by £1 per £2 over £100k
_UK_NI_PRIMARY_THRESHOLD = Decimal("12570")  # Annual primary threshold
_UK_NI_UPPER_THRESHOLD = Decimal("50270")    # Annual upper earnings limit
_UK_NI_PRIMARY_RATE = Decimal("8")           # 8% (was 12% → cut in 2024)
_UK_NI_UPPER_RATE = Decimal("2")            # 2% (was 2% → unchanged)
_UK_PENSION_MIN_ENPLOYER = Decimal("3")     # Minimum employer contribution


def _apply_section_87a_rebate(annual_tax: Decimal, taxable_income: Decimal) -> Decimal:
    """Section 87A rebate for India New Regime FY 2025-26.
    If taxable income <= ₹12,00,000, rebate = min(annual_tax, ₹60,000),
    and that rebate is SUBTRACTED from tax owed — not returned as-is.
    Since the slabs are calibrated so tax-at-exactly-₹12L equals ₹60,000,
    annual_tax is always <= ₹60,000 whenever taxable_income <= ₹12L, which
    means the rebate always fully cancels the tax (net: ₹0). The previous
    version of this function returned `min(annual_tax, 60000)` directly —
    since that's always just `annual_tax` unchanged in this branch, the
    rebate had silently never reduced anyone's tax at all.
    Marginal relief: if crossing ₹12L causes tax to exceed ₹60,000,
    tax is capped to ₹60,000 + (taxable_income - 12L)."""
    if taxable_income <= _IN_REBATE_87A_LIMIT:
        rebate = min(annual_tax, _IN_REBATE_87A_MAX)
        return annual_tax - rebate
    # Marginal relief: tax on ₹12L is ₹60,000. If actual tax > ₹60,000
    # and the excess is less than the income above ₹12L, cap to ₹60,000.
    tax_on_threshold = _IN_REBATE_87A_MAX  # ₹60,000
    if annual_tax > tax_on_threshold:
        excess_income = taxable_income - _IN_REBATE_87A_LIMIT
        excess_tax = annual_tax - tax_on_threshold
        if excess_tax <= excess_income:
            return tax_on_threshold + excess_tax
        return annual_tax
    return annual_tax


def _calculate_annual_tax_in(annual_gross: Decimal, slabs: List[TaxSlab]) -> Decimal:
    """India-specific annual tax: standard deduction → progressive slabs → Section 87A rebate."""
    taxable = max(Decimal("0"), annual_gross - _IN_STANDARD_DEDUCTION)
    tax = _calculate_annual_tax(taxable, slabs)
    tax = _apply_section_87a_rebate(tax, taxable)
    return max(Decimal("0"), tax)


def _calculate_annual_tax_us(annual_gross: Decimal, slabs: List[TaxSlab]) -> Decimal:
    """US-specific annual tax: standard deduction → progressive federal slabs."""
    taxable = max(Decimal("0"), annual_gross - _US_STANDARD_DEDUCTION)
    return _calculate_annual_tax(taxable, slabs)


def _calculate_annual_tax_uk(annual_gross: Decimal, slabs: List[TaxSlab]) -> Decimal:
    """UK-specific annual tax: personal allowance taper → progressive slabs.
    PA is reduced by £1 for every £2 of income above £100,000."""
    pa = _UK_PERSONAL_ALLOWANCE
    if annual_gross > _UK_PA_TAPER_THRESHOLD:
        taper = (annual_gross - _UK_PA_TAPER_THRESHOLD) / Decimal("2")
        pa = max(Decimal("0"), pa - taper)
    taxable = max(Decimal("0"), annual_gross - pa)
    return _calculate_annual_tax(taxable, slabs)


def _calculate_employee_monthly_payroll(
    gross: Decimal,
    basic: Decimal,
    rate_map: dict,
    slabs: List[TaxSlab],
    country: str = "IN",
) -> dict:
    """Shared payroll calculation engine — used by both payslip generation
    and the preview endpoint. Returns a dict with all breakdown fields."""
    from app.modules.payroll.models import EmployeeStatus

    employee_pf = Decimal("0")
    employer_pf = Decimal("0")
    employee_esi = Decimal("0")
    employer_esi = Decimal("0")
    professional_tax = Decimal("0")
    social_security = Decimal("0")
    medicare = Decimal("0")
    employer_social_security = Decimal("0")
    employer_medicare = Decimal("0")
    ni_employee = Decimal("0")
    employer_pension = Decimal("0")

    if country == "IN":
        # ── India: PF, ESI, Professional Tax ──
        pf_rate = rate_map.get("pf")
        employee_pf = _round2(basic * (pf_rate.employee_rate_pct / 100)) if pf_rate and pf_rate.employee_rate_pct else Decimal("0")
        employer_pf = _round2(basic * (pf_rate.employer_rate_pct / 100)) if pf_rate and pf_rate.employer_rate_pct else Decimal("0")

        esi_rate = rate_map.get("esi")
        esi_applicable = gross <= ESI_MONTHLY_WAGE_CEILING
        employee_esi = _round2(gross * (esi_rate.employee_rate_pct / 100)) if esi_rate and esi_rate.employee_rate_pct and esi_applicable else Decimal("0")
        employer_esi = _round2(gross * (esi_rate.employer_rate_pct / 100)) if esi_rate and esi_rate.employer_rate_pct and esi_applicable else Decimal("0")

        pt_rate = rate_map.get("pt")
        professional_tax = pt_rate.flat_amount if pt_rate and pt_rate.flat_amount else Decimal("0")

        annual_gross = gross * MONTHS_PER_YEAR
        annual_tax = _calculate_annual_tax_in(annual_gross, slabs)
        tds = _round2(annual_tax / MONTHS_PER_YEAR)
        total_deductions = employee_pf + employee_esi + professional_tax

    elif country == "US":
        # ── US: Social Security + Medicare (employee + employer) + Federal income tax ──
        annual_gross = gross * MONTHS_PER_YEAR

        # Employee Social Security: 6.2% on first $176,100/year
        annual_ss_wage = min(annual_gross, _US_SOCIAL_SECURITY_WAGE_BASE)
        social_security = _round2((annual_ss_wage * _US_SOCIAL_SECURITY_RATE / Decimal("100")) / MONTHS_PER_YEAR)
        employer_social_security = social_security  # Employer matches

        # Employee Medicare: 1.45% on all wages (no cap)
        medicare = _round2((annual_gross * _US_MEDICARE_RATE / Decimal("100")) / MONTHS_PER_YEAR)
        # Additional Medicare: 0.9% on wages above $200k (employee only, annualized)
        if annual_gross > Decimal("200000"):
            medicare += _round2(((annual_gross - Decimal("200000")) * _US_MEDICARE_ADDITIONAL_RATE / Decimal("100")) / MONTHS_PER_YEAR)
        employer_medicare = _round2((annual_gross * _US_MEDICARE_RATE / Decimal("100")) / MONTHS_PER_YEAR)

        annual_tax = _calculate_annual_tax_us(annual_gross, slabs)
        tds = _round2(annual_tax / MONTHS_PER_YEAR)
        total_deductions = social_security + medicare

    elif country == "UK":
        # ── UK: National Insurance (employee) + employer pension ──
        annual_gross = gross * MONTHS_PER_YEAR

        # Employee NI: 8% between primary threshold and upper threshold, 2% above
        annual_pt = _UK_NI_PRIMARY_THRESHOLD
        annual_ut = _UK_NI_UPPER_THRESHOLD
        ni_basicable = max(Decimal("0"), min(annual_gross, annual_ut) - annual_pt)
        ni_upperable = max(Decimal("0"), annual_gross - annual_ut)
        ni_employee_annual = (ni_basicable * _UK_NI_PRIMARY_RATE / Decimal("100")) + (ni_upperable * _UK_NI_UPPER_RATE / Decimal("100"))
        ni_employee = _round2(ni_employee_annual / MONTHS_PER_YEAR)

        # Employer pension: minimum 3% of gross
        employer_pension = _round2(annual_gross * _UK_PENSION_MIN_ENPLOYER / Decimal("100") / MONTHS_PER_YEAR)

        annual_tax = _calculate_annual_tax_uk(annual_gross, slabs)
        tds = _round2(annual_tax / MONTHS_PER_YEAR)
        total_deductions = ni_employee

    else:
        # Fallback: generic progressive tax only
        annual_gross = gross * MONTHS_PER_YEAR
        annual_tax = _calculate_annual_tax(annual_gross, slabs)
        tds = _round2(annual_tax / MONTHS_PER_YEAR)
        total_deductions = Decimal("0")

    net_pay = gross - total_deductions - tds

    return {
        "basic": basic,
        "gross": gross,
        "employee_pf": employee_pf,
        "employer_pf": employer_pf,
        "employee_esi": employee_esi,
        "employer_esi": employer_esi,
        "professional_tax": professional_tax,
        "social_security": social_security,
        "medicare": medicare,
        "employer_social_security": employer_social_security,
        "employer_medicare": employer_medicare,
        "ni_employee": ni_employee,
        "employer_pension": employer_pension,
        "tds": tds,
        "annual_tax": annual_tax,
        "total_deductions": total_deductions,
        "net_pay": net_pay,
    }


def preview_payroll_run(db: Session, organization_id: int, employee_ids: List[int], country: str = "IN",
                         period_start=None, period_end=None) -> dict:
    """Dry-run payroll calculation: returns per-employee breakdowns without
    writing anything to the database. Uses the exact same engine as payslip
    generation, so preview == persisted by construction.

    period_start/period_end are optional because a preview can happen
    before a run (and its period) exists. When provided, two things kick
    in that will also happen at real generation time:
      1. attendance-recorded rewards/bonus/other_compensation for that
         window are added to gross (_sum_attendance_extras)
      2. basic/hra/special are prorated down for any absent/unpaid-leave
         day within the period (_count_payable_days) — Loss of Pay
    When omitted, additional_compensation is 0 and no proration is applied
    (payableDays == totalWorkingDays == 1 as a no-op), since there's no
    period yet to check attendance against."""
    country = _normalize_country(country)
    rate_map = {r.component_key: r for r in get_contribution_rates(db, organization_id, country)}
    slabs = get_tax_slabs(db, organization_id, country)

    employees = db.query(PayrollEmployee).filter(
        PayrollEmployee.id.in_(employee_ids),
        PayrollEmployee.organization_id == organization_id,
        PayrollEmployee.status == EmployeeStatus.ACTIVE,
    ).all()

    results = []
    totals = {
        "count": 0,
        "totalGross": Decimal("0"),
        "totalTax": Decimal("0"),
        "totalContributions": Decimal("0"),
        "totalNet": Decimal("0"),
    }

    for emp in employees:
        ctc = Decimal(str(getattr(emp, "ctc", 0) or 0))
        monthly_gross_base = _round2(ctc / MONTHS_PER_YEAR) if ctc else Decimal("0")

        payable_days, total_days = (
            _count_payable_days(db, organization_id, emp.id, period_start, period_end)
            if period_start and period_end else (Decimal("1"), Decimal("1"))
        )
        proration_factor = (payable_days / total_days) if total_days else Decimal("1")

        stored_basic = getattr(emp, "basic", None)
        stored_hra = getattr(emp, "hra", None)
        if stored_basic is not None and stored_hra is not None:
            monthly_basic = _round2(Decimal(str(stored_basic)) / MONTHS_PER_YEAR)
            monthly_hra   = _round2(Decimal(str(stored_hra)) / MONTHS_PER_YEAR)
            basic   = _round2(monthly_basic * proration_factor)
            hra     = _round2(monthly_hra * proration_factor)
            special = _round2((monthly_gross_base - monthly_basic - monthly_hra) * proration_factor)
        else:
            basic     = _round2(monthly_gross_base * Decimal("0.40") * proration_factor)
            hra       = _round2(monthly_gross_base * Decimal("0.20") * proration_factor)
            special   = _round2(monthly_gross_base * Decimal("0.40") * proration_factor)

        is_active = emp.status == EmployeeStatus.ACTIVE
        overtime = Decimal("0")
        additional_compensation = (
            _sum_attendance_extras(db, organization_id, emp.id, period_start, period_end)
            if is_active and period_start and period_end else Decimal("0")
        )
        gross = basic + hra + special + overtime + additional_compensation

        calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, country)

        employee_name = f"{getattr(emp, 'first_name', '')} {getattr(emp, 'last_name', '')}".strip() \
            or getattr(emp, "name", f"Employee #{emp.id}")

        results.append({
            "employeeId": emp.id,
            "employeeName": employee_name,
            "department": getattr(emp, "department", None),
            "attendanceStatus": "active" if is_active else "inactive",
            "payableDays": float(payable_days),
            "totalWorkingDays": float(total_days),
            "prorated": payable_days != total_days,
            "monthlyGross": float(calc["gross"]),
            "monthlyTax": float(calc["tds"]),
            "monthlyPf": float(calc["employee_pf"]),
            "monthlyEsi": float(calc["employee_esi"]),
            "monthlyPt": float(calc["professional_tax"]),
            "monthlySocialSecurity": float(calc.get("social_security", 0)),
            "monthlyMedicare": float(calc.get("medicare", 0)),
            "monthlyNi": float(calc.get("ni_employee", 0)),
            "monthlyContributions": float(calc["total_deductions"]),
            "monthlyNet": float(calc["net_pay"]),
            "employerPf": float(calc["employer_pf"]),
            "employerEsi": float(calc["employer_esi"]),
            "employerSs": float(calc.get("employer_social_security", 0)),
            "employerMedicare": float(calc.get("employer_medicare", 0)),
            "employerPension": float(calc.get("employer_pension", 0)),
            "taxSlabRate": _get_slab_label(calc["gross"] * MONTHS_PER_YEAR, slabs, country, annual_tax=calc["annual_tax"]),
        })

        totals["count"] += 1
        totals["totalGross"] += calc["gross"]
        totals["totalTax"] += calc["tds"]
        totals["totalContributions"] += calc["total_deductions"]
        totals["totalNet"] += calc["net_pay"]

    return {
        "employees": results,
        "totals": {
            "count": totals["count"],
            "totalGross": float(totals["totalGross"]),
            "totalTax": float(totals["totalTax"]),
            "totalContributions": float(totals["totalContributions"]),
            "totalNet": float(totals["totalNet"]),
        },
    }


def _get_slab_label(annual_income: Decimal, slabs: List[TaxSlab], country: str = "IN",
                     annual_tax: Decimal = None) -> str:
    """Return the rate label of the applicable tax slab for display.
    When annual_tax is provided and equals 0 (e.g. after Section 87A
    rebate), returns a rebate-aware label instead of the raw bracket."""
    if country == "IN":
        taxable = max(Decimal("0"), annual_income - _IN_STANDARD_DEDUCTION)
    elif country == "US":
        taxable = max(Decimal("0"), annual_income - _US_STANDARD_DEDUCTION)
    elif country == "UK":
        pa = _UK_PERSONAL_ALLOWANCE
        if annual_income > _UK_PA_TAPER_THRESHOLD:
            taper = (annual_income - _UK_PA_TAPER_THRESHOLD) / Decimal("2")
            pa = max(Decimal("0"), pa - taper)
        taxable = max(Decimal("0"), annual_income - pa)
    else:
        taxable = annual_income

    if annual_tax is not None and annual_tax == Decimal("0"):
        if country == "IN" and taxable <= _IN_REBATE_87A_LIMIT:
            return "Nil (87A rebate)"

    for slab in sorted(slabs, key=lambda s: s.min_amount):
        upper = slab.max_amount if slab.max_amount is not None else taxable
        if taxable <= upper:
            return slab.rate_label or "—"
    return slabs[-1].rate_label if slabs else "—"


# ── Company Holidays (shared calendar for LOP proration + Attendance/Leave pages) ──

def list_holidays(db: Session, organization_id: int, year: int = None) -> List[PayrollHoliday]:
    query = db.query(PayrollHoliday).filter(PayrollHoliday.organization_id == organization_id)
    if year:
        query = query.filter(
            PayrollHoliday.date >= date(year, 1, 1),
            PayrollHoliday.date <= date(year, 12, 31),
        )
    return query.order_by(PayrollHoliday.date).all()


def bulk_upsert_holidays(db: Session, organization_id: int, holidays: list) -> List[PayrollHoliday]:
    """holidays: list of objects/dicts with .date / .name (or ["date"]/["name"])."""
    result = []
    for h in holidays:
        h_date = h.date if hasattr(h, "date") else h["date"]
        h_name = h.name if hasattr(h, "name") else h.get("name")
        row = db.query(PayrollHoliday).filter(
            PayrollHoliday.organization_id == organization_id,
            PayrollHoliday.date == h_date,
        ).first()
        if row:
            row.name = h_name
        else:
            row = PayrollHoliday(organization_id=organization_id, date=h_date, name=h_name)
            db.add(row)
        result.append(row)
    db.commit()
    for row in result:
        db.refresh(row)
    return result


def delete_holiday(db: Session, organization_id: int, holiday_id: int) -> None:
    row = db.query(PayrollHoliday).filter(
        PayrollHoliday.id == holiday_id, PayrollHoliday.organization_id == organization_id,
    ).first()
    if not row:
        raise NotFoundException(f"Holiday {holiday_id} not found.")
    db.delete(row)
    db.commit()


def _get_holiday_dates(db: Session, organization_id: int, period_start, period_end) -> set:
    rows = db.query(PayrollHoliday.date).filter(
        PayrollHoliday.organization_id == organization_id,
        PayrollHoliday.date >= period_start,
        PayrollHoliday.date <= period_end,
    ).all()
    return {r[0] for r in rows}


# ── Payslip generation (real computation, replaces client-side mock) ──

def _count_payable_days(db: Session, organization_id: int, employee_id: int,
                         period_start, period_end) -> tuple:
    """Returns (payable_days, total_working_days) for this employee within
    the run's period. total_working_days excludes weekends (Sat/Sun) and any
    date in the org's PayrollHoliday calendar. payable_days additionally
    excludes any day with an attendance record whose status is "absent" or
    "leave" (unpaid leave — see the column comment on
    PayslipItem.payable_days for why "leave" means unpaid here). A working
    day with *no* attendance record at all is treated as payable — we don't
    penalize pay for days nobody logged, only explicit absence/unpaid-leave
    reduces it. Returns (1, 1) if the period is missing/invalid, so callers
    get a no-op proration factor of 1 rather than a division by zero.
    """
    if not period_start or not period_end or period_end < period_start:
        return Decimal("1"), Decimal("1")

    records = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id,
        PayrollAttendanceRecord.employee_id == employee_id,
        PayrollAttendanceRecord.date >= period_start,
        PayrollAttendanceRecord.date <= period_end,
    ).all()
    unpaid_dates = {r.date for r in records if r.status in ("absent", "leave")}
    holiday_dates = _get_holiday_dates(db, organization_id, period_start, period_end)

    total_days = 0
    payable_days = 0
    d = period_start
    while d <= period_end:
        if d.weekday() < 5 and d not in holiday_dates:  # Mon-Fri, not a company holiday
            total_days += 1
            if d not in unpaid_dates:
                payable_days += 1
        d += timedelta(days=1)

    if total_days == 0:
        return Decimal("1"), Decimal("1")
    return Decimal(payable_days), Decimal(total_days)


def _sum_attendance_extras(db: Session, organization_id: int, employee_id: int,
                            period_start, period_end) -> Decimal:
    """Sums rewards + bonus + other_compensation recorded on this
    employee's attendance for the run's pay period. This is real,
    user-entered compensation data (from the Attendance screen) that was
    previously captured but never reached gross pay — fixed here so what
    a user enters is actually what gets paid."""
    rows = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id,
        PayrollAttendanceRecord.employee_id == employee_id,
        PayrollAttendanceRecord.date >= period_start,
        PayrollAttendanceRecord.date <= period_end,
    ).all()
    total = Decimal("0")
    for r in rows:
        total += Decimal(str(r.rewards or 0)) + Decimal(str(r.bonus or 0)) + Decimal(str(r.other_compensation or 0))
    return _round2(total)


def _generate_single_payslip(db: Session, run: PayrollRun, employee, rate_map, slabs, country: str = "IN") -> PayslipItem:
    ctc = Decimal(str(getattr(employee, "ctc", 0) or 0))
    monthly_gross_base = _round2(ctc / MONTHS_PER_YEAR) if ctc else Decimal("0")

    payable_days, total_days = _count_payable_days(
        db, run.organization_id, employee.id, run.period_start, run.period_end
    )
    proration_factor = (payable_days / total_days) if total_days else Decimal("1")

    # Use explicit basic/hra if stored on the employee; otherwise fall back
    # to the default 40/20/40 CTC split.  basic/hra are ANNUAL values
    # (matching ctc), so divide by 12 to get monthly amounts.
    stored_basic = getattr(employee, "basic", None)
    stored_hra = getattr(employee, "hra", None)
    if stored_basic is not None and stored_hra is not None:
        monthly_basic = _round2(Decimal(str(stored_basic)) / MONTHS_PER_YEAR)
        monthly_hra   = _round2(Decimal(str(stored_hra)) / MONTHS_PER_YEAR)
        basic   = _round2(monthly_basic * proration_factor)
        hra     = _round2(monthly_hra * proration_factor)
        special = _round2((monthly_gross_base - monthly_basic - monthly_hra) * proration_factor)
    else:
        basic     = _round2(monthly_gross_base * Decimal("0.40") * proration_factor)
        hra       = _round2(monthly_gross_base * Decimal("0.20") * proration_factor)
        special   = _round2(monthly_gross_base * Decimal("0.40") * proration_factor)

    is_active = employee.status == EmployeeStatus.ACTIVE
    overtime  = Decimal("0")
    additional_compensation = (
        _sum_attendance_extras(db, run.organization_id, employee.id, run.period_start, run.period_end)
        if is_active else Decimal("0")
    )
    gross = basic + hra + special + overtime + additional_compensation

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, country)

    employee_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() \
        or getattr(employee, "name", f"Employee #{employee.id}")

    item = PayslipItem(
        payroll_run_id=run.id,
        employee_id=employee.id,
        organization_id=run.organization_id,
        employee_name=employee_name,
        department=getattr(employee, "department", None),
        bank_account=getattr(employee, "bank_account", None),
        pan=getattr(employee, "pan", None),
        basic_salary=calc["basic"],
        hra=hra,
        special_allowance=special,
        overtime=overtime,
        additional_compensation=additional_compensation,
        payable_days=payable_days,
        total_working_days=total_days,
        gross_pay=calc["gross"],
        pf=calc["employee_pf"],
        esi=calc["employee_esi"],
        professional_tax=calc["professional_tax"],
        social_security=calc.get("social_security", 0),
        medicare=calc.get("medicare", 0),
        ni_employee=calc.get("ni_employee", 0),
        tds=calc["tds"],
        total_deductions=calc["total_deductions"],
        employer_pf=calc["employer_pf"],
        employer_esi=calc["employer_esi"],
        employer_social_security=calc.get("employer_social_security", 0),
        employer_medicare=calc.get("employer_medicare", 0),
        employer_pension=calc.get("employer_pension", 0),
        net_pay=calc["net_pay"],
        status=PayslipStatus.PENDING,
    )
    db.add(item)
    return item


def _recompute_run_aggregates(db: Session, run: PayrollRun):
    items = db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run.id).all()
    run.employee_count = len(items)
    run.total_gross = sum((i.gross_pay for i in items), Decimal("0"))
    run.total_deductions = sum((i.total_deductions for i in items), Decimal("0"))
    run.total_taxes = sum((i.tds for i in items), Decimal("0"))
    run.total_employer_contribution = sum((i.employer_pf + i.employer_esi + i.employer_social_security + i.employer_medicare + i.employer_pension for i in items), Decimal("0"))
    run.total_net = sum((i.net_pay for i in items), Decimal("0"))
    db.commit()
    db.refresh(run)
    return run


def generate_payslips_for_run(db: Session, run: PayrollRun, organization_id: int = None, employee_ids: List[int] = None) -> PayrollRun:
    """Generate a payslip for every Active employee in the org (or only the
    specified employee_ids if provided). Idempotent: re-running skips
    employees who already have a payslip in this run."""
    # Determine jurisdiction country from org's compliance details
    company = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first() if organization_id else None
    country = _normalize_country(getattr(company, "jurisdiction_country", None) or "IN")

    rate_map = {r.component_key: r for r in get_contribution_rates(db, organization_id, country)}
    slabs = get_tax_slabs(db, organization_id, country)

    employees_query = db.query(PayrollEmployee).filter(
        PayrollEmployee.status == EmployeeStatus.ACTIVE,
        PayrollEmployee.organization_id == organization_id,
    )
    if employee_ids:
        employees_query = employees_query.filter(PayrollEmployee.id.in_(employee_ids))
    employees = employees_query.all()

    existing_ids = {
        row.employee_id for row in
        db.query(PayslipItem.employee_id).filter(PayslipItem.payroll_run_id == run.id).all()
    }

    for emp in employees:
        if emp.id in existing_ids:
            continue
        _generate_single_payslip(db, run, emp, rate_map, slabs, country)

    db.commit()
    return _recompute_run_aggregates(db, run)


# ── Employees ────────────────────────────────────────────────────────────
# PayrollEmployee is owned entirely by payroll — organization_id is required
# (not optional) since every payroll employee must belong to a tenant.

def get_employees(db: Session, organization_id: int,
                   search: str = None, department: str = None, status: str = None) -> List[PayrollEmployee]:
    query = db.query(PayrollEmployee).filter(PayrollEmployee.organization_id == organization_id)
    if department:
        query = query.filter(PayrollEmployee.department == department)
    if status:
        query = query.filter(PayrollEmployee.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (PayrollEmployee.first_name.ilike(like)) |
            (PayrollEmployee.last_name.ilike(like)) |
            (PayrollEmployee.employee_code.ilike(like))
        )
    return query.order_by(PayrollEmployee.first_name).all()


def get_employee_by_id(db: Session, employee_id: int, organization_id: int) -> PayrollEmployee:
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == employee_id,
        PayrollEmployee.organization_id == organization_id,
    ).first()
    if not employee:
        raise NotFoundException(f"Employee {employee_id} not found.")
    return employee


def create_employee(db: Session, data: EmployeeCreate, organization_id: int) -> PayrollEmployee:
    employee_data = data.model_dump()

    if not employee_data.get("employee_code"):
        employee_data["employee_code"] = f"EMP-{_next_employee_start_num(db, organization_id):04d}"

    existing = db.query(PayrollEmployee).filter(
        PayrollEmployee.organization_id == organization_id,
        PayrollEmployee.employee_code == employee_data["employee_code"],
    ).first()
    if existing:
        raise HTTPException(
            http_status.HTTP_409_CONFLICT,
            detail=f"Employee code '{employee_data['employee_code']}' already exists in this organization.",
        )

    employee = PayrollEmployee(organization_id=organization_id, **employee_data)
    db.add(employee)
    db.commit()
    db.refresh(employee)

    try:
        log_activity(db, organization_id, f"Employee '{employee.first_name} {employee.last_name}' added.",
                     ActivityStatus.INFO)
    except Exception:
        pass

    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate, organization_id: int) -> PayrollEmployee:
    employee = get_employee_by_id(db, employee_id, organization_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value == "":
            continue
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


FIELD_MAP = {
    "firstName": "first_name",
    "lastName": "last_name",
    "email": "email",
    "phone": "phone",
    "department": "department",
    "designation": "designation",
    "employmentType": "employment_type",
    "status": "status",
    "dateOfJoining": "date_of_joining",
    "ctc": "ctc",
    "basic": "basic",
    "hra": "hra",
    "bankAccountNumber": "bank_account",
    "panNumber": "pan",
}


def _next_employee_start_num(db: Session, organization_id: int) -> int:
    return db.query(PayrollEmployee).filter(
        PayrollEmployee.organization_id == organization_id
    ).count() + 1


def _map_employee_row(row: BulkEmployeeItem) -> dict:
    mapped = {}
    for camel_field, snake_field in FIELD_MAP.items():
        value = getattr(row, camel_field, None)
        if value is not None:
            if camel_field == "dateOfJoining":
                try:
                    from datetime import date
                    mapped[snake_field] = date.fromisoformat(str(value))
                except (ValueError, TypeError):
                    mapped[snake_field] = None
            else:
                mapped[snake_field] = value
    return mapped


def bulk_create_employees(db: Session, data: BulkEmployeeRequest, organization_id: int) -> dict:
    created_employees = []
    failed = []
    next_num = _next_employee_start_num(db, organization_id)

    for row in data.employees:
        if not row.firstName or not row.lastName or not row.email:
            failed.append({
                "row": {"email": row.email, "firstName": row.firstName},
                "reason": "First name, last name, and email are required.",
            })
            continue

        mapped = _map_employee_row(row)

        # Ensure unique employee_code within this batch
        while True:
            code = f"EMP-{next_num:04d}"
            next_num += 1
            existing = db.query(PayrollEmployee).filter(
                PayrollEmployee.organization_id == organization_id,
                PayrollEmployee.employee_code == code,
            ).first()
            if not existing:
                break
        mapped["employee_code"] = code
        mapped["organization_id"] = organization_id

        try:
            employee = PayrollEmployee(**mapped)
            db.add(employee)
            db.flush()
            created_employees.append(employee)
        except Exception as exc:
            db.rollback()
            failed.append({
                "row": {"email": row.email, "firstName": row.firstName},
                "reason": str(exc),
            })
            return {"created": len(created_employees), "employees": created_employees, "failed": failed}

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        return {"created": 0, "employees": [], "failed": [{"row": {}, "reason": str(exc)}]}

    for emp in created_employees:
        db.refresh(emp)

    # Use a dedicated session for activity logging so a log failure
    # cannot rollback/expire the employee objects in the main session.
    log_db = None
    try:
        from app.database import SessionLocal as _LogSession
        log_db = _LogSession()
        log_activity(log_db, organization_id,
                     f"Bulk created {len(created_employees)} employees.",
                     ActivityStatus.INFO)
    except Exception:
        if log_db:
            log_db.rollback()
    finally:
        if log_db:
            log_db.close()

    return {"created": len(created_employees), "employees": created_employees, "failed": failed}


def delete_employee(db: Session, employee_id: int, organization_id: int):
    employee = get_employee_by_id(db, employee_id, organization_id)
    has_payslips = db.query(PayslipItem.id).filter(PayslipItem.employee_id == employee_id).first()
    if has_payslips:
        raise HTTPException(
            http_status.HTTP_409_CONFLICT,
            detail="Cannot delete an employee who already has payslip history. Set status to Inactive instead.",
        )
    # Clear FK-dependent records before deleting the employee.
    # flush() ensures these DELETE statements hit the DB before the
    # employee DELETE runs at commit time, avoiding FK violations.
    db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.employee_id == employee_id,
    ).delete(synchronize_session=False)
    db.query(PayrollLeaveAllocation).filter(
        PayrollLeaveAllocation.employee_id == employee_id,
    ).delete(synchronize_session=False)
    db.flush()
    db.delete(employee)
    db.commit()


def bulk_delete_employees(db: Session, data: BulkDeleteRequest, organization_id: int) -> dict:
    deleted = []
    failed = []

    for emp_id in data.employee_ids:
        try:
            employee = get_employee_by_id(db, emp_id, organization_id)
            has_payslips = db.query(PayslipItem.id).filter(PayslipItem.employee_id == emp_id).first()
            if has_payslips:
                failed.append({"id": emp_id, "reason": "Has payslip history — set status to Inactive instead."})
                continue

            # Clear FK-dependent records before deleting the employee.
            # flush() ensures these DELETE statements hit the DB before the
            # per-employee DELETE runs at commit time, avoiding FK violations.
            db.query(PayrollAttendanceRecord).filter(
                PayrollAttendanceRecord.employee_id == emp_id,
            ).delete(synchronize_session=False)
            db.query(PayrollLeaveAllocation).filter(
                PayrollLeaveAllocation.employee_id == emp_id,
            ).delete(synchronize_session=False)
            db.flush()

            db.delete(employee)
            deleted.append(emp_id)
        except NotFoundException:
            failed.append({"id": emp_id, "reason": "Not found."})

    if deleted:
        db.commit()

    if deleted:
        try:
            log_activity(db, organization_id, f"Bulk deleted {len(deleted)} employees.",
                         ActivityStatus.INFO)
        except Exception:
            pass

    return {"deleted": deleted, "failed": failed}


# ── Payroll Runs ────────────────────────────────────────────────────────

def create_payroll_run(db: Session, created_by: int, data: PayrollRunCreate, organization_id: int = None) -> PayrollRun:
    payload = data.model_dump(exclude={"auto_generate_payslips", "schedule", "employeeIds", "totals"})
    run = PayrollRun(created_by=created_by, **payload)
    if organization_id:
        run.organization_id = organization_id
    db.add(run)
    db.commit()
    db.refresh(run)

    if data.auto_generate_payslips:
        run = generate_payslips_for_run(db, run, organization_id, employee_ids=data.employeeIds)

    log_activity(db, organization_id, f"Payroll run '{run.period_label}' created.",
                 ActivityStatus.INFO, actor_id=created_by)
    return run


def get_payroll_runs(db: Session, organization_id: int = None, year: int = None, month: int = None) -> List[PayrollRun]:
    query = db.query(PayrollRun).order_by(PayrollRun.period_start.desc())
    query = _apply_org_filter(query, PayrollRun, organization_id)
    if year and month:
        from datetime import date as _date
        month_start = _date(year, month, 1)
        if month == 12:
            month_end = _date(year + 1, 1, 1)
        else:
            month_end = _date(year, month + 1, 1)
        query = query.filter(PayrollRun.pay_date >= month_start, PayrollRun.pay_date < month_end)
    elif year:
        from datetime import date as _date
        year_start = _date(year, 1, 1)
        year_end = _date(year + 1, 1, 1)
        query = query.filter(PayrollRun.pay_date >= year_start, PayrollRun.pay_date < year_end)
    return query.all()


def get_payroll_run_by_id(db: Session, run_id: int, organization_id: int = None) -> PayrollRun:
    query = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    query = _apply_org_filter(query, PayrollRun, organization_id)
    run = query.first()
    if not run:
        raise NotFoundException(f"Payroll run {run_id} not found.")
    return run


def update_payroll_run(db: Session, run_id: int, data: PayrollRunUpdate, organization_id: int = None) -> PayrollRun:
    run = get_payroll_run_by_id(db, run_id, organization_id)
    if run.status in (PayrollStatus.PAID, PayrollStatus.CLOSED):
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail=f"Cannot edit a run that is already {run.status.value}.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(run, field, value)
    db.commit()
    db.refresh(run)
    return run


def advance_payroll_run_status(db: Session, run_id: int, approver_id: int, organization_id: int = None) -> PayrollRun:
    """Moves a run one step forward in its lifecycle
    (Draft → Review → Approved → Authorized → Paid → Closed).
    Backs the single "Approve" button in the UI."""
    run = get_payroll_run_by_id(db, run_id, organization_id)
    current_idx = PAYROLL_STATUS_ORDER.index(run.status)
    if current_idx >= len(PAYROLL_STATUS_ORDER) - 1:
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail="This run has already reached its final status.")

    next_status = PAYROLL_STATUS_ORDER[current_idx + 1]
    run.status = next_status
    if next_status == PayrollStatus.APPROVED:
        run.approved_by = approver_id
        run.approved_at = datetime.utcnow()
    if next_status == PayrollStatus.PAID:
        db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run.id).update(
            {PayslipItem.status: PayslipStatus.PAID, PayslipItem.paid_at: datetime.utcnow()}
        )
    db.commit()
    db.refresh(run)

    log_activity(db, organization_id, f"Payroll run '{run.period_label}' advanced to {next_status.value}.",
                 ActivityStatus.SUCCESS, actor_id=approver_id)
    return run


def delete_payroll_run(db: Session, run_id: int, organization_id: int = None):
    run = get_payroll_run_by_id(db, run_id, organization_id)
    if run.status != PayrollStatus.DRAFT:
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail="Only Draft runs can be deleted.")
    db.delete(run)
    db.commit()


# ── Payslip Items ──────────────────────────────────────────────────────

def add_payslip_item(db: Session, run_id: int, data: PayslipItemCreate, organization_id: int = None) -> PayslipItem:
    run = get_payroll_run_by_id(db, run_id, organization_id)
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == data.employee_id,
        PayrollEmployee.organization_id == organization_id,
    ).first()
    if not employee:
        raise NotFoundException(f"Employee {data.employee_id} not found.")

    # Determine jurisdiction country from org's compliance details
    company = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first() if organization_id else None
    country = _normalize_country(getattr(company, "jurisdiction_country", None) or "IN")

    rate_map = {r.component_key: r for r in get_contribution_rates(db, organization_id, country)}
    slabs = get_tax_slabs(db, organization_id, country)

    gross = data.basic_salary + (data.hra or 0) + (data.special_allowance or 0) + (data.overtime or 0)

    calc = _calculate_employee_monthly_payroll(gross, data.basic_salary, rate_map, slabs, country)

    employee_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip()

    item = PayslipItem(
        payroll_run_id=run_id,
        employee_id=data.employee_id,
        organization_id=organization_id,
        employee_name=employee_name,
        department=getattr(employee, "department", None),
        bank_account=getattr(employee, "bank_account", None),
        pan=getattr(employee, "pan", None),
        basic_salary=calc["basic"],
        hra=data.hra or Decimal("0"),
        special_allowance=data.special_allowance or Decimal("0"),
        overtime=data.overtime or Decimal("0"),
        gross_pay=calc["gross"],
        pf=calc["employee_pf"],
        esi=calc["employee_esi"],
        professional_tax=calc["professional_tax"],
        social_security=calc.get("social_security", 0),
        medicare=calc.get("medicare", 0),
        ni_employee=calc.get("ni_employee", 0),
        tds=calc["tds"],
        total_deductions=calc["total_deductions"],
        employer_pf=calc["employer_pf"],
        employer_esi=calc["employer_esi"],
        employer_social_security=calc.get("employer_social_security", 0),
        employer_medicare=calc.get("employer_medicare", 0),
        employer_pension=calc.get("employer_pension", 0),
        net_pay=calc["net_pay"],
        status=PayslipStatus.PENDING,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _recompute_run_aggregates(db, run)
    return item


def get_payslips_for_run(db: Session, run_id: int, organization_id: int = None) -> List[PayslipItem]:
    get_payroll_run_by_id(db, run_id, organization_id)  # 404s if missing/not in org
    query = db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run_id)
    return _apply_org_filter(query, PayslipItem, organization_id).all()


def _serialize_payslip(item: PayslipItem, run: PayrollRun) -> dict:
    # additional_compensation (and, defensively, the other money columns) can
    # be NULL on rows created before that column existed — the model's
    # `default=0` only applies to new INSERTs, not to pre-existing rows. An
    # unguarded None here fails PayslipItemResponse's Decimal validation and
    # was taking down the *entire* payslip list/detail response with a 500,
    # not just the affected row. Coalesce to 0 so old rows still serialize.
    z = Decimal("0")
    return {
        "id": item.id,
        "employee": item.employee_name,
        "employeeId": item.employee_id,
        "department": item.department,
        "period": run.period_label,
        "payDate": run.pay_date,
        "salary": item.gross_pay or z,
        "basicPay": item.basic_salary or z,
        "hra": item.hra or z,
        "specialAllowance": item.special_allowance or z,
        "overtime": item.overtime or z,
        "additionalCompensation": item.additional_compensation or z,
        "payableDays": item.payable_days,        # None on old rows generated before this
        "totalWorkingDays": item.total_working_days,  # column existed — genuinely unknown, not 0
        "tds": item.tds or z,
        "pf": item.pf or z,
        "esi": item.esi or z,
        "professionalTax": item.professional_tax or z,
        "socialSecurity": item.social_security or z,
        "medicare": item.medicare or z,
        "niEmployee": item.ni_employee or z,
        "employerPf": item.employer_pf or z,
        "employerEsi": item.employer_esi or z,
        "employerSs": item.employer_social_security or z,
        "employerMedicare": item.employer_medicare or z,
        "employerPension": item.employer_pension or z,
        "totalDeductions": item.total_deductions or z,
        "netPay": item.net_pay or z,
        "bankAccount": item.bank_account,
        "pan": item.pan,
        "status": item.status,
    }


def list_payslips(db: Session, organization_id: int = None, search: str = None,
                   period: str = None, employee_id: int = None) -> List[dict]:
    query = db.query(PayslipItem, PayrollRun).join(PayrollRun, PayslipItem.payroll_run_id == PayrollRun.id)
    query = _apply_org_filter(query, PayslipItem, organization_id)
    if period:
        query = query.filter(PayrollRun.period_label == period)
    if employee_id:
        query = query.filter(PayslipItem.employee_id == employee_id)
    if search:
        query = query.filter(PayslipItem.employee_name.ilike(f"%{search}%"))

    rows = query.order_by(PayrollRun.pay_date.desc()).all()
    return [_serialize_payslip(item, run) for item, run in rows]


def get_payslip_by_id(db: Session, payslip_id: int, organization_id: int = None) -> dict:
    query = db.query(PayslipItem, PayrollRun).join(PayrollRun, PayslipItem.payroll_run_id == PayrollRun.id)
    query = query.filter(PayslipItem.id == payslip_id)
    query = _apply_org_filter(query, PayslipItem, organization_id)
    row = query.first()
    if not row:
        raise NotFoundException(f"Payslip {payslip_id} not found.")
    item, run = row
    return _serialize_payslip(item, run), item, run


def _get_currency_symbol(country: str) -> str:
    """Return the currency symbol for a jurisdiction country code."""
    return {"IN": "\u20b9", "US": "$", "UK": "\u00a3"}.get(country, "$")


def _get_currency_code(country: str) -> str:
    """Return the ISO currency code for a jurisdiction country code."""
    return {"IN": "INR", "US": "USD", "UK": "GBP"}.get(country, "USD")


def generate_payslip_pdf_bytes(db: Session, payslip_id: int, organization_id: int = None) -> bytes:
    """Renders a professional PDF payslip document with tables, proper layout,
    and jurisdiction-aware currency formatting. Requires `reportlab`."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas

    data, item, run = get_payslip_by_id(db, payslip_id, organization_id)

    # Determine country for currency formatting
    company = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first() if organization_id else None
    country = _normalize_country(getattr(company, "jurisdiction_country", None) or "IN")
    sym = _get_currency_symbol(country)

    def fmt(val):
        v = float(val or 0)
        if v == 0:
            return f"{sym} 0.00"
        return f"{sym} {v:,.2f}"

    import io
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # ── Colors ──
    teal = colors.HexColor("#0D9488")
    teal_light = colors.HexColor("#E8F7F5")
    slate_50 = colors.HexColor("#F8FAFC")
    slate_100 = colors.HexColor("#F1F5F9")
    slate_200 = colors.HexColor("#E2E8F0")
    slate_600 = colors.HexColor("#475569")
    slate_800 = colors.HexColor("#1E293B")

    margin_l = 20 * mm
    margin_r = width - 20 * mm
    col_mid = width / 2
    y = height - 15 * mm

    # ── Header bar ──
    c.setFillColor(teal)
    c.rect(0, y - 2 * mm, width, 18 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_l, y + 2 * mm, "PAYSLIP")
    c.setFont("Helvetica", 9)
    c.drawRightString(margin_r, y + 6 * mm, f"Pay Period: {data['period']}")
    c.drawRightString(margin_r, y + 1 * mm, f"Pay Date: {str(data['payDate'])}")
    y -= 12 * mm

    # ── Employee Info section ──
    y -= 8 * mm
    left_x = margin_l
    right_x = col_mid + 10 * mm
    row_h = 5.5 * mm

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(slate_600)
    labels_left = [
        ("Employee Name", str(data["employee"])),
        ("Employee ID", str(data["employeeId"])),
        ("Department", str(data["department"] or "-")),
    ]
    labels_right = [
        ("Bank Account", str(data["bankAccount"] or "-")),
        ("PAN / Tax ID", str(data["pan"] or "-")),
        ("Status", str(data.get("status", "Pending"))),
    ]
    for i, (lbl, val) in enumerate(labels_left):
        yy = y - i * row_h
        c.setFont("Helvetica", 8)
        c.setFillColor(slate_600)
        c.drawString(left_x, yy, lbl)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(slate_800)
        c.drawString(left_x + 28 * mm, yy, val)
    for i, (lbl, val) in enumerate(labels_right):
        yy = y - i * row_h
        c.setFont("Helvetica", 8)
        c.setFillColor(slate_600)
        c.drawString(right_x, yy, lbl)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(slate_800)
        c.drawString(right_x + 28 * mm, yy, val)
    y -= 3 * row_h + 4 * mm

    # ── Helper: draw a section table ──
    def draw_section(title, rows, y_start, bg=None):
        """Draw a titled section with a table of label-value rows.
        Returns the y position after the section."""
        y_cur = y_start
        # Title bar
        c.setFillColor(bg or teal_light)
        c.rect(margin_l, y_cur - 1 * mm, margin_r - margin_l, 7 * mm, fill=True, stroke=False)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(teal)
        c.drawString(margin_l + 3 * mm, y_cur + 0.5 * mm, title)
        y_cur -= 8 * mm
        # Rows
        c.setFont("Helvetica", 9)
        for i, (lbl, val) in enumerate(rows):
            stripe = slate_50 if i % 2 == 0 else colors.white
            c.setFillColor(stripe)
            c.rect(margin_l, y_cur - 1.5 * mm, margin_r - margin_l, 6 * mm, fill=True, stroke=False)
            c.setFillColor(slate_800)
            c.drawString(margin_l + 3 * mm, y_cur, lbl)
            c.drawRightString(margin_r - 3 * mm, y_cur, val)
            y_cur -= 6 * mm
        # Bottom border
        c.setStrokeColor(slate_200)
        c.setLineWidth(0.5)
        c.line(margin_l, y_cur + 0.5 * mm, margin_r, y_cur + 0.5 * mm)
        return y_cur - 3 * mm

    # ── Earnings ──
    earnings = [
        ("Basic Salary", fmt(data["basicPay"])),
        ("House Rent Allowance (HRA)", fmt(data["hra"])),
        ("Special Allowance", fmt(data["specialAllowance"])),
    ]
    ov = float(data.get("overtime", 0) or 0)
    if ov > 0:
        earnings.append(("Overtime", fmt(ov)))
    add_comp = float(data.get("additionalCompensation", 0) or 0)
    if add_comp > 0:
        earnings.append(("Additional Compensation", fmt(add_comp)))
    earnings.append(("Gross Pay", fmt(data["salary"])))
    y = draw_section("EARNINGS", earnings, y)

    # ── Deductions ──
    deductions = []
    for lbl, key in [
        ("Income Tax (TDS)", "tds"),
        ("Provident Fund (PF)", "pf"),
        ("Employee State Insurance (ESI)", "esi"),
        ("Professional Tax", "professionalTax"),
    ]:
        v = float(data.get(key, 0) or 0)
        if v > 0:
            deductions.append((lbl, fmt(v)))
    for lbl, key in [
        ("Social Security", "socialSecurity"),
        ("Medicare", "medicare"),
        ("National Insurance", "niEmployee"),
    ]:
        v = float(data.get(key, 0) or 0)
        if v > 0:
            deductions.append((lbl, fmt(v)))
    deductions.append(("Total Deductions", fmt(data["totalDeductions"])))
    y = draw_section("DEDUCTIONS", deductions, y)

    # ── Employer Contributions ──
    empl_rows = []
    for lbl, key in [
        ("Employer PF", "employerPf"),
        ("Employer ESI", "employerEsi"),
        ("Employer Social Security", "employerSs"),
        ("Employer Medicare", "employerMedicare"),
        ("Employer Pension", "employerPension"),
    ]:
        v = float(data.get(key, 0) or 0)
        if v > 0:
            empl_rows.append((lbl, fmt(v)))
    total_empl = sum(float(data.get(k, 0) or 0) for k in
                     ["employerPf", "employerEsi", "employerSs", "employerMedicare", "employerPension"])
    if empl_rows:
        empl_rows.append(("Total Employer Contributions", fmt(total_empl)))
        y = draw_section("EMPLOYER CONTRIBUTIONS", empl_rows, y)

    # ── Net Pay box ──
    y -= 4 * mm
    box_h = 16 * mm
    c.setFillColor(teal)
    c.roundRect(margin_l, y - box_h + 4 * mm, margin_r - margin_l, box_h, 3 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin_l + 5 * mm, y - 2 * mm, "NET PAY")
    c.setFont("Helvetica-Bold", 15)
    c.drawRightString(margin_r - 5 * mm, y - 2 * mm, fmt(data["netPay"]))
    c.setFont("Helvetica", 8)
    c.drawString(margin_l + 5 * mm, y - 9 * mm,
                 f"Currency: {_get_currency_code(country)}  |  This is a system-generated payslip.")
    y -= box_h + 6 * mm

    # ── Footer ──
    c.setFont("Helvetica", 7)
    c.setFillColor(slate_600)
    c.drawCentredString(width / 2, 12 * mm,
                        "Generated by Zoiko Payroll System  |  Confidential — For employee use only")

    c.showPage()
    c.save()
    return buf.getvalue()


# ── Attendance & Compensation ───────────────────────────────────────────

def _enrich_attendance_record(db: Session, record: PayrollAttendanceRecord) -> dict:
    """Attach employee name/name fields to an AttendanceRecordResponse."""
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == record.employee_id
    ).first()
    first_name = getattr(employee, "first_name", None) if employee else None
    last_name = getattr(employee, "last_name", None) if employee else None
    department = getattr(employee, "department", None) if employee else None
    designation = getattr(employee, "designation", None) if employee else None
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "name": f"{first_name or ''} {last_name or ''}".strip() or None,
        "first_name": first_name,
        "last_name": last_name,
        "department": department,
        "designation": designation,
        "date": record.date,
        "check_in": record.check_in,
        "check_out": record.check_out,
        "status": record.status,
        "hours": record.hours,
        "rewards": record.rewards,
        "bonus": record.bonus,
        "other_compensation": record.other_compensation,
        "notes": record.notes,
    }


def bulk_save_attendance(db: Session, data: BulkAttendanceRequest, organization_id: int) -> List[dict]:
    """Upsert attendance records for a date. Matches on (employee_id, date)
    to update existing records instead of creating duplicates."""
    results = []
    for item in data.records:
        payload = item.model_dump()
        employee_id = payload.pop("employeeId")
        date_val = payload.pop("date")
        mapped = {
            "check_in": payload.pop("checkIn", None),
            "check_out": payload.pop("checkOut", None),
            "status": payload.pop("status", "present"),
            "hours": payload.pop("hours", None),
            "rewards": payload.pop("rewards", Decimal("0")),
            "bonus": payload.pop("bonus", Decimal("0")),
            "other_compensation": payload.pop("otherCompensation", Decimal("0")),
            "notes": payload.pop("notes", None),
        }

        existing = db.query(PayrollAttendanceRecord).filter(
            PayrollAttendanceRecord.organization_id == organization_id,
            PayrollAttendanceRecord.employee_id == employee_id,
            PayrollAttendanceRecord.date == date_val,
        ).first()

        if existing:
            for field, value in mapped.items():
                setattr(existing, field, value)
            record = existing
        else:
            record = PayrollAttendanceRecord(
                organization_id=organization_id,
                employee_id=employee_id,
                date=date_val,
                **mapped,
            )
            db.add(record)

        results.append(record)

    db.commit()
    for r in results:
        db.refresh(r)
    return [_enrich_attendance_record(db, r) for r in results]


def get_attendance_records(
    db: Session,
    organization_id: int,
    *,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id: Optional[int] = None,
) -> List[dict]:
    """Fetch attendance records with optional date range and employee filter."""
    query = db.query(
        PayrollAttendanceRecord,
        PayrollEmployee.first_name,
        PayrollEmployee.last_name,
        PayrollEmployee.department,
        PayrollEmployee.designation,
    ).join(
        PayrollEmployee,
        PayrollAttendanceRecord.employee_id == PayrollEmployee.id,
    ).filter(
        PayrollAttendanceRecord.organization_id == organization_id
    )
    if start_date:
        query = query.filter(PayrollAttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(PayrollAttendanceRecord.date <= end_date)
    if employee_id:
        query = query.filter(PayrollAttendanceRecord.employee_id == employee_id)

    rows = query.order_by(PayrollAttendanceRecord.date.desc()).all()
    return [
        {
            "id": record.id,
            "employee_id": record.employee_id,
            "name": f"{first_name or ''} {last_name or ''}".strip() or None,
            "first_name": first_name,
            "last_name": last_name,
            "department": department,
            "designation": designation,
            "date": record.date,
            "check_in": record.check_in,
            "check_out": record.check_out,
            "status": record.status,
            "hours": record.hours,
            "rewards": record.rewards,
            "bonus": record.bonus,
            "other_compensation": record.other_compensation,
            "notes": record.notes,
        }
        for record, first_name, last_name, department, designation in rows
    ]


def clear_attendance_records(db: Session, organization_id: int) -> int:
    """Delete all attendance records for the given organization."""
    deleted = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


def get_attendance_summary(db: Session, organization_id: int) -> dict:
    """Aggregate today's attendance counts."""
    today = date.today()
    records = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id,
        PayrollAttendanceRecord.date == today,
    ).all()
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    return {
        "total": total,
        "present": present,
        "absent": absent,
        "leave": leave,
    }


# ── Compliance Documents ────────────────────────────────────────────

_COMPLIANCE_DOC_UPLOAD_DIR = _os.environ.get(
    "PAYROLL_COMPLIANCE_DOC_UPLOAD_DIR",
    os.path.join(_os.environ.get("UPLOAD_BASE_DIR", "/tmp/uploads"), "payroll_compliance_documents"),
)


def list_compliance_documents(
    db: Session,
    organization_id: int,
    *,
    country: Optional[str] = None,
) -> List[ComplianceDocument]:
    query = db.query(ComplianceDocument).filter(ComplianceDocument.organization_id == organization_id)
    if country:
        query = query.filter(ComplianceDocument.country == country)
    return query.order_by(ComplianceDocument.uploaded_at.desc()).all()


def delete_compliance_document(db: Session, document_id: int, organization_id: int) -> None:
    doc = db.query(ComplianceDocument).filter(
        ComplianceDocument.id == document_id,
        ComplianceDocument.organization_id == organization_id,
    ).first()
    if not doc:
        raise NotFoundException("Compliance document", document_id)

    if _os.path.exists(doc.file_path):
        _os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
    log_activity(db, organization_id, f"Compliance document '{doc.title}' deleted.", ActivityStatus.INFO)


def _ocr_image_file(file_path: str) -> str:
    # NOTE: previously this caught every exception (including a missing
    # `pytesseract`/`PIL` package or a missing system `tesseract` binary)
    # and returned "", which was indistinguishable from "OCR ran and found
    # no statutory rates in the image." Letting it raise means
    # upload_compliance_document() now records a real "failed" status +
    # error message instead of silently pretending extraction succeeded.
    from PIL import Image  # type: ignore
    import pytesseract  # type: ignore

    image = Image.open(file_path)
    try:
        text = pytesseract.image_to_string(image)
    finally:
        image.close()
    return text or ""


def _extract_text_from_uploaded_document(file_path: str) -> str:
    if not file_path:
        return ""

    ext = _os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    if ext in {".pdf"}:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if ext in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}:
        return _ocr_image_file(file_path)
    return ""


_DASH_TOKENS = {"—", "–", "-", "n/a", "N/A", "\ufffd"}

# Per-jurisdiction vocabulary. This is the fix for the core bug: the old
# code only knew about India's components (PF/ESI/PT/TDS), so uploading a
# US or UK notice silently returned [] no matter what was in the document —
# which then let the *frontend's* generic policy fallback quietly display
# whichever country's canned numbers happened to be selected in the UI tab,
# mislabeled as "extracted from this document". Detecting the document's
# own jurisdiction and only matching that jurisdiction's real statutory
# components closes that gap.
#
# Each component is ("key", "match pattern", "display label", "pct" | "flat").
# "pct"  components pull percentage cells (employee / employer / total).
# "flat" components pull currency-amount cells (e.g. a flat monthly fee).
_COUNTRY_EXTRACTION_CONFIG = {
    "IN": {
        "currency": "₹",
        "detect": r"jurisdiction:\s*india",
        "components": [
            ("pf",  r"provident fund|\bpf\b(?!\w)", "Employee Provident Fund (EPF)", "pct"),
            ("esi", r"state insurance|\besi\b", "Employee State Insurance (ESI)", "pct"),
            ("pt",  r"professional tax", "Professional Tax (PT)", "flat"),
            ("lwf", r"labour welfare fund", "Labour Welfare Fund", "flat"),
            ("tds", r"\btds\b", "TDS / Income Tax", "pct"),
        ],
    },
    "US": {
        "currency": "$",
        "detect": r"jurisdiction:\s*united states",
        "components": [
            ("social_security", r"social security", "Social Security (FICA)", "pct"),
            ("medicare",        r"medicare", "Medicare (FICA)", "pct"),
            ("futa",            r"federal unemployment|\bfuta\b", "Federal Unemployment (FUTA)", "pct"),
            ("sui",             r"state unemployment|\bsui\b", "State Unemployment Insurance (SUI)", "pct"),
            ("sdi",             r"\bsdi\b|state disability", "State Disability Insurance (SDI)", "pct"),
        ],
    },
    "UK": {
        "currency": "£",
        "detect": r"jurisdiction:\s*united kingdom",
        "components": [
            ("national_insurance", r"national insurance|ni contributions|\bnic\b|class 1\s+ni", "National Insurance", "pct"),
            ("pension",            r"pension\s+auto.?enrolment|workplace\s+pension|auto.?enrolment(?!\s+declaration)", "Workplace Pension (Auto-Enrolment)", "pct"),
            ("apprenticeship_levy",r"apprenticeship levy", "Apprenticeship Levy", "pct"),
            ("ssp",                r"statutory sick pay|\bssp\b", "Statutory Sick Pay (SSP)", "flat"),
        ],
    },
}

_SECTION_END_MARKERS = {
    "IN": "Income Tax Slabs",
    "US": "Federal Income Tax Brackets",
    "UK": "Income Tax Bands",
}


def detect_country_from_text(text: str) -> Optional[str]:
    """Detects the jurisdiction a compliance document is actually *about*
    by reading its own content, rather than trusting the currently-selected
    UI tab. Falls back to None (unknown) if no known jurisdiction phrase is
    found — callers should fall back to the country the user supplied on
    upload in that case."""
    if not text:
        return None
    for code, cfg in _COUNTRY_EXTRACTION_CONFIG.items():
        if re.search(cfg["detect"], text, re.I):
            return code
    return None


def _strip_parenthetical_notes(line: str) -> str:
    # Wage-base / threshold notes like "(up to $176,100 wage base)" or
    # "(above £242/week)" sit inside parentheses next to the real rate and
    # would otherwise get mistaken for a second employee/employer column.
    return re.sub(r"\([^)]*\)", " ", line)


def _extract_contribution_rates(text: str, country: Optional[str]) -> List[dict]:
    """Per-jurisdiction extraction of statutory contribution rates.

    Many PDFs render table cells as individual text lines (pypdf outputs
    each cell on a separate line), so after finding the component keyword
    on a line we scan the next several lines for the cell values instead
    of requiring everything on the same line.

    Reads the first three real cells positionally — employee share,
    employer share, total — so the column order in the PDF must match
    (Component / Employee / Employer / Total).
    """
    cfg = _COUNTRY_EXTRACTION_CONFIG.get(country)
    if not cfg:
        return []

    rates: List[dict] = []
    lines = text.splitlines()
    n = len(lines)

    for key, pattern, label, kind in cfg["components"]:
        if kind == "pct":
            cell_re = re.compile(r"\d+(?:\.\d+)?\s*%\+?|—|–|\ufffd|N/A", re.I)
        else:
            cell_re = re.compile(
                rf"{re.escape(cfg['currency'])}\s?[\d,]+(?:\.\d+)?(?:/\w+)?|—|–|\ufffd|N/A",
                re.I,
            )

        for i, line in enumerate(lines):
            if not re.search(pattern, line, re.I):
                continue
            # Found the component line — collect cell values from subsequent lines
            cells: List[str] = []
            for j in range(i + 1, min(i + 8, n)):
                candidate = _strip_parenthetical_notes(lines[j]).strip()
                if not candidate:
                    continue
                found = cell_re.findall(candidate)
                if found:
                    cells.extend(found)
                if len(cells) >= 3:
                    break
            if not cells:
                break
            employee = cells[0] if len(cells) > 0 else "—"
            employer = cells[1] if len(cells) > 1 else "—"
            total    = cells[2] if len(cells) > 2 else (employer if len(cells) == 2 else employee)
            rates.append({
                "id": key,
                "label": label,
                "employee": "—" if employee in _DASH_TOKENS else employee,
                "employer": "—" if employer in _DASH_TOKENS else employer,
                "total": total,
            })
            break
    return rates


def _extract_tax_slabs(text: str, country: Optional[str]) -> List[dict]:
    """Parses the income-tax slab table using the correct currency symbol
    for the document's own jurisdiction (previously this hardcoded ₹ onto
    every document, so a US or UK slab table came back stamped with rupee
    signs on dollar/pound figures). Scoped to the slab section only, so
    unrelated numbers elsewhere in the document (reference numbers, dates)
    can't be mistaken for a slab row."""
    currency = _COUNTRY_EXTRACTION_CONFIG.get(country, {}).get("currency", "")
    marker = _SECTION_END_MARKERS.get(country)
    section = text.split(marker, 1)[1] if marker and marker in text else text
    section = section.split("Compliance Requirements", 1)[0]

    slabs: List[dict] = []
    pattern = re.compile(
        re.escape(currency) + r"?\s?([\d,]+)\s*(?:-|to|–|—)\s*([\d,]+|above)\s*(nil|\d+(?:\.\d+)?%)",
        re.I,
    )
    for i, match in enumerate(pattern.finditer(section)):
        low, high, rate = match.groups()
        rate_label = "Nil" if rate.lower() == "nil" else rate
        slabs.append({
            "id": f"doc-slab-{i}",
            "min": f"{currency}{low}",
            "max": "Above" if high.lower() == "above" else f"{currency}{high}",
            "rate": rate_label,
            "tax": f"{rate_label} in this band",
        })
    return slabs


def _extract_requirements(text: str) -> List[dict]:
    """Pulls short freeform lines that look like compliance requirements
    (contain words like 'must'/'shall'/'required'). Capped so a large
    document doesn't dump its entire body into the preview."""
    requirements: List[dict] = []
    keywords = ("must", "shall", "required", "mandatory", "due by", "deadline")
    for line in text.splitlines():
        clean = line.strip()
        if not clean or len(clean) > 200:
            continue
        if any(k in clean.lower() for k in keywords):
            requirements.append({"label": clean[:150]})
        if len(requirements) >= 5:
            break
    return requirements


_ENTITY_RULES = {
    "UK": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$"]),
        ("registrationNumber",
         [r"(?:company\s+registration\s+(?:number|no)|crn|registration\s+no)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^companies\s+house\s+(number|no)$", r"^company\s+registration\s+(number|no)$"]),
        ("vatNumber",
         [r"vat\s+(?:registration\s+)?(?:number|no)\s*:?\s*((?:gb)?\d{9,12})"],
         [r"^vat\s+(?:registration\s+)?(?:number|no)$"]),
        ("payeReference",
         [r"paye\s+(?:reference|ref|no)\s*:?\s*([\d/]+[a-z0-9]*)"],
         [r"^paye\s+reference$"]),
        ("utr",
         [r"(?:utr|unique\s+taxpayer\s+reference)\s*:?\s*(\d{10})"],
         [r"^unique\s+taxpayer\s+reference$", r"^utr$"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$"]),
        ("accountsReferenceDate",
         [r"(?:accounts\s+reference\s+date|ard|accounting\s+ref)\s*:?\s*(.+)"],
         [r"^accounts\s+reference\s+date$", r"^ard$"]),
    ],
    "IN": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$", r"^name\s+of\s+(the\s+)?(company|employer)$"]),
        ("pan",
         [r"pan\s+(?:number|no)?\s*:?\s*([a-z]{5}\d{4}[a-z])"],
         [r"^pan\s+(?:number|no)?$", r"^permanent\s+account\s+number$"]),
        ("tan",
         [r"tan\s+(?:number|no)?\s*:?\s*([a-z]{4}\d{5}[a-z])"],
         [r"^tan\s+(?:number|no)?$", r"^tax\s+deduction\s+account\s+number$"]),
        ("gst",
         [r"gst\s+(?:number|no|in)?\s*:?\s*(\d{2}[a-z]{5}\d{4}[a-z]\d[z][a-z\d])"],
         [r"^gst\s+(?:number|no|in)?$", r"^gstin$"]),
        ("pfCode",
         [r"(?:pf|provident\s+fund)\s+(?:code|number|no|account)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^pf\s+(?:code|number|no|account)", r"^provident\s+fund\s+(?:code|number|no|account)"]),
        ("esiCode",
         [r"(?:esi|state\s+insurance)\s+(?:code|number|no)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^esi\s+(?:code|number|no)", r"^state\s+insurance\s+(?:code|number|no)"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$"]),
    ],
    "US": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$", r"^business\s+name$"]),
        ("ein",
         [r"(?:ein|employer\s+identification\s+number|federal\s+id)\s*:?\s*(\d{2}[-\s]?\d{7})"],
         [r"^ein$", r"^employer\s+identification\s+number$", r"^federal\s+(?:id|identification)\s+number$"]),
        ("stateId",
         [r"(?:state\s+(?:id|identification|number)|unemployment\s+(?:id|account))\s*:?\s*([a-z0-9]+(?:[-/][a-z0-9]+)*)"],
         [r"^state\s+(?:id|identification|number)$", r"^unemployment\s+(?:id|account\s+number)$"]),
        ("naicsCode",
         [r"naics\s*(?:code)?\s*:?\s*(\d{6})"],
         [r"^naics\s+code$"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address|legal\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$", r"^legal\s+address$"]),
    ],
}


def _extract_registered_entity_details(text: str, country: Optional[str] = None) -> dict:
    """Extracts registered-entity metadata from a compliance notice.

    Handles two common PDF text-layouts:
      1.  "Label: Value" on the same line
      2.  "Label" on line N, "Value" on line N+1

    Uses country-specific patterns so each jurisdiction's expected fields
    (UK: Companies House / PAYE / UTR;  IN: PAN / TAN / GST / PF / ESI;
    US: EIN / State ID / NAICS) are matched correctly."""
    rules = _ENTITY_RULES.get(country, _ENTITY_RULES.get("UK", []))
    details: dict = {}
    lines = text.splitlines()
    n = len(lines)

    for key, same_line, next_line in rules:
        # Try same-line first:  "Label: Value"
        for pat in same_line:
            for line in lines:
                m = re.search(pat, line.strip(), re.I)
                if m:
                    val = m.group(1).strip().strip(",;")
                    if val:
                        details[key] = val
                        break
            if key in details:
                break
        if key in details:
            continue
        # Fallback to next-line:  "Label" then value on line below
        for i, line in enumerate(lines):
            stripped = line.strip()
            if any(re.match(pat, stripped, re.I) for pat in next_line):
                if i + 1 < n:
                    val = lines[i + 1].strip().strip(",;")
                    if val:
                        details[key] = val
                break

    return details


def _extract_compliance_data(text: str, country: Optional[str]) -> dict:
    """Assembles the exact `extracted` object the frontend contract in
    payrollService.js documents: { contributionRates, taxSlabs, requirements }.
    `country` should be the jurisdiction *detected from the document's own
    text* (see detect_country_from_text) wherever possible — using the
    uploader's currently-selected UI tab instead is what caused rates from
    the wrong jurisdiction to be shown as "extracted from this document."
    This is returned to the client as a per-document preview only — it does
    NOT write into the org's live ContributionRate/TaxSlab policy tables,
    matching the "reference only, nothing is auto-applied" copy already
    shown in ComplianceDocuments.jsx. Applying extracted values to live
    policy should be an explicit, separate user action if that's wanted."""
    if not text:
        return {"contributionRates": [], "taxSlabs": [], "requirements": []}
    return {
        "contributionRates": _extract_contribution_rates(text, country),
        "taxSlabs": _extract_tax_slabs(text, country),
        "requirements": _extract_requirements(text),
        "registeredEntityDetails": _extract_registered_entity_details(text, country),
    }


def upload_compliance_document(
    db: Session,
    *,
    title: str,
    category: str,
    file_path: str,
    file_name: str,
    file_size: int,
    mime_type: str,
    organization_id: int,
    country: Optional[str] = None,
    description: Optional[str] = None,
    document_type: Optional[str] = None,
    uploaded_by: Optional[int] = None,
) -> ComplianceDocument:
    _os.makedirs(_COMPLIANCE_DOC_UPLOAD_DIR, exist_ok=True)

    doc = ComplianceDocument(
        organization_id=organization_id,
        title=title,
        document_type=document_type,
        category=category,
        description=description,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_by=uploaded_by,
        country=country,
        status=ComplianceDocumentStatus.PROCESSING.value,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extraction runs synchronously here (fine for typical single-page
    # notices/PDFs). If this ever needs to handle large multi-page scans,
    # move this to a background task/queue and have the client keep
    # polling GET /compliance/documents — the "processing" status above and
    # the polling loop already in ComplianceDocuments.jsx are built for
    # exactly that, they just weren't being fed real status until now.
    try:
        extracted_text = _extract_text_from_uploaded_document(file_path)

        # Trust the document's own content over whatever jurisdiction tab
        # was active in the UI when the file was dropped — that mismatch
        # (uploading a US notice while the India tab is selected, say) was
        # the actual root cause of "wrong country" extraction results.
        detected_country = detect_country_from_text(extracted_text)
        resolved_country = detected_country or country

        doc.extracted_data = _extract_compliance_data(extracted_text, resolved_country)
        doc.status = ComplianceDocumentStatus.PARSED.value

        # If the document names a jurisdiction that differs from the one it
        # was uploaded under, record what the document actually says so the
        # frontend can show a mismatch warning instead of silently mixing
        # this document's numbers into the wrong tab.
        if detected_country and country and detected_country != country:
            doc.country = detected_country
            doc.error_message = (
                f"This document appears to be for {detected_country}, "
                f"but was uploaded under {country}."
            )
        elif detected_country and not country:
            doc.country = detected_country

        # Populate CompanyComplianceDetails from extracted entity data so
        # the Compliance Overview tab shows jurisdiction, Tax ID, etc.
        # without the user having to fill the form manually.
        try:
            entity = (doc.extracted_data or {}).get("registeredEntityDetails") or {}
            if entity or resolved_country:
                company_row = get_company_details(db, organization_id)
                needs_commit = False

                if entity.get("name") and not company_row.name:
                    company_row.name = entity["name"]
                    needs_commit = True
                if entity.get("address") and not company_row.address:
                    company_row.address = entity["address"]
                    needs_commit = True
                if resolved_country and not company_row.jurisdiction_country:
                    company_row.jurisdiction_country = resolved_country
                    needs_commit = True
                if resolved_country and not company_row.compliance_pack:
                    pack_map = {"IN": "India Statutory", "US": "US Federal & State", "UK": "UK HMRC"}
                    company_row.compliance_pack = pack_map.get(resolved_country, "")
                    needs_commit = True

                # Country-specific tax-id / employer-id mapping
                if resolved_country == "IN":
                    if entity.get("pan") and not company_row.tax_no:
                        company_row.tax_no = entity["pan"].upper()
                        needs_commit = True
                    if entity.get("pfCode") and not company_row.employer_id:
                        company_row.employer_id = entity["pfCode"]
                        needs_commit = True
                elif resolved_country == "UK":
                    if entity.get("utr") and not company_row.tax_no:
                        company_row.tax_no = entity["utr"]
                        needs_commit = True
                    if entity.get("payeReference") and not company_row.employer_id:
                        company_row.employer_id = entity["payeReference"]
                        needs_commit = True
                elif resolved_country == "US":
                    if entity.get("ein") and not company_row.tax_no:
                        company_row.tax_no = entity["ein"]
                        needs_commit = True

                if needs_commit:
                    db.commit()
        except Exception:  # noqa: S110 - best-effort, must not break the upload
            pass
    except Exception as exc:  # noqa: BLE001 - surface it instead of swallowing it
        doc.status = ComplianceDocumentStatus.FAILED.value
        doc.error_message = f"Could not extract text from this document: {exc}"

    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_activity(db, organization_id, f"Compliance document '{title}' uploaded.", ActivityStatus.INFO)
    return doc


# ── Compliance ─────────────────────────────────────────────────────────

def get_company_details(db: Session, organization_id: int) -> CompanyComplianceDetails:
    row = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first()
    if not row:
        row = CompanyComplianceDetails(organization_id=organization_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_company_details(db: Session, organization_id: int, data: CompanyDetailsUpdate) -> CompanyComplianceDetails:
    row = get_company_details(db, organization_id)
    field_map = {
        "name": "name", "type": "type", "taxNo": "tax_no", "employerId": "employer_id",
        "address": "address", "industry": "industry",
        "jurisdictionCountry": "jurisdiction_country", "jurisdictionState": "jurisdiction_state",
        "compliancePack": "compliance_pack", "schedule": "schedule",
        "settlementBank": "settlement_bank", "settlementAcc": "settlement_acc",
    }
    for camel_field, value in data.model_dump(exclude_unset=True).items():
        column = field_map.get(camel_field)
        if column:
            setattr(row, column, value)
    db.commit()
    db.refresh(row)
    log_activity(db, organization_id, "Company compliance details updated.", ActivityStatus.SUCCESS)
    return row


def get_compliance_data(db: Session, organization_id: int) -> dict:
    company = get_company_details(db, organization_id)
    # Placeholder for a future FilingRecord model (statutory filing due-dates,
    # e.g. PF/ESI monthly returns, TDS quarterly returns). Returned as an
    # empty list today rather than fabricated entries.
    filings: List[dict] = []
    return {"company": company, "filings": filings}


# ── Reports ─────────────────────────────────────────────────────────────

def get_payroll_reports(db: Session, organization_id: int = None, **_) -> List[dict]:
    """Build report entries from existing payroll runs."""
    q = db.query(PayrollRun)
    if organization_id:
        q = q.filter(PayrollRun.organization_id == organization_id)
    runs = q.order_by(PayrollRun.period_start.desc()).all()

    reports = []
    for run in runs:
        if run.status in ("Draft",):
            continue
        reports.append({
            "id": run.id,
            "name": f"Payroll Report — {run.period_label}",
            "period": run.period_label,
            "generatedAt": run.updated_at.strftime("%b %d, %Y") if run.updated_at else (
                run.created_at.strftime("%b %d, %Y") if run.created_at else "-"
            ),
            "status": "available" if run.status in ("Approved", "Paid") else "pending",
        })
    return reports


def _get_report_run(db: Session, report_id: int, organization_id: int = None):
    """Fetch the PayrollRun for a report, raising if not found."""
    from app.core.exceptions import NotFoundException
    q = db.query(PayrollRun).filter(PayrollRun.id == report_id)
    if organization_id:
        q = q.filter(PayrollRun.organization_id == organization_id)
    run = q.first()
    if not run:
        raise NotFoundException("Payroll report", report_id)
    return run


def generate_report_pdf_bytes(db: Session, report_id: int, organization_id: int = None) -> bytes:
    """Generate a PDF summary of a payroll run report."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas as pdf_canvas

    run = _get_report_run(db, report_id, organization_id)
    items = run.payslip_items or []

    company = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first() if organization_id else None
    country = _normalize_country(getattr(company, "jurisdiction_country", None) or "IN")
    sym = _get_currency_symbol(country)

    def fmt(val):
        v = float(val or 0)
        return f"{sym} {v:,.2f}"

    import io
    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    teal = colors.HexColor("#0D9488")
    slate_600 = colors.HexColor("#475569")
    slate_800 = colors.HexColor("#1E293B")
    slate_100 = colors.HexColor("#F1F5F9")

    margin_l = 20 * mm
    margin_r = width - 20 * mm
    y = height - 15 * mm

    c.setFillColor(teal)
    c.rect(0, y - 2 * mm, width, 18 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin_l, y + 2 * mm, "PAYROLL REPORT")
    c.setFont("Helvetica", 9)
    c.drawRightString(margin_r, y + 6 * mm, f"Period: {run.period_label}")
    c.drawRightString(margin_r, y + 1 * mm, f"Pay Date: {str(run.pay_date)}")
    y -= 14 * mm

    summary_items = [
        ("Status", str(run.status)),
        ("Employees", str(run.employee_count)),
        ("Total Gross", fmt(run.total_gross)),
        ("Total Deductions", fmt(run.total_deductions)),
        ("Total Taxes", fmt(run.total_taxes)),
        ("Total Net", fmt(run.total_net)),
    ]
    for lbl, val in summary_items:
        y -= 6 * mm
        c.setFont("Helvetica", 9)
        c.setFillColor(slate_600)
        c.drawString(margin_l, y, lbl)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(slate_800)
        c.drawString(margin_l + 40 * mm, y, val)
    y -= 10 * mm

    if items:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(slate_800)
        c.drawString(margin_l, y, "Employee Details")
        y -= 2 * mm

        cols = [margin_l, margin_l + 45*mm, margin_l + 80*mm, margin_l + 110*mm, margin_l + 145*mm]
        headers = ["Employee", "Gross", "Deductions", "Tax (TDS)", "Net Pay"]
        y -= 5 * mm
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(slate_600)
        for i, h in enumerate(headers):
            c.drawString(cols[i], y, h)
        y -= 1 * mm
        c.setStrokeColor(slate_100)
        c.line(margin_l, y, margin_r, y)
        y -= 4 * mm

        c.setFont("Helvetica", 7)
        c.setFillColor(slate_800)
        for item in items:
            if y < 25 * mm:
                c.showPage()
                y = height - 20 * mm
            vals = [
                str(item.employee_name or "-"),
                fmt(item.gross_pay),
                fmt(item.total_deductions),
                fmt(item.tds),
                fmt(item.net_pay),
            ]
            for i, v in enumerate(vals):
                c.drawString(cols[i], y, v)
            y -= 4.5 * mm
    else:
        c.setFont("Helvetica", 9)
        c.setFillColor(slate_600)
        c.drawString(margin_l, y, "No payslip data available for this run.")

    c.save()
    return buf.getvalue()


def generate_report_csv_bytes(db: Session, report_id: int, organization_id: int = None) -> bytes:
    """Generate a CSV summary of a payroll run report."""
    import csv
    import io

    run = _get_report_run(db, report_id, organization_id)
    items = run.payslip_items or []

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Employee", "Department", "Gross Pay", "PF", "ESI",
        "Professional Tax", "TDS", "Other Deductions", "Net Pay",
    ])
    for item in items:
        writer.writerow([
            item.employee_name,
            item.department or "",
            float(item.gross_pay or 0),
            float(item.pf or 0),
            float(item.esi or 0),
            float(item.professional_tax or 0),
            float(item.tds or 0),
            float(item.total_deductions or 0),
            float(item.net_pay or 0),
        ])
    return buf.getvalue().encode("utf-8")


# ── Dashboard ──────────────────────────────────────────────────────────

def get_dashboard_summary(db: Session, organization_id: int = None, year: int = None, month: int = None) -> dict:
    employees_query = db.query(PayrollEmployee).filter(PayrollEmployee.organization_id == organization_id)

    headcount = employees_query.count()
    active_count = employees_query.filter(PayrollEmployee.status == EmployeeStatus.ACTIVE).count()
    on_leave_count = employees_query.filter(PayrollEmployee.status == EmployeeStatus.ON_LEAVE).count()

    now = datetime.utcnow()

    def _month_sum(field, start, end=None):
        q = db.query(sa_func.coalesce(sa_func.sum(field), 0)).filter(PayrollRun.pay_date >= start)
        if end:
            q = q.filter(PayrollRun.pay_date < end)
        if organization_id:
            q = q.filter(PayrollRun.organization_id == organization_id)
        return q.scalar() or Decimal("0")

    def _pending_count(start, end):
        pq = db.query(PayrollRun).filter(
            PayrollRun.pay_date >= start,
            PayrollRun.pay_date < end,
            PayrollRun.status.in_([PayrollStatus.REVIEW, PayrollStatus.APPROVED, PayrollStatus.AUTHORIZED]),
        )
        pq = _apply_org_filter(pq, PayrollRun, organization_id)
        return pq.count()

    if year and month:
        this_month_start = date(year, month, 1)
        if month == 12:
            this_month_end = date(year + 1, 1, 1)
        else:
            this_month_end = date(year, month + 1, 1)
        if month == 1:
            prev_month_start = date(year - 1, 12, 1)
        else:
            prev_month_start = date(year, month - 1, 1)

        total_net = _month_sum(PayrollRun.total_net, this_month_start, this_month_end)
        total_gross = _month_sum(PayrollRun.total_gross, this_month_start, this_month_end)
        total_taxes = _month_sum(PayrollRun.total_taxes, this_month_start, this_month_end)
        prev_net = _month_sum(PayrollRun.total_net, prev_month_start, this_month_start)
        pending_approvals = _pending_count(this_month_start, this_month_end)

        change_pct = None
        if prev_net and prev_net > 0:
            change_pct = float(_round2((total_net - prev_net) / prev_net * 100))
    else:
        earliest_q = db.query(sa_func.min(PayrollRun.pay_date))
        if organization_id:
            earliest_q = earliest_q.filter(PayrollRun.organization_id == organization_id)
        earliest_date = earliest_q.scalar()

        if earliest_date:
            all_start = date(earliest_date.year, earliest_date.month, 1)
        else:
            all_start = date(now.year, now.month, 1)
        all_end = date(now.year, now.month + 1, 1) if now.month < 12 else date(now.year + 1, 1, 1)

        total_net = _month_sum(PayrollRun.total_net, all_start, all_end)
        total_gross = _month_sum(PayrollRun.total_gross, all_start, all_end)
        total_taxes = _month_sum(PayrollRun.total_taxes, all_start, all_end)
        pending_approvals = _pending_count(all_start, all_end)
        change_pct = None

    return {
        "totalPayrollCost": total_net,
        "totalPayrollCostChangePct": change_pct,
        "totalGross": total_gross,
        "totalTaxes": total_taxes,
        "totalNet": total_net,
        "headcount": headcount,
        "activeCount": active_count,
        "onLeaveCount": on_leave_count,
        "pendingApprovals": pending_approvals,
    }


def get_dashboard_trend(db: Session, organization_id: int = None, months: int = 6, year: int = None, month: int = None) -> List[dict]:
    if year and month:
        half = months // 2
        start_m = month - half
        start_y = year
        while start_m <= 0:
            start_m += 12
            start_y -= 1
        end_m = month + (months - half)
        end_y = year
        while end_m > 12:
            end_m -= 12
            end_y += 1
        window_start = date(start_y, start_m, 1)
        window_end = date(end_y, end_m, 1)
    else:
        now = datetime.utcnow()
        earliest_q = db.query(sa_func.min(PayrollRun.pay_date))
        if organization_id:
            earliest_q = earliest_q.filter(PayrollRun.organization_id == organization_id)
        earliest_date = earliest_q.scalar()
        if earliest_date:
            window_start = date(earliest_date.year, earliest_date.month, 1)
        else:
            window_start = date(now.year, now.month, 1)
        window_end = date(now.year, now.month + 1, 1) if now.month < 12 else date(now.year + 1, 1, 1)

    query = db.query(
        sa_func.extract("year", PayrollRun.pay_date).label("y"),
        sa_func.extract("month", PayrollRun.pay_date).label("m"),
        sa_func.coalesce(sa_func.sum(PayrollRun.total_gross), 0).label("gross"),
        sa_func.coalesce(sa_func.sum(PayrollRun.total_net), 0).label("net"),
    )
    query = _apply_org_filter(query, PayrollRun, organization_id)
    query = query.filter(PayrollRun.pay_date >= window_start, PayrollRun.pay_date < window_end)
    rows = query.group_by(
        sa_func.extract("year", PayrollRun.pay_date),
        sa_func.extract("month", PayrollRun.pay_date),
    ).order_by(
        sa_func.extract("year", PayrollRun.pay_date),
        sa_func.extract("month", PayrollRun.pay_date),
    ).all()

    buckets = {(int(r.y), int(r.m)): {"gross": Decimal(str(r.gross)), "net": Decimal(str(r.net))} for r in rows}

    ordered_keys = sorted(buckets.keys())

    return [
        {
            "month": f"{month_name[m][:3]} {y}",
            "gross": buckets[(y, m)]["gross"],
            "net": buckets[(y, m)]["net"],
        }
        for (y, m) in ordered_keys
    ]


def get_recent_activity(db: Session, organization_id: int = None, limit: int = 20, year: int = None, month: int = None) -> List[dict]:
    query = db.query(PayrollActivityLog)
    query = _apply_org_filter(query, PayrollActivityLog, organization_id)
    if year and month:
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        query = query.filter(PayrollActivityLog.created_at >= month_start, PayrollActivityLog.created_at < month_end)
    rows = query.order_by(PayrollActivityLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(row.id),
            "description": row.description,
            "timestamp": row.created_at,
            "status": row.status,
        }
        for row in rows
    ]


def get_dashboard_breakdowns(db: Session, organization_id: int = None, year: int = None, month: int = None) -> dict:
    """Return department, pay-type, and deduction breakdowns from payslip data."""
    q = db.query(PayslipItem).join(PayrollRun, PayslipItem.payroll_run_id == PayrollRun.id)
    q = _apply_org_filter(q, PayslipItem, organization_id)
    if year and month:
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        q = q.filter(PayrollRun.pay_date >= month_start, PayrollRun.pay_date < month_end)
    items = q.all()

    # Department breakdown
    dept_map: dict = {}
    for item in items:
        dept = item.department or "Unassigned"
        dept_map[dept] = dept_map.get(dept, Decimal("0")) + (item.gross_pay or Decimal("0"))
    total_gross_all = sum(dept_map.values(), Decimal("0")) or Decimal("1")
    by_department = sorted(
        [{"name": k, "value": round(float(v / total_gross_all * 100), 1), "amount": float(v)}
         for k, v in dept_map.items()],
        key=lambda x: x["value"], reverse=True,
    )

    # Pay type breakdown
    total_basic = sum((item.basic_salary or Decimal("0")) for item in items)
    total_hra = sum((item.hra or Decimal("0")) for item in items)
    total_special = sum((item.special_allowance or Decimal("0")) for item in items)
    total_overtime = sum((item.overtime or Decimal("0")) for item in items)
    total_add = sum((item.additional_compensation or Decimal("0")) for item in items)
    pay_types = [
        {"name": "Basic Salary", "value": float(total_basic)},
        {"name": "HRA", "value": float(total_hra)},
        {"name": "Special Allowance", "value": float(total_special)},
    ]
    if total_overtime > 0:
        pay_types.append({"name": "Overtime", "value": float(total_overtime)})
    if total_add > 0:
        pay_types.append({"name": "Additional", "value": float(total_add)})

    # Deductions breakdown
    deduction_fields = [
        ("Income Tax (TDS)", "tds"),
        ("Provident Fund (PF)", "pf"),
        ("ESI", "esi"),
        ("Professional Tax", "professional_tax"),
        ("Social Security", "social_security"),
        ("Medicare", "medicare"),
        ("National Insurance", "ni_employee"),
    ]
    deductions = []
    total_ded_all = Decimal("0")
    for label, field in deduction_fields:
        total_val = sum((getattr(item, field, None) or Decimal("0")) for item in items)
        if total_val > 0:
            deductions.append({"name": label, "total": float(total_val)})
            total_ded_all += total_val
    for d in deductions:
        d["pct"] = round(d["total"] / float(total_ded_all or 1) * 100, 1)

    return {
        "byDepartment": by_department,
        "payTypes": pay_types,
        "deductions": deductions,
    }


# ── Leave Allocations ─────────────────────────────────────────────────────

def _enrich_leave_allocation(db: Session, record: PayrollLeaveAllocation) -> dict:
    emp = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == record.employee_id,
    ).first()
    return {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": f"{emp.first_name} {emp.last_name}" if emp else None,
        "department": emp.department if emp else None,
        "leaveBalances": record.leave_balances or {},
        "periodLabel": record.period_label,
        "notes": record.notes,
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    }


def bulk_save_leaves(db: Session, data, organization_id: int) -> List[dict]:
    results = []
    for item in data.records:
        payload = item.model_dump()
        employee_id = payload.pop("employeeId")
        leave_balances = payload.pop("leaveBalances", None)
        mapped = {
            "leave_balances": leave_balances,
            "period_label": payload.pop("periodLabel", None),
            "notes": payload.pop("notes", None),
        }

        existing = db.query(PayrollLeaveAllocation).filter(
            PayrollLeaveAllocation.organization_id == organization_id,
            PayrollLeaveAllocation.employee_id == employee_id,
        ).first()

        if existing:
            for field, value in mapped.items():
                if value is not None or field != "leave_balances":
                    setattr(existing, field, value)
            record = existing
        else:
            record = PayrollLeaveAllocation(
                organization_id=organization_id,
                employee_id=employee_id,
                **mapped,
            )
            db.add(record)

        results.append(record)

    db.commit()
    for r in results:
        db.refresh(r)
    return [_enrich_leave_allocation(db, r) for r in results]


def get_leave_allocations(
    db: Session,
    organization_id: int,
    *,
    employee_id: Optional[int] = None,
) -> List[dict]:
    query = db.query(
        PayrollLeaveAllocation,
        PayrollEmployee.first_name,
        PayrollEmployee.last_name,
        PayrollEmployee.department,
    ).join(
        PayrollEmployee,
        PayrollLeaveAllocation.employee_id == PayrollEmployee.id,
    ).filter(
        PayrollLeaveAllocation.organization_id == organization_id
    )
    if employee_id:
        query = query.filter(PayrollLeaveAllocation.employee_id == employee_id)

    rows = query.all()
    return [
        {
            "id": record.id,
            "employeeId": record.employee_id,
            "employeeName": f"{first_name} {last_name}" if first_name else None,
            "department": department,
            "leaveBalances": record.leave_balances or {},
            "periodLabel": record.period_label,
            "notes": record.notes,
            "createdAt": record.created_at,
            "updatedAt": record.updated_at,
        }
        for record, first_name, last_name, department in rows
    ]


def reset_leave_allocations(db: Session, organization_id: int) -> dict:
    """Set every employee's leave balances to empty and delete leave-only attendance records."""
    leaves_reset = db.query(PayrollLeaveAllocation).filter(
        PayrollLeaveAllocation.organization_id == organization_id,
    ).update({"leave_balances": {}}, synchronize_session=False)

    attendance_deleted = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id,
        PayrollAttendanceRecord.status == "leave",
    ).delete(synchronize_session=False)

    db.commit()

    try:
        log_activity(db, organization_id, f"Leave allocations reset for {leaves_reset} employees; {attendance_deleted} leave attendance record(s) cleared.", ActivityStatus.INFO)
    except Exception:
        pass

    return {"leavesReset": leaves_reset, "attendanceCleared": attendance_deleted}