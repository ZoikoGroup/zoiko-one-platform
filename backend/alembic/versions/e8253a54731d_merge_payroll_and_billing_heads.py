"""merge payroll and billing heads

Revision ID: e8253a54731d
Revises: a3b4c5d6e7f8, h2i3j4k5l6m7
Create Date: 2026-07-06 11:45:39.527656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8253a54731d'
down_revision: Union[str, None] = ('a3b4c5d6e7f8', 'h2i3j4k5l6m7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
