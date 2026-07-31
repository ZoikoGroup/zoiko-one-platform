"""RC2 Phase 3: Write-off & Financial Adjustment module

Revision ID: r6s7t8u9v0w1
Revises: q5r6s7t8u9v0
Create Date: 2026-07-31

Introduces a first-class Write-off / Financial-Adjustment entity, distinct
from the legacy CreditNoteType.WRITE_OFF classification value. A write-off
lets a customer's outstanding invoice balance (or general receivable/
customer-balance amount) be given up on for collection, through a
Draft -> Pending Approval -> Approved -> Executed -> Reversed/Cancelled
approval workflow mirroring RefundStatus's shape.

This migration is purely additive:

- Three new tables: write_offs, write_off_status_history,
  write_off_communications — mirroring refunds/refund_status_history/
  refund_communications exactly, so the same timeline/audit UI pattern can
  be reused.
- invoices.status gains a new WRITTEN_OFF value at the application layer
  (InvoiceStatus is stored as a plain string column via CaseInsensitiveEnum,
  so no column-level enum migration is required for this — new status
  values are accepted by existing string columns).
- billing_configurations gains write_off_prefix/write_off_number_format/
  write_off_sequence_reset, mirroring the invoice/credit_note/refund
  numbering columns, all nullable/defaulted so existing rows are unaffected.

No existing column, table, or row is modified or dropped.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'r6s7t8u9v0w1'
down_revision = 'q5r6s7t8u9v0'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "write_offs" not in existing_tables:
        op.create_table(
            "write_offs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("write_off_number", sa.String(50), nullable=False),
            sa.Column("write_off_type", sa.String(30), nullable=False),
            sa.Column("adjustment_type", sa.String(30), nullable=True),
            sa.Column("write_off_source", sa.String(30), nullable=False, server_default="invoice"),
            sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("currency", sa.String(3), server_default="USD"),
            sa.Column("exchange_rate", sa.Numeric(12, 6), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("approved_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("executed_at", sa.DateTime(), nullable=True),
            sa.Column("executed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reversed_at", sa.DateTime(), nullable=True),
            sa.Column("reversed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reversal_reason", sa.Text(), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(), nullable=True),
            sa.Column("cancelled_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("cancellation_reason", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("organization_id", "write_off_number", name="uq_write_offs_org_number"),
            sa.CheckConstraint("amount > 0", name="ck_write_offs_amount"),
        )

    if "write_off_status_history" not in existing_tables:
        op.create_table(
            "write_off_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("write_off_id", sa.Integer(), sa.ForeignKey("write_offs.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "write_off_communications" not in existing_tables:
        op.create_table(
            "write_off_communications",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("write_off_id", sa.Integer(), sa.ForeignKey("write_offs.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("event_type", sa.String(30), nullable=False, index=True),
            sa.Column("recipient", sa.String(255), nullable=True),
            sa.Column("subject", sa.String(500), nullable=True),
            sa.Column("body_preview", sa.String(500), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="sent"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        )
        op.create_index("ix_write_off_comms_org_write_off", "write_off_communications", ["organization_id", "write_off_id"])

    existing_config_columns = (
        {c["name"] for c in inspector.get_columns("billing_configurations")}
        if "billing_configurations" in existing_tables else set()
    )
    if "write_off_prefix" not in existing_config_columns:
        op.add_column('billing_configurations', sa.Column('write_off_prefix', sa.String(10), server_default='WO-', nullable=True))
    if "write_off_number_format" not in existing_config_columns:
        op.add_column('billing_configurations', sa.Column('write_off_number_format', sa.String(30), server_default='prefix_yyyy_seq', nullable=True))
    if "write_off_sequence_reset" not in existing_config_columns:
        op.add_column('billing_configurations', sa.Column('write_off_sequence_reset', sa.String(20), server_default='annually', nullable=True))


def downgrade():
    op.drop_column('billing_configurations', 'write_off_sequence_reset')
    op.drop_column('billing_configurations', 'write_off_number_format')
    op.drop_column('billing_configurations', 'write_off_prefix')

    op.drop_index("ix_write_off_comms_org_write_off", table_name="write_off_communications")
    op.drop_table("write_off_communications")
    op.drop_table("write_off_status_history")
    op.drop_table("write_offs")
