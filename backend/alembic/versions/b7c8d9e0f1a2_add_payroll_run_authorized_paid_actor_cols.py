"""Add authorized_by/authorized_at/paid_by columns to payroll_runs

Mirrors the existing approved_by/approved_at pattern so the Authorized and
Paid stages of the run lifecycle can record who advanced them and when,
the same way Approved already does. processed_at (existing column)
continues to double as "paid_at".

Revision ID: b7c8d9e0f1a2
Revises: f4a5b6c7d8e9
Create Date: 2026-08-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_runs" not in inspector.get_table_names():
        print("[migrate] Table 'payroll_runs' does not exist — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("payroll_runs")}
    if "authorized_by" not in existing_cols:
        op.add_column("payroll_runs", sa.Column("authorized_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True))
    if "authorized_at" not in existing_cols:
        op.add_column("payroll_runs", sa.Column("authorized_at", sa.DateTime(timezone=True), nullable=True))
    if "paid_by" not in existing_cols:
        op.add_column("payroll_runs", sa.Column("paid_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "payroll_runs" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("payroll_runs")}
    for col in ["authorized_by", "authorized_at", "paid_by"]:
        if col in existing_cols:
            op.drop_column("payroll_runs", col)
