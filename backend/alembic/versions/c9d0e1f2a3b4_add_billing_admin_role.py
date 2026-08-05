"""add_billing_admin_role

Revision ID: c9d0e1f2a3b4
Revises: h1b2c3d4e5f6
Create Date: 2026-08-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'h1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# NOTE: Postgres native enum stores the member NAME (uppercase), not the
# Python enum VALUE (lowercase) — must be 'BILLING_ADMIN', not 'billing_admin'.
NEW_ROLE = "BILLING_ADMIN"


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT unnest(enum_range(NULL::userrole))::text")
    ).fetchall()
    existing = {r[0] for r in result}
    if NEW_ROLE not in existing:
        op.execute(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{NEW_ROLE}'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum.
    # This migration is additive only.
    pass
