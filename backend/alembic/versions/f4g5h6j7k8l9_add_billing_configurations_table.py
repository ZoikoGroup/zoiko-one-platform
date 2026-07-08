"""add_billing_configurations_table

Revision ID: f4g5h6j7k8l9
Revises: h2i3j4k5l6m7
Create Date: 2026-07-03 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f4g5h6j7k8l9"
down_revision: Union[str, None] = "b2c3d4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_configurations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, unique=True, index=True),

        # ── General ──
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("billing_email", sa.String(255), nullable=True),
        sa.Column("billing_phone", sa.String(30), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("fiscal_year_start", sa.String(5), nullable=False, server_default="01-01"),
        sa.Column("fiscal_year_end", sa.String(5), nullable=False, server_default="12-31"),
        sa.Column("default_currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("supported_currencies", postgresql.JSON(), nullable=True, server_default=sa.text("'[\"USD\"]'::json")),
        sa.Column("date_format", sa.String(20), nullable=False, server_default="DD-MM-YYYY"),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="UTC"),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),

        # ── Address ──
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("address_line1", sa.String(255), nullable=True),
        sa.Column("address_line2", sa.String(255), nullable=True),

        # ── Registration ──
        sa.Column("business_registration_number", sa.String(100), nullable=True),
        sa.Column("gst_number", sa.String(50), nullable=True),
        sa.Column("vat_number", sa.String(50), nullable=True),
        sa.Column("pan_number", sa.String(50), nullable=True),
        sa.Column("tin_number", sa.String(50), nullable=True),

        # ── Invoicing ──
        sa.Column("invoice_prefix", sa.String(10), nullable=False, server_default="INV-"),
        sa.Column("invoice_number_format", sa.String(50), nullable=False, server_default="PREFIX-{YYYY}-{SEQ}"),
        sa.Column("invoice_sequence_reset", sa.String(20), nullable=False, server_default="annually"),
        sa.Column("quote_prefix", sa.String(10), nullable=False, server_default="QTE-"),
        sa.Column("quote_number_format", sa.String(50), nullable=False, server_default="PREFIX-{YYYY}-{SEQ}"),
        sa.Column("quote_sequence_reset", sa.String(20), nullable=False, server_default="annually"),
        sa.Column("credit_note_prefix", sa.String(10), nullable=False, server_default="CN-"),
        sa.Column("credit_note_number_format", sa.String(50), nullable=False, server_default="PREFIX-{YYYY}-{SEQ}"),
        sa.Column("credit_note_sequence_reset", sa.String(20), nullable=False, server_default="annually"),
        sa.Column("refund_prefix", sa.String(10), nullable=False, server_default="RF-"),
        sa.Column("refund_number_format", sa.String(50), nullable=False, server_default="PREFIX-{YYYY}-{SEQ}"),
        sa.Column("refund_sequence_reset", sa.String(20), nullable=False, server_default="annually"),
        sa.Column("auto_generate_invoice_number", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("invoice_footer", sa.Text(), nullable=True),
        sa.Column("invoice_terms", sa.Text(), nullable=True),
        sa.Column("invoice_notes", sa.Text(), nullable=True),
        sa.Column("invoice_logo_url", sa.String(500), nullable=True),
        sa.Column("invoice_watermark", sa.String(500), nullable=True),
        sa.Column("invoice_template", sa.String(30), nullable=False, server_default="standard"),
        sa.Column("invoice_pdf_template", sa.String(50), nullable=False, server_default="standard"),
        sa.Column("draft_behaviour", sa.String(30), nullable=False, server_default="save_as_draft"),
        sa.Column("invoice_terms_and_conditions", sa.Text(), nullable=True),
        sa.Column("show_tax_breakdown", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("show_discount", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("show_shipping", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("default_due_days", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("payment_reminder_days_before", sa.Integer(), nullable=False, server_default=sa.text("3")),
        sa.Column("late_payment_fee_percentage", sa.Numeric(5, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("late_payment_fee_flat", sa.Numeric(14, 2), nullable=False, server_default=sa.text("0")),

        # ── Currency ──
        sa.Column("base_currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("currency_precision", sa.Integer(), nullable=False, server_default=sa.text("2")),
        sa.Column("currency_symbol_position", sa.String(10), nullable=False, server_default="before"),

        # ── Payments ──
        sa.Column("default_payment_terms", sa.String(20), nullable=False, server_default="net_30"),
        sa.Column("payment_term_options", postgresql.JSON(), nullable=True, server_default=sa.text("'[\"net_30\", \"net_15\", \"net_7\", \"due_on_receipt\"]'::json")),
        sa.Column("supported_payment_methods", postgresql.JSON(), nullable=True, server_default=sa.text("'[\"credit_card\", \"bank_transfer\", \"paypal\"]'::json")),
        sa.Column("auto_send_receipts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("exchange_rate_provider", sa.String(30), nullable=False, server_default="manual"),
        sa.Column("exchange_rate_auto_update", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("rounding_method", sa.String(20), nullable=False, server_default="half_up"),
        sa.Column("rounding_precision", sa.Integer(), nullable=False, server_default=sa.text("2")),

        # ── Payment Gateways ──
        sa.Column("gateway_stripe_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("gateway_razorpay_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("gateway_paypal_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("gateway_cash_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("gateway_bank_transfer_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("gateway_upi_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("gateway_offline_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("webhook_secret", sa.String(500), nullable=True),
        sa.Column("retry_rules", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"max_retries\": 3, \"retry_interval_hours\": 24}'::json")),
        sa.Column("auto_capture_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("refund_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"auto_approve\": false, \"refund_window_days\": 30, \"require_reason\": true}'::json")),
        sa.Column("grace_period_days", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("credit_limit", sa.Numeric(14, 2), nullable=False, server_default=sa.text("0")),

        # ── Tax ──
        sa.Column("tax_calculation_method", sa.String(20), nullable=False, server_default="exclusive"),
        sa.Column("default_tax_rate_id", sa.Integer(), sa.ForeignKey("tax_rates.id"), nullable=True),
        sa.Column("tax_label", sa.String(50), nullable=False, server_default="VAT"),
        sa.Column("tax_number", sa.String(100), nullable=True),
        sa.Column("tax_profiles", postgresql.JSON(), nullable=True, server_default=sa.text("'[]'::json")),
        sa.Column("is_tax_inclusive_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("show_tax_on_invoice", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_auto_tax_calculation", sa.Boolean(), nullable=False, server_default=sa.text("false")),

        # ── Tax Types ──
        sa.Column("gst_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("gst_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("vat_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("sales_tax_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sales_tax_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("service_tax_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("service_tax_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("withholding_tax_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("withholding_tax_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("reverse_charge_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reverse_charge_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("compound_tax_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("compound_tax_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("tax_regions", postgresql.JSON(), nullable=True, server_default=sa.text("'[]'::json")),
        sa.Column("tax_categories", postgresql.JSON(), nullable=True, server_default=sa.text("'[]'::json")),
        sa.Column("hsn_sac_codes", postgresql.JSON(), nullable=True, server_default=sa.text("'[]'::json")),
        sa.Column("tax_rounding_method", sa.String(20), nullable=False, server_default="per_line"),

        # ── Dunning & Collections ──
        sa.Column("auto_dunning", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("dunning_level_count", sa.Integer(), nullable=False, server_default=sa.text("4")),
        sa.Column("dunning_wait_days", sa.Integer(), nullable=False, server_default=sa.text("3")),
        sa.Column("dunning_action_types", postgresql.JSON(), nullable=True, server_default=sa.text("'[\"email_reminder\"]'::json")),
        sa.Column("enable_escalation_to_collections", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("collections_wait_days", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("dunning_email_template", sa.Text(), nullable=True),
        sa.Column("reminder_schedule", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"before_due\": [3, 1], \"after_due\": [0, 3, 7, 14, 30]}'::json")),
        sa.Column("reminder_sms_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reminder_whatsapp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("auto_suspend_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("grace_days", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("penalty_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"type\": \"percentage\", \"value\": 0, \"max_cap\": null}'::json")),
        sa.Column("interest_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"annual_rate\": 0, \"compounding\": \"simple\", \"waive_first_x_days\": 0}'::json")),
        sa.Column("final_notice_template", sa.Text(), nullable=True),

        # ── Revenue Recognition ──
        sa.Column("enable_revenue_recognition", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("revenue_recognition_method", sa.String(30), nullable=False, server_default="immediate"),
        sa.Column("revenue_recognition_deferral_days", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("recognized_revenue_method", sa.String(20), nullable=False, server_default="accrual"),
        sa.Column("revenue_accounts", postgresql.JSON(), nullable=True, server_default=sa.text("'{\"deferred_revenue\": null, \"recognized_revenue\": null, \"contract_asset\": null}'::json")),
        sa.Column("recognition_frequency", sa.String(50), nullable=False, server_default="monthly"),
        sa.Column("recognition_schedule", postgresql.JSON(), nullable=True, server_default=sa.text("'[]'::json")),

        # ── Multi-currency ──
        sa.Column("enable_multi_currency", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("home_currency", sa.String(3), nullable=False, server_default="USD"),

        # ── Notifications ──
        sa.Column("email_templates", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("sms_templates", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),
        sa.Column("notification_preferences", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),

        # ── Notification Events ──
        sa.Column("notify_invoice_created", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_invoice_sent", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_invoice_paid", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_invoice_overdue", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_subscription_renewed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_subscription_cancelled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_payment_failed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_payment_success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_customer_created", sa.Boolean(), nullable=False, server_default=sa.text("false")),

        # ── Feature Flags / Advanced ──
        sa.Column("enable_approval_workflow", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enable_credit_notes", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_discounts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_retainers", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enable_schedule_invoicing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enable_partial_payments", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_auto_apply_credits", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_quotes", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_contracts", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_usage_billing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enable_refunds", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("enable_auto_taxes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("enable_audit_logs", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("security_settings", postgresql.JSON(), nullable=True, server_default=sa.text("'{}'::json")),

        # ── Audit ──
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("billing_configurations")
