"""Clean up duplicate auto_refresh_exchange_rates column in billing_configurations

Drops the legacy duplicate column 'auto_refresh_exchange_rates' that was
created by Base.metadata.create_all() alongside the migration-created
'exchange_rate_auto_refresh' column.

Revision ID: a1b2c3d4e5f9
Revises: f6a7b8c9d0e1
Create Date: 2026-07-14

NOTE: Revision was renamed from a1b2c3d4e5f8 to a1b2c3d4e5f9 to resolve
a duplicate-revision conflict with a1b2c3d4e5f8_merge_heads_add_payable_days.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "a1b2c3d4e5f9"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    if "billing_configurations" not in inspector.get_table_names():
        print("[migrate] Table 'billing_configurations' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    # Drop duplicate legacy column
    if "auto_refresh_exchange_rates" in existing_cols:
        op.drop_column("billing_configurations", "auto_refresh_exchange_rates")
        print("[migrate] Dropped duplicate column 'auto_refresh_exchange_rates' from 'billing_configurations'")
    else:
        print("[migrate] Column 'auto_refresh_exchange_rates' does not exist — skipping")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    if "billing_configurations" not in inspector.get_table_names():
        print("[migrate] Table 'billing_configurations' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    if "auto_refresh_exchange_rates" not in existing_cols:
        op.add_column(
            "billing_configurations",
            sa.Column("auto_refresh_exchange_rates", sa.Boolean(), server_default="false"),
        )
        print("[migrate] Restored column 'auto_refresh_exchange_rates' to 'billing_configurations'")
