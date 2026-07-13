"""add emergency_contacts json column to employees

Revision ID: z0a1b2c3d4e5
Revises: 37013faca880, i9j0k1l2m3n4
Create Date: 2026-07-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "z0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = ("1ee7c69696f3", "37013faca880", "i9j0k1l2m3n4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("employees")}
    if "emergency_contacts" not in cols:
        op.add_column("employees", sa.Column("emergency_contacts", sa.JSON(), nullable=True))
        print("[migrate] Added emergency_contacts column to employees table")


def downgrade() -> None:
    op.drop_column("employees", "emergency_contacts")
