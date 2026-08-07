"""make_org_employee_id_prefix_nullable

Align ``organizations.employee_id_prefix`` with the ORM model
(``nullable=True`` in ``hr/models.py``).  The column was set ``NOT NULL`` by
``b5a6c7d8e9f0`` but several code paths create an Organization without a
prefix (super-admin create org, startup seed, tests), and the service layer
defaults to ``"OR"`` at ID-generation time.  Keeping it nullable lets those
paths succeed while preserving the backfilled values on existing rows.

Revision ID: c5e6d7f8a9b0
Revises: aa11bb22cc33
Create Date: 2026-08-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c5e6d7f8a9b0"
down_revision: Union[str, None] = "aa11bb22cc33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "organizations" not in tables:
        print("[migrate] Table 'organizations' does not exist yet — skipping")
        return
    cols = {c["name"]: c for c in inspector.get_columns("organizations")}
    if "employee_id_prefix" not in cols:
        print("[migrate] Column 'employee_id_prefix' missing — skipping")
        return
    nullable = cols["employee_id_prefix"]["nullable"]
    if nullable:
        print("[migrate] Column 'employee_id_prefix' already nullable — skipping")
        return
    op.alter_column("organizations", "employee_id_prefix", nullable=True)
    print("[migrate] Made organizations.employee_id_prefix nullable")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "organizations" not in tables:
        return
    cols = {c["name"]: c for c in inspector.get_columns("organizations")}
    if "employee_id_prefix" not in cols:
        return
    conn.execute(
        sa.text("UPDATE organizations SET employee_id_prefix = 'OR' "
                "WHERE employee_id_prefix IS NULL")
    )
    op.alter_column("organizations", "employee_id_prefix", nullable=False)
