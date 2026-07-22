"""Add billing_country and shipping_country to billing_customers

Revision ID: d7e8f9a0b1c2
Revises: z3a4b5c6d7e8
Create Date: 2026-07-22
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d7e8f9a0b1c2"
down_revision = "z3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "billing_customers",
        sa.Column("billing_country", sa.String(100), nullable=True),
    )
    op.add_column(
        "billing_customers",
        sa.Column("shipping_country", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("billing_customers", "shipping_country")
    op.drop_column("billing_customers", "billing_country")
