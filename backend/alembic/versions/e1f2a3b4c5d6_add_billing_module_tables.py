"""add_billing_module_tables

Revision ID: e1f2a3b4c5d6
Revises: d5e6f7a8b9c0
Create Date: 2026-07-02 10:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 1 — Drop obsolete billing tables & constraints
    # ═══════════════════════════════════════════════════════════════════

    if "invoice_lines" in existing_tables:
        op.execute("ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_invoice_id_fkey")
        op.drop_table("invoice_lines")
        print("[migrate] Dropped obsolete table 'invoice_lines'")

    if "clients" in existing_tables:
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey")
        op.drop_table("clients")
        print("[migrate] Dropped obsolete table 'clients'")

    # Drop old unique constraint on invoice_number (replaced by org+number)
    if "invoices" in existing_tables:
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key")

        # Change status from PostgreSQL ENUM to VARCHAR
        op.execute("ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(30) USING status::text")
        op.execute("DROP TYPE IF EXISTS invoicestatus")

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 2 — Migrate existing invoices table (add columns)
    # ═══════════════════════════════════════════════════════════════════

    if "invoices" in existing_tables:
        existing_cols = {c["name"] for c in inspector.get_columns("invoices")}

        if "organization_id" not in existing_cols:
            op.add_column("invoices", sa.Column("organization_id", sa.Integer(), nullable=False, server_default="1"))
            op.alter_column("invoices", "organization_id", server_default=None)
        if "customer_id" not in existing_cols:
            op.add_column("invoices", sa.Column("customer_id", sa.Integer(), nullable=False, server_default="1"))
            op.alter_column("invoices", "customer_id", server_default=None)
        for col in ("subscription_id", "quotation_id", "contract_id"):
            if col not in existing_cols:
                op.add_column("invoices", sa.Column(col, sa.Integer(), nullable=True))
        fin_cols = [
            ("invoice_type", sa.String(30), False, "standard"),
            ("discount_percentage", sa.Numeric(5, 2), False, "0"),
            ("discount_amount", sa.Numeric(14, 2), False, "0"),
            ("paid_amount", sa.Numeric(14, 2), False, "0"),
            ("balance_due", sa.Numeric(14, 2), False, "0"),
            ("currency", sa.String(3), False, "USD"),
            ("exchange_rate", sa.Numeric(12, 6), False, "1"),
            ("is_recurring", sa.Boolean(), False, "false"),
            ("is_active", sa.Boolean(), False, "true"),
        ]
        for col_name, col_type, nullable, default in fin_cols:
            if col_name not in existing_cols:
                op.add_column("invoices", sa.Column(col_name, col_type, nullable=nullable, server_default=default))
                if default:
                    op.alter_column("invoices", col_name, server_default=None)
        null_cols = [
            ("sent_at", sa.DateTime()), ("reminded_at", sa.DateTime()),
            ("paid_at", sa.DateTime()), ("cancelled_at", sa.DateTime()),
            ("cancellation_reason", sa.Text()), ("payment_terms", sa.String(50)),
            ("po_number", sa.String(100)), ("deleted_at", sa.DateTime()),
            ("updated_by", sa.Integer()),
        ]
        for col_name, col_type in null_cols:
            if col_name not in existing_cols:
                op.add_column("invoices", sa.Column(col_name, col_type, nullable=True))
        if "client_id" in existing_cols:
            op.drop_column("invoices", "client_id")

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 3 — Create new billing tables (dependency-ordered)
    # ═══════════════════════════════════════════════════════════════════
    #
    # Order: independent first, then by FK dependency chain.
    # ═══════════════════════════════════════════════════════════════════

    # --- 3a: No new-table FK deps (FKs only to organizations / employees / self) ---

    if "product_categories" not in existing_tables:
        op.create_table(
            "product_categories",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("parent_id", sa.Integer(), sa.ForeignKey("product_categories.id"), nullable=True),
            sa.Column("sort_order", sa.Integer(), default=0),
            sa.Column("icon", sa.String(50), nullable=True),
            sa.Column("color", sa.String(7), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "code", name="uq_product_categories_org_code"),
        )

    if "dunning_levels" not in existing_tables:
        op.create_table(
            "dunning_levels",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("level_number", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("min_days_overdue", sa.Integer(), nullable=False),
            sa.Column("max_days_overdue", sa.Integer(), nullable=True),
            sa.Column("action_type", sa.String(50), nullable=False),
            sa.Column("action_template", sa.String(500), nullable=True),
            sa.Column("fee_amount", sa.Numeric(14, 2), default=0),
            sa.Column("fee_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "tax_rates" not in existing_tables:
        op.create_table(
            "tax_rates",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("jurisdiction", sa.String(255), nullable=False),
            sa.Column("rate", sa.Numeric(5, 2), nullable=False),
            sa.Column("tax_type", sa.String(30), nullable=False),
            sa.Column("is_compound", sa.Boolean(), default=False),
            sa.Column("is_recoverable", sa.Boolean(), default=True),
            sa.Column("effective_from", sa.Date(), nullable=False),
            sa.Column("effective_to", sa.Date(), nullable=True),
            sa.Column("applies_to", sa.String(30), nullable=False, server_default="both"),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "code", name="uq_tax_rates_org_code"),
        )

    # billing_settings FKs to tax_rates — put AFTER tax_rates
    if "billing_settings" not in existing_tables:
        op.create_table(
            "billing_settings",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, unique=True, index=True),
            sa.Column("default_currency", sa.String(3), default="USD"),
            sa.Column("fiscal_year_start", sa.String(5), default="01-01"),
            sa.Column("default_payment_terms", sa.String(50), default="net_30"),
            sa.Column("default_invoice_prefix", sa.String(10), default="INV-"),
            sa.Column("default_quote_prefix", sa.String(10), default="QTE-"),
            sa.Column("auto_generate_invoice_number", sa.Boolean(), default=True),
            sa.Column("invoice_number_format", sa.String(100), nullable=True),
            sa.Column("default_tax_rate_id", sa.Integer(), sa.ForeignKey("tax_rates.id"), nullable=True),
            sa.Column("auto_apply_credits", sa.Boolean(), default=True),
            sa.Column("auto_send_invoices", sa.Boolean(), default=False),
            sa.Column("auto_send_receipts", sa.Boolean(), default=True),
            sa.Column("auto_dunning", sa.Boolean(), default=True),
            sa.Column("dunning_level_count", sa.Integer(), default=4),
            sa.Column("payment_reminder_days_before", sa.Integer(), default=3),
            sa.Column("late_payment_fee_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("late_payment_fee_flat", sa.Numeric(14, 2), default=0),
            sa.Column("enable_revenue_recognition", sa.Boolean(), default=False),
            sa.Column("enable_multi_currency", sa.Boolean(), default=False),
            sa.Column("billing_email", sa.String(255), nullable=True),
            sa.Column("billing_phone", sa.String(30), nullable=True),
            sa.Column("terms_and_conditions", sa.Text(), nullable=True),
            sa.Column("logo_url", sa.String(500), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    # --- 3b: billing_customers + contacts ---

    if "billing_customers" not in existing_tables:
        op.create_table(
            "billing_customers",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_code", sa.String(50), nullable=False),
            sa.Column("company_name", sa.String(255), nullable=False),
            sa.Column("display_name", sa.String(255), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("phone", sa.String(30), nullable=True),
            sa.Column("website", sa.String(500), nullable=True),
            sa.Column("tax_id", sa.String(100), nullable=True),
            sa.Column("tax_id_type", sa.String(50), nullable=True),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("payment_terms", sa.String(50), default="net_30"),
            sa.Column("credit_limit", sa.Numeric(14, 2), default=0),
            sa.Column("credit_balance", sa.Numeric(14, 2), default=0),
            sa.Column("billing_address", sa.Text(), nullable=True),
            sa.Column("shipping_address", sa.Text(), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="active"),
            sa.Column("customer_type", sa.String(30), nullable=False, server_default="business"),
            sa.Column("industry", sa.String(100), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "customer_code", name="uq_billing_customers_org_code"),
        )

    if "customer_contacts" not in existing_tables:
        op.create_table(
            "customer_contacts",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("salutation", sa.String(20), nullable=True),
            sa.Column("first_name", sa.String(100), nullable=False),
            sa.Column("last_name", sa.String(100), nullable=False),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("phone", sa.String(30), nullable=True),
            sa.Column("mobile", sa.String(30), nullable=True),
            sa.Column("job_title", sa.String(200), nullable=True),
            sa.Column("department", sa.String(100), nullable=True),
            sa.Column("is_primary", sa.Boolean(), default=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("customer_id", "email", name="uq_customer_contacts_customer_email"),
        )

    # --- 3c: Products & pricing ---

    if "products" not in existing_tables:
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("category_id", sa.Integer(), sa.ForeignKey("product_categories.id"), nullable=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("code", sa.String(50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("product_type", sa.String(30), nullable=False, server_default="service"),
            sa.Column("unit_label", sa.String(50), nullable=True),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("default_price", sa.Numeric(14, 2), default=0),
            sa.Column("cost_price", sa.Numeric(14, 2), default=0),
            sa.Column("tax_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("tax_inclusive", sa.Boolean(), default=False),
            sa.Column("is_subscribable", sa.Boolean(), default=False),
            sa.Column("is_usage_billable", sa.Boolean(), default=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "code", name="uq_products_org_code"),
        )

    if "pricing_plans" not in existing_tables:
        op.create_table(
            "pricing_plans",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=False, index=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("billing_period", sa.String(30), nullable=False),
            sa.Column("billing_cycle_count", sa.Integer(), default=0),
            sa.Column("pricing_model", sa.String(30), nullable=False, server_default="flat"),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=True),
            sa.Column("flat_fee", sa.Numeric(14, 2), default=0),
            sa.Column("setup_fee", sa.Numeric(14, 2), default=0),
            sa.Column("min_quantity", sa.Integer(), default=1),
            sa.Column("max_quantity", sa.Integer(), nullable=True),
            sa.Column("trial_days", sa.Integer(), default=0),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("effective_from", sa.Date(), nullable=False),
            sa.Column("effective_to", sa.Date(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("product_id", "billing_period", "effective_from", name="uq_pricing_plans_product_period"),
        )

    if "plan_tiers" not in existing_tables:
        op.create_table(
            "plan_tiers",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("pricing_plan_id", sa.Integer(), sa.ForeignKey("pricing_plans.id"), nullable=False, index=True),
            sa.Column("from_quantity", sa.Integer(), nullable=False),
            sa.Column("to_quantity", sa.Integer(), nullable=True),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=True),
            sa.Column("flat_fee", sa.Numeric(14, 2), default=0),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3d: Subscription plans (independent) ---

    if "subscription_plans" not in existing_tables:
        op.create_table(
            "subscription_plans",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("plan_code", sa.String(50), nullable=False),
            sa.Column("plan_name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(30), nullable=False),
            sa.Column("billing_period", sa.String(30), nullable=False),
            sa.Column("billing_cycles", sa.Integer(), default=0),
            sa.Column("pricing_model", sa.String(30), nullable=False, server_default="flat"),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=True),
            sa.Column("setup_fee", sa.Numeric(14, 2), default=0),
            sa.Column("trial_days", sa.Integer(), default=0),
            sa.Column("is_public", sa.Boolean(), default=True),
            sa.Column("sort_order", sa.Integer(), default=0),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "plan_code", name="uq_subscription_plans_org_code"),
        )

    # --- 3e: Contracts (depends on billing_customers) ---

    if "contracts" not in existing_tables:
        op.create_table(
            "contracts",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("contract_number", sa.String(50), nullable=False),
            sa.Column("contract_name", sa.String(255), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("notice_period_days", sa.Integer(), default=30),
            sa.Column("auto_renew", sa.Boolean(), default=False),
            sa.Column("renewal_term_days", sa.Integer(), nullable=True),
            sa.Column("value", sa.Numeric(14, 2), default=0),
            sa.Column("signed_by_customer", sa.Boolean(), default=False),
            sa.Column("signed_by_org", sa.Boolean(), default=False),
            sa.Column("signed_at", sa.DateTime(), nullable=True),
            sa.Column("document_url", sa.String(500), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "contract_number", name="uq_contracts_org_number"),
        )

    # --- 3f: Subscriptions (depends on billing_customers, subscription_plans, contracts) ---

    if "subscriptions" not in existing_tables:
        op.create_table(
            "subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("plan_id", sa.Integer(), sa.ForeignKey("subscription_plans.id"), nullable=False, index=True),
            sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id"), nullable=True),
            sa.Column("subscription_number", sa.String(50), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="active"),
            sa.Column("quantity", sa.Integer(), default=1),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=False),
            sa.Column("setup_fee", sa.Numeric(14, 2), default=0),
            sa.Column("discount_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("discount_amount", sa.Numeric(14, 2), default=0),
            sa.Column("tax_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("current_term_start", sa.Date(), nullable=False),
            sa.Column("current_term_end", sa.Date(), nullable=False),
            sa.Column("trial_end_date", sa.Date(), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(), nullable=True),
            sa.Column("cancellation_reason", sa.Text(), nullable=True),
            sa.Column("paused_at", sa.DateTime(), nullable=True),
            sa.Column("resume_at", sa.Date(), nullable=True),
            sa.Column("last_billed_at", sa.DateTime(), nullable=True),
            sa.Column("next_billing_at", sa.Date(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "subscription_number", name="uq_subscriptions_org_number"),
        )

    if "subscription_events" not in existing_tables:
        op.create_table(
            "subscription_events",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id"), nullable=False, index=True),
            sa.Column("event_type", sa.String(50), nullable=False),
            sa.Column("old_value", sa.JSON(), nullable=True),
            sa.Column("new_value", sa.JSON(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3g: Quotations (depends on billing_customers + invoices + subscriptions via FK) ---

    if "quotations" not in existing_tables:
        op.create_table(
            "quotations",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("quote_number", sa.String(50), nullable=False),
            sa.Column("quote_version", sa.Integer(), default=1),
            sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
            sa.Column("subject", sa.String(500), nullable=True),
            sa.Column("subtotal", sa.Numeric(14, 2), default=0),
            sa.Column("discount_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("discount_amount", sa.Numeric(14, 2), default=0),
            sa.Column("tax_amount", sa.Numeric(14, 2), default=0),
            sa.Column("total_amount", sa.Numeric(14, 2), default=0),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("valid_until", sa.Date(), nullable=True),
            sa.Column("accepted_at", sa.DateTime(), nullable=True),
            sa.Column("rejected_reason", sa.Text(), nullable=True),
            sa.Column("converted_to_invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=True),
            sa.Column("converted_to_subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id"), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("terms", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "quote_number", name="uq_quotations_org_number"),
        )

    if "quotation_items" not in existing_tables:
        op.create_table(
            "quotation_items",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("quotation_id", sa.Integer(), sa.ForeignKey("quotations.id"), nullable=False, index=True),
            sa.Column("line_number", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
            sa.Column("description", sa.String(1000), nullable=False),
            sa.Column("quantity", sa.Numeric(12, 2), nullable=False, default=1),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=False),
            sa.Column("discount_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("discount_amount", sa.Numeric(14, 2), default=0),
            sa.Column("tax_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("tax_amount", sa.Numeric(14, 2), default=0),
            sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("is_tax_inclusive", sa.Boolean(), default=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("quotation_id", "line_number", name="uq_quotation_items_quote_line"),
        )

    # --- 3h: Invoice-related tables (depend on invoices which already exists) ---

    if "invoice_items" not in existing_tables:
        op.create_table(
            "invoice_items",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("line_number", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id"), nullable=True),
            sa.Column("item_type", sa.String(30), nullable=False, server_default="product"),
            sa.Column("description", sa.String(1000), nullable=False),
            sa.Column("quantity", sa.Numeric(12, 2), nullable=False, default=1),
            sa.Column("unit_price", sa.Numeric(16, 4), nullable=False),
            sa.Column("discount_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("discount_amount", sa.Numeric(14, 2), default=0),
            sa.Column("tax_percentage", sa.Numeric(5, 2), default=0),
            sa.Column("tax_amount", sa.Numeric(14, 2), default=0),
            sa.Column("total", sa.Numeric(14, 2), nullable=False),
            sa.Column("is_tax_inclusive", sa.Boolean(), default=False),
            sa.Column("sort_order", sa.Integer(), default=0),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("invoice_id", "line_number", name="uq_invoice_items_invoice_line"),
        )

    if "invoice_status_history" not in existing_tables:
        op.create_table(
            "invoice_status_history",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("from_status", sa.String(30), nullable=True),
            sa.Column("to_status", sa.String(30), nullable=False),
            sa.Column("changed_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3i: Payment tables ---

    if "payment_methods" not in existing_tables:
        op.create_table(
            "payment_methods",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("payment_type", sa.String(30), nullable=False),
            sa.Column("gateway", sa.String(50), nullable=False),
            sa.Column("gateway_customer_id", sa.String(255), nullable=True),
            sa.Column("gateway_payment_method_id", sa.String(255), nullable=True),
            sa.Column("is_default", sa.Boolean(), default=False),
            sa.Column("last_four", sa.String(4), nullable=True),
            sa.Column("card_brand", sa.String(50), nullable=True),
            sa.Column("card_expiry_month", sa.Integer(), nullable=True),
            sa.Column("card_expiry_year", sa.Integer(), nullable=True),
            sa.Column("bank_name", sa.String(255), nullable=True),
            sa.Column("account_last_four", sa.String(4), nullable=True),
            sa.Column("billing_address", sa.Text(), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="active"),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    if "payments" not in existing_tables:
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("payment_number", sa.String(50), nullable=False),
            sa.Column("transaction_id", sa.String(255), nullable=True),
            sa.Column("payment_method_id", sa.Integer(), sa.ForeignKey("payment_methods.id"), nullable=True),
            sa.Column("payment_type", sa.String(30), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("exchange_rate", sa.Numeric(12, 6), default=1),
            sa.Column("gateway", sa.String(30), nullable=True),
            sa.Column("gateway_charge_id", sa.String(255), nullable=True),
            sa.Column("gateway_fee", sa.Numeric(14, 2), default=0),
            sa.Column("net_amount", sa.Numeric(14, 2), default=0),
            sa.Column("payment_date", sa.Date(), nullable=False),
            sa.Column("cleared_at", sa.DateTime(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.Column("failure_code", sa.String(50), nullable=True),
            sa.Column("receipt_sent", sa.Boolean(), default=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "payment_number", name="uq_payments_org_number"),
        )

    if "payment_allocations" not in existing_tables:
        op.create_table(
            "payment_allocations",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("payment_id", "invoice_id", name="uq_payalloc_payment_invoice"),
        )

    if "payment_attempts" not in existing_tables:
        op.create_table(
            "payment_attempts",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=False, index=True),
            sa.Column("attempt_number", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False),
            sa.Column("gateway_response", sa.JSON(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3j: Credit & Refund tables ---

    if "credit_notes" not in existing_tables:
        op.create_table(
            "credit_notes",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=True),
            sa.Column("credit_note_number", sa.String(50), nullable=False),
            sa.Column("credit_note_type", sa.String(30), nullable=False),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
            sa.Column("subtotal", sa.Numeric(14, 2), default=0),
            sa.Column("tax_amount", sa.Numeric(14, 2), default=0),
            sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("remaining_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("issue_date", sa.Date(), nullable=False),
            sa.Column("voided_at", sa.DateTime(), nullable=True),
            sa.Column("voided_reason", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "credit_note_number", name="uq_credit_notes_org_number"),
        )

    if "credit_note_applications" not in existing_tables:
        op.create_table(
            "credit_note_applications",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("credit_note_id", sa.Integer(), sa.ForeignKey("credit_notes.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "refunds" not in existing_tables:
        op.create_table(
            "refunds",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id"), nullable=True),
            sa.Column("credit_note_id", sa.Integer(), sa.ForeignKey("credit_notes.id"), nullable=True),
            sa.Column("refund_number", sa.String(50), nullable=False),
            sa.Column("refund_type", sa.String(30), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("currency", sa.String(3), default="USD"),
            sa.Column("gateway", sa.String(30), nullable=True),
            sa.Column("gateway_refund_id", sa.String(255), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "refund_number", name="uq_refunds_org_number"),
        )

    # --- 3k: Tax transaction records ---

    if "taxes" not in existing_tables:
        op.create_table(
            "taxes",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=True),
            sa.Column("credit_note_id", sa.Integer(), sa.ForeignKey("credit_notes.id"), nullable=True),
            sa.Column("tax_rate_id", sa.Integer(), sa.ForeignKey("tax_rates.id"), nullable=True),
            sa.Column("taxable_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("tax_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("tax_percentage", sa.Numeric(5, 2), nullable=False),
            sa.Column("jurisdiction", sa.String(255), nullable=True),
            sa.Column("tax_type", sa.String(30), nullable=True),
            sa.Column("is_reverse_charge", sa.Boolean(), default=False),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3l: Dunning & Collections ---

    if "dunning_cases" not in existing_tables:
        op.create_table(
            "dunning_cases",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="active"),
            sa.Column("current_level", sa.Integer(), nullable=False, default=1),
            sa.Column("total_overdue_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("days_overdue", sa.Integer(), nullable=False),
            sa.Column("last_action_at", sa.DateTime(), nullable=True),
            sa.Column("last_action_type", sa.String(100), nullable=True),
            sa.Column("next_action_at", sa.Date(), nullable=True),
            sa.Column("auto_escalate", sa.Boolean(), default=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("resolution_note", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    if "collections_cases" not in existing_tables:
        op.create_table(
            "collections_cases",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("billing_customers.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("case_number", sa.String(50), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="open"),
            sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("total_outstanding", sa.Numeric(14, 2), nullable=False),
            sa.Column("amount_collected", sa.Numeric(14, 2), default=0),
            sa.Column("days_overdue", sa.Integer(), nullable=False),
            sa.Column("priority", sa.String(30), nullable=False, server_default="normal"),
            sa.Column("last_contact_at", sa.DateTime(), nullable=True),
            sa.Column("next_action_date", sa.Date(), nullable=True),
            sa.Column("resolution", sa.Text(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
            sa.UniqueConstraint("organization_id", "case_number", name="uq_collections_cases_org_number"),
        )

    if "collection_actions" not in existing_tables:
        op.create_table(
            "collection_actions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("collection_id", sa.Integer(), sa.ForeignKey("collections_cases.id"), nullable=False, index=True),
            sa.Column("action_type", sa.String(50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("performed_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("performed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("outcome", sa.Text(), nullable=True),
            sa.Column("follow_up_date", sa.Date(), nullable=True),
        )

    # --- 3m: Revenue recognition ---

    if "revenue_recognition_schedules" not in existing_tables:
        op.create_table(
            "revenue_recognition_schedules",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id"), nullable=True),
            sa.Column("recognition_method", sa.String(30), nullable=False),
            sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("recognized_amount", sa.Numeric(14, 2), default=0),
            sa.Column("deferred_amount", sa.Numeric(14, 2), default=0),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
            sa.Column("is_active", sa.Boolean(), default=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    if "revenue_recognition_entries" not in existing_tables:
        op.create_table(
            "revenue_recognition_entries",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("schedule_id", sa.Integer(), sa.ForeignKey("revenue_recognition_schedules.id"), nullable=False, index=True),
            sa.Column("entry_date", sa.Date(), nullable=False),
            sa.Column("amount", sa.Numeric(14, 2), nullable=False),
            sa.Column("is_released", sa.Boolean(), default=False),
            sa.Column("released_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # --- 3n: Billing audit log (append-only) ---

    if "billing_audit_logs" not in existing_tables:
        op.create_table(
            "billing_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("actor_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("entity_type", sa.String(50), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=False),
            sa.Column("action", sa.String(30), nullable=False),
            sa.Column("old_values", sa.JSON(), nullable=True),
            sa.Column("new_values", sa.JSON(), nullable=True),
            sa.Column("changes", sa.JSON(), nullable=True),
            sa.Column("ip_address", sa.String(50), nullable=True),
            sa.Column("user_agent", sa.String(500), nullable=True),
            sa.Column("request_id", sa.String(100), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Index("ix_billing_audit_logs_entity", "entity_type", "entity_id"),
            sa.Index("ix_billing_audit_logs_org_action", "organization_id", "action"),
            sa.Index("ix_billing_audit_logs_timestamp", "timestamp"),
        )

    # ═══════════════════════════════════════════════════════════════════
    # SECTION 4 — Add FKs, indexes & constraints to invoices
    # ═══════════════════════════════════════════════════════════════════

    if "invoices" in existing_tables:
        op.create_index("ix_invoices_organization_id", "invoices", ["organization_id"])
        op.create_index("ix_invoices_customer_id", "invoices", ["customer_id"])
        op.create_index("ix_invoices_status", "invoices", ["status"])
        op.create_index("ix_invoices_issue_date", "invoices", ["issue_date"])
        op.create_index("ix_invoices_due_date", "invoices", ["due_date"])
        op.create_unique_constraint("uq_invoices_org_number", "invoices", ["organization_id", "invoice_number"])
        op.create_foreign_key("fk_invoices_organization_id", "invoices", "organizations", ["organization_id"], ["id"])
        op.create_foreign_key("fk_invoices_customer_id", "invoices", "billing_customers", ["customer_id"], ["id"])
        op.create_foreign_key("fk_invoices_subscription_id", "invoices", "subscriptions", ["subscription_id"], ["id"])
        op.create_foreign_key("fk_invoices_quotation_id", "invoices", "quotations", ["quotation_id"], ["id"])
        op.create_foreign_key("fk_invoices_contract_id", "invoices", "contracts", ["contract_id"], ["id"])
        op.create_foreign_key("fk_invoices_updated_by", "invoices", "employees", ["updated_by"], ["id"])
        print("[migrate] Added indexes, constraints, and FKs to 'invoices'")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # Drop billing tables in reverse dependency order
    tables_to_drop = [
        "revenue_recognition_entries",
        "revenue_recognition_schedules",
        "collection_actions",
        "collections_cases",
        "dunning_cases",
        "taxes",
        "refunds",
        "credit_note_applications",
        "credit_notes",
        "payment_attempts",
        "payment_allocations",
        "payments",
        "payment_methods",
        "invoice_status_history",
        "invoice_items",
        "quotation_items",
        "quotations",
        "subscription_events",
        "subscriptions",
        "contracts",
        "subscription_plans",
        "plan_tiers",
        "pricing_plans",
        "products",
        "customer_contacts",
        "billing_customers",
        "billing_settings",
        "tax_rates",
        "dunning_levels",
        "product_categories",
        "billing_audit_logs",
    ]
    for table in tables_to_drop:
        if table in existing_tables:
            op.drop_table(table)
            print(f"[migrate] Dropped '{table}'")

    # Restore invoices to original state
    if "invoices" in existing_tables:
        existing_cols = {c["name"] for c in inspector.get_columns("invoices")}

        # Drop FK constraints and indexes
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_organization_id")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_customer_id")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_subscription_id")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_quotation_id")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_contract_id")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_updated_by")
        op.execute("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS uq_invoices_org_number")
        op.execute("DROP INDEX IF EXISTS ix_invoices_organization_id")
        op.execute("DROP INDEX IF EXISTS ix_invoices_customer_id")
        op.execute("DROP INDEX IF EXISTS ix_invoices_status")
        op.execute("DROP INDEX IF EXISTS ix_invoices_issue_date")
        op.execute("DROP INDEX IF EXISTS ix_invoices_due_date")

        # Drop added columns
        added_cols = [
            "organization_id", "customer_id", "subscription_id", "quotation_id", "contract_id",
            "invoice_type", "discount_percentage", "discount_amount", "paid_amount", "balance_due",
            "currency", "exchange_rate", "sent_at", "reminded_at", "paid_at", "cancelled_at",
            "cancellation_reason", "payment_terms", "po_number", "is_recurring", "is_active",
            "deleted_at", "updated_by",
        ]
        for col in added_cols:
            if col in existing_cols:
                op.drop_column("invoices", col)

        # Restore client_id
        if "client_id" not in existing_cols:
            op.add_column("invoices", sa.Column("client_id", sa.Integer(), nullable=False, server_default="1"))
            op.alter_column("invoices", "client_id", server_default=None)

        # Restore unique constraint on invoice_number
        op.create_unique_constraint("invoices_invoice_number_key", "invoices", ["invoice_number"])

    # Re-create old billing tables
    if "clients" not in existing_tables:
        op.create_table(
            "clients",
            sa.Column("id", sa.INTEGER(), sa.Identity(), nullable=False),
            sa.Column("name", sa.VARCHAR(200), nullable=False),
            sa.Column("email", sa.VARCHAR(255), nullable=True),
            sa.Column("phone", sa.VARCHAR(30), nullable=True),
            sa.Column("address", sa.TEXT(), nullable=True),
            sa.Column("is_active", sa.BOOLEAN(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id", name="clients_pkey"),
            sa.UniqueConstraint("email", name="clients_email_key"),
        )

    if "invoice_lines" not in existing_tables:
        op.create_table(
            "invoice_lines",
            sa.Column("id", sa.INTEGER(), sa.Identity(), nullable=False),
            sa.Column("invoice_id", sa.INTEGER(), nullable=False),
            sa.Column("description", sa.VARCHAR(500), nullable=False),
            sa.Column("quantity", sa.NUMERIC(10, 2), nullable=False),
            sa.Column("unit_price", sa.NUMERIC(12, 2), nullable=False),
            sa.Column("total", sa.NUMERIC(14, 2), nullable=False),
            sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], name="invoice_lines_invoice_id_fkey"),
            sa.PrimaryKeyConstraint("id", name="invoice_lines_pkey"),
        )

    print("[migrate] Downgrade complete — old billing tables restored")
