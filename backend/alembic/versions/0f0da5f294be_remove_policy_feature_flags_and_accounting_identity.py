"""remove payroll policy feature flags table and accounting/identity integration rows

Removes the payroll-policy-scoped "Feature Flags" tab and the "Accounting"/
"Identity" integration categories. Confirmed via repo-wide grep that
PolicyFeatureFlag/feature_flags is read/written only inside
app/modules/payroll/policy/ (no external readers) before dropping the table.
This does not touch the unrelated platform-wide Identity (Zoiko ID) or
Feature Flags (Operations) pages, which are separate features entirely.

Revision ID: 0f0da5f294be
Revises: f3415fa368ea
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '0f0da5f294be'
down_revision: Union[str, None] = 'f3415fa368ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    tables = insp.get_table_names()
    if 'payroll_policy_integrations' in tables:
        op.execute(
            "DELETE FROM payroll_policy_integrations WHERE category IN ('accounting', 'identity')"
        )
    if 'payroll_policy_feature_flags' in tables:
        op.drop_table('payroll_policy_feature_flags')


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    tables = insp.get_table_names()

    if 'payroll_policy_feature_flags' not in tables:
        op.create_table(
            'payroll_policy_feature_flags',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, index=True),
            sa.Column('flag_key', sa.String(length=40), nullable=False),
            sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.UniqueConstraint('policy_id', 'flag_key', name='uq_policy_feature_flag'),
        )
    # Accounting/Identity integration rows are not recreated on downgrade —
    # they were just seeded defaults, not user data.
