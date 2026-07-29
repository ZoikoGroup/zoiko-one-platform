"""merge organization_admin into admin

Converts all existing ORGANIZATION_ADMIN role rows to ADMIN.

The column uses CaseInsensitiveEnum (VARCHAR storage), so this is a
straightforward UPDATE — no ALTER TYPE needed.

Backward-compatible: the Python code still accepts both "admin" and
"organization_admin" during login, JWT generation, route guards, and
permission checks. This migration is safe to apply at any time.

Revision ID: z5a6b7c8d9e0
Revises: a1b2c3d4e5fc
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z5a6b7c8d9e0"
down_revision: Union[str, None] = "a1b2c3d4e5fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE employees SET role = 'ADMIN' WHERE role = 'ORGANIZATION_ADMIN'"
    )


def downgrade() -> None:
    # Restore is not possible because we cannot distinguish which ADMIN rows
    # were originally ORGANIZATION_ADMIN. This is acceptable because:
    # 1. Both values represent the same authority level.
    # 2. The compatibility layer accepts both values transparently.
    # 3. No new ORGANIZATION_ADMIN rows are created after this migration.
    pass
