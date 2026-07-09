"""add_product_settings_fields

Add product-specific settings columns to billing_configurations table.
Ensures the Product Settings page can persist its configuration.

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8j9k0l1
Create Date: 2026-07-08 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "f6g7h8j9k0l1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "billing_configurations" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    columns = [
        ("product_numbering_prefix", sa.String(20), "PROD-"),
        ("product_numbering_format", sa.String(100), "{PREFIX}{NUMBER}"),
        ("default_product_currency", sa.String(3), "USD"),
        ("default_category_id", sa.Integer(), None),
        ("default_tax_rate", sa.String(50), None),
        ("max_discount_percentage", sa.Numeric(5, 2), None),
        ("usage_billing_unit", sa.String(50), "unit"),
        ("usage_billing_rounding", sa.String(20), "nearest"),
        ("auto_archive_days", sa.Integer(), None),
        ("product_visibility", sa.String(20), "visible"),
        ("require_sku", sa.String(10), "no"),
    ]

    for col_name, col_type, default in columns:
        if col_name not in existing_cols:
            op.add_column(
                "billing_configurations",
                sa.Column(col_name, col_type, nullable=True),
            )
            if default is not None:
                op.execute(
                    f"UPDATE billing_configurations SET {col_name} = '{default}' "
                    f"WHERE {col_name} IS NULL"
                )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "billing_configurations" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    drop_cols = [
        "product_numbering_prefix",
        "product_numbering_format",
        "default_product_currency",
        "default_category_id",
        "default_tax_rate",
        "max_discount_percentage",
        "usage_billing_unit",
        "usage_billing_rounding",
        "auto_archive_days",
        "product_visibility",
        "require_sku",
    ]

    for col_name in drop_cols:
        if col_name in existing_cols:
            op.drop_column("billing_configurations", col_name)
