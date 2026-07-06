"""Add payroll_employees, payroll_activities, company_compliance tables

Revision ID: e2f3a4b5c6d7
Revises: e1f2a3b4c5d6
Create Date: 2026-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('payroll_employees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_code', sa.String(length=20), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('designation', sa.String(length=100), nullable=True),
        sa.Column('employment_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='Active', nullable=True),
        sa.Column('date_of_joining', sa.Date(), nullable=True),
        sa.Column('ctc', sa.Numeric(14, 2), server_default='0', nullable=True),
        sa.Column('basic', sa.Numeric(14, 2), server_default='0', nullable=True),
        sa.Column('hra', sa.Numeric(14, 2), server_default='0', nullable=True),
        sa.Column('bank_account_number', sa.String(length=50), nullable=True),
        sa.Column('ifsc_code', sa.String(length=20), nullable=True),
        sa.Column('pan_number', sa.String(length=20), nullable=True),
        sa.Column('uan', sa.String(length=20), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('employee_code'),
    )
    op.create_index(op.f('ix_payroll_employees_id'), 'payroll_employees', ['id'], unique=False)
    op.create_index(op.f('ix_payroll_employees_organization_id'), 'payroll_employees', ['organization_id'], unique=False)

    op.create_table('payroll_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='info', nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_payroll_activities_id'), 'payroll_activities', ['id'], unique=False)
    op.create_index(op.f('ix_payroll_activities_organization_id'), 'payroll_activities', ['organization_id'], unique=False)

    op.create_table('company_compliance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=True),
        sa.Column('company_type', sa.String(length=100), nullable=True),
        sa.Column('tax_no', sa.String(length=50), nullable=True),
        sa.Column('employer_id', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('jurisdiction_country', sa.String(length=100), server_default='India', nullable=True),
        sa.Column('jurisdiction_state', sa.String(length=100), nullable=True),
        sa.Column('compliance_pack', sa.String(length=100), server_default='Standard', nullable=True),
        sa.Column('schedule', sa.String(length=50), server_default='Monthly', nullable=True),
        sa.Column('settlement_bank', sa.String(length=100), nullable=True),
        sa.Column('settlement_acc', sa.String(length=50), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id'),
    )
    op.create_index(op.f('ix_company_compliance_id'), 'company_compliance', ['id'], unique=False)
    op.create_index(op.f('ix_company_compliance_organization_id'), 'company_compliance', ['organization_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_company_compliance_organization_id'), table_name='company_compliance')
    op.drop_index(op.f('ix_company_compliance_id'), table_name='company_compliance')
    op.drop_table('company_compliance')
    op.drop_index(op.f('ix_payroll_activities_organization_id'), table_name='payroll_activities')
    op.drop_index(op.f('ix_payroll_activities_id'), table_name='payroll_activities')
    op.drop_table('payroll_activities')
    op.drop_index(op.f('ix_payroll_employees_organization_id'), table_name='payroll_employees')
    op.drop_index(op.f('ix_payroll_employees_id'), table_name='payroll_employees')
    op.drop_table('payroll_employees')
