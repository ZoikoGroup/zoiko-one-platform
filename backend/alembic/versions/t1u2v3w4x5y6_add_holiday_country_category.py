"""Add country/category to payroll_holidays; backfill; fix duplicate scope

Holidays were previously seeded with the same hardcoded Indian list for
every organization regardless of jurisdiction (fixed by this same change's
application code). This migration:
  1. Adds `country` and `category` columns to payroll_holidays.
  2. Backfills `country` on existing rows from each row's own org's current
     CompanyComplianceDetails.jurisdiction_country (normalized to a 2-letter
     code), and `category` to 'National'.
  3. Replaces the (organization_id, date) unique constraint with
     (organization_id, country, date) — needed so an Enterprise org with
     more than one onboarded jurisdiction can hold two different countries'
     holidays without colliding on the same calendar date.
  4. Removes the specific rows confirmed to be incorrectly seeded (Indian
     holiday names seeded onto a non-Indian-jurisdiction org by the bug
     this migration fixes) — org 1342 (jurisdiction: Canada), holiday ids
     12-17. Nothing else in the table is touched; admin-added holidays are
     never affected by this cleanup since they're identified by exact id,
     not by any heuristic.

Revision ID: t1u2v3w4x5y6
Revises: r5s6t7u8v9w0
Create Date: 2026-08-07 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "t1u2v3w4x5y6"
down_revision: Union[str, None] = "r5s6t7u8v9w0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Mirrors app/modules/payroll/service.py's _COUNTRY_NAME_TO_CODE — duplicated
# here (rather than imported) since migrations must stay valid independent
# of how application code evolves later.
_COUNTRY_NAME_TO_CODE = {
    "india": "IN", "in": "IN",
    "united states": "US", "us": "US", "usa": "US", "united states of america": "US",
    "united kingdom": "UK", "uk": "UK", "great britain": "UK", "gb": "UK",
    "australia": "AU", "au": "AU",
    "germany": "DE", "de": "DE",
    "canada": "CA", "ca": "CA",
}


def _normalize_country(country):
    if not country:
        return "IN"
    key = country.strip().lower()
    return _COUNTRY_NAME_TO_CODE.get(key, country.strip().upper()[:2])


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_holidays" not in inspector.get_table_names():
        print("[migrate] Table 'payroll_holidays' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("payroll_holidays")}
    if "country" not in existing_cols:
        op.add_column("payroll_holidays", sa.Column("country", sa.String(10), nullable=True))
    if "category" not in existing_cols:
        op.add_column("payroll_holidays", sa.Column("category", sa.String(30), nullable=True, server_default="National"))

    # Backfill country on existing rows from each row's own org's current
    # jurisdiction_country, normalized to a 2-letter code.
    rows = conn.execute(sa.text(
        "SELECT h.id, c.jurisdiction_country FROM payroll_holidays h "
        "LEFT JOIN payroll_company_compliance c ON c.organization_id = h.organization_id "
        "WHERE h.country IS NULL"
    )).fetchall()
    for holiday_id, jurisdiction_country in rows:
        code = _normalize_country(jurisdiction_country)
        conn.execute(
            sa.text("UPDATE payroll_holidays SET country = :country WHERE id = :id"),
            {"country": code, "id": holiday_id},
        )
    conn.execute(sa.text("UPDATE payroll_holidays SET category = 'National' WHERE category IS NULL"))

    # Data cleanup: remove the specific rows confirmed to be Indian holidays
    # incorrectly seeded onto org 1342 (jurisdiction: Canada) by the bug this
    # migration's application-code counterpart fixes. Identified by exact id
    # — never touches anything else, including any admin-added holiday.
    conn.execute(sa.text(
        "DELETE FROM payroll_holidays WHERE id IN (12, 13, 14, 15, 16, 17) "
        "AND organization_id = 1342 AND name IN "
        "('Republic Day', 'Ambedkar Jayanti', 'Labour Day', 'Independence Day', 'Gandhi Jayanti', 'Christmas')"
    ))

    existing_indexes = {ix["name"] for ix in inspector.get_indexes("payroll_holidays")}
    existing_uniques = {uc["name"] for uc in inspector.get_unique_constraints("payroll_holidays")}
    if "uq_payroll_holiday_org_date" in existing_uniques:
        op.drop_constraint("uq_payroll_holiday_org_date", "payroll_holidays", type_="unique")
    if "uq_payroll_holiday_org_country_date" not in existing_uniques:
        op.create_unique_constraint(
            "uq_payroll_holiday_org_country_date", "payroll_holidays",
            ["organization_id", "country", "date"],
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_holidays" not in inspector.get_table_names():
        return

    existing_uniques = {uc["name"] for uc in inspector.get_unique_constraints("payroll_holidays")}
    if "uq_payroll_holiday_org_country_date" in existing_uniques:
        op.drop_constraint("uq_payroll_holiday_org_country_date", "payroll_holidays", type_="unique")
    if "uq_payroll_holiday_org_date" not in existing_uniques:
        op.create_unique_constraint(
            "uq_payroll_holiday_org_date", "payroll_holidays", ["organization_id", "date"],
        )

    existing_cols = {c["name"] for c in inspector.get_columns("payroll_holidays")}
    if "category" in existing_cols:
        op.drop_column("payroll_holidays", "category")
    if "country" in existing_cols:
        op.drop_column("payroll_holidays", "country")
