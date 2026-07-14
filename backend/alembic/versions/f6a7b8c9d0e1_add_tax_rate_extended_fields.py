"""Add country_code, currency_code, tax_type_label, priority, is_default to tax_rates

Revision ID: f6a7b8c9d0e1
Revises: b2c3d4e5f6a7
Create Date: 2026-07-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUMN_DEFS = [
    ("country_code", sa.String(2), True, None),
    ("currency_code", sa.String(3), True, None),
    ("tax_type_label", sa.String(50), True, None),
    ("priority", sa.Integer(), True, "0"),
    ("is_default", sa.Boolean(), True, "false"),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if "tax_rates" not in inspector.get_table_names():
        print("[migrate] Table 'tax_rates' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("tax_rates")}

    for col_name, col_type, nullable, server_default in COLUMN_DEFS:
        if col_name not in existing_cols:
            kw = {"type_": col_type, "nullable": nullable}
            if server_default is not None:
                kw["server_default"] = server_default
            op.add_column("tax_rates", sa.Column(col_name, **kw))
            print(f"[migrate] Added column '{col_name}' to 'tax_rates'")
        else:
            print(f"[migrate] Column '{col_name}' already exists in 'tax_rates'")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    if "tax_rates" not in inspector.get_table_names():
        print("[migrate] Table 'tax_rates' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("tax_rates")}

    for col_name, _, _, _ in COLUMN_DEFS:
        if col_name in existing_cols:
            op.drop_column("tax_rates", col_name)
            print(f"[migrate] Dropped column '{col_name}' from 'tax_rates'")
