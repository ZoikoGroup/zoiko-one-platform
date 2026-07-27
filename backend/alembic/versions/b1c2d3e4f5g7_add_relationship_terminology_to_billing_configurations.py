"""add_relationship_terminology_to_billing_configurations

Add relationship_terminology column to billing_configurations table.
Sets default value to 'customer' for existing rows.

Revision ID: b1c2d3e4f5g7
Revises: a1b2c3d4e6f0
Create Date: 2026-07-27 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5g7"
down_revision: Union[str, None] = "a1b2c3d4e6f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "billing_configurations" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    if "relationship_terminology" not in existing_cols:
        op.add_column(
            "billing_configurations",
            sa.Column("relationship_terminology", sa.String(20), nullable=True, server_default="customer"),
        )
        op.execute(
            "UPDATE billing_configurations SET relationship_terminology = 'customer' WHERE relationship_terminology IS NULL"
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "billing_configurations" not in existing_tables:
        return

    existing_cols = {c["name"] for c in inspector.get_columns("billing_configurations")}

    if "relationship_terminology" in existing_cols:
        op.drop_column("billing_configurations", "relationship_terminology")
