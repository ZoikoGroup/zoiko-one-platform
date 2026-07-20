"""Add price provenance fields to subscriptions

Revision ID: p1b_sub_prov
Revises: p1a_price_provenance_foundation
Create Date: 2026-07-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'p1b_sub_prov'
down_revision = 'p1a_price_provenance_foundation'
branch_labels = None
depends_on = None


def upgrade():
    # subscriptions — add 5 provenance columns (all nullable)
    op.add_column('subscriptions', sa.Column('product_id', sa.Integer(), nullable=True))
    op.add_column('subscriptions', sa.Column('pricing_plan_id', sa.Integer(), nullable=True))
    op.add_column('subscriptions', sa.Column('price_source', sa.String(20), nullable=True))
    op.add_column('subscriptions', sa.Column('base_price', sa.Numeric(16, 4), nullable=True))
    op.add_column('subscriptions', sa.Column('resolved_price', sa.Numeric(16, 4), nullable=True))

    # FKs
    op.create_foreign_key('fk_subscriptions_product', 'subscriptions', 'products',
                          ['product_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_subscriptions_pricing_plan', 'subscriptions', 'pricing_plans',
                          ['pricing_plan_id'], ['id'], ondelete='SET NULL')

    # Indexes
    op.create_index('ix_subscriptions_product_id', 'subscriptions', ['product_id'])
    op.create_index('ix_subscriptions_pricing_plan_id', 'subscriptions', ['pricing_plan_id'])


def downgrade():
    op.drop_index('ix_subscriptions_pricing_plan_id', table_name='subscriptions')
    op.drop_index('ix_subscriptions_product_id', table_name='subscriptions')
    op.drop_constraint('fk_subscriptions_pricing_plan', 'subscriptions', type_='foreignkey')
    op.drop_constraint('fk_subscriptions_product', 'subscriptions', type_='foreignkey')
    op.drop_column('subscriptions', 'resolved_price')
    op.drop_column('subscriptions', 'base_price')
    op.drop_column('subscriptions', 'price_source')
    op.drop_column('subscriptions', 'pricing_plan_id')
    op.drop_column('subscriptions', 'product_id')
