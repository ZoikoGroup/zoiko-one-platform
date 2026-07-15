"""Audit payroll_employees basic/hra: detect and normalize annual vs monthly values

The payroll engine now treats basic/hra as ANNUAL amounts (matching ctc).
This script audits existing records to identify employees whose basic+hra
sum is close to their ctc (meaning they were already entered as annual)
versus those where basic+hra is a small fraction of ctc (already monthly
and now need to be multiplied by 12 to stay correct under the new convention).

Revision ID: b3c4d5e6f7g8
Revises: a2b3c4d5e6f7
Create Date: 2026-07-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7g8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Audit and log employees whose basic/hra appear to be monthly values.

    Detection heuristic: if basic + hra < 0.5 * ctc, the values were
    likely entered as monthly (the new engine divides by 12 again,
    which would make them ~1/12th of intended). These records need
    manual review or migration to annual values.

    This script is a READ-ONLY audit — it logs warnings but does NOT
    modify data, to avoid silent corruption. Admins should review the
    flagged employees and update their basic/hra to annual amounts.
    """
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT id, employee_code, first_name, last_name, ctc, basic, hra
        FROM payroll_employees
        WHERE basic IS NOT NULL AND hra IS NOT NULL
          AND ctc > 0
    """))

    flagged = []
    ok = []
    for row in result:
        emp_id, code, first, last, ctc, basic, hra = row
        ctc = float(ctc or 0)
        basic = float(basic or 0)
        hra = float(hra or 0)
        combined = basic + hra

        if ctc <= 0:
            continue

        ratio = combined / ctc
        if ratio < 0.5:
            # basic+hra is a small fraction of ctc — likely monthly values
            flagged.append({
                "id": emp_id,
                "code": code,
                "name": f"{first} {last}".strip(),
                "ctc": ctc,
                "basic": basic,
                "hra": hra,
                "ratio": ratio,
            })
        else:
            ok.append({"id": emp_id, "code": code, "ratio": ratio})

    if flagged:
        print(f"\n{'='*70}")
        print(f"PAYROLL BASIC/HRA UNIT AUDIT — {len(flagged)} employee(s) flagged")
        print(f"{'='*70}")
        print("The following employees have basic+hra < 50% of their ctc,")
        print("suggesting basic/hra were entered as MONTHLY amounts.")
        print("The payroll engine now treats them as ANNUAL (divides by 12).")
        print("Please review and update these records to annual values:\n")
        for f in flagged:
            print(f"  ID={f['id']}  {f['code']}  {f['name']}")
            print(f"    CTC={f['ctc']:,.2f}  basic={f['basic']:,.2f}  hra={f['hra']:,.2f}"
                  f"  ratio={f['ratio']:.2f}")
        print(f"\n{'='*70}\n")
    else:
        print("\nAll employees with explicit basic/hra appear to use annual units. No action needed.\n")


def downgrade() -> None:
    # Audit-only migration — nothing to downgrade.
    pass
