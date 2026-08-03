"""Merge PayrollEmployee first_name/last_name into a single name column

Adds payroll_employees.name, backfills it from
TRIM(first_name || ' ' || last_name) for existing rows, then drops
first_name/last_name. Scoped only to the payroll module's own
PayrollEmployee — the separate core HR/auth Employee table (employees)
keeps its first_name/last_name untouched.

Revision ID: e2f3a4b5c6d7g8
Revises: b7c8d9e0f1a2
Create Date: 2026-08-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2f3a4b5c6d7g8"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_employees" not in inspector.get_table_names():
        print("[migrate] Table 'payroll_employees' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("payroll_employees")}
    if "name" not in existing_cols:
        op.add_column("payroll_employees", sa.Column("name", sa.String(200), nullable=True))

    if "first_name" in existing_cols and "last_name" in existing_cols:
        conn.execute(sa.text(
            "UPDATE payroll_employees SET name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) "
            "WHERE name IS NULL"
        ))
        op.alter_column("payroll_employees", "name", nullable=False)
        op.drop_column("payroll_employees", "first_name")
        op.drop_column("payroll_employees", "last_name")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_employees" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("payroll_employees")}
    if "first_name" not in existing_cols:
        op.add_column("payroll_employees", sa.Column("first_name", sa.String(100), nullable=True))
    if "last_name" not in existing_cols:
        op.add_column("payroll_employees", sa.Column("last_name", sa.String(100), nullable=True))
    if "name" in existing_cols:
        conn.execute(sa.text(
            "UPDATE payroll_employees SET "
            "first_name = SPLIT_PART(name, ' ', 1), "
            "last_name = TRIM(SUBSTR(name, LENGTH(SPLIT_PART(name, ' ', 1)) + 1)) "
            "WHERE first_name IS NULL"
        ))
        op.drop_column("payroll_employees", "name")
