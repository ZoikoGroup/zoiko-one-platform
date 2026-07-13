"""add additional_compensation to payslip_items

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a2b3
Create Date: 2026-07-13 13:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = 'd8e9f0a1b2c3'
down_revision: Union[str, None] = 'c7d8e9f0a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = [c['name'] for c in insp.get_columns('payslip_items')]

    if 'additional_compensation' not in cols:
        op.add_column('payslip_items', sa.Column('additional_compensation', sa.Numeric(12, 2), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('payslip_items', 'additional_compensation')
