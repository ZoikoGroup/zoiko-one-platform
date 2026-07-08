"""payroll_chain_bridge

Bridge migration — connects the payroll revision chain
(e2f3a4b5c6d7 → f2a3b4c5d6e7 → g1h2i3j4k5l6 → h2i3j4k5l6m7)
to the common ancestor d5e6f7a8b9c0.

This migration is a no-op; it exists only to satisfy the
Alembic revision graph after the merge of two parallel
development branches.

Revision ID: e1f2a3b4c5d6
Revises: d5e6f7a8b9c0
Create Date: 2026-07-02 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
