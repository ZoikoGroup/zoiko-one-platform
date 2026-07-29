"""add uan and ifsc columns to payroll_employees

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e6f0
Create Date: 2026-07-27 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a1b2c3d4e6f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'uan' not in cols:
        op.add_column('payroll_employees',
            sa.Column('uan', sa.String(20), nullable=True))
    if 'ifsc' not in cols:
        op.add_column('payroll_employees',
            sa.Column('ifsc', sa.String(20), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_employees')]
    if 'ifsc' in cols:
        op.drop_column('payroll_employees', 'ifsc')
    if 'uan' in cols:
        op.drop_column('payroll_employees', 'uan')
