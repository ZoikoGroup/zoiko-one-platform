"""merge leave_allocations and previous heads

Revision ID: 20ef3eb283c3
Revises: b4c5d6e7f8g9, e8253a54731d
Create Date: 2026-07-06 15:19:06.294180

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20ef3eb283c3'
down_revision: Union[str, None] = ('b4c5d6e7f8g9', 'e8253a54731d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
