"""RC2 Phase 2: Refund Management enhancements (source, method, approval workflow, status history, communications)

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
Create Date: 2026-07-31

Refunds previously supported only a thin PENDING -> PROCESSING -> COMPLETED/
FAILED flow with no approval gate, no origin tracking beyond payment_id/
credit_note_id, and no status-history/communication tables (unlike credit
notes, which gained both in the prior migration). This migration is purely
additive:

- refunds gains invoice_id (a refund can originate directly from an invoice,
  not only a payment or credit note), refund_source, refund_method,
  reference_number, approved_at/approved_by, processing_started_at/
  processed_by, cancelled_at/cancelled_by/cancellation_reason, and
  deleted_at (soft-delete parity with credit_notes) — all nullable/defaulted
  so existing rows are unaffected.
- Two new tables, refund_status_history and refund_communications, mirror
  credit_note_status_history/credit_note_communications exactly so the same
  timeline/audit UI pattern can be reused for refunds.

No existing column, table, or row is modified or dropped.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'q5r6s7t8u9v0'
down_revision = 'p4q5r6s7t8u9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    existing_refund_columns = {c["name"] for c in inspector.get_columns("refunds")} if "refunds" in existing_tables else set()

    if "invoice_id" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True))
        op.create_index('ix_refunds_invoice_id', 'refunds', ['invoice_id'])
    if "refund_source" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('refund_source', sa.String(30), nullable=False, server_default='payment'))
    if "refund_method" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('refund_method', sa.String(30), nullable=True))
    if "reference_number" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('reference_number', sa.String(100), nullable=True))
    if "approved_at" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('approved_at', sa.DateTime(), nullable=True))
    if "approved_by" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('approved_by', sa.Integer(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True))
    if "processing_started_at" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('processing_started_at', sa.DateTime(), nullable=True))
    if "processed_by" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('processed_by', sa.Integer(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True))
    if "cancelled_at" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('cancelled_at', sa.DateTime(), nullable=True))
    if "cancelled_by" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('cancelled_by', sa.Integer(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True))
    if "cancellation_reason" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    if "deleted_at" not in existing_refund_columns:
        op.add_column('refunds', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    if "refund_status_history" not in existing_tables:
        op.create_table(
            "refund_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("refund_id", sa.Integer(), sa.ForeignKey("refunds.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "refund_communications" not in existing_tables:
        op.create_table(
            "refund_communications",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("refund_id", sa.Integer(), sa.ForeignKey("refunds.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("event_type", sa.String(30), nullable=False, index=True),
            sa.Column("recipient", sa.String(255), nullable=True),
            sa.Column("subject", sa.String(500), nullable=True),
            sa.Column("body_preview", sa.String(500), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="sent"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        )
        op.create_index("ix_refund_comms_org_refund", "refund_communications", ["organization_id", "refund_id"])


def downgrade():
    op.drop_index("ix_refund_comms_org_refund", table_name="refund_communications")
    op.drop_table("refund_communications")
    op.drop_table("refund_status_history")
    op.drop_column('refunds', 'deleted_at')
    op.drop_column('refunds', 'cancellation_reason')
    op.drop_column('refunds', 'cancelled_by')
    op.drop_column('refunds', 'cancelled_at')
    op.drop_column('refunds', 'processed_by')
    op.drop_column('refunds', 'processing_started_at')
    op.drop_column('refunds', 'approved_by')
    op.drop_column('refunds', 'approved_at')
    op.drop_column('refunds', 'reference_number')
    op.drop_column('refunds', 'refund_method')
    op.drop_column('refunds', 'refund_source')
    op.drop_index('ix_refunds_invoice_id', table_name='refunds')
    op.drop_column('refunds', 'invoice_id')
