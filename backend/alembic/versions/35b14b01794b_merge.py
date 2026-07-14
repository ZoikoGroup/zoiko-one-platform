"""merge

Revision ID: 35b14b01794b
Revises: 1ee7c69696f3, c7d8e9f0a2b3, m1n2o3p4q5r6
Create Date: 2026-07-13 13:57:31.096619

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35b14b01794b'
down_revision: Union[str, None] = ('1ee7c69696f3', 'c7d8e9f0a2b3', 'm1n2o3p4q5r6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
