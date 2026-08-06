"""merge heads

Revision ID: 4e34e83b4956
Revises: c5e6d7f8a9b0, c9d0e1f2a3b4, e2f3a4b5c6d7g8
Create Date: 2026-08-05 16:22:28.421042

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e34e83b4956'
down_revision: Union[str, None] = ('c5e6d7f8a9b0', 'c9d0e1f2a3b4', 'e2f3a4b5c6d7g8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
