"""add archived and suspended to employeestatus enum

The Python EmployeeStatus model defines ARCHIVED and SUSPENDED but the
PostgreSQL enum was never migrated to include them.  This causes 500 errors
when the archive/suspend service functions try to commit.

Revision ID: a1b2c3d4e6f0
Revises: z3a4b5c6d7e8
Create Date: 2026-07-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e6f0"
down_revision: Union[str, None] = "d7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing values to the employeestatus enum (PostgreSQL).
    # Using raw SQL because Alembic's op.alter_column doesn't support
    # PostgreSQL enum value additions directly.
    op.execute("ALTER TYPE employeestatus ADD VALUE IF NOT EXISTS 'suspended'")
    op.execute("ALTER TYPE employeestatus ADD VALUE IF NOT EXISTS 'archived'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # A full downgrade would require recreating the enum — skip for safety.
    pass
