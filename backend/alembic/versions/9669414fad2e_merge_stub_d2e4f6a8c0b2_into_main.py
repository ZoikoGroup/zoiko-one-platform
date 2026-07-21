"""merge_stub_d2e4f6a8c0b2_into_main

Revision ID: 9669414fad2e
Revises: d2e4f6a8c0b2, b76e3297a5a8
Create Date: 2026-07-21 15:51:50.703312

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9669414fad2e'
down_revision: Union[str, None] = ('d2e4f6a8c0b2', 'b76e3297a5a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
