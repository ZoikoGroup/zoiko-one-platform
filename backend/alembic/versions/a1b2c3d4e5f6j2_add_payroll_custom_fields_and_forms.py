"""Add payroll custom fields + Send Template data-collection forms

Adds:
  - payroll_employees.custom_fields (JSON) — org-defined extra field values
  - payroll_custom_field_definitions — registry of org-defined extra fields
  - payroll_update_forms — saved "Send Template" form templates
  - payroll_update_form_sends — per-employee single-use send tokens
  - payroll_update_form_submissions — employee-submitted data, pending review

Revision ID: a1b2c3d4e5f6j2
Revises: d3e4f5a6b7c8h9
Create Date: 2026-08-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6j2"
down_revision: Union[str, None] = "d3e4f5a6b7c8h9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payroll_employees",
        sa.Column("custom_fields", sa.JSON(), nullable=False, server_default="{}"),
    )

    op.create_table(
        "payroll_custom_field_definitions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("field_key", sa.String(60), nullable=False),
        sa.Column("label", sa.String(150), nullable=False),
        sa.Column("field_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("select_options", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "field_key", name="uq_payroll_custom_field_org_key"),
    )

    op.create_table(
        "payroll_update_forms",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("fields_config", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "payroll_update_form_sends",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("form_id", sa.Integer(), sa.ForeignKey("payroll_update_forms.id"), nullable=False, index=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("payroll_employees.id"), nullable=False, index=True),
        sa.Column("token", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="sent"),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "payroll_update_form_submissions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("send_id", sa.Integer(), sa.ForeignKey("payroll_update_form_sends.id"), nullable=False, index=True),
        sa.Column("submitted_data", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("payroll_update_form_submissions")
    op.drop_table("payroll_update_form_sends")
    op.drop_table("payroll_update_forms")
    op.drop_table("payroll_custom_field_definitions")
    op.drop_column("payroll_employees", "custom_fields")
