"""add_in_progress_to_requeststatus_enum

The Python RequestStatus model does not define IN_PROGRESS, but the
performance review workflow (pending -> in_progress -> completed -> approved)
needs it. Add IN_PROGRESS to the enum and migrate the PostgreSQL enum type
to include it, following the same pattern used for employeestatus.

SQLAlchemy's Enum type persists native Postgres enum labels using the
Python enum member's NAME (e.g. "PENDING"), not its value ("pending") -
matching the existing labels on this type. The label added here must be
the uppercase name, not the lowercase value.

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f0
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE requeststatus ADD VALUE IF NOT EXISTS 'IN_PROGRESS'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # A full downgrade would require recreating the enum — skip for safety.
    pass
