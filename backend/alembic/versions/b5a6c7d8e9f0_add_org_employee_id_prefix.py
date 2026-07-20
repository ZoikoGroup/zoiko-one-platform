"""add_org_employee_id_prefix

Add ``employee_id_prefix`` to organizations.  Each org gets a stable
2-letter prefix derived from its name at creation time, used for
generating employee IDs like ZO0001, AC0002, etc.

Historical note:
    Employees created before this migration already have ``EMP####``-style
    IDs.  Those values are **NOT** modified by this migration (or ever).
    New employees created after this change use the org-specific prefix.
    The existing EMP-prefixed IDs continue to work because
    ``_generate_employee_id()`` filters by ``LIKE '<prefix>%'`` and will
    not match old EMP values for a non-EMP org.

Revision ID: b5a6c7d8e9f0
Revises: p1a_price_provenance_foundation
Create Date: 2026-07-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b5a6c7d8e9f0"
down_revision: Union[str, None] = "p1a_price_provenance_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# SQL expression that mirrors derive_employee_id_prefix():
#   strip non-alpha, take first 2 chars uppercased, pad with X, fallback OR
_PREFIX_EXPR = """
CASE
  WHEN regexp_replace(organizations.name, '[^A-Za-z]', '', 'g') = ''
    THEN 'OR'
  WHEN length(regexp_replace(organizations.name, '[^A-Za-z]', '', 'g')) = 1
    THEN upper(
      substring(regexp_replace(organizations.name, '[^A-Za-z]', '', 'g') FROM 1 FOR 1)
      || 'X'
    )
  ELSE upper(
    substring(regexp_replace(organizations.name, '[^A-Za-z]', '', 'g') FROM 1 FOR 2)
  )
END
"""


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "organizations" not in tables:
        print("[migrate] Table 'organizations' does not exist yet — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("organizations")}
    if "employee_id_prefix" in existing_cols:
        print("[migrate] Column 'employee_id_prefix' already exists in 'organizations' — skipping")
        return

    # 1. Add nullable column
    op.add_column(
        "organizations",
        sa.Column("employee_id_prefix", sa.String(10), nullable=True),
    )

    # 2. Backfill from org name using the same derivation rule as the code
    conn.execute(
        sa.text(
            f"UPDATE organizations "
            f"SET employee_id_prefix = {_PREFIX_EXPR}"
        )
    )

    # 3. Now that all rows have a value, make it NOT NULL
    op.alter_column("organizations", "employee_id_prefix", nullable=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "organizations" not in tables:
        return
    existing_cols = {c["name"] for c in inspector.get_columns("organizations")}
    if "employee_id_prefix" not in existing_cols:
        return
    op.drop_column("organizations", "employee_id_prefix")
