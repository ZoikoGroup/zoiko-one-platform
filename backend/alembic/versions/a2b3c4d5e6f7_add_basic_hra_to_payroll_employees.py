"""add basic and hra columns to payroll_employees

Revision ID: a2b3c4d5e6f7
Revises: 1ee7c69696f3
Create Date: 2026-07-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '1ee7c69696f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'basic' not in cols:
        op.add_column('payroll_employees',
            sa.Column('basic', sa.Numeric(12, 2), nullable=True))
    if 'hra' not in cols:
        op.add_column('payroll_employees',
            sa.Column('hra', sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'basic' in cols:
        op.drop_column('payroll_employees', 'basic')
    if 'hra' in cols:
        op.drop_column('payroll_employees', 'hra')
