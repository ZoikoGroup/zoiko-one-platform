"""backfill historical employee_ids from EMP#### to org-prefix format

Employees created before the ``employee_id_prefix`` feature had their IDs
set to ``EMP####``.  This migration reassigns those IDs to use each
organization's stored prefix (e.g. EMP0009 → RU0009 for an org with
prefix "RU").

Revision ID: c7d8e9f0a3b4
Revises: b5a6c7d8e9f0
Create Date: 2026-07-20 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c7d8e9f0a3b4"
down_revision: str = "b5a6c7d8e9f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Fetch all orgs that have a prefix assigned
    orgs = conn.execute(
        sa.text("SELECT id, employee_id_prefix FROM organizations WHERE employee_id_prefix IS NOT NULL")
    ).fetchall()

    for org_id, prefix in orgs:
        # Find all employees in this org whose employee_id starts with something
        # OTHER than the current prefix (i.e. old EMP or other format)
        rows = conn.execute(
            sa.text(
                "SELECT id, employee_id FROM employees "
                "WHERE organization_id = :org_id "
                "AND employee_id IS NOT NULL "
                "AND employee_id NOT LIKE :prefix_pattern"
            ),
            {"org_id": org_id, "prefix_pattern": f"{prefix}%"},
        ).fetchall()

        if not rows:
            continue

        # Determine the current max number under the org prefix
        max_row = conn.execute(
            sa.text(
                "SELECT MAX(CAST(SUBSTRING(employee_id FROM :start FOR LENGTH(employee_id) - :start + 1) AS INTEGER)) "
                "FROM employees "
                "WHERE organization_id = :org_id "
                "AND employee_id LIKE :prefix_pattern"
            ),
            {
                "org_id": org_id,
                "prefix_pattern": f"{prefix}%",
                "start": len(prefix) + 1,
            },
        ).fetchone()
        next_num = (max_row[0] or 0) + 1

        for emp_id, old_eid in rows:
            new_eid = f"{prefix}{next_num:04d}"
            conn.execute(
                sa.text(
                    "UPDATE employees SET employee_id = :new_eid WHERE id = :emp_id"
                ),
                {"new_eid": new_eid, "emp_id": emp_id},
            )
            next_num += 1


def downgrade() -> None:
    # Irreversible — historical EMP IDs cannot be reconstructed.
    pass
