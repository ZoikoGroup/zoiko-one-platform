"""merge_rc1_release_blocker_heads

Revision ID: 18b181e6d3ad
Revises: a1b2c3d4e5fc, o3p4q5r6s7t8, a9b8c7d6e5f4
Create Date: 2026-07-30 15:42:54.047984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18b181e6d3ad'
down_revision: Union[str, None] = ('a1b2c3d4e5fc', 'o3p4q5r6s7t8', 'a9b8c7d6e5f4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
