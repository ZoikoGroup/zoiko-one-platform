"""merge_heads

Revision ID: edfdc7efdbf0
Revises: 37013faca880, i9j0k1l2m3n4
Create Date: 2026-07-10 13:34:38.586549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'edfdc7efdbf0'
down_revision: Union[str, None] = ('37013faca880', 'i9j0k1l2m3n4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
