"""merge heads into a single linear graph

Merges the three remaining heads after the nikhil/main branch merge:

  - a9b0c1d2e3f4  (add_leave_balances_to_leave_allocations)
  - x9y8z7w6v5u4  (add_document_versions_approval_workflow)
  - f5g6h7j8k9l0  (harden_billing_models_enterprise)

Revision ID: f6g7h8j9k0l1
Revises: a9b0c1d2e3f4, x9y8z7w6v5u4, f5g6h7j8k9l0
Create Date: 2026-07-08 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6g7h8j9k0l1"
down_revision: Union[str, None] = (
    "a9b0c1d2e3f4",
    "x9y8z7w6v5u4",
    "f5g6h7j8k9l0",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
