"""add payroll_attendance_records table

Revision ID: a3b4c5d6e7f8
Revises: 43bf8824775c
Create Date: 2026-07-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "43bf8824775c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payroll_attendance_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("check_in", sa.String(length=10), nullable=True),
        sa.Column("check_out", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="present"),
        sa.Column("hours", sa.String(length=10), nullable=True),
        sa.Column("rewards", sa.Numeric(precision=12, scale=2), nullable=True, server_default=sa.text("0")),
        sa.Column("bonus", sa.Numeric(precision=12, scale=2), nullable=True, server_default=sa.text("0")),
        sa.Column("other_compensation", sa.Numeric(precision=12, scale=2), nullable=True, server_default=sa.text("0")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(["employee_id"], ["payroll_employees.id"], ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payroll_attendance_org_date", "payroll_attendance_records", ["organization_id", "date"])
    op.create_index("ix_payroll_attendance_emp_date", "payroll_attendance_records", ["employee_id", "date"])
    op.create_index(op.f("ix_payroll_attendance_records_id"), "payroll_attendance_records", ["id"], unique=False)
    op.create_index(op.f("ix_payroll_attendance_records_organization_id"), "payroll_attendance_records", ["organization_id"], unique=False)
    op.create_index(op.f("ix_payroll_attendance_records_employee_id"), "payroll_attendance_records", ["employee_id"], unique=False)
    op.create_index(op.f("ix_payroll_attendance_records_date"), "payroll_attendance_records", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payroll_attendance_records_date"), table_name="payroll_attendance_records")
    op.drop_index(op.f("ix_payroll_attendance_records_employee_id"), table_name="payroll_attendance_records")
    op.drop_index(op.f("ix_payroll_attendance_records_organization_id"), table_name="payroll_attendance_records")
    op.drop_index(op.f("ix_payroll_attendance_records_id"), table_name="payroll_attendance_records")
    op.drop_index("ix_payroll_attendance_emp_date", table_name="payroll_attendance_records")
    op.drop_index("ix_payroll_attendance_org_date", table_name="payroll_attendance_records")
    op.drop_table("payroll_attendance_records")
