"""merge all heads

Revision ID: c4e5b485a33e
Revises: 481e66cbc30a, a1b2c3d4e5f8, c0n1r2a3c4t5, z0a1b2c3d4e5
Create Date: 2026-07-16 10:11:18.966618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e5b485a33e'
down_revision: Union[str, None] = ('481e66cbc30a', 'a1b2c3d4e5f8', 'c0n1r2a3c4t5', 'z0a1b2c3d4e5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
