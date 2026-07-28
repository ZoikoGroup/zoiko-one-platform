"""add_hr_admin_reviewer_to_performance

Adds hr_reviewer_id and admin_reviewer_id columns to
performance_reviews and performance_appraisals tables.

Revision ID: a1b2c3d4e5f0
Revises: b1c2d3e4f5g7
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f0"
down_revision: Union[str, Sequence[str], None] = "b1c2d3e4f5g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ["performance_reviews", "performance_appraisals"]
COLUMNS = [
    ("hr_reviewer_id", sa.Integer, True),
    ("admin_reviewer_id", sa.Integer, True),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    for table in TABLES:
        if table not in existing_tables:
            print(f"[migrate] Table '{table}' does not exist — skipping")
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        for col_name, col_type, nullable in COLUMNS:
            if col_name in existing_cols:
                print(f"[migrate] Column '{col_name}' already exists in '{table}'")
                continue
            op.add_column(
                table,
                sa.Column(col_name, col_type, sa.ForeignKey("employees.id"), nullable=nullable),
            )
            print(f"[migrate] Added '{col_name}' to '{table}'")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    for table in TABLES:
        if table not in existing_tables:
            continue
        for col_name, _, _ in COLUMNS:
            try:
                op.drop_column(table, col_name)
                print(f"[migrate] Dropped '{col_name}' from '{table}'")
            except Exception:
                print(f"[migrate] Could not drop '{col_name}' from '{table}' — continuing")
