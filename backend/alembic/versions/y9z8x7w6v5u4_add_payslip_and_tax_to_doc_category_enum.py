"""add payslip and tax to HrDocumentCategory enum

Revision ID: y9z8x7w6v5u4
Revises: a9b0c1d2e3f4
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op

revision: str = "y9z8x7w6v5u4"
down_revision: Union[str, None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE hrdocumentcategory ADD VALUE IF NOT EXISTS 'payslip'")
    op.execute("ALTER TYPE hrdocumentcategory ADD VALUE IF NOT EXISTS 'tax'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum.
    # The new values are harmless and won't be used if the application
    # code is reverted, so we leave them in place.
    pass
