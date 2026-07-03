"""add_billing_customer_enterprise_fields

Revision ID: a1b2c3d4e5f7
Revises: f4g5h6j7k8l9
Create Date: 2026-07-03 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "f4g5h6j7k8l9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("billing_customers", sa.Column("legal_name", sa.String(255), nullable=True))
    op.add_column("billing_customers", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("billing_customers", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("billing_customers", sa.Column("alternate_email", sa.String(255), nullable=True))
    op.add_column("billing_customers", sa.Column("mobile", sa.String(30), nullable=True))
    op.add_column("billing_customers", sa.Column("designation", sa.String(100), nullable=True))
    op.add_column("billing_customers", sa.Column("employee_count", sa.Integer(), nullable=True))
    op.add_column("billing_customers", sa.Column("gst_number", sa.String(50), nullable=True))
    op.add_column("billing_customers", sa.Column("vat_number", sa.String(50), nullable=True))
    op.add_column("billing_customers", sa.Column("pan", sa.String(50), nullable=True))
    op.add_column("billing_customers", sa.Column("tin", sa.String(50), nullable=True))
    op.add_column("billing_customers", sa.Column("tax_category", sa.String(50), nullable=True))
    op.add_column("billing_customers", sa.Column("credit_days", sa.Integer(), nullable=True))
    op.add_column("billing_customers", sa.Column("price_list", sa.String(100), nullable=True))
    op.add_column("billing_customers", sa.Column("outstanding_balance", sa.Numeric(14, 2), server_default="0"))
    op.add_column("billing_customers", sa.Column("total_revenue", sa.Numeric(14, 2), server_default="0"))
    op.add_column("billing_customers", sa.Column("total_invoices", sa.Integer(), server_default="0"))
    op.add_column("billing_customers", sa.Column("total_payments", sa.Integer(), server_default="0"))
    op.add_column("billing_customers", sa.Column("lifetime_value", sa.Numeric(14, 2), server_default="0"))
    op.add_column("billing_customers", sa.Column("tags", sa.JSON(), nullable=True))
    op.add_column("billing_customers", sa.Column("custom_fields", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("billing_customers", "custom_fields")
    op.drop_column("billing_customers", "tags")
    op.drop_column("billing_customers", "lifetime_value")
    op.drop_column("billing_customers", "total_payments")
    op.drop_column("billing_customers", "total_invoices")
    op.drop_column("billing_customers", "total_revenue")
    op.drop_column("billing_customers", "outstanding_balance")
    op.drop_column("billing_customers", "price_list")
    op.drop_column("billing_customers", "credit_days")
    op.drop_column("billing_customers", "tax_category")
    op.drop_column("billing_customers", "tin")
    op.drop_column("billing_customers", "pan")
    op.drop_column("billing_customers", "vat_number")
    op.drop_column("billing_customers", "gst_number")
    op.drop_column("billing_customers", "employee_count")
    op.drop_column("billing_customers", "designation")
    op.drop_column("billing_customers", "mobile")
    op.drop_column("billing_customers", "alternate_email")
    op.drop_column("billing_customers", "last_name")
    op.drop_column("billing_customers", "first_name")
    op.drop_column("billing_customers", "legal_name")
