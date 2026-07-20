"""Add price provenance fields to quotation_items, contract_items, invoice_items

Revision ID: p1a_price_provenance_foundation
Revises: a16140a46d7c
Create Date: 2026-07-20

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'p1a_price_provenance_foundation'
down_revision = 'a16140a46d7c'
branch_labels = None
depends_on = None

# PriceSource enum values — stored as VARCHAR via CaseInsensitiveEnum
price_source_enum = sa.Enum('CATALOG', 'PRICING_PLAN', 'NEGOTIATED', name='pricesource')


def upgrade():
    # Create the enum type in PostgreSQL
    price_source_enum.create(op.get_bind(), checkfirst=True)

    # quotation_items — add 4 provenance columns
    op.add_column('quotation_items', sa.Column('price_source', sa.String(20), nullable=True))
    op.add_column('quotation_items', sa.Column('pricing_plan_id', sa.Integer(), nullable=True))
    op.add_column('quotation_items', sa.Column('base_price', sa.Numeric(16, 4), nullable=True))
    op.add_column('quotation_items', sa.Column('resolved_price', sa.Numeric(16, 4), nullable=True))
    op.create_foreign_key('fk_quotation_items_pricing_plan', 'quotation_items', 'pricing_plans', ['pricing_plan_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_quotation_items_pricing_plan_id', 'quotation_items', ['pricing_plan_id'])

    # contract_items — add 4 provenance columns
    op.add_column('contract_items', sa.Column('price_source', sa.String(20), nullable=True))
    op.add_column('contract_items', sa.Column('pricing_plan_id', sa.Integer(), nullable=True))
    op.add_column('contract_items', sa.Column('base_price', sa.Numeric(16, 4), nullable=True))
    op.add_column('contract_items', sa.Column('resolved_price', sa.Numeric(16, 4), nullable=True))
    op.create_foreign_key('fk_contract_items_pricing_plan', 'contract_items', 'pricing_plans', ['pricing_plan_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_contract_items_pricing_plan_id', 'contract_items', ['pricing_plan_id'])

    # invoice_items — add 4 provenance columns
    op.add_column('invoice_items', sa.Column('price_source', sa.String(20), nullable=True))
    op.add_column('invoice_items', sa.Column('pricing_plan_id', sa.Integer(), nullable=True))
    op.add_column('invoice_items', sa.Column('base_price', sa.Numeric(16, 4), nullable=True))
    op.add_column('invoice_items', sa.Column('resolved_price', sa.Numeric(16, 4), nullable=True))
    op.create_foreign_key('fk_invoice_items_pricing_plan', 'invoice_items', 'pricing_plans', ['pricing_plan_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_invoice_items_pricing_plan_id', 'invoice_items', ['pricing_plan_id'])


def downgrade():
    # invoice_items — remove provenance columns
    op.drop_index('ix_invoice_items_pricing_plan_id', table_name='invoice_items')
    op.drop_constraint('fk_invoice_items_pricing_plan', 'invoice_items', type_='foreignkey')
    op.drop_column('invoice_items', 'resolved_price')
    op.drop_column('invoice_items', 'base_price')
    op.drop_column('invoice_items', 'pricing_plan_id')
    op.drop_column('invoice_items', 'price_source')

    # contract_items — remove provenance columns
    op.drop_index('ix_contract_items_pricing_plan_id', table_name='contract_items')
    op.drop_constraint('fk_contract_items_pricing_plan', 'contract_items', type_='foreignkey')
    op.drop_column('contract_items', 'resolved_price')
    op.drop_column('contract_items', 'base_price')
    op.drop_column('contract_items', 'pricing_plan_id')
    op.drop_column('contract_items', 'price_source')

    # quotation_items — remove provenance columns
    op.drop_index('ix_quotation_items_pricing_plan_id', table_name='quotation_items')
    op.drop_constraint('fk_quotation_items_pricing_plan', 'quotation_items', type_='foreignkey')
    op.drop_column('quotation_items', 'resolved_price')
    op.drop_column('quotation_items', 'base_price')
    op.drop_column('quotation_items', 'pricing_plan_id')
    op.drop_column('quotation_items', 'price_source')

    # Drop the enum type
    price_source_enum.drop(op.get_bind(), checkfirst=True)
