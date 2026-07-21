"""drop_obsolete_auto_refresh_exchange_rates

Corrective migration: removes the obsolete 'auto_refresh_exchange_rates'
column from billing_configurations. This column was supposed to be dropped
by migration a1b2c3d4e5f8 but was never actually executed against the
production database due to an alembic_version desynchronization.

Revision ID: d1e2f3a4b5d0  (renamed from d1e2f3a4b5c6 to fix duplicate)
Revises: 7457adf23cff
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5d0'
down_revision: Union[str, None] = '7457adf23cff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('billing_configurations', 'auto_refresh_exchange_rates')


def downgrade() -> None:
    op.add_column(
        'billing_configurations',
        sa.Column('auto_refresh_exchange_rates', sa.Boolean(), server_default='false', nullable=True),
    )
