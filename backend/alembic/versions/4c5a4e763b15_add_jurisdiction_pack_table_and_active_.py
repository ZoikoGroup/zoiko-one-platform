"""add_jurisdiction_pack_table_and_active_pack_id

Revision ID: 4c5a4e763b15
Revises: edfdc7efdbf0
Create Date: 2026-07-10 13:35:14.763099

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '4c5a4e763b15'
down_revision: Union[str, None] = 'edfdc7efdbf0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    if not inspector.has_table("payroll_jurisdiction_packs"):
        op.create_table(
            "payroll_jurisdiction_packs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("pack_id", sa.String(100), nullable=False),
            sa.Column("jurisdiction_country", sa.String(100), nullable=False),
            sa.Column("jurisdiction_state", sa.String(100), nullable=True),
            sa.Column("version", sa.String(20), nullable=False, server_default="1.0"),
            sa.Column("status", sa.String(20), nullable=False, server_default="Draft"),
            sa.Column("effective_from", sa.Date(), nullable=True),
            sa.Column("effective_to", sa.Date(), nullable=True),
            sa.Column("compliance_owner", sa.String(150), server_default=""),
            sa.Column("engineering_owner", sa.String(150), server_default=""),
            sa.Column("source_references", sa.Text(), server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("pack_id", "version", name="uq_jurisdiction_pack_id_version"),
        )
        op.create_index(
            "ix_jurisdiction_packs_country_state",
            "payroll_jurisdiction_packs",
            ["jurisdiction_country", "jurisdiction_state"],
        )

    cols = [c["name"] for c in inspector.get_columns("payroll_company_compliance")]
    if "active_pack_id" not in cols:
        op.add_column(
            "payroll_company_compliance",
            sa.Column("active_pack_id", sa.Integer(), sa.ForeignKey("payroll_jurisdiction_packs.id"), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    cols = [c["name"] for c in inspector.get_columns("payroll_company_compliance")]
    if "active_pack_id" in cols:
        op.drop_column("payroll_company_compliance", "active_pack_id")

    if inspector.has_table("payroll_jurisdiction_packs"):
        # Drop the FK on payroll_company_compliance first if it exists
        op.drop_constraint(
            "payroll_company_compliance_active_pack_id_fkey",
            "payroll_company_compliance",
            type_="foreignkey",
        )
        op.drop_index("ix_jurisdiction_packs_country_state", table_name="payroll_jurisdiction_packs")
        op.drop_constraint("uq_jurisdiction_pack_id_version", "payroll_jurisdiction_packs", type_="unique")
        op.drop_table("payroll_jurisdiction_packs")
