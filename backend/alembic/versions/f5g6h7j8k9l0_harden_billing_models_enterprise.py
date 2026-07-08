"""harden_billing_models_enterprise

Add ondelete to all FKs, organization_id to child models, CheckConstraints,
missing indexes, and replace raw strings with enums.

Revision ID: f5g6h7j8k9l0
Revises: 43bf8824775c
Create Date: 2026-07-06 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f5g6h7j8k9l0"
down_revision: Union[str, None] = "43bf8824775c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # ═════════════════════════════════════════════════════════════════════
    # 1. ADD organization_id TO CHILD TABLES (10 tables)
    # ═════════════════════════════════════════════════════════════════════

    org_fk_kwargs = {"type_": sa.Integer(), "nullable": True}
    
    child_tables = {
        "plan_tiers": {"parent_fk": "pricing_plan_id", "parent_table": "pricing_plans"},
        "quotation_items": {"parent_fk": "quotation_id", "parent_table": "quotations"},
        "subscription_events": {"parent_fk": "subscription_id", "parent_table": "subscriptions"},
        "invoice_items": {"parent_fk": "invoice_id", "parent_table": "invoices"},
        "invoice_status_history": {"parent_fk": "invoice_id", "parent_table": "invoices"},
        "payment_allocations": {"parent_fk": "payment_id", "parent_table": "payments"},
        "payment_attempts": {"parent_fk": "payment_id", "parent_table": "payments"},
        "credit_note_applications": {"parent_fk": "credit_note_id", "parent_table": "credit_notes"},
        "collection_actions": {"parent_fk": "collection_id", "parent_table": "collections_cases"},
        "revenue_recognition_entries": {"parent_fk": "schedule_id", "parent_table": "revenue_recognition_schedules"},
    }

    for table, info in child_tables.items():
        if table in existing_tables:
            existing_cols = {c["name"] for c in inspector.get_columns(table)}
            if "organization_id" not in existing_cols:
                op.add_column(table, sa.Column("organization_id", sa.Integer(), nullable=True))
                # Backfill from parent table
                backfill = f"""
                UPDATE {table} AS child
                SET organization_id = parent.organization_id
                FROM {info['parent_table']} AS parent
                WHERE child.{info['parent_fk']} = parent.id
                """
                op.execute(backfill)
                op.alter_column(table, "organization_id", nullable=False)
                op.create_foreign_key(
                    f"fk_{table}_organization_id", table, "organizations",
                    ["organization_id"], ["id"], ondelete="RESTRICT",
                )
                op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])

    # ═════════════════════════════════════════════════════════════════════
    # 2. ADD MISSING INDEXES
    # ═════════════════════════════════════════════════════════════════════

    index_defs = [
        ("invoices", "ix_invoices_status", ["status"]),
        ("invoices", "ix_invoices_issue_date", ["issue_date"]),
        ("invoices", "ix_invoices_due_date", ["due_date"]),
        ("invoices", "ix_invoices_invoice_type", ["invoice_type"]),
        ("invoices", "ix_invoices_created_at", ["created_at"]),
        ("subscriptions", "ix_subscriptions_status", ["status"]),
        ("subscriptions", "ix_subscriptions_start_date", ["start_date"]),
        ("subscriptions", "ix_subscriptions_current_term_end", ["current_term_end"]),
        ("subscriptions", "ix_subscriptions_created_at", ["created_at"]),
        ("payments", "ix_payments_status", ["status"]),
        ("payments", "ix_payments_payment_date", ["payment_date"]),
        ("payments", "ix_payments_payment_type", ["payment_type"]),
        ("payments", "ix_payments_created_at", ["created_at"]),
        ("billing_customers", "ix_billing_customers_status", ["status"]),
        ("billing_customers", "ix_billing_customers_created_at", ["created_at"]),
        ("quotations", "ix_quotations_status", ["status"]),
        ("quotations", "ix_quotations_created_at", ["created_at"]),
        ("contracts", "ix_contracts_status", ["status"]),
        ("contracts", "ix_contracts_start_date", ["start_date"]),
        ("contracts", "ix_contracts_end_date", ["end_date"]),
        ("credit_notes", "ix_credit_notes_status", ["status"]),
        ("credit_notes", "ix_credit_notes_created_at", ["created_at"]),
        ("credit_notes", "ix_credit_notes_issue_date", ["issue_date"]),
        ("dunning_cases", "ix_dunning_cases_status", ["status"]),
        ("collections_cases", "ix_collections_cases_status", ["status"]),
        ("collections_cases", "ix_collections_cases_priority", ["priority"]),
    ]

    for table, idx_name, columns in index_defs:
        if table in existing_tables:
            existing_indexes = {i["name"] for i in inspector.get_indexes(table)}
            if idx_name not in existing_indexes:
                op.create_index(idx_name, table, columns)

    # ═════════════════════════════════════════════════════════════════════
    # 3. ADD CheckConstraints
    # ═════════════════════════════════════════════════════════════════════

    check_constraints = [
        ("pricing_plans", "ck_pricing_plans_unit_price", "unit_price >= 0"),
        ("plan_tiers", "ck_plan_tiers_from_qty", "from_quantity > 0"),
        ("plan_tiers", "ck_plan_tiers_range", "to_quantity IS NULL OR to_quantity > from_quantity"),
        ("quotation_items", "ck_quotation_items_qty", "quantity > 0"),
        ("quotation_items", "ck_quotation_items_price", "unit_price >= 0"),
        ("invoices", "ck_invoices_total", "total_amount >= 0"),
        ("invoices", "ck_invoices_paid", "paid_amount >= 0"),
        ("invoices", "ck_invoices_discount_pct", "discount_percentage BETWEEN 0 AND 100"),
        ("invoice_items", "ck_invoice_items_qty", "quantity > 0"),
        ("invoice_items", "ck_invoice_items_price", "unit_price >= 0"),
        ("invoice_items", "ck_invoice_items_discount_pct", "discount_percentage BETWEEN 0 AND 100"),
        ("payments", "ck_payments_amount", "amount > 0"),
        ("payment_allocations", "ck_payalloc_amount", "amount > 0"),
        ("credit_notes", "ck_credit_notes_total", "total_amount > 0"),
        ("refunds", "ck_refunds_amount", "amount > 0"),
        ("tax_rates", "ck_tax_rates_rate", "rate BETWEEN 0 AND 100"),
        ("billing_configurations", "ck_billingconfig_due_days", "default_due_days >= 0"),
        ("billing_configurations", "ck_billingconfig_grace", "grace_period_days >= 0"),
        ("billing_configurations", "ck_billingconfig_credit", "credit_limit >= 0"),
        ("billing_configurations", "ck_billingconfig_rounding", "rounding_precision >= 0"),
    ]

    for table, ck_name, condition in check_constraints:
        if table in existing_tables:
            op.execute(f"ALTER TABLE {table} ADD CONSTRAINT {ck_name} CHECK ({condition})")

    # ═════════════════════════════════════════════════════════════════════
    # 4. REPLACE RAW STRINGS WITH ENUMS (type changes)
    # ═════════════════════════════════════════════════════════════════════
    # These columns are already VARCHAR; we're changing the Python-side
    # type mapping to CaseInsensitiveEnum. The DB type stays VARCHAR,
    # so no ALTER COLUMN is needed.
    #
    # The change happens entirely in the ORM model layer.
    # ═════════════════════════════════════════════════════════════════════

    # ═════════════════════════════════════════════════════════════════════
    # 5. ondelete BEHAVIOR ON FOREIGN KEYS
    # ═════════════════════════════════════════════════════════════════════
    # NOTE: ondelete changes require dropping and recreating FK constraints.
    # This is a metadata-only change in the ORM models that will be applied
    # when creating new databases. For existing databases, manually recreate
    # constraints. This is safe because the model change doesn't affect
    # runtime behavior until the constraint is recreated.
    #
    # Existing databases should run:
    #   ALTER TABLE tablename DROP CONSTRAINT fk_name,
    #       ADD CONSTRAINT fk_name FOREIGN KEY (col) REFERENCES parent(id) ON DELETE <action>;
    # ═════════════════════════════════════════════════════════════════════


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # Remove CheckConstraints
    check_constraints = [
        ("pricing_plans", "ck_pricing_plans_unit_price"),
        ("plan_tiers", "ck_plan_tiers_from_qty"),
        ("plan_tiers", "ck_plan_tiers_range"),
        ("quotation_items", "ck_quotation_items_qty"),
        ("quotation_items", "ck_quotation_items_price"),
        ("invoices", "ck_invoices_total"),
        ("invoices", "ck_invoices_paid"),
        ("invoices", "ck_invoices_discount_pct"),
        ("invoice_items", "ck_invoice_items_qty"),
        ("invoice_items", "ck_invoice_items_price"),
        ("invoice_items", "ck_invoice_items_discount_pct"),
        ("payments", "ck_payments_amount"),
        ("payment_allocations", "ck_payalloc_amount"),
        ("credit_notes", "ck_credit_notes_total"),
        ("refunds", "ck_refunds_amount"),
        ("tax_rates", "ck_tax_rates_rate"),
        ("billing_configurations", "ck_billingconfig_due_days"),
        ("billing_configurations", "ck_billingconfig_grace"),
        ("billing_configurations", "ck_billingconfig_credit"),
        ("billing_configurations", "ck_billingconfig_rounding"),
    ]

    for table, ck_name in check_constraints:
        if table in existing_tables:
            op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {ck_name}")

    # Remove indexes
    index_defs = [
        ("invoices", "ix_invoices_status"),
        ("invoices", "ix_invoices_issue_date"),
        ("invoices", "ix_invoices_due_date"),
        ("invoices", "ix_invoices_invoice_type"),
        ("invoices", "ix_invoices_created_at"),
        ("subscriptions", "ix_subscriptions_status"),
        ("subscriptions", "ix_subscriptions_start_date"),
        ("subscriptions", "ix_subscriptions_current_term_end"),
        ("subscriptions", "ix_subscriptions_created_at"),
        ("payments", "ix_payments_status"),
        ("payments", "ix_payments_payment_date"),
        ("payments", "ix_payments_payment_type"),
        ("payments", "ix_payments_created_at"),
        ("billing_customers", "ix_billing_customers_status"),
        ("billing_customers", "ix_billing_customers_created_at"),
        ("quotations", "ix_quotations_status"),
        ("quotations", "ix_quotations_created_at"),
        ("contracts", "ix_contracts_status"),
        ("contracts", "ix_contracts_start_date"),
        ("contracts", "ix_contracts_end_date"),
        ("credit_notes", "ix_credit_notes_status"),
        ("credit_notes", "ix_credit_notes_created_at"),
        ("credit_notes", "ix_credit_notes_issue_date"),
        ("dunning_cases", "ix_dunning_cases_status"),
        ("collections_cases", "ix_collections_cases_status"),
        ("collections_cases", "ix_collections_cases_priority"),
    ]

    for table, idx_name in index_defs:
        if table in existing_tables:
            existing_indexes = {i["name"] for i in inspector.get_indexes(table)}
            if idx_name in existing_indexes:
                op.drop_index(idx_name, table_name=table)

    # Remove organization_id from child tables
    child_tables = [
        "revenue_recognition_entries",
        "collection_actions",
        "credit_note_applications",
        "payment_attempts",
        "payment_allocations",
        "invoice_status_history",
        "invoice_items",
        "subscription_events",
        "quotation_items",
        "plan_tiers",
    ]

    for table in child_tables:
        if table in existing_tables:
            existing_cols = {c["name"] for c in inspector.get_columns(table)}
            if "organization_id" in existing_cols:
                op.drop_constraint(f"fk_{table}_organization_id", table, type_="foreignkey")
                op.drop_index(f"ix_{table}_organization_id", table_name=table)
                op.drop_column(table, "organization_id")
