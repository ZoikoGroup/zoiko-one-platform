"""add payroll_leave_allocations table

Revision ID: b4c5d6e7f8g9
Revises: a3b4c5d6e7f8
Create Date: 2026-07-06 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "b4c5d6e7f8g9"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payroll_leave_allocations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("paid_leaves", sa.Numeric(6, 1), nullable=True),
        sa.Column("unpaid_leaves", sa.Numeric(6, 1), nullable=True),
        sa.Column("total_leaves_allowed", sa.Numeric(6, 1), nullable=True),
        sa.Column("period_label", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["payroll_employees.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "employee_id",
            name="uq_payroll_leave_org_emp",
        ),
    )
    op.create_index(
        op.f("ix_payroll_leave_allocations_id"),
        "payroll_leave_allocations",
        ["id"],
    )
    op.create_index(
        op.f("ix_payroll_leave_allocations_organization_id"),
        "payroll_leave_allocations",
        ["organization_id"],
    )
    op.create_index(
        op.f("ix_payroll_leave_allocations_employee_id"),
        "payroll_leave_allocations",
        ["employee_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_payroll_leave_allocations_employee_id"),
        table_name="payroll_leave_allocations",
    )
    op.drop_index(
        op.f("ix_payroll_leave_allocations_organization_id"),
        table_name="payroll_leave_allocations",
    )
    op.drop_index(
        op.f("ix_payroll_leave_allocations_id"),
        table_name="payroll_leave_allocations",
    )
    op.drop_table("payroll_leave_allocations")
