"""Add leave_request_id and is_half_day to payroll_attendance_records

Revision ID: d9e0f1a2b3c4
Revises: o3p4q5r6s7t8
Create Date: 2026-07-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, None] = "o3p4q5r6s7t8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_attendance_records",
        sa.Column("leave_request_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "payroll_attendance_records",
        sa.Column("is_half_day", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_foreign_key(
        "fk_payroll_attendance_leave_request",
        "payroll_attendance_records",
        "payroll_leave_requests",
        ["leave_request_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_payroll_attendance_records_leave_request_id"),
        "payroll_attendance_records",
        ["leave_request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_payroll_attendance_records_leave_request_id"), table_name="payroll_attendance_records")
    op.drop_constraint("fk_payroll_attendance_leave_request", "payroll_attendance_records", type_="foreignkey")
    op.drop_column("payroll_attendance_records", "is_half_day")
    op.drop_column("payroll_attendance_records", "leave_request_id")
