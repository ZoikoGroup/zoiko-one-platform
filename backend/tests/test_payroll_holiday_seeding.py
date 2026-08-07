"""
Regression tests for jurisdiction-based holiday seeding.

Replaces the earlier same-session fix that always seeded the same Indian
holidays for every organization regardless of country (confirmed live on
org 1342, jurisdiction Canada, before this fix — see the migration
t1u2v3w4x5y6 that cleaned those rows up). Holidays are now seeded per
(organization_id, country, year) from _DEFAULT_HOLIDAYS_BY_COUNTRY, mirroring
the existing _seed_contribution_rates/get_contribution_rates pattern.
"""

from datetime import date

from app.modules.payroll.models import CompanyComplianceDetails, PayrollHoliday
from app.modules.payroll.service import (
    list_holidays, _seed_holidays_for_country, _easter_sunday, _nth_weekday_of_month,
    _DEFAULT_HOLIDAYS_BY_COUNTRY,
)


def _set_jurisdiction(db, org_id, country):
    row = db.query(CompanyComplianceDetails).filter_by(organization_id=org_id).first()
    if row:
        row.jurisdiction_country = country
    else:
        row = CompanyComplianceDetails(organization_id=org_id, jurisdiction_country=country)
        db.add(row)
    db.flush()


def test_easter_sunday_known_dates():
    assert _easter_sunday(2026) == date(2026, 4, 5)
    assert _easter_sunday(2027) == date(2027, 3, 28)


def test_nth_weekday_of_month_known_dates():
    # 4th Thursday of November 2026 = US Thanksgiving = Nov 26, 2026.
    assert _nth_weekday_of_month(2026, 11, 3, 4) == date(2026, 11, 26)
    # Last Monday of May 2026 = US Memorial Day = May 25, 2026.
    assert _nth_weekday_of_month(2026, 5, 0, -1) == date(2026, 5, 25)


def test_seeding_produces_correct_country_specific_holidays(db):
    # Each country is independently scoped by (organization_id, country,
    # year) — seeding several for the same org/year is not a conflict, so
    # no isolation/rollback is needed between iterations here.
    org_id = 1
    for country, expected_names in [
        ("IN", {"Republic Day", "Independence Day", "Gandhi Jayanti"}),
        ("US", {"Independence Day", "Thanksgiving", "Labor Day"}),
        ("UK", {"Good Friday", "Early May Bank Holiday", "Summer Bank Holiday"}),
        ("AU", {"Australia Day", "ANZAC Day", "Boxing Day"}),
        ("CA", {"Canada Day", "Thanksgiving", "Labour Day"}),
        ("DE", {"German Unity Day", "Easter Monday"}),
    ]:
        rows = _seed_holidays_for_country(db, org_id, country, 2032)
        names = {r.name for r in rows}
        assert expected_names.issubset(names), f"{country}: expected {expected_names}, got {names}"
        assert all(r.country == country for r in rows)
        assert all(r.category == "National" for r in rows)


def test_seeding_is_idempotent_per_org_country_year(db):
    org_id = 1
    first = _seed_holidays_for_country(db, org_id, "US", 2031)
    db.commit()

    # list_holidays must NOT re-seed since 2031 US rows already exist for this org.
    rows = list_holidays(db, org_id, year=2031)
    us_2031 = [r for r in rows if r.country == "US" and r.date.year == 2031]
    assert len(us_2031) == len(first)


def test_unrecognized_country_falls_back_to_india_defaults(db):
    org_id = 1
    rows = _seed_holidays_for_country(db, org_id, "ZZ", 2031)
    names = {r.name for r in rows}
    assert "Republic Day" in names  # fell back to IN defaults, not an error


def test_multi_tenant_isolation(db):
    org_a, org_b = 1, 2
    _seed_holidays_for_country(db, org_a, "US", 2031)
    db.commit()

    org_b_rows = db.query(PayrollHoliday).filter(
        PayrollHoliday.organization_id == org_b,
        PayrollHoliday.country == "US",
        PayrollHoliday.date >= date(2031, 1, 1), PayrollHoliday.date <= date(2031, 12, 31),
    ).all()
    assert org_b_rows == []  # seeding org A never creates rows for org B


def test_list_holidays_seeds_using_the_orgs_actual_jurisdiction(db):
    org_id = 1
    _set_jurisdiction(db, org_id, "Canada")  # full name, exercises _normalize_country too

    rows = list_holidays(db, org_id, year=2031)
    ca_rows = [r for r in rows if r.date.year == 2031 and r.country == "CA"]
    names = {r.name for r in ca_rows}
    assert "Canada Day" in names
    assert "Republic Day" not in {r.name for r in rows if r.date.year == 2031}
