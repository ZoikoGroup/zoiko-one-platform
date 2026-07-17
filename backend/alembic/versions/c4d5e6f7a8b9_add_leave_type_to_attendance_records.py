"""Add leave_type column to payroll_attendance_records

When status = 'leave', leave_type distinguishes unpaid (reduces payable_days)
from paid/sick/casual (do not reduce payable_days). Defaults to NULL for
backwards compatibility with existing rows.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7g8
Create Date: 2026-07-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7g8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'payroll_attendance_records',
        sa.Column('leave_type', sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('payroll_attendance_records', 'leave_type')
