"""add_product_image_url

Add image_url column to products table for product image support.

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-07-08 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h8i9j0k1l2m3"
down_revision: Union[str, None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "products" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("products")}

    if "image_url" not in existing_cols:
        op.add_column(
            "products",
            sa.Column("image_url", sa.String(500), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "products" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("products")}

    if "image_url" in existing_cols:
        op.drop_column("products", "image_url")
