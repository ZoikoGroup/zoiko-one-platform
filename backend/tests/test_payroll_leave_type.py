"""
Tests that _count_payable_days correctly distinguishes paid vs unpaid leaves.

Bug: all "leave" attendance records were treated as unpaid, reducing payable_days.
After the fix, only leave_type="unpaid" (or NULL for legacy rows) reduces
payable_days. Paid / sick / casual leaves should NOT reduce payable_days.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.modules.payroll.service import _count_payable_days
from app.modules.payroll.models import PayrollAttendanceRecord, PayrollEmployee


def _get_test_emp(db, org_id):
    """Create or get a test employee in the given org (inside the test transaction)."""
    emp = db.query(PayrollEmployee).filter(
        PayrollEmployee.organization_id == org_id,
        PayrollEmployee.employee_code == "TEST-LEAVE"
    ).first()
    if not emp:
        emp = PayrollEmployee(
            organization_id=org_id,
            employee_code="TEST-LEAVE",
            first_name="Leave",
            last_name="Tester",
            email="leave.tester@test.local",
            designation="Tester",
            department="QA",
            status="active",
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)
    return emp.id


def _make_attendance(db, org_id, emp_id, dt, status, leave_type=None):
    """Insert a single attendance record."""
    rec = PayrollAttendanceRecord(
        organization_id=org_id,
        employee_id=emp_id,
        date=dt,
        status=status,
        leave_type=leave_type,
    )
    db.add(rec)
    db.commit()


def _next_weekday(start):
    """Return the next Monday on or after start."""
    while start.weekday() >= 5:
        start += timedelta(days=1)
    return start


@pytest.fixture(autouse=True)
def _clean_up(db):
    """Remove test attendance records and employee after each test."""
    yield
    emp = db.query(PayrollEmployee).filter(
        PayrollEmployee.employee_code == "TEST-LEAVE"
    ).first()
    if emp:
        db.query(PayrollAttendanceRecord).filter(
            PayrollAttendanceRecord.employee_id == emp.id
        ).delete(synchronize_session="fetch")
        db.delete(emp)
        db.commit()


def test_unpaid_leave_reduces_payable_days(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 7, 20))
    tuesday = monday + timedelta(days=1)

    _make_attendance(db, org_id, emp_id, tuesday, "leave", "unpaid")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("4")


def test_paid_leave_does_not_reduce_payable_days(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 8, 3))
    tuesday = monday + timedelta(days=1)

    _make_attendance(db, org_id, emp_id, tuesday, "leave", "paid")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("5")


def test_sick_leave_does_not_reduce_payable_days(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 8, 10))
    wednesday = monday + timedelta(days=2)

    _make_attendance(db, org_id, emp_id, wednesday, "leave", "sick")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("5")


def test_casual_leave_does_not_reduce_payable_days(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 8, 17))

    _make_attendance(db, org_id, emp_id, monday, "leave", "casual")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("5")


def test_null_leave_type_treated_as_unpaid(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 8, 24))
    thursday = monday + timedelta(days=3)

    _make_attendance(db, org_id, emp_id, thursday, "leave", None)

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("4")


def test_absent_always_reduces_payable_days(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 8, 31))
    wednesday = monday + timedelta(days=2)

    _make_attendance(db, org_id, emp_id, wednesday, "absent")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, monday + timedelta(days=4))
    assert total == Decimal("5")
    assert payable == Decimal("4")


def test_mixed_leave_types(db):
    org_id = 1
    emp_id = _get_test_emp(db, org_id)
    monday = _next_weekday(date(2026, 9, 7))
    tuesday = monday + timedelta(days=1)
    wednesday = monday + timedelta(days=2)
    thursday = monday + timedelta(days=3)
    friday = monday + timedelta(days=4)

    _make_attendance(db, org_id, emp_id, monday, "leave", "paid")
    _make_attendance(db, org_id, emp_id, tuesday, "leave", "sick")
    _make_attendance(db, org_id, emp_id, wednesday, "leave", "unpaid")
    _make_attendance(db, org_id, emp_id, thursday, "absent")
    _make_attendance(db, org_id, emp_id, friday, "leave", "casual")

    payable, total = _count_payable_days(db, org_id, emp_id, monday, friday)
    assert total == Decimal("5")
    assert payable == Decimal("3")  # wed (unpaid) + thurs (absent) excluded
