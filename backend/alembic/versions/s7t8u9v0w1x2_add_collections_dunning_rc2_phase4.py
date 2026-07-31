"""RC2 Phase 4: Collections & Dunning Automation

Revision ID: s7t8u9v0w1x2
Revises: r6s7t8u9v0w1
Create Date: 2026-07-31

Adds Promise-to-Pay tracking and status-history tables for DunningCase/
CollectionsCase, matching the timeline pattern already established by
CreditNote/Refund/WriteOff (RC2 Phases 1-3). Prior to this phase, Dunning
and Collections cases were mutated in place with no structured, queryable
history of status transitions — audit facts existed only in the generic
billing_audit_logs table, which isn't shaped for a per-case timeline UI.

This migration is purely additive:

- New table `promise_to_pay`: tracks a customer's promise to pay a specific
  amount by a specific date, optionally linked to an invoice/dunning case/
  collections case, with a status lifecycle (pending -> overdue -> broken,
  or -> fulfilled at any point, or -> cancelled) that the new
  PromiseToPayService automation keeps in sync with actual invoice payment.
- Two new tables, `dunning_case_status_history` and
  `collections_case_status_history`, mirroring `write_off_status_history`
  exactly.
- `dunning_cases` gains a nullable `notes` column (DunningCaseCreate/Update
  schemas already accepted a `notes` field that the model silently dropped
  — this closes that gap without changing any existing behavior for callers
  that don't send it).

No existing column, table, or row is modified or dropped.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 's7t8u9v0w1x2'
down_revision = 'r6s7t8u9v0w1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    existing_dunning_case_columns = (
        {c["name"] for c in inspector.get_columns("dunning_cases")}
        if "dunning_cases" in existing_tables else set()
    )
    if "notes" not in existing_dunning_case_columns:
        op.add_column('dunning_cases', sa.Column('notes', sa.Text(), nullable=True))

    if "promise_to_pay" not in existing_tables:
        op.create_table(
            "promise_to_pay",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("dunning_case_id", sa.Integer(), sa.ForeignKey("dunning_cases.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("collections_case_id", sa.Integer(), sa.ForeignKey("collections_cases.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("promise_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("promise_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("fulfilled_at", sa.DateTime(), nullable=True),
            sa.Column("broken_at", sa.DateTime(), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint("promise_amount > 0", name="ck_promise_to_pay_amount"),
        )

    if "dunning_case_status_history" not in existing_tables:
        op.create_table(
            "dunning_case_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("dunning_case_id", sa.Integer(), sa.ForeignKey("dunning_cases.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "collections_case_status_history" not in existing_tables:
        op.create_table(
            "collections_case_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True),
            sa.Column("collections_case_id", sa.Integer(), sa.ForeignKey("collections_cases.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade():
    op.drop_table("collections_case_status_history")
    op.drop_table("dunning_case_status_history")
    op.drop_table("promise_to_pay")
    op.drop_column('dunning_cases', 'notes')
