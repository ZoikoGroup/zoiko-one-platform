"""add_invoice_communications_table

Adds the invoice_communications table for tracking per-invoice
communication events (email sent/delivered/bounced, reminders, notes).

Part of the Invoice Lifecycle and Communication Tracking feature.

Revision ID: z5a6b7c8d9e0
Revises: z4a5b6c7d8e9
Create Date: 2026-07-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "z5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "z4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invoice_communications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("recipient", sa.String(255), nullable=True),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body_preview", sa.String(500), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'sent'")),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_communications_id"), "invoice_communications", ["id"])
    op.create_index(op.f("ix_invoice_communications_organization_id"), "invoice_communications", ["organization_id"])
    op.create_index(op.f("ix_invoice_communications_invoice_id"), "invoice_communications", ["invoice_id"])
    op.create_index(op.f("ix_invoice_communications_event_type"), "invoice_communications", ["event_type"])
    op.create_index(op.f("ix_invoice_communications_created_at"), "invoice_communications", ["created_at"])
    op.create_index(
        "ix_inv_comms_org_invoice",
        "invoice_communications",
        ["organization_id", "invoice_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_inv_comms_org_invoice", table_name="invoice_communications")
    op.drop_index(op.f("ix_invoice_communications_created_at"), table_name="invoice_communications")
    op.drop_index(op.f("ix_invoice_communications_event_type"), table_name="invoice_communications")
    op.drop_index(op.f("ix_invoice_communications_invoice_id"), table_name="invoice_communications")
    op.drop_index(op.f("ix_invoice_communications_organization_id"), table_name="invoice_communications")
    op.drop_index(op.f("ix_invoice_communications_id"), table_name="invoice_communications")
    op.drop_table("invoice_communications")
