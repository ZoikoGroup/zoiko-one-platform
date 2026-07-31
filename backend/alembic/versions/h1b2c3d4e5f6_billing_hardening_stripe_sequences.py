"""billing_hardening_stripe_sequences

Billing hardening round 2:
  - document_sequences (concurrency-safe per-org numbering, replaces count()+1)
  - stripe_events (webhook idempotency ledger)
  - Stripe foreign keys (customer / subscription / invoice / payment)
  - resolved_price_type on invoice_items / contract_items
  - unique (organization_id, transaction_id) on payments

Revision ID: h1b2c3d4e5f6
Revises: f405e41fc25a
Create Date: 2026-07-31 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "h1b2c3d4e5f6"
down_revision: Union[str, None] = "f405e41fc25a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DOC_SEQ_DEFS = [
    ("invoice", "invoices", "invoice_number"),
    ("credit_note", "credit_notes", "credit_note_number"),
    ("refund", "refunds", "refund_number"),
    ("write_off", "write_offs", "write_off_number"),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # ─────────────────────────────────────────────────────────────────────
    # 1. NEW TABLES
    # ─────────────────────────────────────────────────────────────────────
    if "document_sequences" not in existing_tables:
        op.create_table(
            "document_sequences",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), nullable=False, index=True),
            sa.Column("doc_type", sa.String(length=30), nullable=False),
            sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("window_start", sa.Date(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(
                ["organization_id"], ["organizations.id"], ondelete="RESTRICT",
                name="fk_document_sequences_organization_id",
            ),
            sa.UniqueConstraint("organization_id", "doc_type", name="uq_document_sequences_org_type"),
        )

    if "stripe_events" not in existing_tables:
        op.create_table(
            "stripe_events",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("event_id", sa.String(length=255), nullable=False, index=True),
            sa.Column("event_type", sa.String(length=100), nullable=False, index=True),
            sa.Column("organization_id", sa.Integer(), nullable=True, index=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="processed"),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("error", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(
                ["organization_id"], ["organizations.id"], ondelete="SET NULL",
                name="fk_stripe_events_organization_id",
            ),
            sa.UniqueConstraint("event_id", name="uq_stripe_events_event_id"),
        )

    # ─────────────────────────────────────────────────────────────────────
    # 2. NEW COLUMNS
    # ─────────────────────────────────────────────────────────────────────
    column_defs = [
        ("billing_customers", "stripe_customer_id", sa.String(length=255), None, True),
        ("subscriptions", "stripe_subscription_id", sa.String(length=255), None, True),
        ("subscriptions", "stripe_price_id", sa.String(length=255), None, True),
        ("subscriptions", "cancel_at_period_end", sa.Boolean(), sa.false(), False),
        ("subscriptions", "stripe_cancel_at", sa.DateTime(timezone=True), None, True),
        ("invoices", "stripe_invoice_id", sa.String(length=255), None, True),
        ("invoices", "stripe_payment_intent_id", sa.String(length=255), None, True),
        ("invoices", "stripe_checkout_session_id", sa.String(length=255), None, True),
        ("invoice_items", "resolved_price_type", sa.String(length=20), None, True),
        ("contract_items", "resolved_price_type", sa.String(length=20), None, True),
        ("payments", "stripe_payment_intent_id", sa.String(length=255), None, True),
        ("payments", "stripe_checkout_session_id", sa.String(length=255), None, True),
    ]

    for table, col, col_type, server_default, nullable in column_defs:
        if table not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        if col in existing_cols:
            continue
        op.add_column(
            table,
            sa.Column(col, col_type, nullable=nullable, server_default=server_default),
        )

    # Indexes for stripe lookup columns
    index_defs = [
        ("billing_customers", "ix_billing_customers_stripe_customer_id", ["stripe_customer_id"]),
        ("subscriptions", "ix_subscriptions_stripe_subscription_id", ["stripe_subscription_id"]),
        ("invoices", "ix_invoices_stripe_invoice_id", ["stripe_invoice_id"]),
        ("invoices", "ix_invoices_stripe_checkout_session_id", ["stripe_checkout_session_id"]),
        ("payments", "ix_payments_stripe_payment_intent_id", ["stripe_payment_intent_id"]),
    ]
    for table, idx_name, cols in index_defs:
        if table not in existing_tables:
            continue
        existing_indexes = {i["name"] for i in inspector.get_indexes(table)}
        if idx_name not in existing_indexes:
            op.create_index(idx_name, table, cols)

    # ─────────────────────────────────────────────────────────────────────
    # 3. UNIQUE (organization_id, transaction_id) ON payments
    # ─────────────────────────────────────────────────────────────────────
    if "payments" in existing_tables:
        existing_constraints = {c["name"] for c in inspector.get_unique_constraints("payments")}
        if "uq_payments_org_transaction" not in existing_constraints:
            # Normalize empty-string transaction_ids to NULL so the unique
            # constraint does not fire for non-gateway payments.
            op.execute(
                "UPDATE payments SET transaction_id = NULL "
                "WHERE transaction_id = '' OR transaction_id IS NOT NULL AND trim(transaction_id) = ''"
            )
            # De-duplicate any historical collisions: keep the earliest row,
            # null out the transaction_id on later duplicates.
            op.execute("""
                WITH ranked AS (
                    SELECT id, organization_id, transaction_id,
                           ROW_NUMBER() OVER (
                               PARTITION BY organization_id, transaction_id
                               ORDER BY id
                           ) AS rn
                    FROM payments
                    WHERE transaction_id IS NOT NULL
                )
                UPDATE payments
                SET transaction_id = NULL
                FROM ranked
                WHERE payments.id = ranked.id AND ranked.rn > 1
            """)
            op.create_unique_constraint(
                "uq_payments_org_transaction",
                "payments",
                ["organization_id", "transaction_id"],
            )

    # ─────────────────────────────────────────────────────────────────────
    # 4. SEED document_sequences FROM EXISTING DATA
    # ─────────────────────────────────────────────────────────────────────
    # Backfill last_number with the max numeric suffix already issued per
    # (org, doc_type) so the new sequence continues without colliding with
    # historical numbers (old count()+1 numbering left gaps/duplicates).
    for doc_type, table, col in DOC_SEQ_DEFS:
        if table not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        if "organization_id" not in existing_cols or col not in existing_cols:
            continue
        op.execute(f"""
            INSERT INTO document_sequences (organization_id, doc_type, last_number, updated_at)
            SELECT t.organization_id,
                   '{doc_type}',
                   COALESCE(MAX(
                       CASE
                           WHEN t.{col} ~ '[0-9]+$'
                           THEN CAST(regexp_replace(t.{col}, '.*[^0-9]', '') AS INTEGER)
                           ELSE 0
                       END
                   ), 0) AS last_number,
                   NOW()
            FROM {table} t
            WHERE t.{col} IS NOT NULL
            GROUP BY t.organization_id
            ON CONFLICT (organization_id, doc_type) DO NOTHING
        """)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    for table, col, _idx in [
        ("payments", "stripe_payment_intent_id", "ix_payments_stripe_payment_intent_id"),
        ("payments", "stripe_checkout_session_id", None),
        ("contract_items", "resolved_price_type", None),
        ("invoice_items", "resolved_price_type", None),
        ("invoices", "stripe_checkout_session_id", "ix_invoices_stripe_checkout_session_id"),
        ("invoices", "stripe_payment_intent_id", None),
        ("invoices", "stripe_invoice_id", "ix_invoices_stripe_invoice_id"),
        ("subscriptions", "stripe_cancel_at", None),
        ("subscriptions", "cancel_at_period_end", None),
        ("subscriptions", "stripe_price_id", None),
        ("subscriptions", "stripe_subscription_id", "ix_subscriptions_stripe_subscription_id"),
        ("billing_customers", "stripe_customer_id", "ix_billing_customers_stripe_customer_id"),
    ]:
        if table not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        if col in existing_cols:
            if _idx:
                try:
                    op.drop_index(_idx, table_name=table)
                except Exception:
                    pass
            op.drop_column(table, col)

    if "payments" in existing_tables:
        existing_constraints = {c["name"] for c in inspector.get_unique_constraints("payments")}
        if "uq_payments_org_transaction" in existing_constraints:
            op.drop_constraint("uq_payments_org_transaction", "payments", type_="unique")

    if "stripe_events" in existing_tables:
        op.drop_table("stripe_events")

    if "document_sequences" in existing_tables:
        op.drop_table("document_sequences")
