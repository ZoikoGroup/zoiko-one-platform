"""Sync payroll_employees table schema with current model

Revision ID: g1h2i3j4k5l6
Revises: f2a3b4c5d6e7
Create Date: 2026-07-02 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns
    op.add_column('payroll_employees', sa.Column('bank_name', sa.String(length=100), nullable=True))

    # Rename columns
    op.alter_column('payroll_employees', 'bank_account_number', new_column_name='bank_account')
    op.alter_column('payroll_employees', 'pan_number', new_column_name='pan')

    # Drop columns no longer in the model
    op.drop_column('payroll_employees', 'ifsc_code')
    op.drop_column('payroll_employees', 'uan')
    op.drop_column('payroll_employees', 'basic')
    op.drop_column('payroll_employees', 'hra')

    # Replace unique constraint on employee_code with composite on (organization_id, employee_code)
    op.drop_constraint('payroll_employees_employee_code_key', 'payroll_employees', type_='unique')
    op.create_unique_constraint('uq_payroll_employee_org_code', 'payroll_employees', ['organization_id', 'employee_code'])

    # Add composite index on (organization_id, status)
    op.create_index('ix_payroll_employees_org_status', 'payroll_employees', ['organization_id', 'status'])


def downgrade() -> None:
    # Restore composite index
    op.drop_index('ix_payroll_employees_org_status', table_name='payroll_employees')

    # Restore unique constraint
    op.drop_constraint('uq_payroll_employee_org_code', 'payroll_employees', type_='unique')
    op.create_unique_constraint('payroll_employees_employee_code_key', 'payroll_employees', ['employee_code'])

    # Restore dropped columns
    op.add_column('payroll_employees', sa.Column('hra', sa.Numeric(14, 2), server_default='0', nullable=True))
    op.add_column('payroll_employees', sa.Column('basic', sa.Numeric(14, 2), server_default='0', nullable=True))
    op.add_column('payroll_employees', sa.Column('uan', sa.String(length=20), nullable=True))
    op.add_column('payroll_employees', sa.Column('ifsc_code', sa.String(length=20), nullable=True))

    # Rename columns back
    op.alter_column('payroll_employees', 'pan', new_column_name='pan_number')
    op.alter_column('payroll_employees', 'bank_account', new_column_name='bank_account_number')

    # Drop new columns
    op.drop_column('payroll_employees', 'bank_name')
