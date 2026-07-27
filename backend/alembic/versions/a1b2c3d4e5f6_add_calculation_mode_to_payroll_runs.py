"""Add calculation_mode column to payroll_runs

Revision ID: a1b2c3d4e5f6
Revises: b76e3297a5a8
Create Date: 2026-07-22

Adds a nullable calculation_mode column to payroll_runs so each run
records which policy calculation mode (simple/standard/enterprise) was
active when it was created.
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'b76e3297a5a8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('payroll_runs', sa.Column('calculation_mode', sa.String(20), nullable=True, server_default='standard'))


def downgrade():
    op.drop_column('payroll_runs', 'calculation_mode')
