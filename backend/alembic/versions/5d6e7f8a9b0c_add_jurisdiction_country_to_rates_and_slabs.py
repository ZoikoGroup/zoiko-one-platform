"""add_jurisdiction_country_to_contribution_rates_and_tax_slabs

Revision ID: 5d6e7f8a9b0c
Revises: 4c5a4e763b15
Create Date: 2026-07-10 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "5d6e7f8a9b0c"
down_revision: Union[str, None] = "4c5a4e763b15"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    # --- ContributionRate ---
    cols1 = {c["name"] for c in inspector.get_columns("payroll_contribution_rates")}
    if "jurisdiction_country" not in cols1:
        op.add_column(
            "payroll_contribution_rates",
            sa.Column("jurisdiction_country", sa.String(10),
                      nullable=False, server_default="IN"),
        )
    # Drop old unique constraint, add new one that includes country
    op.execute(
        "ALTER TABLE payroll_contribution_rates "
        "DROP CONSTRAINT IF EXISTS uq_contribution_rate_org_component"
    )
    op.create_unique_constraint(
        "uq_contribution_rate_org_country_component",
        "payroll_contribution_rates",
        ["organization_id", "jurisdiction_country", "component_key"],
    )

    # --- TaxSlab ---
    cols2 = {c["name"] for c in inspector.get_columns("payroll_tax_slabs")}
    if "jurisdiction_country" not in cols2:
        op.add_column(
            "payroll_tax_slabs",
            sa.Column("jurisdiction_country", sa.String(10),
                      nullable=False, server_default="IN"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    # --- ContributionRate ---
    cols1 = {c["name"] for c in inspector.get_columns("payroll_contribution_rates")}
    if "jurisdiction_country" in cols1:
        op.drop_constraint(
            "uq_contribution_rate_org_country_component",
            "payroll_contribution_rates",
            type_="unique",
        )
        op.create_unique_constraint(
            "uq_contribution_rate_org_component",
            "payroll_contribution_rates",
            ["organization_id", "component_key"],
        )
        op.drop_column("payroll_contribution_rates", "jurisdiction_country")

    # --- TaxSlab ---
    cols2 = {c["name"] for c in inspector.get_columns("payroll_tax_slabs")}
    if "jurisdiction_country" in cols2:
        op.drop_column("payroll_tax_slabs", "jurisdiction_country")
