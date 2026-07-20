"""
Tests for apply_extracted_rate() with currency-prefixed tax slab values.

Bug: _extract_tax_slabs() produces rows like {"min": "₹4,00,000", "max": "₹8,00,000"}
and apply_extracted_rate() used to call Decimal("₹4,00,000") which silently
fell back to Decimal("0"), collapsing all bands into a single row.
"""

import pytest
from decimal import Decimal
from sqlalchemy import text
from app.modules.payroll.service import apply_extracted_rate
from app.modules.payroll.models import TaxSlab


# Use org_id=1 (exists in test DB via superadmin fixture).
_TEST_ORG_ID = 1


@pytest.fixture(autouse=True)
def _cleanup_test_slabs(db):
    """Clean up any IN/US/UK slabs for the test org before and after each test,
    so tests start from a clean state regardless of prior runs."""
    db.execute(
        text("DELETE FROM payroll_tax_slabs WHERE organization_id = :oid "
             "AND jurisdiction_country IN ('IN', 'US', 'UK')"),
        {"oid": _TEST_ORG_ID},
    )
    db.commit()
    yield
    db.execute(
        text("DELETE FROM payroll_tax_slabs WHERE organization_id = :oid "
             "AND jurisdiction_country IN ('IN', 'US', 'UK')"),
        {"oid": _TEST_ORG_ID},
    )
    db.commit()


# Realistic 7-band IN slab table as _extract_tax_slabs produces it.
IN_SLAB_ROWS = [
    {"id": "doc-slab-0", "min": "₹0",       "max": "₹4,00,000",  "rate": "Nil",  "tax": "Nil in this band"},
    {"id": "doc-slab-1", "min": "₹4,00,001", "max": "₹8,00,000",  "rate": "5%",   "tax": "5% in this band"},
    {"id": "doc-slab-2", "min": "₹8,00,001", "max": "₹12,00,000", "rate": "10%",  "tax": "10% in this band"},
    {"id": "doc-slab-3", "min": "₹12,00,001","max": "₹16,00,000", "rate": "15%",  "tax": "15% in this band"},
    {"id": "doc-slab-4", "min": "₹16,00,001","max": "₹20,00,000", "rate": "20%",  "tax": "20% in this band"},
    {"id": "doc-slab-5", "min": "₹20,00,001","max": "₹24,00,000", "rate": "25%",  "tax": "25% in this band"},
    {"id": "doc-slab-6", "min": "₹24,00,001","max": "Above",      "rate": "30%",  "tax": "30% in this band"},
]


def test_apply_tax_slab_currency_prefixed_rows(db):
    """Applying a realistic 7-band IN slab table one row at a time should
    produce exactly 7 TaxSlab rows with correct numeric min/max values,
    not one collapsed row at (0, None)."""
    for row in IN_SLAB_ROWS:
        result = apply_extracted_rate(db, _TEST_ORG_ID, "taxSlab", row, country_code="IN")
        assert result["applied"] is True, f"Failed to apply row: {result['message']}"

    slabs = db.query(TaxSlab).filter(
        TaxSlab.organization_id == _TEST_ORG_ID,
        TaxSlab.jurisdiction_country == "IN",
    ).order_by(TaxSlab.sort_order).all()

    assert len(slabs) == 7, f"Expected 7 slabs, got {len(slabs)}: {[s.min_amount for s in slabs]}"

    # Verify each band parsed correctly
    assert slabs[0].min_amount == Decimal("0")
    assert slabs[0].max_amount == Decimal("400000")

    assert slabs[1].min_amount == Decimal("400001")
    assert slabs[1].max_amount == Decimal("800000")

    assert slabs[6].min_amount == Decimal("2400001")
    assert slabs[6].max_amount is None  # "Above" = open-ended


def test_apply_tax_slab_bad_min_returns_error(db):
    """A row with an unparseable min should return an error, not silently default to 0."""
    result = apply_extracted_rate(
        db, _TEST_ORG_ID, "taxSlab",
        {"min": "not-a-number", "max": "₹8,00,000", "rate": "5%", "tax": "5%"},
        country_code="IN",
    )
    assert result["applied"] is False
    assert "Could not parse" in result["message"]


def test_apply_tax_slab_bad_max_returns_error(db):
    """A row with an unparseable max (not 'Above') should return an error."""
    result = apply_extracted_rate(
        db, _TEST_ORG_ID, "taxSlab",
        {"min": "₹4,00,001", "max": "garbage!@#", "rate": "5%", "tax": "5%"},
        country_code="IN",
    )
    assert result["applied"] is False
    assert "Could not parse" in result["message"]


def test_apply_tax_slab_above_max_is_open_ended(db):
    """'Above' max should be accepted as None (open-ended top band)."""
    result = apply_extracted_rate(
        db, _TEST_ORG_ID, "taxSlab",
        {"min": "₹24,00,001", "max": "Above", "rate": "30%", "tax": "30%"},
        country_code="IN",
    )
    assert result["applied"] is True
    slab = db.query(TaxSlab).filter(
        TaxSlab.organization_id == _TEST_ORG_ID,
        TaxSlab.jurisdiction_country == "IN",
        TaxSlab.min_amount == Decimal("2400001"),
    ).first()
    assert slab is not None
    assert slab.max_amount is None


def test_apply_tax_slab_us_dollar_prefix(db):
    """US dollar-prefixed values should also parse correctly."""
    result = apply_extracted_rate(
        db, _TEST_ORG_ID, "taxSlab",
        {"min": "$11,925", "max": "$48,475", "rate": "12%", "tax": "12% band"},
        country_code="US",
    )
    assert result["applied"] is True
    slab = db.query(TaxSlab).filter(
        TaxSlab.organization_id == _TEST_ORG_ID,
        TaxSlab.jurisdiction_country == "US",
        TaxSlab.min_amount == Decimal("11925"),
    ).first()
    assert slab is not None
    assert slab.max_amount == Decimal("48475")


def test_apply_tax_slab_uk_pound_prefix(db):
    """UK pound-prefixed values should also parse correctly."""
    result = apply_extracted_rate(
        db, _TEST_ORG_ID, "taxSlab",
        {"min": "£12,570", "max": "£50,270", "rate": "20%", "tax": "20% band"},
        country_code="UK",
    )
    assert result["applied"] is True
    slab = db.query(TaxSlab).filter(
        TaxSlab.organization_id == _TEST_ORG_ID,
        TaxSlab.jurisdiction_country == "UK",
        TaxSlab.min_amount == Decimal("12570"),
    ).first()
    assert slab is not None
    assert slab.max_amount == Decimal("50270")
