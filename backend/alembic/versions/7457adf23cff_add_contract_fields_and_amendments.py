"""add_contract_fields_and_amendments

Revision ID: 7457adf23cff
Revises: c4e5b485a33e
Create Date: 2026-07-16 10:16:03.888136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import reflection

# revision identifiers, used by Alembic.
revision: str = '7457adf23cff'
down_revision: Union[str, None] = 'c4e5b485a33e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = reflection.Inspector.from_engine(bind)
    tables = insp.get_table_names()

    # 1. Create contract_amendments table if not exists
    if 'contract_amendments' not in tables:
        op.create_table('contract_amendments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('organization_id', sa.Integer(), nullable=False),
            sa.Column('contract_id', sa.Integer(), nullable=False),
            sa.Column('amendment_number', sa.Integer(), nullable=False),
            sa.Column('amendment_date', sa.Date(), nullable=False),
            sa.Column('effective_date', sa.Date(), nullable=False),
            sa.Column('reason', sa.String(length=1000), nullable=True),
            sa.Column('changed_by', sa.Integer(), nullable=True),
            sa.Column('previous_values', sa.JSON(), nullable=True),
            sa.Column('new_values', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['changed_by'], ['employees.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('contract_id', 'amendment_number', name='uq_contract_amendments_number')
        )
        op.create_index(op.f('ix_contract_amendments_amendment_date'), 'contract_amendments', ['amendment_date'], unique=False)
        op.create_index(op.f('ix_contract_amendments_contract_id'), 'contract_amendments', ['contract_id'], unique=False)
        op.create_index(op.f('ix_contract_amendments_effective_date'), 'contract_amendments', ['effective_date'], unique=False)
        op.create_index(op.f('ix_contract_amendments_id'), 'contract_amendments', ['id'], unique=False)
        op.create_index(op.f('ix_contract_amendments_organization_id'), 'contract_amendments', ['organization_id'], unique=False)
    else:
        print("Table contract_amendments already exists, skipping create")

    # 2. Add columns to contracts table if not exist
    contract_cols = [c['name'] for c in insp.get_columns('contracts')]
    if 'terminated_reason' not in contract_cols:
        op.add_column('contracts', sa.Column('terminated_reason', sa.Text(), nullable=True))
    if 'contract_version' not in contract_cols:
        op.add_column('contracts', sa.Column('contract_version', sa.Integer(), nullable=False, server_default='1'))

    # 3. Add columns to billing_configurations table if not exist
    billing_cols = [c['name'] for c in insp.get_columns('billing_configurations')]
    new_settings = {
        'default_contract_prefix': sa.Column('default_contract_prefix', sa.String(length=20), nullable=True, server_default='CTR-'),
        'contract_number_format': sa.Column('contract_number_format', sa.String(length=100), nullable=True, server_default='{PREFIX}{NUMBER}'),
        'auto_generate_contract_number': sa.Column('auto_generate_contract_number', sa.Boolean(), nullable=True, server_default='true'),
        'default_notice_period_days': sa.Column('default_notice_period_days', sa.Integer(), nullable=True, server_default='30'),
        'default_contract_term_days': sa.Column('default_contract_term_days', sa.Integer(), nullable=True, server_default='365'),
        'auto_renew_default': sa.Column('auto_renew_default', sa.Boolean(), nullable=True, server_default='false'),
        'default_renewal_term_days': sa.Column('default_renewal_term_days', sa.Integer(), nullable=True, server_default='365'),
        'require_customer_signature': sa.Column('require_customer_signature', sa.Boolean(), nullable=True, server_default='false'),
        'require_org_signature': sa.Column('require_org_signature', sa.Boolean(), nullable=True, server_default='true'),
        'default_terms_and_conditions': sa.Column('default_terms_and_conditions', sa.Text(), nullable=True)
    }

    for col_name, col_obj in new_settings.items():
        if col_name not in billing_cols:
            op.add_column('billing_configurations', col_obj)


def downgrade() -> None:
    # 1. Drop contract_amendments table
    op.drop_index(op.f('ix_contract_amendments_organization_id'), table_name='contract_amendments')
    op.drop_index(op.f('ix_contract_amendments_id'), table_name='contract_amendments')
    op.drop_index(op.f('ix_contract_amendments_effective_date'), table_name='contract_amendments')
    op.drop_index(op.f('ix_contract_amendments_contract_id'), table_name='contract_amendments')
    op.drop_index(op.f('ix_contract_amendments_amendment_date'), table_name='contract_amendments')
    op.drop_table('contract_amendments')

    # 2. Drop columns from contracts table
    op.drop_column('contracts', 'contract_version')
    op.drop_column('contracts', 'terminated_reason')

    # 3. Drop columns from billing_configurations table
    op.drop_column('billing_configurations', 'default_terms_and_conditions')
    op.drop_column('billing_configurations', 'require_org_signature')
    op.drop_column('billing_configurations', 'require_customer_signature')
    op.drop_column('billing_configurations', 'default_renewal_term_days')
    op.drop_column('billing_configurations', 'auto_renew_default')
    op.drop_column('billing_configurations', 'default_contract_term_days')
    op.drop_column('billing_configurations', 'default_notice_period_days')
    op.drop_column('billing_configurations', 'auto_generate_contract_number')
    op.drop_column('billing_configurations', 'contract_number_format')
    op.drop_column('billing_configurations', 'default_contract_prefix')
