"""add_security_action_tokens

Revision ID: aa11bb22cc33
Revises: d09221f9281a, h1b2c3d4e5f6, o3p4q5r6s7t8, o3p4q5r6s7t9
Create Date: 2026-08-04 07:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aa11bb22cc33"
down_revision: Union[str, None] = (
    "d09221f9281a",
    "h1b2c3d4e5f6",
    "o3p4q5r6s7t8",
    "o3p4q5r6s7t9",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "security_action_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("purpose", sa.String(length=50), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
    )
    op.create_index("ix_security_action_tokens_id", "security_action_tokens", ["id"])
    op.create_index("ix_security_action_tokens_email", "security_action_tokens", ["email"])
    op.create_index("ix_security_action_tokens_token_hash", "security_action_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_security_action_tokens_token_hash", table_name="security_action_tokens")
    op.drop_index("ix_security_action_tokens_email", table_name="security_action_tokens")
    op.drop_index("ix_security_action_tokens_id", table_name="security_action_tokens")
    op.drop_table("security_action_tokens")
