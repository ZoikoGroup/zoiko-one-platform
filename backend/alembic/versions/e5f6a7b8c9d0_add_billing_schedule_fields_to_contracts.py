"""add billing schedule fields to contracts

Revision ID: e5f6a7b8c9d0
Revises: d1e2f3a4b5c6
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add billing schedule fields to contracts table
    op.add_column('contracts', sa.Column('billing_period', sa.String(20), server_default='monthly', nullable=False))
    op.add_column('contracts', sa.Column('billing_day', sa.Integer(), server_default='1', nullable=False))
    op.add_column('contracts', sa.Column('next_billing_date', sa.Date(), nullable=True))
    op.add_column('contracts', sa.Column('payment_terms', sa.String(50), server_default='net_30', nullable=False))


def downgrade() -> None:
    op.drop_column('contracts', 'payment_terms')
    op.drop_column('contracts', 'next_billing_date')
    op.drop_column('contracts', 'billing_day')
    op.drop_column('contracts', 'billing_period')
