"""merge all heads after duplicate revision repair

Joins the three remaining heads into a single terminal head:

  - a5b6c7d8e9f1  (add_payroll_leave_requests — renamed from d1e2f3a4b5c6)
  - c7d8e9f0a3b4  (backfill_historical_employee_ids)
  - p1b_sub_prov   (subscription_price_provenance)

All schema operations from every migration in the graph have already been
applied to the database.  This migration is a pure pass-through.

Revision ID: z1a2b3c4d5e6
Revises: a5b6c7d8e9f1, c7d8e9f0a3b4, p1b_sub_prov
Create Date: 2026-07-21
"""

from typing import Sequence, Union

revision: str = "z1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = (
    "a5b6c7d8e9f1",
    "c7d8e9f0a3b4",
    "p1b_sub_prov",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
