"""p1b_sub_prov_placeholder_stub

Stub migration to match the revision 'p1b_sub_prov' that was previously
applied to the database but whose migration file was removed/lost.
This is a no-op — all changes were already applied to the DB directly.

Revision ID: p1b_sub_prov
Revises: p1a_price_provenance_foundation
Create Date: 2026-07-20 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p1b_sub_prov'
down_revision: Union[str, None] = 'p1a_price_provenance_foundation'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

