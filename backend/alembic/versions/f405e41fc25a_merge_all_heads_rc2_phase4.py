"""merge_all_heads_rc2_phase4

Revision ID: f405e41fc25a
Revises: 89ef11945135, s7t8u9v0w1x2, z5a6b7c8d9e0
Create Date: 2026-07-31 16:31:51.839696

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f405e41fc25a'
down_revision: Union[str, None] = ('89ef11945135', 's7t8u9v0w1x2', 'z5a6b7c8d9e0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
