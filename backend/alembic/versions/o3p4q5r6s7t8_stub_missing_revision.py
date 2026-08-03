"""stub — placeholder for missing revision o3p4q5r6s7t8

Revision ID: o3p4q5r6s7t8
Revises: 89ef11945135, e4f5a6b7c8d9, z5a6b7c8d9e0
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o3p4q5r6s7t8"
down_revision: Union[str, None] = ("89ef11945135", "e4f5a6b7c8d9", "z5a6b7c8d9e0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
