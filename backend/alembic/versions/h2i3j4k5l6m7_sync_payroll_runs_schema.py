"""Sync payroll_runs table schema with current model

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-07-02 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'h2i3j4k5l6m7'
down_revision: Union[str, None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to payroll_runs
    op.add_column('payroll_runs', sa.Column('pay_date', sa.Date(), nullable=True))
    op.add_column('payroll_runs', sa.Column('employee_count', sa.Integer(), server_default='0', nullable=True))
    op.add_column('payroll_runs', sa.Column('total_deductions', sa.Numeric(14, 2), server_default='0', nullable=True))
    op.add_column('payroll_runs', sa.Column('total_taxes', sa.Numeric(14, 2), server_default='0', nullable=True))
    op.add_column('payroll_runs', sa.Column('total_employer_contribution', sa.Numeric(14, 2), server_default='0', nullable=True))
    op.add_column('payroll_runs', sa.Column('approved_by', sa.Integer(), nullable=True))
    op.add_column('payroll_runs', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))

    # Change status from native ENUM to VARCHAR(20)
    op.execute("ALTER TABLE payroll_runs ALTER COLUMN status TYPE VARCHAR(20) USING status::text")

    # Drop old enum type
    op.execute("DROP TYPE IF EXISTS payrollstatus")

    # Add composite index
    op.create_index('ix_payroll_runs_org_status', 'payroll_runs', ['organization_id', 'status'])

    # Add foreign key for approved_by
    op.create_foreign_key('fk_payroll_runs_approved_by', 'payroll_runs', 'employees', ['approved_by'], ['id'])


def downgrade() -> None:
    # Drop foreign key
    op.drop_constraint('fk_payroll_runs_approved_by', 'payroll_runs', type_='foreignkey')

    # Drop index
    op.drop_index('ix_payroll_runs_org_status', table_name='payroll_runs')

    # Restore enum type (re-create it as it was before)
    payrollstatus = postgresql.ENUM('DRAFT', 'PROCESSING', 'COMPLETED', 'PAID', name='payrollstatus')
    payrollstatus.create(op.get_bind())
    op.execute("ALTER TABLE payroll_runs ALTER COLUMN status TYPE payrollstatus USING status::payrollstatus")

    # Drop added columns
    op.drop_column('payroll_runs', 'approved_at')
    op.drop_column('payroll_runs', 'approved_by')
    op.drop_column('payroll_runs', 'total_employer_contribution')
    op.drop_column('payroll_runs', 'total_taxes')
    op.drop_column('payroll_runs', 'total_deductions')
    op.drop_column('payroll_runs', 'employee_count')
    op.drop_column('payroll_runs', 'pay_date')
