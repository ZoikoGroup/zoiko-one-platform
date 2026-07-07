"""Add leave_balances JSON column to payroll_leave_allocations, drop old leaf columns

Revision ID: a9b0c1d2e3f4
Revises: 20ef3eb283c3
Create Date: 2026-07-07 15:36:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a9b0c1d2e3f4'
down_revision: Union[str, None] = '20ef3eb283c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_leave_allocations",
        sa.Column("leave_balances", postgresql.JSON, nullable=True),
    )
    op.drop_column("payroll_leave_allocations", "paid_leaves")
    op.drop_column("payroll_leave_allocations", "unpaid_leaves")
    op.drop_column("payroll_leave_allocations", "total_leaves_allowed")


def downgrade() -> None:
    op.add_column(
        "payroll_leave_allocations",
        sa.Column("paid_leaves", sa.Numeric(6, 1), nullable=True),
    )
    op.add_column(
        "payroll_leave_allocations",
        sa.Column("unpaid_leaves", sa.Numeric(6, 1), nullable=True),
    )
    op.add_column(
        "payroll_leave_allocations",
        sa.Column("total_leaves_allowed", sa.Numeric(6, 1), nullable=True),
    )
    op.drop_column("payroll_leave_allocations", "leave_balances")
