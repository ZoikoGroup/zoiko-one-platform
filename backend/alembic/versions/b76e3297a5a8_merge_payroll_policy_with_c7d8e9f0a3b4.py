"""merge_payroll_policy_with_c7d8e9f0a3b4

Revision ID: b76e3297a5a8
Revises: c7d8e9f0a3b4, z1a2b3c4d5e6
Create Date: 2026-07-21 15:47:52.817896

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b76e3297a5a8'
down_revision: Union[str, None] = ('c7d8e9f0a3b4', 'z1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
