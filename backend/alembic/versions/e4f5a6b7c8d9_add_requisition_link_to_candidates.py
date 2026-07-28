"""add_requisition_link_to_candidates

Adds requisition_id to recruitment_candidates so a candidate can be linked
to the specific job requisition they're applying for. This powers live
candidate counts and filled/openings tracking on requisitions, and lets
hiring a candidate automatically increment the requisition's filled count.

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
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
    if "requisition_id" in existing_cols:
        print("[migrate] Column 'requisition_id' already exists — skipping")
        return

    op.add_column(
        "recruitment_candidates",
        sa.Column("requisition_id", sa.Integer, sa.ForeignKey("recruitment_requisitions.id"), nullable=True),
    )
    op.create_index(
        "ix_recruitment_candidates_requisition_id",
        "recruitment_candidates",
        ["requisition_id"],
    )
    print("[migrate] Added 'requisition_id' to 'recruitment_candidates'")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "recruitment_candidates" not in existing_tables:
        return

    try:
        op.drop_index("ix_recruitment_candidates_requisition_id", table_name="recruitment_candidates")
    except Exception:
        pass
    try:
        op.drop_column("recruitment_candidates", "requisition_id")
    except Exception:
        print("[migrate] Could not drop 'requisition_id' — continuing")
