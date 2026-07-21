"""merge_heads_price_provenance_and_leave_type

Revision ID: f9e8d7c6b5a4
Revises: c4d5e6f7a8b9, p1a_price_provenance_foundation
Create Date: 2026-07-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f9e8d7c6b5a4'
down_revision: Union[str, None] = ('c4d5e6f7a8b9', 'p1a_price_provenance_foundation')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
