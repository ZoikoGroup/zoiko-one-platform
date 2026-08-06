"""Add Payroll onboarding "configured" signals for Policy + Compliance

Adds:
  - payroll_policies.configured_at — set on first explicit admin save
    (mandatory Payroll onboarding gate: distinguishes an auto-seeded default
    policy from one an admin actually configured)
  - payroll_company_compliance.configured_at — set on first explicit admin
    save (same onboarding gate, and doubles as the jurisdiction-lock signal:
    once set, jurisdiction_country can no longer be changed)

Revision ID: k3l4m5n6o7p8
Revises: a1b2c3d4e5f6j2
Create Date: 2026-08-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k3l4m5n6o7p8"
down_revision: Union[str, None] = "a1b2c3d4e5f6j2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_policies",
        sa.Column("configured_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payroll_company_compliance",
        sa.Column("configured_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payroll_company_compliance", "configured_at")
    op.drop_column("payroll_policies", "configured_at")
