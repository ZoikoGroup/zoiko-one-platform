"""add document versions + approval workflow tables

Revision ID: x9y8z7w6v5u4
Revises: 
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "x9y8z7w6v5u4"
down_revision: Union[str, None] = "20ef3eb283c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # ── Add columns to hr_documents ──
    existing_hr_doc_cols = [c["name"] for c in inspector.get_columns("hr_documents")]
    if "current_version" not in existing_hr_doc_cols:
        op.add_column("hr_documents", sa.Column("current_version", sa.Integer(), server_default="1", nullable=False))
    if "access_control" not in existing_hr_doc_cols:
        op.add_column("hr_documents", sa.Column("access_control", postgresql.JSON, nullable=True))
    if "approved_by" not in existing_hr_doc_cols:
        op.add_column("hr_documents", sa.Column("approved_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True))
    if "approved_at" not in existing_hr_doc_cols:
        op.add_column("hr_documents", sa.Column("approved_at", sa.DateTime(), nullable=True))
    if "is_template" not in existing_hr_doc_cols:
        op.add_column("hr_documents", sa.Column("is_template", sa.Boolean(), server_default="false", nullable=False))

    # ── hr_document_versions table ──
    if "hr_document_versions" not in inspector.get_table_names():
        op.create_table(
            "hr_document_versions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("document_id", sa.Integer(), sa.ForeignKey("hr_documents.id"), nullable=False, index=True),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("file_path", sa.String(500), nullable=True),
            sa.Column("file_name", sa.String(255), nullable=True),
            sa.Column("file_size", sa.Integer(), nullable=True),
            sa.Column("mime_type", sa.String(100), nullable=True),
            sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("change_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )

    # ── document_approval_steps table ──
    if "document_approval_steps" not in inspector.get_table_names():
        op.create_table(
            "document_approval_steps",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("document_id", sa.Integer(), sa.ForeignKey("hr_documents.id"), nullable=False, index=True),
            sa.Column("step_order", sa.Integer(), nullable=False),
            sa.Column("required_role", sa.String(50), nullable=False),
            sa.Column("status", sa.String(20), server_default="pending", nullable=False),
            sa.Column("approved_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )

    # ── document_approval_logs table ──
    if "document_approval_logs" not in inspector.get_table_names():
        op.create_table(
            "document_approval_logs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("document_id", sa.Integer(), sa.ForeignKey("hr_documents.id"), nullable=False, index=True),
            sa.Column("action", sa.String(20), nullable=False),
            sa.Column("step_id", sa.Integer(), sa.ForeignKey("document_approval_steps.id"), nullable=True),
            sa.Column("performed_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
            sa.Column("role_at_time", sa.String(50), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("document_approval_logs")
    op.drop_table("document_approval_steps")
    op.drop_table("hr_document_versions")
    op.drop_column("hr_documents", "is_template")
    op.drop_column("hr_documents", "approved_at")
    op.drop_column("hr_documents", "approved_by")
    op.drop_column("hr_documents", "access_control")
    op.drop_column("hr_documents", "current_version")
