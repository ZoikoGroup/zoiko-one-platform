"""Add exchange rate fields to BillingConfiguration and currency conversion fields to InvoiceItem

Revision ID: m1n2o3p4q5r6
Revises: f5g6h7j8k9l0
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'm1n2o3p4q5r6'
down_revision = 'f5g6h7j8k9l0'
branch_labels = None
depends_on = None


def upgrade():
    # Add exchange rate fields to billing_configurations table
    op.add_column('billing_configurations', sa.Column('exchange_rate_usd', sa.Numeric(12, 6), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_inr', sa.Numeric(12, 6), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_gbp', sa.Numeric(12, 6), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_eur', sa.Numeric(12, 6), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_aed', sa.Numeric(12, 6), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_updated_by', sa.Integer(), nullable=True))

    # Add currency conversion fields to invoice_items table
    op.add_column('invoice_items', sa.Column('original_currency', sa.String(3), nullable=True))
    op.add_column('invoice_items', sa.Column('original_amount', sa.Numeric(16, 4), nullable=True))
    op.add_column('invoice_items', sa.Column('invoice_currency', sa.String(3), nullable=True))
    op.add_column('invoice_items', sa.Column('exchange_rate', sa.Numeric(12, 6), nullable=True))
    op.add_column('invoice_items', sa.Column('converted_amount', sa.Numeric(16, 4), nullable=True))


def downgrade():
    # Remove currency conversion fields from invoice_items table
    op.drop_column('invoice_items', 'converted_amount')
    op.drop_column('invoice_items', 'exchange_rate')
    op.drop_column('invoice_items', 'invoice_currency')
    op.drop_column('invoice_items', 'original_amount')
    op.drop_column('invoice_items', 'original_currency')

    # Remove exchange rate fields from billing_configurations table
    op.drop_column('billing_configurations', 'exchange_rate_updated_by')
    op.drop_column('billing_configurations', 'exchange_rate_updated_at')
    op.drop_column('billing_configurations', 'exchange_rate_aed')
    op.drop_column('billing_configurations', 'exchange_rate_eur')
    op.drop_column('billing_configurations', 'exchange_rate_gbp')
    op.drop_column('billing_configurations', 'exchange_rate_inr')
    op.drop_column('billing_configurations', 'exchange_rate_usd')