"""Stub for missing revision d2e4f6a8c0b2

This revision was previously applied to the database but its migration
file was removed/lost. This is a no-op — all changes were already applied.

Revision ID: d2e4f6a8c0b2
Revises: p1a_price_provenance_foundation
Create Date: 2026-07-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd2e4f6a8c0b2'
down_revision: Union[str, None] = 'p1a_price_provenance_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
