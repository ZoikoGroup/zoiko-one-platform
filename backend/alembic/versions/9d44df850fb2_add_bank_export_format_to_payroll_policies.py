"""add bank_export_format to payroll_policies

Adds the Banking Policy setting that drives the new post-approval bank
transfer file pipeline (app/modules/payroll/bank_export/). Independent of
the older banking integration enable/disable toggles.

Revision ID: 9d44df850fb2
Revises: 8968e9be02e7
Create Date: 2026-07-28 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '9d44df850fb2'
down_revision: Union[str, None] = '8968e9be02e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_policies')]
    if 'bank_export_format' not in cols:
        op.add_column(
            'payroll_policies',
            sa.Column('bank_export_format', sa.String(length=10), nullable=False, server_default='csv'),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_policies')]
    if 'bank_export_format' in cols:
        op.drop_column('payroll_policies', 'bank_export_format')
