"""Enforce at most one is_default=true tax rate per organization

Adds a partial unique index on tax_rates(organization_id) WHERE is_default,
backing the "exactly one organization default" rule for the global tax
catalogue feature. TaxService.create_tax_rate/update_tax_rate now demote any
existing default before setting a new one, so this index is a backstop
against races/direct-DB writes rather than the primary enforcement path.

Pre-existing data may already have more than one is_default=true row for the
same organization (no enforcement existed before this migration). Before
creating the index, this migration demotes all but one such row per
organization — keeping the one TaxRateRepository.get_default() was already
treating as "the" effective default (highest priority, ties broken by lowest
id), so this preserves current runtime behavior rather than changing it.

Idempotent: checks pg_indexes before creating/dropping.

Revision ID: q2r3s4t5u6v7
Revises: p1q2r3s4t5u6
Create Date: 2026-08-11

"""
from typing import Sequence, Union

from alembic import op

revision: str = "q2r3s4t5u6v7"
down_revision: Union[str, None] = "p1q2r3s4t5u6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "uq_tax_rates_org_default"


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.exec_driver_sql(
        "SELECT 1 FROM pg_indexes WHERE indexname = %(name)s",
        {"name": INDEX_NAME},
    ).first()
    if exists:
        print(f"[migrate] Index '{INDEX_NAME}' already exists — skipping")
        return

    result = conn.exec_driver_sql("""
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY organization_id ORDER BY priority DESC, id ASC
            ) AS rn
            FROM tax_rates
            WHERE is_default = true
        )
        UPDATE tax_rates
        SET is_default = false
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    """)
    if result.rowcount:
        print(f"[migrate] Demoted {result.rowcount} duplicate default tax rate(s) "
              f"(kept the highest-priority default per organization)")

    conn.exec_driver_sql(
        f"CREATE UNIQUE INDEX {INDEX_NAME} ON tax_rates (organization_id) WHERE is_default = true"
    )
    print(f"[migrate] Created partial unique index '{INDEX_NAME}'")


def downgrade() -> None:
    conn = op.get_bind()
    exists = conn.exec_driver_sql(
        "SELECT 1 FROM pg_indexes WHERE indexname = %(name)s",
        {"name": INDEX_NAME},
    ).first()
    if not exists:
        print(f"[migrate] Index '{INDEX_NAME}' does not exist — skipping")
        return
    conn.exec_driver_sql(f"DROP INDEX {INDEX_NAME}")
    print(f"[migrate] Dropped index '{INDEX_NAME}'")
