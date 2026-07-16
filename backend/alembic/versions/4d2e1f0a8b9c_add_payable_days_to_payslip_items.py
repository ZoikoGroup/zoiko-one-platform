"""add payable_days and total_working_days to payslip_items

Revision ID: 4d2e1f0a8b9c
Revises: 481e66cbc30a
Create Date: 2026-07-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '4d2e1f0a8b9c'
down_revision: Union[str, None] = '481e66cbc30a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = [c['name'] for c in insp.get_columns('payslip_items')]

    if 'payable_days' not in cols:
        op.add_column('payslip_items',
            sa.Column('payable_days', sa.Numeric(5, 2), nullable=True))

    if 'total_working_days' not in cols:
        op.add_column('payslip_items',
            sa.Column('total_working_days', sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = [c['name'] for c in insp.get_columns('payslip_items')]

    if 'total_working_days' in cols:
        op.drop_column('payslip_items', 'total_working_days')

    if 'payable_days' in cols:
        op.drop_column('payslip_items', 'payable_days')
