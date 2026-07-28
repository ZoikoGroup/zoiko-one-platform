"""add_onboarding_link_to_candidates

Adds onboarding_new_hire_id to recruitment_candidates so a candidate that
has been hired can be linked directly to the onboarding record created for
them, connecting the Recruitment and Onboarding modules end to end.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "recruitment_candidates" not in existing_tables:
        print("[migrate] Table 'recruitment_candidates' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("recruitment_candidates")}
    if "onboarding_new_hire_id" in existing_cols:
        print("[migrate] Column 'onboarding_new_hire_id' already exists — skipping")
        return

    op.add_column(
        "recruitment_candidates",
        sa.Column("onboarding_new_hire_id", sa.Integer, sa.ForeignKey("onboarding_new_hires.id"), nullable=True),
    )
    print("[migrate] Added 'onboarding_new_hire_id' to 'recruitment_candidates'")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "recruitment_candidates" not in existing_tables:
        return

    try:
        op.drop_column("recruitment_candidates", "onboarding_new_hire_id")
    except Exception:
        print("[migrate] Could not drop 'onboarding_new_hire_id' — continuing")
