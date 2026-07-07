"""stub — pre-existing migration from a different environment
that is already applied to the database.

Revision ID: 20ef3eb283c3
Revises: 
Create Date: 2026-07-07

"""
from typing import Sequence, Union

revision: str = "20ef3eb283c3"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
