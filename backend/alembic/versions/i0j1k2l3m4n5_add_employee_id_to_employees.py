"""add_employee_id_to_employees

Add the permanent Employee ID field (e.g., EMP0001) to the employees table.
Each organization has its own sequential numbering.

Revision ID: i0j1k2l3m4n5
Revises: h8i9j0k1l2m3
Create Date: 2026-07-09 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i0j1k2l3m4n5"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "employees" not in tables:
        print("[migrate] Table 'employees' does not exist yet — skipping")
        return

    existing_cols = {c["name"] for c in inspector.get_columns("employees")}
    if "employee_id" in existing_cols:
        print("[migrate] Column 'employee_id' already exists in 'employees' — skipping")
        return

    op.add_column(
        "employees",
        sa.Column("employee_id", sa.String(20), nullable=True, index=True),
    )

    conn.execute(
        sa.text(
            "UPDATE employees e "
            "SET employee_id = sub.new_id "
            "FROM ("
            "  SELECT id, "
            "         'EMP' || LPAD(ROW_NUMBER() OVER ("
            "           PARTITION BY organization_id ORDER BY id"
            "         )::text, 4, '0') AS new_id "
            "  FROM employees"
            ") sub "
            "WHERE e.id = sub.id"
        )
    )

    op.alter_column("employees", "employee_id", nullable=False)
    op.create_unique_constraint(
        "uq_org_employee_id", "employees", ["organization_id", "employee_id"]
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "employees" not in tables:
        return
    existing_cols = {c["name"] for c in inspector.get_columns("employees")}
    if "employee_id" not in existing_cols:
        return
    existing_constraints = [c["name"] for c in inspector.get_unique_constraints("employees")]
    if "uq_org_employee_id" in existing_constraints:
        op.drop_constraint("uq_org_employee_id", "employees", type_="unique")
    op.drop_column("employees", "employee_id")
