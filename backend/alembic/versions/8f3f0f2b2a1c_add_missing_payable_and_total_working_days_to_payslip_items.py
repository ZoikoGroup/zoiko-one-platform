"""Add missing payable_days and total_working_days columns on payslip_items

Revision ID: 8f3f0f2b2a1c
Revises: h2i3j4k5l6m7
Create Date: 2026-07-14

This migration is intentionally idempotent: it checks for the presence of
columns before attempting to add/drop them.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "8f3f0f2b2a1c"
down_revision: Union[str, None] = "h2i3j4k5l6m7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("payslip_items")}

    if "payable_days" not in cols:
        op.add_column(
            "payslip_items",
            sa.Column("payable_days", sa.Numeric(5, 2), nullable=True),
        )

    if "total_working_days" not in cols:
        op.add_column(
            "payslip_items",
            sa.Column("total_working_days", sa.Numeric(5, 2), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("payslip_items")}

    if "total_working_days" in cols:
        op.drop_column("payslip_items", "total_working_days")

    if "payable_days" in cols:
        op.drop_column("payslip_items", "payable_days")

