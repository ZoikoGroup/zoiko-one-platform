"""remove employee_id generation

Drop the unique constraint on (organization_id, employee_id) and make
employee_id nullable.  The column stays in the table for backward
compatibility but is no longer auto-generated.

Revision ID: d2e4f6a8c0b2
Revises: c4d5e6f7a8b9, c7d8e9f0a3b4, p1b_sub_prov
Create Date: 2026-07-21 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2e4f6a8c0b2"
down_revision: Union[str, None] = ("c4d5e6f7a8b9", "c7d8e9f0a3b4", "p1b_sub_prov")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_constraints = [c["name"] for c in inspector.get_unique_constraints("employees")]
    if "uq_org_employee_id" in existing_constraints:
        op.drop_constraint("uq_org_employee_id", "employees", type_="unique")

    existing_cols = {c["name"] for c in inspector.get_columns("employees")}
    if "employee_id" in existing_cols:
        op.alter_column("employees", "employee_id", nullable=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_cols = {c["name"] for c in inspector.get_columns("employees")}
    if "employee_id" in existing_cols:
        op.alter_column("employees", "employee_id", nullable=False)
        op.create_unique_constraint(
            "uq_org_employee_id", "employees", ["organization_id", "employee_id"]
        )
