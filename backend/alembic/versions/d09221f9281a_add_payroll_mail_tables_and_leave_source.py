"""Add payroll email/mail tables and leave_request source column

Adds the payroll SMTP-reuse + IMAP mail-receiver submodule's tables
(payroll_email_settings, payroll_inbound_messages, payroll_inbound_attachments)
and a nullable-safe "source" column on payroll_leave_requests distinguishing
manually-submitted requests from ones converted from an inbound email.

No credentials are set by this migration — payroll_email_settings rows are
only ever created empty (get-or-create-on-first-access) and populated later
by an org admin through the API.

Revision ID: d09221f9281a
Revises: d9e0f1a2b3c4
Create Date: 2026-07-30 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d09221f9281a"
down_revision: Union[str, None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # ── payroll_leave_requests.source ──
    if "payroll_leave_requests" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("payroll_leave_requests")}
        if "source" not in existing_cols:
            op.add_column(
                "payroll_leave_requests",
                sa.Column("source", sa.String(20), nullable=False, server_default="manual"),
            )
        else:
            print("[migrate] Column 'source' already exists on 'payroll_leave_requests' — skipping")
    else:
        print("[migrate] Table 'payroll_leave_requests' does not exist yet — skipping source column")

    # ── payroll_email_settings ──
    if "payroll_email_settings" not in tables:
        op.create_table(
            "payroll_email_settings",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, unique=True, index=True),
            sa.Column("from_email", sa.String(255), nullable=True),
            sa.Column("from_display_name", sa.String(150), nullable=True),
            sa.Column("notify_payslip_ready", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("notify_run_approved", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("use_custom_smtp", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("custom_smtp_host", sa.String(255), nullable=True),
            sa.Column("custom_smtp_port", sa.String(10), nullable=True),
            sa.Column("custom_smtp_username", sa.String(255), nullable=True),
            sa.Column("custom_smtp_password", sa.Text(), nullable=True),
            sa.Column("imap_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("imap_host", sa.String(255), nullable=True),
            sa.Column("imap_port", sa.String(10), nullable=True),
            sa.Column("imap_username", sa.String(255), nullable=True),
            sa.Column("imap_password", sa.Text(), nullable=True),
            sa.Column("imap_use_ssl", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
    else:
        print("[migrate] Table 'payroll_email_settings' already exists — skipping")

    # ── payroll_inbound_messages ──
    if "payroll_inbound_messages" not in tables:
        op.create_table(
            "payroll_inbound_messages",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
            sa.Column("message_uid", sa.String(100), nullable=False),
            sa.Column("from_email", sa.String(255), nullable=False),
            sa.Column("to_email", sa.String(255), nullable=True),
            sa.Column("subject", sa.String(500), nullable=True),
            sa.Column("body_text", sa.Text(), nullable=True),
            sa.Column("body_html", sa.Text(), nullable=True),
            sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="unmatched"),
            sa.Column("matched_employee_id", sa.Integer(), sa.ForeignKey("payroll_employees.id"), nullable=True),
            sa.Column("leave_request_id", sa.Integer(), sa.ForeignKey("payroll_leave_requests.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
            sa.UniqueConstraint("organization_id", "message_uid", name="uq_org_message_uid"),
        )
        op.create_index(
            "ix_inbound_messages_org_status", "payroll_inbound_messages",
            ["organization_id", "status"],
        )
    else:
        print("[migrate] Table 'payroll_inbound_messages' already exists — skipping")

    # ── payroll_inbound_attachments ──
    if "payroll_inbound_attachments" not in tables:
        op.create_table(
            "payroll_inbound_attachments",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("message_id", sa.Integer(), sa.ForeignKey("payroll_inbound_messages.id"), nullable=False, index=True),
            sa.Column("file_path", sa.String(500), nullable=False),
            sa.Column("file_name", sa.String(255), nullable=False),
            sa.Column("file_size", sa.Integer(), nullable=True),
            sa.Column("mime_type", sa.String(100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        )
    else:
        print("[migrate] Table 'payroll_inbound_attachments' already exists — skipping")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "payroll_inbound_attachments" in tables:
        op.drop_table("payroll_inbound_attachments")
    if "payroll_inbound_messages" in tables:
        op.drop_table("payroll_inbound_messages")
    if "payroll_email_settings" in tables:
        op.drop_table("payroll_email_settings")

    if "payroll_leave_requests" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("payroll_leave_requests")}
        if "source" in existing_cols:
            op.drop_column("payroll_leave_requests", "source")
