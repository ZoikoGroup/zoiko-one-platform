"""Add email/phone columns to payroll_company_compliance

Lets Company Details auto-populate email/phone from the org's existing
billing profile (BillingConfiguration.billing_email/billing_phone),
alongside the existing name/tax_no/industry/address auto-fill.

Revision ID: d3e4f5a6b7c8h9
Revises: e2f3a4b5c6d7g8
Create Date: 2026-08-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8h9"
down_revision: Union[str, None] = "e2f3a4b5c6d7g8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_company_compliance" not in inspector.get_table_names():
        print("[migrate] Table 'payroll_company_compliance' does not exist — skipping")
        return
    existing_cols = {c["name"] for c in inspector.get_columns("payroll_company_compliance")}
    if "email" not in existing_cols:
        op.add_column("payroll_company_compliance", sa.Column("email", sa.String(255), server_default="", nullable=True))
    if "phone" not in existing_cols:
        op.add_column("payroll_company_compliance", sa.Column("phone", sa.String(50), server_default="", nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_company_compliance" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("payroll_company_compliance")}
    if "email" in existing_cols:
        op.drop_column("payroll_company_compliance", "email")
    if "phone" in existing_cols:
        op.drop_column("payroll_company_compliance", "phone")
