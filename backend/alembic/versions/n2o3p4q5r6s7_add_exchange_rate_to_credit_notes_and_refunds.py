"""Add exchange_rate column to credit_notes and refunds

Revision ID: n2o3p4q5r6s7
Revises: e4f5a6b7c8d9
Create Date: 2026-07-30

CreditNote and Refund already store `currency` but had no `exchange_rate` column,
so a rate resolved at issuance time (credit_note_service.py / refund_service.py)
was fetched and then silently discarded before persisting — cross-currency credit
notes/refunds had no audit trail for the rate actually used. This mirrors the
existing `exchange_rate Numeric(12,6)` column already on Invoice/Payment/InvoiceItem.
Additive-only: both columns are nullable, no existing column or row is touched.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'n2o3p4q5r6s7'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('credit_notes', sa.Column('exchange_rate', sa.Numeric(12, 6), nullable=True))
    op.add_column('refunds', sa.Column('exchange_rate', sa.Numeric(12, 6), nullable=True))


def downgrade():
    op.drop_column('refunds', 'exchange_rate')
    op.drop_column('credit_notes', 'exchange_rate')
