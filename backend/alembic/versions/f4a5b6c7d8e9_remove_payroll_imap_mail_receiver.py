"""Remove payroll IMAP mail-receiver feature

Drops the IMAP-only columns from payroll_email_settings and the two
IMAP-only tables (payroll_inbound_messages, payroll_inbound_attachments).
SMTP send-identity columns on payroll_email_settings are untouched.

No real data was lost by this migration: at the time it was written, zero
organizations had imap_enabled=true and both inbound tables were empty.

Revision ID: f4a5b6c7d8e9
Revises: d09221f9281a
Create Date: 2026-08-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4a5b6c7d8e9"
down_revision: Union[str, None] = "d09221f9281a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "payroll_inbound_attachments" in tables:
        op.drop_table("payroll_inbound_attachments")
    else:
        print("[migrate] Table 'payroll_inbound_attachments' does not exist — skipping")

    if "payroll_inbound_messages" in tables:
        op.drop_table("payroll_inbound_messages")
    else:
        print("[migrate] Table 'payroll_inbound_messages' does not exist — skipping")

    if "payroll_email_settings" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("payroll_email_settings")}
        for col in ["imap_enabled", "imap_host", "imap_port", "imap_username", "imap_password", "imap_use_ssl", "last_polled_at"]:
            if col in existing_cols:
                op.drop_column("payroll_email_settings", col)
    else:
        print("[migrate] Table 'payroll_email_settings' does not exist — skipping")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "payroll_email_settings" in tables:
        existing_cols = {c["name"] for c in inspector.get_columns("payroll_email_settings")}
        if "imap_enabled" not in existing_cols:
            op.add_column("payroll_email_settings", sa.Column("imap_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
            op.add_column("payroll_email_settings", sa.Column("imap_host", sa.String(255), nullable=True))
            op.add_column("payroll_email_settings", sa.Column("imap_port", sa.String(10), nullable=True))
            op.add_column("payroll_email_settings", sa.Column("imap_username", sa.String(255), nullable=True))
            op.add_column("payroll_email_settings", sa.Column("imap_password", sa.Text(), nullable=True))
            op.add_column("payroll_email_settings", sa.Column("imap_use_ssl", sa.Boolean(), nullable=False, server_default=sa.text("true")))
            op.add_column("payroll_email_settings", sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True))

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
