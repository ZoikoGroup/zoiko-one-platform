"""merge heads: employee_id and doc_category_enum

Revision ID: 37013faca880
Revises: i0j1k2l3m4n5, y9z8x7w6v5u4
Create Date: 2026-07-09 11:35:19.211708

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37013faca880'
down_revision: Union[str, None] = ('i0j1k2l3m4n5', 'y9z8x7w6v5u4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
