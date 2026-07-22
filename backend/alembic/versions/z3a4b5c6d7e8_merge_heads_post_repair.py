"""merge heads after graph repair

Joins the two remaining heads into a single terminal head:

  - 9669414fad2e  (merge_stub_d2e4f6a8c0b2_into_main — new branch from Payroll Police module)
  - z1a2b3c4d5e6  (merge_all_heads_final — established merge from previous repair)

Both heads are already applied to the database. This migration is a pure
pass-through that consolidates the graph into a single terminal head.

Revision ID: z3a4b5c6d7e8
Revises: 9669414fad2e, z1a2b3c4d5e6
Create Date: 2026-07-22
"""
from typing import Sequence, Union

revision: str = "z3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = (
    "9669414fad2e",
    "z1a2b3c4d5e6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
