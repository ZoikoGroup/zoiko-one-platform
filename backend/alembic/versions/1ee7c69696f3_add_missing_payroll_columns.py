"""add missing work_state column to payroll_employees and sync payslip_items schema

Revision ID: 1ee7c69696f3
Revises: 5d6e7f8a9b0c
Create Date: 2026-07-10 15:37:00.329886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '1ee7c69696f3'
down_revision: Union[str, None] = '5d6e7f8a9b0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # ── payroll_employees: add work_state ──
    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'work_state' not in cols:
        op.add_column('payroll_employees',
            sa.Column('work_state', sa.String(length=100), nullable=True))

    # ── payslip_items: add missing columns ──
    cols = [c['name'] for c in insp.get_columns('payslip_items')]
    additions = {
        'employee_name': sa.Column('employee_name', sa.String(length=150), nullable=False,
                                    server_default=''),
        'department': sa.Column('department', sa.String(length=100), nullable=True),
        'bank_account': sa.Column('bank_account', sa.String(length=50), nullable=True),
        'pan': sa.Column('pan', sa.String(length=20), nullable=True),
        'hra': sa.Column('hra', sa.Numeric(12, 2), server_default='0', nullable=True),
        'special_allowance': sa.Column('special_allowance', sa.Numeric(12, 2),
                                        server_default='0', nullable=True),
        'overtime': sa.Column('overtime', sa.Numeric(12, 2), server_default='0', nullable=True),
        'pf': sa.Column('pf', sa.Numeric(12, 2), server_default='0', nullable=True),
        'esi': sa.Column('esi', sa.Numeric(12, 2), server_default='0', nullable=True),
        'professional_tax': sa.Column('professional_tax', sa.Numeric(12, 2),
                                       server_default='0', nullable=True),
        'tds': sa.Column('tds', sa.Numeric(12, 2), server_default='0', nullable=True),
        'total_deductions': sa.Column('total_deductions', sa.Numeric(12, 2),
                                       server_default='0', nullable=True),
        'employer_pf': sa.Column('employer_pf', sa.Numeric(12, 2),
                                  server_default='0', nullable=True),
        'employer_esi': sa.Column('employer_esi', sa.Numeric(12, 2),
                                   server_default='0', nullable=True),
        'status': sa.Column('status', sa.String(length=20),
                             server_default='Pending', nullable=False),
    }
    for name, column in additions.items():
        if name not in cols:
            op.add_column('payslip_items', column)

    # Add index on status
    idx_names = [i['name'] for i in insp.get_indexes('payslip_items')]
    if 'ix_payslip_items_status' not in idx_names:
        op.create_index('ix_payslip_items_status', 'payslip_items', ['status'])

    # Drop old columns no longer in the model
    drops = ['allowances', 'deductions', 'tax', 'is_paid']
    for name in drops:
        if name in cols:
            op.drop_column('payslip_items', name)

    # Create payroll_activity_log table if not exists
    if 'payroll_activity_log' not in insp.get_table_names():
        op.create_table('payroll_activity_log',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('organization_id', sa.Integer(), nullable=True),
            sa.Column('description', sa.String(length=300), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='info', nullable=False),
            sa.Column('actor_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                       nullable=True),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
            sa.ForeignKeyConstraint(['actor_id'], ['employees.id'], ),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_payroll_activity_log_id', 'payroll_activity_log', ['id'])
        op.create_index('ix_payroll_activity_log_organization_id', 'payroll_activity_log',
                        ['organization_id'])
        op.create_index('ix_payroll_activity_log_created_at', 'payroll_activity_log',
                        ['created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # ── payroll_employees: drop work_state ──
    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'work_state' in cols:
        op.drop_column('payroll_employees', 'work_state')

    # ── payslip_items: drop added columns, restore old ones ──
    cols = [c['name'] for c in insp.get_columns('payslip_items')]
    added = ['employee_name', 'department', 'bank_account', 'pan', 'hra',
             'special_allowance', 'overtime', 'pf', 'esi', 'professional_tax',
             'tds', 'total_deductions', 'employer_pf', 'employer_esi', 'status']
    for name in added:
        if name in cols:
            op.drop_column('payslip_items', name)

    restores = {
        'allowances': sa.Column('allowances', sa.Numeric(12, 2), nullable=True),
        'deductions': sa.Column('deductions', sa.Numeric(12, 2), nullable=True),
        'tax': sa.Column('tax', sa.Numeric(12, 2), nullable=True),
        'is_paid': sa.Column('is_paid', sa.Boolean(), nullable=True),
    }
    for name, column in restores.items():
        if name not in cols:
            op.add_column('payslip_items', column)

    # Drop index
    idx_names = [i['name'] for i in insp.get_indexes('payslip_items')]
    if 'ix_payslip_items_status' in idx_names:
        op.drop_index('ix_payslip_items_status', table_name='payslip_items')
