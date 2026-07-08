"""Add organization_id to payroll_runs and payslip_items

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-07-02 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # --- payroll_runs ---
    cols = [c['name'] for c in insp.get_columns('payroll_runs')]
    if 'organization_id' not in cols:
        op.add_column('payroll_runs', sa.Column('organization_id', sa.Integer(), nullable=True))

    idx_names = [i['name'] for i in insp.get_indexes('payroll_runs')]
    if op.f('ix_payroll_runs_organization_id') not in idx_names:
        op.create_index(op.f('ix_payroll_runs_organization_id'), 'payroll_runs', ['organization_id'], unique=False)

    fk_names = [fk['name'] for fk in insp.get_foreign_keys('payroll_runs')]
    if 'fk_payroll_runs_organization_id' not in fk_names:
        op.create_foreign_key('fk_payroll_runs_organization_id', 'payroll_runs', 'organizations', ['organization_id'], ['id'])

    # --- payslip_items ---
    cols = [c['name'] for c in insp.get_columns('payslip_items')]
    if 'organization_id' not in cols:
        op.add_column('payslip_items', sa.Column('organization_id', sa.Integer(), nullable=True))

    idx_names = [i['name'] for i in insp.get_indexes('payslip_items')]
    if op.f('ix_payslip_items_organization_id') not in idx_names:
        op.create_index(op.f('ix_payslip_items_organization_id'), 'payslip_items', ['organization_id'], unique=False)

    fk_names = [fk['name'] for fk in insp.get_foreign_keys('payslip_items')]
    if 'fk_payslip_items_organization_id' not in fk_names:
        op.create_foreign_key('fk_payslip_items_organization_id', 'payslip_items', 'organizations', ['organization_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_payslip_items_organization_id', 'payslip_items', type_='foreignkey')
    op.drop_index(op.f('ix_payslip_items_organization_id'), table_name='payslip_items')
    op.drop_column('payslip_items', 'organization_id')

    op.drop_constraint('fk_payroll_runs_organization_id', 'payroll_runs', type_='foreignkey')
    op.drop_index(op.f('ix_payroll_runs_organization_id'), table_name='payroll_runs')
    op.drop_column('payroll_runs', 'organization_id')