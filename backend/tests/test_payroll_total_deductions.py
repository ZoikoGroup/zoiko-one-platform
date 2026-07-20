"""
Tests that total_deductions includes TDS/income tax so that
gross_pay - total_deductions == net_pay holds exactly.

Bug: total_deductions was PF+ESI+PT (IN) / SS+Medicare (US) / NI (UK),
excluding TDS. net_pay was computed as gross - total_deductions - tds
which was numerically correct, but the stored total_deductions field
was wrong — every payslip showed "Total Deductions" short by the tax amount.
"""

import pytest
from decimal import Decimal
from app.modules.payroll.service import (
    _calculate_employee_monthly_payroll,
    get_contribution_rates,
    get_tax_slabs,
)


def _make_rate_map_and_slabs(db, org_id, country):
    """Get contribution rates and tax slabs for the given org/country,
    seeding defaults if they don't exist yet. Returns rate_map dict + slab list."""
    rate_map = {r.component_key: r for r in get_contribution_rates(db, org_id, country)}
    slabs = get_tax_slabs(db, org_id, country)
    return rate_map, slabs


def _get_basic_for_country(country):
    """Return a reasonable monthly basic salary for PF/NI calculation."""
    if country == "IN":
        return Decimal("30000")   # ~₹3.6L annual basic
    elif country == "US":
        return Decimal("6000")    # ~$72k annual
    elif country == "UK":
        return Decimal("2500")    # ~£30k annual
    return Decimal("3000")


def test_india_total_deductions_includes_tds(db):
    org_id = 1
    rate_map, slabs = _make_rate_map_and_slabs(db, org_id, "IN")
    basic = _get_basic_for_country("IN")
    gross = Decimal("50000")

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, "IN")

    assert calc["gross"] == gross
    # Total deductions must equal gross - net_pay exactly
    assert calc["total_deductions"] == gross - calc["net_pay"]
    # TDS should be included in total_deductions
    assert calc["total_deductions"] == calc["employee_pf"] + calc["employee_esi"] + calc["professional_tax"] + calc["tds"]
    # gross - total_deductions must equal net_pay (the invariant)
    assert calc["gross"] - calc["total_deductions"] == calc["net_pay"]


def test_us_total_deductions_includes_tds(db):
    org_id = 1
    rate_map, slabs = _make_rate_map_and_slabs(db, org_id, "US")
    basic = _get_basic_for_country("US")
    gross = Decimal("8000")

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, "US")

    assert calc["gross"] == gross
    assert calc["total_deductions"] == calc["social_security"] + calc["medicare"] + calc["tds"]
    assert calc["gross"] - calc["total_deductions"] == calc["net_pay"]


def test_uk_total_deductions_includes_tds(db):
    org_id = 1
    rate_map, slabs = _make_rate_map_and_slabs(db, org_id, "UK")
    basic = _get_basic_for_country("UK")
    gross = Decimal("4000")

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, "UK")

    assert calc["gross"] == gross
    assert calc["total_deductions"] == calc["ni_employee"] + calc["tds"]
    assert calc["gross"] - calc["total_deductions"] == calc["net_pay"]


def test_zero_income_zero_deductions(db):
    """Zero gross should produce zero TDS and PF (both % of basic/gross=0).
    PT is a flat ₹200 so total_deductions = ₹200. The key invariant holds."""
    org_id = 1
    rate_map, slabs = _make_rate_map_and_slabs(db, org_id, "IN")
    basic = Decimal("0")
    gross = Decimal("0")

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, "IN")

    assert calc["tds"] == Decimal("0")
    assert calc["employee_pf"] == Decimal("0")
    assert calc["employee_esi"] == Decimal("0")
    # PT is a flat ₹200, so total_deductions = 200
    assert calc["gross"] - calc["total_deductions"] == calc["net_pay"]


def test_high_income_india(db):
    """High-income employee: verify the core invariant holds regardless
    of whether 87A rebate applies."""
    org_id = 1
    rate_map, slabs = _make_rate_map_and_slabs(db, org_id, "IN")
    basic = Decimal("40000")
    gross = Decimal("100000")

    calc = _calculate_employee_monthly_payroll(gross, basic, rate_map, slabs, "IN")

    # The critical invariant: total_deductions includes everything
    # deducted from gross to reach net_pay
    assert calc["gross"] - calc["total_deductions"] == calc["net_pay"]
    # total_deductions should be sum of all components
    assert calc["total_deductions"] == (
        calc["employee_pf"] + calc["employee_esi"]
        + calc["professional_tax"] + calc["tds"]
    )
