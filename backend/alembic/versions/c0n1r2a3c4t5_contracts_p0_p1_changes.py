"""Add currency, quotation_id to contracts, create contract_items table

Revision ID: c0n1r2a3c4t5
Revises: m1n2o3p4q5r6
Create Date: 2026-07-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c0n1r2a3c4t5"
down_revision = "m1n2o3p4q5r6"
branch_labels = None
depends_on = None


def upgrade():
    # Add currency column to contracts
    op.add_column("contracts", sa.Column("currency", sa.String(3), nullable=True))
    op.execute("UPDATE contracts SET currency = 'USD' WHERE currency IS NULL")
    op.alter_column("contracts", "currency", nullable=False, server_default="USD")

    # Add quotation_id FK to contracts
    op.add_column("contracts", sa.Column("quotation_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_contracts_quotation_id",
        "contracts", "quotations",
        ["quotation_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_contracts_quotation_id", "contracts", ["quotation_id"])

    # Create contract_items table
    op.create_table(
        "contract_items",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False, default=1),
        sa.Column("unit_price", sa.Numeric(16, 4), nullable=False),
        sa.Column("discount_percentage", sa.Numeric(5, 2), default=0),
        sa.Column("discount_amount", sa.Numeric(14, 2), default=0),
        sa.Column("tax_percentage", sa.Numeric(5, 2), default=0),
        sa.Column("tax_amount", sa.Numeric(14, 2), default=0),
        sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("is_tax_inclusive", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("contract_id", "line_number", name="uq_contract_items_contract_line"),
        sa.CheckConstraint("quantity > 0", name="ck_contract_items_qty"),
        sa.CheckConstraint("unit_price >= 0", name="ck_contract_items_price"),
    )


def downgrade():
    op.drop_table("contract_items")
    op.drop_index("ix_contracts_quotation_id", table_name="contracts")
    op.drop_constraint("fk_contracts_quotation_id", "contracts", type_="foreignkey")
    op.drop_column("contracts", "quotation_id")
    op.drop_column("contracts", "currency")
