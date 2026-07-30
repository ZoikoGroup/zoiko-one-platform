"""add processed_at to payroll_runs

Adds a dedicated "Processed Date" timestamp to PayrollRun, set when a run
reaches the PAID status (advance_payroll_run_status in service.py). Purely
additive metadata for the Run Details view — does not touch any payroll
calculation.

Revision ID: 8968e9be02e7
Revises: 0f0da5f294be
Create Date: 2026-07-28 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '8968e9be02e7'
down_revision: Union[str, None] = '0f0da5f294be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_runs')]
    if 'processed_at' not in cols:
        op.add_column('payroll_runs', sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    cols = [c['name'] for c in insp.get_columns('payroll_runs')]
    if 'processed_at' in cols:
        op.drop_column('payroll_runs', 'processed_at')
