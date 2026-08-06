"""merge_venu_payroll_and_dev_heads

Revision ID: f1a2b3c4d5e6
Revises: aa11bb22cc33, c9d0e1f2a3b4, k3l4m5n6o7p8
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = ('aa11bb22cc33', 'c9d0e1f2a3b4', 'k3l4m5n6o7p8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
