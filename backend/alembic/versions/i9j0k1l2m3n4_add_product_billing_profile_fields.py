"""add_product_billing_profile_fields

Add brand, billing_frequency, default_discount, invoice_description
to the products table for the Enterprise Product Catalog Billing Profile.

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-07-09 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "i9j0k1l2m3n4"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "products" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("products")}

    if "brand" not in existing_cols:
        op.add_column("products", sa.Column("brand", sa.String(255), nullable=True))
    if "billing_frequency" not in existing_cols:
        op.add_column(
            "products",
            sa.Column(
                "billing_frequency",
                postgresql.VARCHAR(length=50),
                nullable=False,
                server_default="one_time",
            ),
        )
    if "default_discount" not in existing_cols:
        op.add_column(
            "products",
            sa.Column("default_discount", sa.Numeric(5, 2), nullable=False, server_default="0"),
        )
    if "invoice_description" not in existing_cols:
        op.add_column("products", sa.Column("invoice_description", sa.Text(), nullable=True))

    # Create billing_frequency enum type if not exists (for PostgreSQL)
    if "billing_frequency" in existing_cols:
        return

    # For PostgreSQL, ensure the enum type exists
    if conn.dialect.name == "postgresql":
        from sqlalchemy import text
        conn.execute(text("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingfrequency') THEN CREATE TYPE billingfrequency AS ENUM ('one_time', 'monthly', 'quarterly', 'yearly', 'usage_based', 'recurring'); END IF; END $$;"))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "products" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("products")}

    for col in ("invoice_description", "default_discount", "billing_frequency", "brand"):
        if col in existing_cols:
            op.drop_column("products", col)
