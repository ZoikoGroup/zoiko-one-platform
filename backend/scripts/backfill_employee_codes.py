"""
Backfill ZK-* employee_codes in Employee table only.

Run: python scripts/backfill_employee_codes.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database import SessionLocal
from app.core.code_generation import generate_employee_code


def backfill():
    db = SessionLocal()
    try:
        rows = db.execute(
            text("SELECT id, organization_id, employee_code FROM employees WHERE employee_code LIKE 'ZK-%' ORDER BY id")
        ).fetchall()

        if not rows:
            print("No ZK- employees found.")
            return

        print(f"Found {len(rows)} employees with ZK- codes")

        for emp_id, org_id, old_code in rows:
            new_code = generate_employee_code(db, organization_id=org_id)
            db.execute(
                text("UPDATE employees SET employee_code = :new_code WHERE id = :id"),
                {"new_code": new_code, "id": emp_id},
            )
            db.flush()
            print(f"  Employee {emp_id}: {old_code} -> {new_code}")

        db.commit()
        print("Backfill complete.")
    finally:
        db.close()


if __name__ == "__main__":
    backfill()
