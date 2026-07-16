"""merge heads and add missing payslip_items columns

Revision ID: a1b2c3d4e5f8
Revises: 4d2e1f0a8b9c, 5d6e7f8a9b0c, 8f3f0f2b2a1c, z0a1b2c3d4e5
Create Date: 2026-07-15 10:00:00.000000

Merges all outstanding heads into a single linear graph and ensures
the payslip_items table has the payable_days and total_working_days
columns that the model expects.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f8"
down_revision: Union[str, Sequence[str], None] = (
    "4d2e1f0a8b9c",
    "5d6e7f8a9b0c",
    "8f3f0f2b2a1c",
    "z0a1b2c3d4e5",
)
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
