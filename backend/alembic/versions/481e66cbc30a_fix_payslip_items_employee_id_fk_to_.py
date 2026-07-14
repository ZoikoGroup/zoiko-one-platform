"""fix payslip_items employee_id fk to payroll_employees

Revision ID: 481e66cbc30a
Revises: d8e9f0a1b2c3
Create Date: 2026-07-13 15:27:53.392360

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '481e66cbc30a'
down_revision: Union[str, None] = 'd8e9f0a1b2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE payslip_items DROP CONSTRAINT IF EXISTS payslip_items_employee_id_fkey"
    )
    op.execute(
        "ALTER TABLE payslip_items ADD CONSTRAINT payslip_items_employee_id_fkey "
        "FOREIGN KEY (employee_id) REFERENCES payroll_employees(id)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE payslip_items DROP CONSTRAINT IF EXISTS payslip_items_employee_id_fkey"
    )
    op.execute(
        "ALTER TABLE payslip_items ADD CONSTRAINT payslip_items_employee_id_fkey "
        "FOREIGN KEY (employee_id) REFERENCES employees(id)"
    )
