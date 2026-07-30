"""add designation/date_of_joining/bank_name/uan/ifsc snapshot columns to payslip_items

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-07-27 09:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'f3415fa368ea'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_COLUMNS = [
    ('designation', sa.String(100)),
    ('date_of_joining', sa.Date()),
    ('bank_name', sa.String(100)),
    ('uan', sa.String(20)),
    ('ifsc', sa.String(20)),
]


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payslip_items')]
    for name, col_type in _NEW_COLUMNS:
        if name not in cols:
            op.add_column('payslip_items', sa.Column(name, col_type, nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payslip_items')]
    for name, _ in reversed(_NEW_COLUMNS):
        if name in cols:
            op.drop_column('payslip_items', name)
