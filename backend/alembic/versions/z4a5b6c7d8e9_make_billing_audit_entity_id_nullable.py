"""make_billing_audit_entity_id_nullable

Batch-level operations (CatalogImport, bulk Invoice delete) log audit events
that do not reference a single entity.  Making entity_id nullable allows the
database to correctly represent "this event is not associated with any specific
entity" instead of requiring a fake ID.

Consistent with super_admin_audit_logs.entity_id (nullable=True).

Revision ID: z4a5b6c7d8e9
Revises: z3a4b5c6d7e8
Create Date: 2026-07-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "z4a5b6c7d8e9"
down_revision: Union[str, Sequence[str], None] = "z3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "billing_audit_logs",
        "entity_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    # Remove rows that have NULL entity_id before restoring NOT NULL
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM billing_audit_logs WHERE entity_id IS NULL"
        )
    )
    op.alter_column(
        "billing_audit_logs",
        "entity_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
