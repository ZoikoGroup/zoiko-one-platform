"""Add index on payroll_runs (organization_id, period_start)

period_start is the primary filter/order column for the runs list, the
dashboard's month-range filters, and the trend chart's window filter — all
previously did a full table scan of payroll_runs (and the payslip_items
joined through it) with no supporting index.

Revision ID: r5s6t7u8v9w0
Revises: 4e34e83b4956
Create Date: 2026-08-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "r5s6t7u8v9w0"
down_revision: Union[str, None] = "4e34e83b4956"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_payroll_runs_org_period_start", "payroll_runs",
        ["organization_id", "period_start"],
    )


def downgrade() -> None:
    op.drop_index("ix_payroll_runs_org_period_start", table_name="payroll_runs")
