"""
Regression test for the N+1 fix in generate_payslips_for_run: attendance
records are now batch-fetched once per run (employee_id IN (...)) instead of
2 queries per employee. _count_unpaid_leave_days / _sum_attendance_extras
now accept a pre-fetched `records` list and must produce IDENTICAL results
to their original per-employee-query behavior.
"""

from datetime import date
from decimal import Decimal

from app.modules.payroll.models import PayrollEmployee, PayrollAttendanceRecord
from app.modules.payroll.service import _count_unpaid_leave_days, _sum_attendance_extras


def _seed_employee_with_attendance(db, org_id):
    employee = PayrollEmployee(
        organization_id=org_id, employee_code="TESTATT-1", name="Test Attendance Employee",
        email="testatt@example.com",
    )
    db.add(employee)
    db.flush()

    period_start, period_end = date(2031, 3, 1), date(2031, 3, 31)
    records = [
        PayrollAttendanceRecord(
            organization_id=org_id, employee_id=employee.id,
            date=date(2031, 3, 5), status="absent", rewards=Decimal("0"),
        ),
        PayrollAttendanceRecord(
            organization_id=org_id, employee_id=employee.id,
            date=date(2031, 3, 6), status="leave", leave_type="unpaid", rewards=Decimal("0"),
        ),
        PayrollAttendanceRecord(
            organization_id=org_id, employee_id=employee.id,
            date=date(2031, 3, 7), status="leave", leave_type="paid", rewards=Decimal("0"),
        ),
        PayrollAttendanceRecord(
            organization_id=org_id, employee_id=employee.id,
            date=date(2031, 3, 10), status="present",
            rewards=Decimal("500"), bonus=Decimal("1000"), other_compensation=Decimal("250"),
        ),
    ]
    db.add_all(records)
    db.flush()
    return employee, period_start, period_end


def test_batched_records_match_query_path_for_unpaid_leave_days(db):
    org_id = 1
    employee, period_start, period_end = _seed_employee_with_attendance(db, org_id)

    # Original path: records=None -> queries the DB itself.
    via_query = _count_unpaid_leave_days(db, org_id, employee.id, period_start, period_end)

    # Batched path: caller pre-fetches once and passes the list in.
    prefetched = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == org_id,
        PayrollAttendanceRecord.employee_id == employee.id,
        PayrollAttendanceRecord.date >= period_start,
        PayrollAttendanceRecord.date <= period_end,
    ).all()
    via_batch = _count_unpaid_leave_days(db, org_id, employee.id, period_start, period_end, records=prefetched)

    assert via_query == via_batch == 2  # 1 absent + 1 unpaid leave; paid leave doesn't count


def test_batched_records_match_query_path_for_attendance_extras(db):
    org_id = 1
    employee, period_start, period_end = _seed_employee_with_attendance(db, org_id)

    via_query = _sum_attendance_extras(db, org_id, employee.id, period_start, period_end)

    prefetched = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == org_id,
        PayrollAttendanceRecord.employee_id == employee.id,
        PayrollAttendanceRecord.date >= period_start,
        PayrollAttendanceRecord.date <= period_end,
    ).all()
    via_batch = _sum_attendance_extras(db, org_id, employee.id, period_start, period_end, records=prefetched)

    assert via_query == via_batch == Decimal("1750.00")  # 500 + 1000 + 250
