"""add_organization_identity_fields

Adds phone, email, postal_code, tax_number, and org_type to the
organizations table. These are already collected by the onboarding
registration form (RegisterRequest) but were previously dropped instead of
being persisted. They are the source fields that
BillingConfigurationService.initialize_from_organization() reads from to
auto-populate Billing defaults for a newly created organization.

Chained after u2v3w4x5y6z7 only (the revision actually applied to this DB
per `alembic current`), not merged with the other pre-existing head
f1a2b3c4d5e6 - that branch (a 3-way merge of aa11bb22cc33/c9d0e1f2a3b4/
k3l4m5n6o7p8) has never been applied here and contains an unrelated,
already-broken migration (a1b2c3d4e5f6j2_add_payroll_custom_fields_and_forms
unconditionally re-adds payroll_employees.custom_fields, which already
exists on this DB). Fixing that cross-branch payroll migration conflict is
out of scope for this organization/billing change, so this revision
deliberately leaves f1a2b3c4d5e6 as the separate, already-pre-existing
dangling head it was before this migration (run `alembic upgrade
p1q2r3s4t5u6` explicitly rather than `alembic upgrade heads` until that
branch is reconciled).

Revision ID: p1q2r3s4t5u6
Revises: u2v3w4x5y6z7
Create Date: 2026-08-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p1q2r3s4t5u6'
down_revision: Union[str, None] = 'u2v3w4x5y6z7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = {c["name"] for c in inspector.get_columns("organizations")}

    columns = [
        ("phone", sa.String(50)),
        ("email", sa.String(255)),
        ("postal_code", sa.String(20)),
        ("tax_number", sa.String(100)),
        ("org_type", sa.String(50)),
    ]
    for col_name, col_type in columns:
        if col_name not in existing:
            op.add_column("organizations", sa.Column(col_name, col_type, nullable=True))
            print(f"[migrate] Added column '{col_name}' to organizations table")
        else:
            print(f"[migrate] Column '{col_name}' already exists in organizations table")


def downgrade() -> None:
    columns = ["phone", "email", "postal_code", "tax_number", "org_type"]
    for col in columns:
        op.drop_column("organizations", col)
