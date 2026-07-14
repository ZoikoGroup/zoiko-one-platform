"""Add live exchange rate fields to billing_configurations

Revision ID: b2c3d4e5f6a7
Revises: 35b14b01794b
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = '35b14b01794b'
branch_labels = None
depends_on = None


def upgrade():
    # Add Phase 2 live exchange rate fields to billing_configurations
    op.add_column('billing_configurations', sa.Column('exchange_rates', sa.JSON(), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_base_currency', sa.String(3), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_last_refreshed', sa.DateTime(timezone=True), nullable=True))
    op.add_column('billing_configurations', sa.Column('exchange_rate_auto_refresh', sa.Boolean(), server_default='false'))


def downgrade():
    op.drop_column('billing_configurations', 'exchange_rate_auto_refresh')
    op.drop_column('billing_configurations', 'exchange_rate_last_refreshed')
    op.drop_column('billing_configurations', 'exchange_rate_base_currency')
    op.drop_column('billing_configurations', 'exchange_rates')
