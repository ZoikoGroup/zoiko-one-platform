"""add US/UK payroll columns to payslip_items

Revision ID: c7d8e9f0a2b3
Revises: 1ee7c69696f3
Create Date: 2026-07-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a2b3'
down_revision: Union[str, None] = '1ee7c69696f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = [c['name'] for c in insp.get_columns('payslip_items')]

    new_cols = [
        ('social_security', sa.Numeric(12, 2), 0),
        ('medicare', sa.Numeric(12, 2), 0),
        ('ni_employee', sa.Numeric(12, 2), 0),
        ('employer_social_security', sa.Numeric(12, 2), 0),
        ('employer_medicare', sa.Numeric(12, 2), 0),
        ('employer_pension', sa.Numeric(12, 2), 0),
    ]

    for name, col_type, default in new_cols:
        if name not in cols:
            op.add_column('payslip_items', sa.Column(name, col_type, server_default=str(default), nullable=False))


def downgrade() -> None:
    for name in ['social_security', 'medicare', 'ni_employee',
                  'employer_social_security', 'employer_medicare', 'employer_pension']:
        op.drop_column('payslip_items', name)
