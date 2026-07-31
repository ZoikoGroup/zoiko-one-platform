"""RC2 Phase 1: Credit Note enhancements (discount, approval, status history, communications)

Revision ID: p4q5r6s7t8u9
Revises: 18b181e6d3ad
Create Date: 2026-07-30

Credit notes previously had no line-discount field, no explicit "approved"
checkpoint before issuance, and no status-history/communication tables (unlike
invoices, which already have both). This migration is purely additive:

- credit_notes gains discount_amount (mirrors Invoice.discount_amount),
  approved_at, and approved_by — all nullable/defaulted so existing rows are
  unaffected.
- Two new tables, credit_note_status_history and credit_note_communications,
  mirror invoice_status_history/invoice_communications exactly so the same
  timeline/audit UI pattern can be reused for credit notes.

No existing column, table, or row is modified or dropped.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'p4q5r6s7t8u9'
down_revision = '18b181e6d3ad'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    existing_cn_columns = {c["name"] for c in inspector.get_columns("credit_notes")} if "credit_notes" in existing_tables else set()

    if "discount_amount" not in existing_cn_columns:
        op.add_column('credit_notes', sa.Column('discount_amount', sa.Numeric(14, 2), nullable=True, server_default='0'))
    if "approved_at" not in existing_cn_columns:
        op.add_column('credit_notes', sa.Column('approved_at', sa.DateTime(), nullable=True))
    if "approved_by" not in existing_cn_columns:
        op.add_column('credit_notes', sa.Column('approved_by', sa.Integer(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True))

    if "credit_note_status_history" not in existing_tables:
        op.create_table(
            "credit_note_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("credit_note_id", sa.Integer(), sa.ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "credit_note_communications" not in existing_tables:
        op.create_table(
            "credit_note_communications",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("credit_note_id", sa.Integer(), sa.ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("event_type", sa.String(30), nullable=False, index=True),
            sa.Column("recipient", sa.String(255), nullable=True),
            sa.Column("subject", sa.String(500), nullable=True),
            sa.Column("body_preview", sa.String(500), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="sent"),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        )
        op.create_index("ix_cn_comms_org_creditnote", "credit_note_communications", ["organization_id", "credit_note_id"])


def downgrade():
    op.drop_index("ix_cn_comms_org_creditnote", table_name="credit_note_communications")
    op.drop_table("credit_note_communications")
    op.drop_table("credit_note_status_history")
    op.drop_column('credit_notes', 'approved_by')
    op.drop_column('credit_notes', 'approved_at')
    op.drop_column('credit_notes', 'discount_amount')
