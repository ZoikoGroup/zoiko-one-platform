"""add payroll_leave_requests table

Revision ID: d1e2f3a4b5c6
Revises: c4d5e6f7a8b9
Create Date: 2026-07-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payroll_leave_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("leave_type", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("days", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["payroll_employees.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["payroll_employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_payroll_leave_req_org",
        "payroll_leave_requests",
        ["organization_id"],
    )
    op.create_index(
        "ix_payroll_leave_req_status",
        "payroll_leave_requests",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_payroll_leave_requests_employee_id",
        "payroll_leave_requests",
        ["employee_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_payroll_leave_requests_employee_id", table_name="payroll_leave_requests")
    op.drop_index("ix_payroll_leave_req_status", table_name="payroll_leave_requests")
    op.drop_index("ix_payroll_leave_req_org", table_name="payroll_leave_requests")
    op.drop_table("payroll_leave_requests")
