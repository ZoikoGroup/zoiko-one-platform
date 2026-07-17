"""Add currency and notes columns to subscriptions table

Adds the persisted currency column to subscriptions so that recurring
invoices use the subscription's own currency rather than resolving it
dynamically each time. Also adds a notes column for user annotations.

Revision ID: c1d2e3f4a5b6
Revises: b3c4d5e6f7g8, e5f6a7b8c9d0, f6a7b8c9d0e1
Create Date: 2026-07-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add currency column (nullable first for backfill)
    op.add_column('subscriptions', sa.Column('currency', sa.String(3), nullable=True))
    op.create_index('ix_subscriptions_currency', 'subscriptions', ['currency'])

    # Add notes column
    op.add_column('subscriptions', sa.Column('notes', sa.Text(), nullable=True))

    # Backfill currency using priority:
    # Contract currency -> Customer currency -> Organization currency
    # subscription_plans does NOT have a currency column — do not reference it.
    # The final fallback uses the organisation's own currency, never a hard-coded USD.
    op.execute("""
        UPDATE subscriptions s
        SET currency = COALESCE(
            (SELECT c.currency FROM contracts c WHERE c.id = s.contract_id AND c.currency IS NOT NULL),
            (SELECT bc.currency FROM billing_customers bc WHERE bc.id = s.customer_id AND bc.currency IS NOT NULL),
            (SELECT o.currency FROM organizations o WHERE o.id = s.organization_id AND o.currency IS NOT NULL),
            'USD'
        )
        WHERE s.currency IS NULL
    """)


def downgrade() -> None:
    op.drop_index('ix_subscriptions_currency', table_name='subscriptions')
    op.drop_column('subscriptions', 'currency')
    op.drop_column('subscriptions', 'notes')
