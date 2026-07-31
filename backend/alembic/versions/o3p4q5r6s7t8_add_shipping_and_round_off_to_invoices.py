"""Add shipping_amount and round_off columns to invoices

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
Create Date: 2026-07-30

The invoice creation wizard already lets a user enter a Shipping amount and a
Round Off adjustment and reflects them in the on-screen total, but neither was
ever persisted — the Invoice table had no columns for them, so the total the
user approved on screen silently differed from what was actually saved. This
adds the two missing columns (additive, nullable, server-side defaulted to 0
so existing invoices read as "no shipping / no round-off" rather than NULL).
No existing column, table, or row is touched.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'o3p4q5r6s7t8'
down_revision = 'n2o3p4q5r6s7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('invoices', sa.Column('shipping_amount', sa.Numeric(14, 2), nullable=True, server_default='0'))
    op.add_column('invoices', sa.Column('round_off', sa.Numeric(14, 2), nullable=True, server_default='0'))


def downgrade():
    op.drop_column('invoices', 'round_off')
    op.drop_column('invoices', 'shipping_amount')
