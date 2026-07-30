"""add enterprise jurisdictions table and policy enterprise status columns

Adds the Enterprise Policy onboarding data model: a new
payroll_enterprise_jurisdictions table (one row per org per configured
jurisdiction) plus enterprise_status/enterprise_activated_at columns on
payroll_policies. Purely additive — does not touch any existing payroll
calculation table or column.

Revision ID: 89ef11945135
Revises: 9d44df850fb2
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '89ef11945135'
down_revision: Union[str, None] = '9d44df850fb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    tables = insp.get_table_names()
    if 'payroll_enterprise_jurisdictions' not in tables:
        op.create_table(
            'payroll_enterprise_jurisdictions',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False, index=True),
            sa.Column('country_code', sa.String(length=2), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
            sa.Column('general_config', sa.JSON(), nullable=True),
            sa.Column('compliance_config', sa.JSON(), nullable=True),
            sa.Column('payroll_rules_config', sa.JSON(), nullable=True),
            sa.Column('configured_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('organization_id', 'country_code', name='uq_org_jurisdiction_country'),
        )
        op.create_index(
            'ix_enterprise_jurisdictions_org_status', 'payroll_enterprise_jurisdictions',
            ['organization_id', 'status'],
        )

    cols = [c['name'] for c in insp.get_columns('payroll_policies')]
    if 'enterprise_status' not in cols:
        op.add_column(
            'payroll_policies',
            sa.Column('enterprise_status', sa.String(length=20), nullable=False, server_default='not_configured'),
        )
    if 'enterprise_activated_at' not in cols:
        op.add_column(
            'payroll_policies',
            sa.Column('enterprise_activated_at', sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_policies')]
    if 'enterprise_activated_at' in cols:
        op.drop_column('payroll_policies', 'enterprise_activated_at')
    if 'enterprise_status' in cols:
        op.drop_column('payroll_policies', 'enterprise_status')

    tables = insp.get_table_names()
    if 'payroll_enterprise_jurisdictions' in tables:
        op.drop_table('payroll_enterprise_jurisdictions')
