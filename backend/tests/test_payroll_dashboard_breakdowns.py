"""
Regression tests for get_dashboard_breakdowns / _compute_attendance_deductions
after rewriting them from "pull every PayslipItem into Python and loop" to
SQL-level SUM/GROUP BY (perf fix — these ran on every 30s Dashboard poll
tick and scaled linearly with total payslips ever generated).

Since tests run against the real dev DB (see conftest.py), org_id=1 may
already have real PayslipItem rows from normal app usage. To stay correct
regardless of existing data, every assertion compares the DELTA introduced
by this test's own rows, not an absolute total.
"""

from datetime import date
from decimal import Decimal

from app.modules.payroll.models import PayrollEmployee, PayrollRun, PayslipItem
from app.modules.payroll.service import _compute_attendance_deductions, get_dashboard_breakdowns


def _seed_run_with_items(db, org_id):
    employee = PayrollEmployee(
        organization_id=org_id, employee_code="TESTPERF-1", name="Test Perf Employee",
        email="testperf@example.com",
    )
    db.add(employee)
    db.flush()

    run = PayrollRun(
        organization_id=org_id, period_label="Test Perf Period",
        period_start=date(2031, 1, 1), period_end=date(2031, 1, 31), pay_date=date(2031, 2, 1),
    )
    db.add(run)
    db.flush()

    # Item 1: prorated (payable_days < total_working_days) — 20/25 days.
    item1 = PayslipItem(
        payroll_run_id=run.id, employee_id=employee.id, organization_id=org_id,
        employee_name="Test Perf Employee", department="TestPerfDept",
        basic_salary=Decimal("9000"), hra=Decimal("3000"), special_allowance=Decimal("3000"),
        overtime=Decimal("100"), additional_compensation=Decimal("0"),
        gross_pay=Decimal("11250"),
        payable_days=Decimal("20"), total_working_days=Decimal("25"),
        attendance_deduction=Decimal("500"),
        tds=Decimal("500"), pf=Decimal("200"), esi=Decimal("50"),
    )
    # Item 2: full month, no proration.
    item2 = PayslipItem(
        payroll_run_id=run.id, employee_id=employee.id, organization_id=org_id,
        employee_name="Test Perf Employee", department="TestPerfDept",
        basic_salary=Decimal("8000"), hra=Decimal("2000"), special_allowance=Decimal("2000"),
        overtime=Decimal("0"), additional_compensation=Decimal("200"),
        gross_pay=Decimal("12000"),
        payable_days=Decimal("22"), total_working_days=Decimal("22"),
        attendance_deduction=Decimal("0"),
        tds=Decimal("300"), pf=Decimal("150"), esi=Decimal("40"),
    )
    db.add_all([item1, item2])
    db.flush()
    return run


def test_compute_attendance_deductions_matches_manual_proration(db):
    org_id = 1
    before = _compute_attendance_deductions(db, org_id)

    _seed_run_with_items(db, org_id)

    after = _compute_attendance_deductions(db, org_id)

    # Item 1: (basic+hra+special) * (total_working_days - payable_days) / payable_days
    #        = (9000+3000+3000) * (25-20) / 20 = 15000 * 5 / 20 = 3750
    # Item 2: no proration loss (payable_days == total_working_days) -> 0
    expected_delta = Decimal("3750.00")
    assert (after - before) == expected_delta


def test_dashboard_breakdowns_pay_types_and_deductions_match_manual_sums(db):
    org_id = 1
    before = get_dashboard_breakdowns(db, org_id)
    before_pay = {p["name"]: p["value"] for p in before["payTypes"]}
    before_ded = {d["name"]: d["total"] for d in before["deductions"]}
    before_dept = {d["name"]: d["amount"] for d in before["byDepartment"]}

    _seed_run_with_items(db, org_id)

    after = get_dashboard_breakdowns(db, org_id)
    after_pay = {p["name"]: p["value"] for p in after["payTypes"]}
    after_ded = {d["name"]: d["total"] for d in after["deductions"]}
    after_dept = {d["name"]: d["amount"] for d in after["byDepartment"]}

    assert after_pay["Basic Salary"] - before_pay.get("Basic Salary", 0) == 17000  # 9000+8000
    assert after_pay["HRA"] - before_pay.get("HRA", 0) == 5000                     # 3000+2000
    assert after_pay["Special Allowance"] - before_pay.get("Special Allowance", 0) == 5000  # 3000+2000
    assert after_pay["Overtime"] - before_pay.get("Overtime", 0) == 100
    assert after_pay["Additional"] - before_pay.get("Additional", 0) == 200

    assert after_ded["LOP Deduction"] - before_ded.get("LOP Deduction", 0) == 500  # attendance_deduction sum

    # tds/pf/esi labels are jurisdiction-aware (see get_dashboard_breakdowns),
    # so match by delta rather than assuming a fixed India-locale label name.
    before_total = sum(before_ded.values())
    after_total = sum(after_ded.values())
    assert after_total - before_total == 500 + 800 + 350 + 90  # LOP + tds(500+300) + pf(200+150) + esi(50+40)

    # New department introduced by this test's seed data — full amount visible (no pre-existing rows for it).
    assert after_dept["TestPerfDept"] - before_dept.get("TestPerfDept", 0) == 23250  # 11250 + 12000
