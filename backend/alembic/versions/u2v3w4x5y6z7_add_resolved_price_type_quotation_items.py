"""add_resolved_price_type_quotation_items

BUG-003/BUG-007 follow-up: quotation_items was missing the
`resolved_price_type` column that invoice_items and contract_items already
have (added in h1b2c3d4e5f6). Without it, QuoteService.recalculate_quote
cannot tell whether a persisted line's unit_price is a per-unit rate or an
already-computed lump-sum/graduated total, so it always assumed "unit" and
double-counted any tiered plan that carries a flat_fee. This migration
brings quotation_items in line with its sibling tables — same column name
and type, no other schema change.

Revision ID: u2v3w4x5y6z7
Revises: t1u2v3w4x5y6
Create Date: 2026-08-10 12:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "u2v3w4x5y6z7"
down_revision: Union[str, None] = "t1u2v3w4x5y6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "quotation_items" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("quotation_items")}
    if "resolved_price_type" in existing_cols:
        return
    op.add_column(
        "quotation_items",
        sa.Column("resolved_price_type", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "quotation_items" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("quotation_items")}
    if "resolved_price_type" in existing_cols:
        op.drop_column("quotation_items", "resolved_price_type")
