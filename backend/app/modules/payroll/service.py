"""
modules/payroll/service.py
--------------------------
Business logic for the Zoiko Payroll module.

Replaces all client-side mock computation (the old `generatePayslips()` in
PayslipsPage.jsx) with real, server-side, persisted calculations. Contribution
rates and tax slabs are stored per-organization in the database (seeded with
sensible defaults on first access) so they are genuinely configurable data,
not hardcoded constants baked into the frontend.

IMPORTANT — payroll tax accuracy disclaimer:
The PF/ESI/PT/TDS calculations below implement the standard *simplified*
formulas (flat percentages of basic/gross, progressive slab tax on an
annualized gross with no deductions/exemptions modeled). Real statutory
payroll (especially TDS, which depends on regime, Section 80C/80D
declarations, HRA exemption rules, etc., and Professional Tax, which is
state-specific) is genuinely complex. Before going live, either replace
`_calculate_annual_tax` / `_generate_single_payslip` with a certified
payroll engine, or have these formulas reviewed by a payroll/compliance
specialist for your jurisdiction.
"""

import os as _os
import re
from typing import List, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from calendar import month_name

from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.modules.payroll.models import (
    PayrollEmployee, EmploymentType, EmployeeStatus,
    PayrollRun, PayslipItem, PayrollAttendanceRecord, PayrollLeaveAllocation,
    ContributionRate, TaxSlab, CompanyComplianceDetails, ComplianceDocument, PayrollActivityLog,
    PayrollStatus, PayslipStatus, ActivityStatus, ComplianceDocumentStatus,
    PAYROLL_STATUS_ORDER,
)
from app.modules.payroll.schemas import (
    PayrollRunCreate, PayrollRunUpdate, PayslipItemCreate, CompanyDetailsUpdate,
    EmployeeCreate, EmployeeUpdate, BulkEmployeeItem, BulkEmployeeRequest,
    BulkDeleteRequest,
    AttendanceRecordCreate, BulkAttendanceRequest,
)
from app.core.exceptions import NotFoundException
from fastapi import HTTPException, status as http_status


ESI_MONTHLY_WAGE_CEILING = Decimal("21000")  # employees above this gross are ESI-exempt
MONTHS_PER_YEAR = Decimal("12")


def _round2(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ── Org-scoping helpers ─────────────────────────────────────────────────

def _apply_org_filter(query, model, organization_id: int = None):
    if organization_id:
        return query.filter(model.organization_id == organization_id)
    return query


def log_activity(db: Session, organization_id: int, description: str,
                  status: ActivityStatus = ActivityStatus.INFO, actor_id: int = None):
    entry = PayrollActivityLog(
        organization_id=organization_id,
        description=description,
        status=status,
        actor_id=actor_id,
    )
    db.add(entry)
    db.commit()
    return entry


# ── Contribution rates / tax slabs (seeded, then DB-backed) ────────────

def _seed_contribution_rates(db: Session, organization_id: int) -> List[ContributionRate]:
    defaults = [
        dict(component_key="pf", label="Employee Provident Fund (EPF)",
             employee_share="12% of Basic", employer_share="12% of Basic", total="24% of Basic",
             employee_rate_pct=Decimal("12.00"), employer_rate_pct=Decimal("12.00"), sort_order=1),
        dict(component_key="esi", label="Employee State Insurance (ESI)",
             employee_share="0.75% of Gross", employer_share="3.25% of Gross", total="4% of Gross",
             employee_rate_pct=Decimal("0.75"), employer_rate_pct=Decimal("3.25"), sort_order=2),
        dict(component_key="pt", label="Professional Tax (PT)",
             employee_share="₹200/month (fixed)", employer_share="—", total="₹200",
             flat_amount=Decimal("200.00"), sort_order=3),
        dict(component_key="tds", label="TDS / Income Tax",
             employee_share="As per income slab", employer_share="—", total="As per slab",
             sort_order=4),
    ]
    rows = []
    for d in defaults:
        row = ContributionRate(organization_id=organization_id, **d)
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_contribution_rates(db: Session, organization_id: int = None) -> List[ContributionRate]:
    query = db.query(ContributionRate)
    query = _apply_org_filter(query, ContributionRate, organization_id)
    rows = query.order_by(ContributionRate.sort_order).all()
    if not rows and organization_id:
        rows = _seed_contribution_rates(db, organization_id)
    return rows


def _seed_tax_slabs(db: Session, organization_id: int) -> List[TaxSlab]:
    defaults = [
        dict(min_amount=Decimal("0"),        max_amount=Decimal("250000"),  rate_pct=Decimal("0"),  rate_label="Nil", tax_formula="Basic exemption", sort_order=1),
        dict(min_amount=Decimal("250000"),   max_amount=Decimal("500000"),  rate_pct=Decimal("5"),  rate_label="5%",  tax_formula="₹12,500 + 5% above ₹2.5L", sort_order=2),
        dict(min_amount=Decimal("500000"),   max_amount=Decimal("750000"),  rate_pct=Decimal("10"), rate_label="10%", tax_formula="₹37,500 + 10% above ₹5L", sort_order=3),
        dict(min_amount=Decimal("750000"),   max_amount=Decimal("1000000"), rate_pct=Decimal("15"), rate_label="15%", tax_formula="₹62,500 + 15% above ₹7.5L", sort_order=4),
        dict(min_amount=Decimal("1000000"),  max_amount=Decimal("1250000"), rate_pct=Decimal("20"), rate_label="20%", tax_formula="₹1,00,000 + 20% above ₹10L", sort_order=5),
        dict(min_amount=Decimal("1250000"),  max_amount=Decimal("1500000"), rate_pct=Decimal("25"), rate_label="25%", tax_formula="₹1,50,000 + 25% above ₹12.5L", sort_order=6),
        dict(min_amount=Decimal("1500000"),  max_amount=None,               rate_pct=Decimal("30"), rate_label="30%", tax_formula="₹2,12,500 + 30% above ₹15L", sort_order=7),
    ]
    rows = []
    for d in defaults:
        row = TaxSlab(organization_id=organization_id, **d)
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_tax_slabs(db: Session, organization_id: int = None) -> List[TaxSlab]:
    query = db.query(TaxSlab)
    query = _apply_org_filter(query, TaxSlab, organization_id)
    rows = query.order_by(TaxSlab.sort_order).all()
    if not rows and organization_id:
        rows = _seed_tax_slabs(db, organization_id)
    return rows


def _calculate_annual_tax(annual_income: Decimal, slabs: List[TaxSlab]) -> Decimal:
    """Progressive slab-based tax on the full annual income. See module
    docstring for the accuracy disclaimer."""
    tax = Decimal("0")
    for slab in sorted(slabs, key=lambda s: s.min_amount):
        lower = slab.min_amount
        upper = slab.max_amount if slab.max_amount is not None else annual_income
        if annual_income <= lower:
            continue
        taxable_in_band = min(annual_income, upper) - lower
        if taxable_in_band > 0:
            tax += taxable_in_band * (slab.rate_pct / Decimal("100"))
    return tax


# ── Payslip generation (real computation, replaces client-side mock) ──

def _generate_single_payslip(db: Session, run: PayrollRun, employee, rate_map, slabs) -> PayslipItem:
    ctc = Decimal(str(getattr(employee, "ctc", 0) or 0))
    monthly_gross_base = _round2(ctc / MONTHS_PER_YEAR) if ctc else Decimal("0")

    basic     = _round2(monthly_gross_base * Decimal("0.40"))
    hra       = _round2(monthly_gross_base * Decimal("0.20"))
    special   = _round2(monthly_gross_base * Decimal("0.40"))
    is_active = employee.status == EmployeeStatus.ACTIVE
    overtime  = _round2(monthly_gross_base * Decimal("0.02")) if is_active else Decimal("0")
    gross     = basic + hra + special + overtime

    pf_rate = rate_map.get("pf")
    employee_pf = _round2(basic * (pf_rate.employee_rate_pct / 100)) if pf_rate and pf_rate.employee_rate_pct else Decimal("0")
    employer_pf = _round2(basic * (pf_rate.employer_rate_pct / 100)) if pf_rate and pf_rate.employer_rate_pct else Decimal("0")

    esi_rate = rate_map.get("esi")
    esi_applicable = gross <= ESI_MONTHLY_WAGE_CEILING
    employee_esi = _round2(gross * (esi_rate.employee_rate_pct / 100)) if esi_rate and esi_rate.employee_rate_pct and esi_applicable else Decimal("0")
    employer_esi = _round2(gross * (esi_rate.employer_rate_pct / 100)) if esi_rate and esi_rate.employer_rate_pct and esi_applicable else Decimal("0")

    pt_rate = rate_map.get("pt")
    professional_tax = pt_rate.flat_amount if pt_rate and pt_rate.flat_amount else Decimal("0")

    annual_taxable = gross * MONTHS_PER_YEAR
    annual_tax = _calculate_annual_tax(annual_taxable, slabs)
    tds = _round2(annual_tax / MONTHS_PER_YEAR)

    total_deductions = employee_pf + employee_esi + professional_tax
    net_pay = gross - total_deductions - tds

    employee_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip() \
        or getattr(employee, "name", f"Employee #{employee.id}")

    item = PayslipItem(
        payroll_run_id=run.id,
        employee_id=employee.id,
        organization_id=run.organization_id,
        employee_name=employee_name,
        department=getattr(employee, "department", None),
        bank_account=getattr(employee, "bank_account", None),
        pan=getattr(employee, "pan", None),
        basic_salary=basic,
        hra=hra,
        special_allowance=special,
        overtime=overtime,
        gross_pay=gross,
        pf=employee_pf,
        esi=employee_esi,
        professional_tax=professional_tax,
        tds=tds,
        total_deductions=total_deductions,
        employer_pf=employer_pf,
        employer_esi=employer_esi,
        net_pay=net_pay,
        status=PayslipStatus.PENDING,
    )
    db.add(item)
    return item


def _recompute_run_aggregates(db: Session, run: PayrollRun):
    items = db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run.id).all()
    run.employee_count = len(items)
    run.total_gross = sum((i.gross_pay for i in items), Decimal("0"))
    run.total_deductions = sum((i.total_deductions for i in items), Decimal("0"))
    run.total_taxes = sum((i.tds for i in items), Decimal("0"))
    run.total_employer_contribution = sum((i.employer_pf + i.employer_esi for i in items), Decimal("0"))
    run.total_net = sum((i.net_pay for i in items), Decimal("0"))
    db.commit()
    db.refresh(run)
    return run


def generate_payslips_for_run(db: Session, run: PayrollRun, organization_id: int = None) -> PayrollRun:
    """Generate a payslip for every Active employee in the org. Idempotent:
    re-running skips employees who already have a payslip in this run."""
    rate_map = {r.component_key: r for r in get_contribution_rates(db, organization_id)}
    slabs = get_tax_slabs(db, organization_id)

    employees_query = db.query(PayrollEmployee).filter(
        PayrollEmployee.status == EmployeeStatus.ACTIVE,
        PayrollEmployee.organization_id == organization_id,
    )
    employees = employees_query.all()

    existing_ids = {
        row.employee_id for row in
        db.query(PayslipItem.employee_id).filter(PayslipItem.payroll_run_id == run.id).all()
    }

    for emp in employees:
        if emp.id in existing_ids:
            continue
        _generate_single_payslip(db, run, emp, rate_map, slabs)

    db.commit()
    return _recompute_run_aggregates(db, run)


# ── Employees ────────────────────────────────────────────────────────────
# PayrollEmployee is owned entirely by payroll — organization_id is required
# (not optional) since every payroll employee must belong to a tenant.

def get_employees(db: Session, organization_id: int,
                   search: str = None, department: str = None, status: str = None) -> List[PayrollEmployee]:
    query = db.query(PayrollEmployee).filter(PayrollEmployee.organization_id == organization_id)
    if department:
        query = query.filter(PayrollEmployee.department == department)
    if status:
        query = query.filter(PayrollEmployee.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (PayrollEmployee.first_name.ilike(like)) |
            (PayrollEmployee.last_name.ilike(like)) |
            (PayrollEmployee.employee_code.ilike(like))
        )
    return query.order_by(PayrollEmployee.first_name).all()


def get_employee_by_id(db: Session, employee_id: int, organization_id: int) -> PayrollEmployee:
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == employee_id,
        PayrollEmployee.organization_id == organization_id,
    ).first()
    if not employee:
        raise NotFoundException(f"Employee {employee_id} not found.")
    return employee


def create_employee(db: Session, data: EmployeeCreate, organization_id: int) -> PayrollEmployee:
    employee_data = data.model_dump()

    if not employee_data.get("employee_code"):
        employee_data["employee_code"] = f"EMP-{_next_employee_start_num(db, organization_id):04d}"

    existing = db.query(PayrollEmployee).filter(
        PayrollEmployee.organization_id == organization_id,
        PayrollEmployee.employee_code == employee_data["employee_code"],
    ).first()
    if existing:
        raise HTTPException(
            http_status.HTTP_409_CONFLICT,
            detail=f"Employee code '{employee_data['employee_code']}' already exists in this organization.",
        )

    employee = PayrollEmployee(organization_id=organization_id, **employee_data)
    db.add(employee)
    db.commit()
    db.refresh(employee)

    try:
        log_activity(db, organization_id, f"Employee '{employee.first_name} {employee.last_name}' added.",
                     ActivityStatus.INFO)
    except Exception:
        try:
            db.rollback()
            db.refresh(employee)
        except Exception:
            pass

    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate, organization_id: int) -> PayrollEmployee:
    employee = get_employee_by_id(db, employee_id, organization_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value == "":
            continue
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


FIELD_MAP = {
    "firstName": "first_name",
    "lastName": "last_name",
    "email": "email",
    "phone": "phone",
    "department": "department",
    "designation": "designation",
    "employmentType": "employment_type",
    "status": "status",
    "dateOfJoining": "date_of_joining",
    "ctc": "ctc",
    "bankAccountNumber": "bank_account",
    "panNumber": "pan",
}


def _next_employee_start_num(db: Session, organization_id: int) -> int:
    max_code = db.query(sa_func.max(PayrollEmployee.employee_code)).filter(
        PayrollEmployee.organization_id == organization_id
    ).scalar()
    if max_code:
        try:
            return int(max_code.split("-")[-1]) + 1
        except (ValueError, IndexError):
            return db.query(PayrollEmployee).filter(
                PayrollEmployee.organization_id == organization_id
            ).count() + 1
    return 1


def _map_employee_row(row: BulkEmployeeItem) -> dict:
    mapped = {}
    for camel_field, snake_field in FIELD_MAP.items():
        value = getattr(row, camel_field, None)
        if value is not None:
            if camel_field == "dateOfJoining":
                try:
                    from datetime import date
                    mapped[snake_field] = date.fromisoformat(str(value))
                except (ValueError, TypeError):
                    mapped[snake_field] = None
            else:
                mapped[snake_field] = value
    return mapped


def bulk_create_employees(db: Session, data: BulkEmployeeRequest, organization_id: int) -> dict:
    created_employees = []
    failed = []
    next_num = _next_employee_start_num(db, organization_id)

    for row in data.employees:
        if not row.firstName or not row.lastName or not row.email:
            failed.append({
                "row": {"email": row.email, "firstName": row.firstName},
                "reason": "First name, last name, and email are required.",
            })
            continue

        mapped = _map_employee_row(row)
        mapped["employee_code"] = f"EMP-{next_num:04d}"
        next_num += 1
        mapped["organization_id"] = organization_id

        employee = PayrollEmployee(**mapped)
        db.add(employee)
        created_employees.append(employee)

    try:
        db.commit()
    except Exception:
        db.rollback()
        return {"created": 0, "employees": [], "failed": [{"row": {}, "reason": "Database error — possible duplicate employee_code, email, or other unique constraint."}]}

    for emp in created_employees:
        db.refresh(emp)

    # Use a dedicated session for activity logging so a log failure
    # cannot rollback/expire the employee objects in the main session.
    log_db = None
    try:
        from app.database import SessionLocal as _LogSession
        log_db = _LogSession()
        log_activity(log_db, organization_id,
                     f"Bulk created {len(created_employees)} employees.",
                     ActivityStatus.INFO)
    except Exception:
        if log_db:
            log_db.rollback()
    finally:
        if log_db:
            log_db.close()

    return {"created": len(created_employees), "employees": created_employees, "failed": failed}


def delete_employee(db: Session, employee_id: int, organization_id: int):
    employee = get_employee_by_id(db, employee_id, organization_id)
    has_payslips = db.query(PayslipItem.id).filter(PayslipItem.employee_id == employee_id).first()
    if has_payslips:
        raise HTTPException(
            http_status.HTTP_409_CONFLICT,
            detail="Cannot delete an employee who already has payslip history. Set status to Inactive instead.",
        )
    db.delete(employee)
    db.commit()


def bulk_delete_employees(db: Session, data: BulkDeleteRequest, organization_id: int) -> dict:
    deleted = []
    failed = []

    for emp_id in data.employee_ids:
        try:
            employee = get_employee_by_id(db, emp_id, organization_id)
            has_payslips = db.query(PayslipItem.id).filter(PayslipItem.employee_id == emp_id).first()
            if has_payslips:
                failed.append({"id": emp_id, "reason": "Has payslip history — set status to Inactive instead."})
                continue
            db.delete(employee)
            deleted.append(emp_id)
        except NotFoundException:
            failed.append({"id": emp_id, "reason": "Not found."})

    if deleted:
        db.commit()

    if deleted:
        try:
            log_activity(db, organization_id, f"Bulk deleted {len(deleted)} employees.",
                         ActivityStatus.INFO)
        except Exception:
            pass

    return {"deleted": deleted, "failed": failed}


# ── Payroll Runs ────────────────────────────────────────────────────────

def create_payroll_run(db: Session, created_by: int, data: PayrollRunCreate, organization_id: int = None) -> PayrollRun:
    payload = data.model_dump(exclude={"auto_generate_payslips"})
    run = PayrollRun(created_by=created_by, **payload)
    if organization_id:
        run.organization_id = organization_id
    db.add(run)
    db.commit()
    db.refresh(run)

    if data.auto_generate_payslips:
        run = generate_payslips_for_run(db, run, organization_id)

    log_activity(db, organization_id, f"Payroll run '{run.period_label}' created.",
                 ActivityStatus.INFO, actor_id=created_by)
    return run


def get_payroll_runs(db: Session, organization_id: int = None) -> List[PayrollRun]:
    query = db.query(PayrollRun).order_by(PayrollRun.period_start.desc())
    return _apply_org_filter(query, PayrollRun, organization_id).all()


def get_payroll_run_by_id(db: Session, run_id: int, organization_id: int = None) -> PayrollRun:
    query = db.query(PayrollRun).filter(PayrollRun.id == run_id)
    query = _apply_org_filter(query, PayrollRun, organization_id)
    run = query.first()
    if not run:
        raise NotFoundException(f"Payroll run {run_id} not found.")
    return run


def update_payroll_run(db: Session, run_id: int, data: PayrollRunUpdate, organization_id: int = None) -> PayrollRun:
    run = get_payroll_run_by_id(db, run_id, organization_id)
    if run.status in (PayrollStatus.PAID, PayrollStatus.CLOSED):
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail=f"Cannot edit a run that is already {run.status.value}.")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(run, field, value)
    db.commit()
    db.refresh(run)
    return run


def advance_payroll_run_status(db: Session, run_id: int, approver_id: int, organization_id: int = None) -> PayrollRun:
    """Moves a run one step forward in its lifecycle
    (Draft → Review → Approved → Authorized → Paid → Closed).
    Backs the single "Approve" button in the UI."""
    run = get_payroll_run_by_id(db, run_id, organization_id)
    current_idx = PAYROLL_STATUS_ORDER.index(run.status)
    if current_idx >= len(PAYROLL_STATUS_ORDER) - 1:
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail="This run has already reached its final status.")

    next_status = PAYROLL_STATUS_ORDER[current_idx + 1]
    run.status = next_status
    if next_status == PayrollStatus.APPROVED:
        run.approved_by = approver_id
        run.approved_at = datetime.utcnow()
    if next_status == PayrollStatus.PAID:
        db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run.id).update(
            {PayslipItem.status: PayslipStatus.PAID, PayslipItem.paid_at: datetime.utcnow()}
        )
    db.commit()
    db.refresh(run)

    log_activity(db, organization_id, f"Payroll run '{run.period_label}' advanced to {next_status.value}.",
                 ActivityStatus.SUCCESS, actor_id=approver_id)
    return run


def delete_payroll_run(db: Session, run_id: int, organization_id: int = None):
    run = get_payroll_run_by_id(db, run_id, organization_id)
    if run.status != PayrollStatus.DRAFT:
        raise HTTPException(http_status.HTTP_409_CONFLICT, detail="Only Draft runs can be deleted.")
    db.delete(run)
    db.commit()


# ── Payslip Items ──────────────────────────────────────────────────────

def add_payslip_item(db: Session, run_id: int, data: PayslipItemCreate, organization_id: int = None) -> PayslipItem:
    run = get_payroll_run_by_id(db, run_id, organization_id)
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == data.employee_id,
        PayrollEmployee.organization_id == organization_id,
    ).first()
    if not employee:
        raise NotFoundException(f"Employee {data.employee_id} not found.")

    rate_map = {r.component_key: r for r in get_contribution_rates(db, organization_id)}
    slabs = get_tax_slabs(db, organization_id)

    gross = data.basic_salary + (data.hra or 0) + (data.special_allowance or 0) + (data.overtime or 0)

    pf_rate = rate_map.get("pf")
    employee_pf = _round2(data.basic_salary * (pf_rate.employee_rate_pct / 100)) if pf_rate and pf_rate.employee_rate_pct else Decimal("0")
    employer_pf = _round2(data.basic_salary * (pf_rate.employer_rate_pct / 100)) if pf_rate and pf_rate.employer_rate_pct else Decimal("0")

    esi_rate = rate_map.get("esi")
    esi_applicable = gross <= ESI_MONTHLY_WAGE_CEILING
    employee_esi = _round2(gross * (esi_rate.employee_rate_pct / 100)) if esi_rate and esi_rate.employee_rate_pct and esi_applicable else Decimal("0")
    employer_esi = _round2(gross * (esi_rate.employer_rate_pct / 100)) if esi_rate and esi_rate.employer_rate_pct and esi_applicable else Decimal("0")

    pt_rate = rate_map.get("pt")
    professional_tax = pt_rate.flat_amount if pt_rate and pt_rate.flat_amount else Decimal("0")

    annual_tax = _calculate_annual_tax(gross * MONTHS_PER_YEAR, slabs)
    tds = _round2(annual_tax / MONTHS_PER_YEAR)

    total_deductions = employee_pf + employee_esi + professional_tax
    net_pay = gross - total_deductions - tds

    employee_name = f"{getattr(employee, 'first_name', '')} {getattr(employee, 'last_name', '')}".strip()

    item = PayslipItem(
        payroll_run_id=run_id,
        employee_id=data.employee_id,
        organization_id=organization_id,
        employee_name=employee_name,
        department=getattr(employee, "department", None),
        bank_account=getattr(employee, "bank_account", None),
        pan=getattr(employee, "pan", None),
        basic_salary=data.basic_salary,
        hra=data.hra or Decimal("0"),
        special_allowance=data.special_allowance or Decimal("0"),
        overtime=data.overtime or Decimal("0"),
        gross_pay=gross,
        pf=employee_pf,
        esi=employee_esi,
        professional_tax=professional_tax,
        tds=tds,
        total_deductions=total_deductions,
        employer_pf=employer_pf,
        employer_esi=employer_esi,
        net_pay=net_pay,
        status=PayslipStatus.PENDING,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _recompute_run_aggregates(db, run)
    return item


def get_payslips_for_run(db: Session, run_id: int, organization_id: int = None) -> List[PayslipItem]:
    get_payroll_run_by_id(db, run_id, organization_id)  # 404s if missing/not in org
    query = db.query(PayslipItem).filter(PayslipItem.payroll_run_id == run_id)
    return _apply_org_filter(query, PayslipItem, organization_id).all()


def _serialize_payslip(item: PayslipItem, run: PayrollRun) -> dict:
    return {
        "id": item.id,
        "employee": item.employee_name,
        "employeeId": item.employee_id,
        "department": item.department,
        "period": run.period_label,
        "payDate": run.pay_date,
        "salary": item.gross_pay,
        "basicPay": item.basic_salary,
        "hra": item.hra,
        "specialAllowance": item.special_allowance,
        "overtime": item.overtime,
        "tds": item.tds,
        "pf": item.pf,
        "esi": item.esi,
        "professionalTax": item.professional_tax,
        "netPay": item.net_pay,
        "bankAccount": item.bank_account,
        "pan": item.pan,
        "status": item.status,
    }


def list_payslips(db: Session, organization_id: int = None, search: str = None,
                   period: str = None, employee_id: int = None) -> List[dict]:
    query = db.query(PayslipItem, PayrollRun).join(PayrollRun, PayslipItem.payroll_run_id == PayrollRun.id)
    query = _apply_org_filter(query, PayslipItem, organization_id)
    if period:
        query = query.filter(PayrollRun.period_label == period)
    if employee_id:
        query = query.filter(PayslipItem.employee_id == employee_id)
    if search:
        query = query.filter(PayslipItem.employee_name.ilike(f"%{search}%"))

    rows = query.order_by(PayrollRun.pay_date.desc()).all()
    return [_serialize_payslip(item, run) for item, run in rows]


def get_payslip_by_id(db: Session, payslip_id: int, organization_id: int = None) -> dict:
    query = db.query(PayslipItem, PayrollRun).join(PayrollRun, PayslipItem.payroll_run_id == PayrollRun.id)
    query = query.filter(PayslipItem.id == payslip_id)
    query = _apply_org_filter(query, PayslipItem, organization_id)
    row = query.first()
    if not row:
        raise NotFoundException(f"Payslip {payslip_id} not found.")
    item, run = row
    return _serialize_payslip(item, run), item, run


def generate_payslip_pdf_bytes(db: Session, payslip_id: int, organization_id: int = None) -> bytes:
    """Renders a real PDF payslip document. Requires `reportlab`
    (pip install reportlab)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    data, item, run = get_payslip_by_id(db, payslip_id, organization_id)

    import io
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 25 * mm

    c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, y, "Payslip")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"Employee: {data['employee']}  (ID: {data['employeeId']})")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Department: {data['department'] or '-'}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Pay Period: {data['period']}   Pay Date: {data['payDate']}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Bank Account: {data['bankAccount'] or '-'}   PAN: {data['pan'] or '-'}")
    y -= 12 * mm

    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, "Earnings")
    y -= 7 * mm
    c.setFont("Helvetica", 10)
    for label, val in [
        ("Basic Pay", data["basicPay"]), ("HRA", data["hra"]),
        ("Special Allowance", data["specialAllowance"]), ("Overtime", data["overtime"]),
    ]:
        c.drawString(24 * mm, y, label)
        c.drawRightString(120 * mm, y, f"Rs. {val:,.2f}")
        y -= 6 * mm

    y -= 4 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, "Deductions")
    y -= 7 * mm
    c.setFont("Helvetica", 10)
    for label, val in [
        ("TDS / Income Tax", data["tds"]), ("Provident Fund (PF)", data["pf"]),
        ("ESI", data["esi"]), ("Professional Tax", data["professionalTax"]),
    ]:
        c.drawString(24 * mm, y, label)
        c.drawRightString(120 * mm, y, f"Rs. {val:,.2f}")
        y -= 6 * mm

    y -= 8 * mm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20 * mm, y, "Net Pay")
    c.drawRightString(120 * mm, y, f"Rs. {data['netPay']:,.2f}")

    c.showPage()
    c.save()
    return buf.getvalue()


# ── Attendance & Compensation ───────────────────────────────────────────

def _enrich_attendance_record(db: Session, record: PayrollAttendanceRecord) -> dict:
    """Attach employee name/name fields to an AttendanceRecordResponse."""
    employee = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == record.employee_id
    ).first()
    first_name = getattr(employee, "first_name", None) if employee else None
    last_name = getattr(employee, "last_name", None) if employee else None
    department = getattr(employee, "department", None) if employee else None
    designation = getattr(employee, "designation", None) if employee else None
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "name": f"{first_name or ''} {last_name or ''}".strip() or None,
        "first_name": first_name,
        "last_name": last_name,
        "department": department,
        "designation": designation,
        "date": record.date,
        "check_in": record.check_in,
        "check_out": record.check_out,
        "status": record.status,
        "hours": record.hours,
        "rewards": record.rewards,
        "bonus": record.bonus,
        "other_compensation": record.other_compensation,
        "notes": record.notes,
    }


def bulk_save_attendance(db: Session, data: BulkAttendanceRequest, organization_id: int) -> List[dict]:
    """Upsert attendance records for a date. Matches on (employee_id, date)
    to update existing records instead of creating duplicates."""
    results = []
    for item in data.records:
        payload = item.model_dump()
        employee_id = payload.pop("employeeId")
        date_val = payload.pop("date")
        mapped = {
            "check_in": payload.pop("checkIn", None),
            "check_out": payload.pop("checkOut", None),
            "status": payload.pop("status", "present"),
            "hours": payload.pop("hours", None),
            "rewards": payload.pop("rewards", Decimal("0")),
            "bonus": payload.pop("bonus", Decimal("0")),
            "other_compensation": payload.pop("otherCompensation", Decimal("0")),
            "notes": payload.pop("notes", None),
        }

        existing = db.query(PayrollAttendanceRecord).filter(
            PayrollAttendanceRecord.organization_id == organization_id,
            PayrollAttendanceRecord.employee_id == employee_id,
            PayrollAttendanceRecord.date == date_val,
        ).first()

        if existing:
            for field, value in mapped.items():
                setattr(existing, field, value)
            record = existing
        else:
            record = PayrollAttendanceRecord(
                organization_id=organization_id,
                employee_id=employee_id,
                date=date_val,
                **mapped,
            )
            db.add(record)

        results.append(record)

    db.commit()
    for r in results:
        db.refresh(r)
    return [_enrich_attendance_record(db, r) for r in results]


def get_attendance_records(
    db: Session,
    organization_id: int,
    *,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id: Optional[int] = None,
) -> List[dict]:
    """Fetch attendance records with optional date range and employee filter."""
    query = db.query(
        PayrollAttendanceRecord,
        PayrollEmployee.first_name,
        PayrollEmployee.last_name,
        PayrollEmployee.department,
        PayrollEmployee.designation,
    ).join(
        PayrollEmployee,
        PayrollAttendanceRecord.employee_id == PayrollEmployee.id,
    ).filter(
        PayrollAttendanceRecord.organization_id == organization_id
    )
    if start_date:
        query = query.filter(PayrollAttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(PayrollAttendanceRecord.date <= end_date)
    if employee_id:
        query = query.filter(PayrollAttendanceRecord.employee_id == employee_id)

    rows = query.order_by(PayrollAttendanceRecord.date.desc()).all()
    return [
        {
            "id": record.id,
            "employee_id": record.employee_id,
            "name": f"{first_name or ''} {last_name or ''}".strip() or None,
            "first_name": first_name,
            "last_name": last_name,
            "department": department,
            "designation": designation,
            "date": record.date,
            "check_in": record.check_in,
            "check_out": record.check_out,
            "status": record.status,
            "hours": record.hours,
            "rewards": record.rewards,
            "bonus": record.bonus,
            "other_compensation": record.other_compensation,
            "notes": record.notes,
        }
        for record, first_name, last_name, department, designation in rows
    ]


def clear_attendance_records(db: Session, organization_id: int) -> int:
    """Delete all attendance records for the given organization."""
    deleted = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


def get_attendance_summary(db: Session, organization_id: int) -> dict:
    """Aggregate today's attendance counts."""
    today = date.today()
    records = db.query(PayrollAttendanceRecord).filter(
        PayrollAttendanceRecord.organization_id == organization_id,
        PayrollAttendanceRecord.date == today,
    ).all()
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    leave = sum(1 for r in records if r.status == "leave")
    return {
        "total": total,
        "present": present,
        "absent": absent,
        "leave": leave,
    }


# ── Compliance Documents ────────────────────────────────────────────

_COMPLIANCE_DOC_UPLOAD_DIR = _os.environ.get(
    "PAYROLL_COMPLIANCE_DOC_UPLOAD_DIR", "uploads/payroll_compliance_documents"
)


def list_compliance_documents(
    db: Session,
    organization_id: int,
    *,
    country: Optional[str] = None,
) -> List[ComplianceDocument]:
    query = db.query(ComplianceDocument).filter(ComplianceDocument.organization_id == organization_id)
    if country:
        query = query.filter(ComplianceDocument.country == country)
    return query.order_by(ComplianceDocument.uploaded_at.desc()).all()


def delete_compliance_document(db: Session, document_id: int, organization_id: int) -> None:
    doc = db.query(ComplianceDocument).filter(
        ComplianceDocument.id == document_id,
        ComplianceDocument.organization_id == organization_id,
    ).first()
    if not doc:
        raise NotFoundException("Compliance document", document_id)

    if _os.path.exists(doc.file_path):
        _os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
    log_activity(db, organization_id, f"Compliance document '{doc.title}' deleted.", ActivityStatus.INFO)


def _ocr_image_file(file_path: str) -> str:
    # NOTE: previously this caught every exception (including a missing
    # `pytesseract`/`PIL` package or a missing system `tesseract` binary)
    # and returned "", which was indistinguishable from "OCR ran and found
    # no statutory rates in the image." Letting it raise means
    # upload_compliance_document() now records a real "failed" status +
    # error message instead of silently pretending extraction succeeded.
    from PIL import Image  # type: ignore
    import pytesseract  # type: ignore

    image = Image.open(file_path)
    try:
        text = pytesseract.image_to_string(image)
    finally:
        image.close()
    return text or ""


def _extract_text_from_uploaded_document(file_path: str) -> str:
    if not file_path:
        return ""

    ext = _os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    if ext == ".csv":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read()
    if ext in {".pdf"}:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if ext in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}:
        return _ocr_image_file(file_path)
    return ""


_DASH_TOKENS = {"—", "–", "-", "n/a", "N/A", "\ufffd"}

# Per-jurisdiction vocabulary. This is the fix for the core bug: the old
# code only knew about India's components (PF/ESI/PT/TDS), so uploading a
# US or UK notice silently returned [] no matter what was in the document —
# which then let the *frontend's* generic policy fallback quietly display
# whichever country's canned numbers happened to be selected in the UI tab,
# mislabeled as "extracted from this document". Detecting the document's
# own jurisdiction and only matching that jurisdiction's real statutory
# components closes that gap.
#
# Each component is ("key", "match pattern", "display label", "pct" | "flat").
# "pct"  components pull percentage cells (employee / employer / total).
# "flat" components pull currency-amount cells (e.g. a flat monthly fee).
_COUNTRY_EXTRACTION_CONFIG = {
    "IN": {
        "currency": "₹",
        "detect": r"jurisdiction:\s*india",
        "components": [
            ("pf",  r"provident fund|\bpf\b(?!\w)", "Employee Provident Fund (EPF)", "pct"),
            ("esi", r"state insurance|\besi\b", "Employee State Insurance (ESI)", "pct"),
            ("pt",  r"professional tax", "Professional Tax (PT)", "flat"),
            ("lwf", r"labour welfare fund", "Labour Welfare Fund", "flat"),
            ("tds", r"\btds\b", "TDS / Income Tax", "pct"),
        ],
    },
    "US": {
        "currency": "$",
        "detect": r"jurisdiction:\s*united states",
        "components": [
            ("social_security", r"social security", "Social Security (FICA)", "pct"),
            ("medicare",        r"medicare", "Medicare (FICA)", "pct"),
            ("futa",            r"federal unemployment|\bfuta\b", "Federal Unemployment (FUTA)", "pct"),
            ("sui",             r"state unemployment|\bsui\b", "State Unemployment Insurance (SUI)", "pct"),
            ("sdi",             r"\bsdi\b|state disability", "State Disability Insurance (SDI)", "pct"),
        ],
    },
    "UK": {
        "currency": "£",
        "detect": r"jurisdiction:\s*united kingdom",
        "components": [
            ("national_insurance", r"national insurance|ni contributions|\bnic\b|class 1\s+ni", "National Insurance", "pct"),
            ("pension",            r"pension\s+auto.?enrolment|workplace\s+pension|auto.?enrolment(?!\s+declaration)", "Workplace Pension (Auto-Enrolment)", "pct"),
            ("apprenticeship_levy",r"apprenticeship levy", "Apprenticeship Levy", "pct"),
            ("ssp",                r"statutory sick pay|\bssp\b", "Statutory Sick Pay (SSP)", "flat"),
        ],
    },
}

_SECTION_END_MARKERS = {
    "IN": "Income Tax Slabs",
    "US": "Federal Income Tax Brackets",
    "UK": "Income Tax Bands",
}


def detect_country_from_text(text: str) -> Optional[str]:
    """Detects the jurisdiction a compliance document is actually *about*
    by reading its own content, rather than trusting the currently-selected
    UI tab. Falls back to None (unknown) if no known jurisdiction phrase is
    found — callers should fall back to the country the user supplied on
    upload in that case."""
    if not text:
        return None
    for code, cfg in _COUNTRY_EXTRACTION_CONFIG.items():
        if re.search(cfg["detect"], text, re.I):
            return code
    return None


def _strip_parenthetical_notes(line: str) -> str:
    # Wage-base / threshold notes like "(up to $176,100 wage base)" or
    # "(above £242/week)" sit inside parentheses next to the real rate and
    # would otherwise get mistaken for a second employee/employer column.
    return re.sub(r"\([^)]*\)", " ", line)


def _extract_contribution_rates(text: str, country: Optional[str]) -> List[dict]:
    """Per-jurisdiction extraction of statutory contribution rates.

    Many PDFs render table cells as individual text lines (pypdf outputs
    each cell on a separate line), so after finding the component keyword
    on a line we scan the next several lines for the cell values instead
    of requiring everything on the same line.

    Reads the first three real cells positionally — employee share,
    employer share, total — so the column order in the PDF must match
    (Component / Employee / Employer / Total).
    """
    cfg = _COUNTRY_EXTRACTION_CONFIG.get(country)
    if not cfg:
        return []

    rates: List[dict] = []
    lines = text.splitlines()
    n = len(lines)

    for key, pattern, label, kind in cfg["components"]:
        if kind == "pct":
            cell_re = re.compile(r"\d+(?:\.\d+)?\s*%\+?|—|–|\ufffd|N/A", re.I)
        else:
            cell_re = re.compile(
                rf"{re.escape(cfg['currency'])}\s?[\d,]+(?:\.\d+)?(?:/\w+)?|—|–|\ufffd|N/A",
                re.I,
            )

        for i, line in enumerate(lines):
            if not re.search(pattern, line, re.I):
                continue
            # Found the component line — collect cell values from subsequent lines
            cells: List[str] = []
            for j in range(i + 1, min(i + 8, n)):
                candidate = _strip_parenthetical_notes(lines[j]).strip()
                if not candidate:
                    continue
                found = cell_re.findall(candidate)
                if found:
                    cells.extend(found)
                if len(cells) >= 3:
                    break
            if not cells:
                break
            employee = cells[0] if len(cells) > 0 else "—"
            employer = cells[1] if len(cells) > 1 else "—"
            total    = cells[2] if len(cells) > 2 else (employer if len(cells) == 2 else employee)
            rates.append({
                "id": key,
                "label": label,
                "employee": "—" if employee in _DASH_TOKENS else employee,
                "employer": "—" if employer in _DASH_TOKENS else employer,
                "total": total,
            })
            break
    return rates


def _extract_tax_slabs(text: str, country: Optional[str]) -> List[dict]:
    """Parses the income-tax slab table using the correct currency symbol
    for the document's own jurisdiction (previously this hardcoded ₹ onto
    every document, so a US or UK slab table came back stamped with rupee
    signs on dollar/pound figures). Scoped to the slab section only, so
    unrelated numbers elsewhere in the document (reference numbers, dates)
    can't be mistaken for a slab row."""
    currency = _COUNTRY_EXTRACTION_CONFIG.get(country, {}).get("currency", "")
    marker = _SECTION_END_MARKERS.get(country)
    section = text.split(marker, 1)[1] if marker and marker in text else text
    section = section.split("Compliance Requirements", 1)[0]

    slabs: List[dict] = []
    pattern = re.compile(
        re.escape(currency) + r"?\s?([\d,]+)\s*(?:-|to|–|—)\s*([\d,]+|above)\s*(nil|\d+(?:\.\d+)?%)",
        re.I,
    )
    for i, match in enumerate(pattern.finditer(section)):
        low, high, rate = match.groups()
        rate_label = "Nil" if rate.lower() == "nil" else rate
        slabs.append({
            "id": f"doc-slab-{i}",
            "min": f"{currency}{low}",
            "max": "Above" if high.lower() == "above" else f"{currency}{high}",
            "rate": rate_label,
            "tax": f"{rate_label} in this band",
        })
    return slabs


def _extract_requirements(text: str) -> List[dict]:
    """Pulls short freeform lines that look like compliance requirements
    (contain words like 'must'/'shall'/'required'). Capped so a large
    document doesn't dump its entire body into the preview."""
    requirements: List[dict] = []
    keywords = ("must", "shall", "required", "mandatory", "due by", "deadline")
    for line in text.splitlines():
        clean = line.strip()
        if not clean or len(clean) > 200:
            continue
        if any(k in clean.lower() for k in keywords):
            requirements.append({"label": clean[:150]})
        if len(requirements) >= 5:
            break
    return requirements


_ENTITY_RULES = {
    "UK": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$"]),
        ("registrationNumber",
         [r"(?:company\s+registration\s+(?:number|no)|crn|registration\s+no)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^companies\s+house\s+(number|no)$", r"^company\s+registration\s+(number|no)$"]),
        ("vatNumber",
         [r"vat\s+(?:registration\s+)?(?:number|no)\s*:?\s*((?:gb)?\d{9,12})"],
         [r"^vat\s+(?:registration\s+)?(?:number|no)$"]),
        ("payeReference",
         [r"paye\s+(?:reference|ref|no)\s*:?\s*([\d/]+[a-z0-9]*)"],
         [r"^paye\s+reference$"]),
        ("utr",
         [r"(?:utr|unique\s+taxpayer\s+reference)\s*:?\s*(\d{10})"],
         [r"^unique\s+taxpayer\s+reference$", r"^utr$"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$"]),
        ("accountsReferenceDate",
         [r"(?:accounts\s+reference\s+date|ard|accounting\s+ref)\s*:?\s*(.+)"],
         [r"^accounts\s+reference\s+date$", r"^ard$"]),
    ],
    "IN": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$", r"^name\s+of\s+(the\s+)?(company|employer)$"]),
        ("pan",
         [r"pan\s+(?:number|no)?\s*:?\s*([a-z]{5}\d{4}[a-z])"],
         [r"^pan\s+(?:number|no)?$", r"^permanent\s+account\s+number$"]),
        ("tan",
         [r"tan\s+(?:number|no)?\s*:?\s*([a-z]{4}\d{5}[a-z])"],
         [r"^tan\s+(?:number|no)?$", r"^tax\s+deduction\s+account\s+number$"]),
        ("gst",
         [r"gst\s+(?:number|no|in)?\s*:?\s*(\d{2}[a-z]{5}\d{4}[a-z]\d[z][a-z\d])"],
         [r"^gst\s+(?:number|no|in)?$", r"^gstin$"]),
        ("pfCode",
         [r"(?:pf|provident\s+fund)\s+(?:code|number|no|account)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^pf\s+(?:code|number|no|account)", r"^provident\s+fund\s+(?:code|number|no|account)"]),
        ("esiCode",
         [r"(?:esi|state\s+insurance)\s+(?:code|number|no)\s*:?\s*([a-z0-9/]+(?:\s+[a-z0-9/]+)*)"],
         [r"^esi\s+(?:code|number|no)", r"^state\s+insurance\s+(?:code|number|no)"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$"]),
    ],
    "US": [
        ("name",
         [r"(?:company|employer|organisation|business)\s+name\s*:\s*(.+)"],
         [r"^company\s+(legal\s+)?name$", r"^employer\s+name$", r"^business\s+name$"]),
        ("ein",
         [r"(?:ein|employer\s+identification\s+number|federal\s+id)\s*:?\s*(\d{2}[-\s]?\d{7})"],
         [r"^ein$", r"^employer\s+identification\s+number$", r"^federal\s+(?:id|identification)\s+number$"]),
        ("stateId",
         [r"(?:state\s+(?:id|identification|number)|unemployment\s+(?:id|account))\s*:?\s*([a-z0-9]+(?:[-/][a-z0-9]+)*)"],
         [r"^state\s+(?:id|identification|number)$", r"^unemployment\s+(?:id|account\s+number)$"]),
        ("naicsCode",
         [r"naics\s*(?:code)?\s*:?\s*(\d{6})"],
         [r"^naics\s+code$"]),
        ("address",
         [r"(?:registered\s+(?:office|address)|business\s+address|legal\s+address)\s*:?\s*(.+)"],
         [r"^registered\s+(?:office|address)$", r"^business\s+address$", r"^legal\s+address$"]),
    ],
}


def _extract_registered_entity_details(text: str, country: Optional[str] = None) -> dict:
    """Extracts registered-entity metadata from a compliance notice.

    Handles two common PDF text-layouts:
      1.  "Label: Value" on the same line
      2.  "Label" on line N, "Value" on line N+1

    Uses country-specific patterns so each jurisdiction's expected fields
    (UK: Companies House / PAYE / UTR;  IN: PAN / TAN / GST / PF / ESI;
    US: EIN / State ID / NAICS) are matched correctly."""
    rules = _ENTITY_RULES.get(country, _ENTITY_RULES.get("UK", []))
    details: dict = {}
    lines = text.splitlines()
    n = len(lines)

    for key, same_line, next_line in rules:
        # Try same-line first:  "Label: Value"
        for pat in same_line:
            for line in lines:
                m = re.search(pat, line.strip(), re.I)
                if m:
                    val = m.group(1).strip().strip(",;")
                    if val:
                        details[key] = val
                        break
            if key in details:
                break
        if key in details:
            continue
        # Fallback to next-line:  "Label" then value on line below
        for i, line in enumerate(lines):
            stripped = line.strip()
            if any(re.match(pat, stripped, re.I) for pat in next_line):
                if i + 1 < n:
                    val = lines[i + 1].strip().strip(",;")
                    if val:
                        details[key] = val
                break

    return details


def _extract_compliance_data(text: str, country: Optional[str]) -> dict:
    """Assembles the exact `extracted` object the frontend contract in
    payrollService.js documents: { contributionRates, taxSlabs, requirements }.
    `country` should be the jurisdiction *detected from the document's own
    text* (see detect_country_from_text) wherever possible — using the
    uploader's currently-selected UI tab instead is what caused rates from
    the wrong jurisdiction to be shown as "extracted from this document."
    This is returned to the client as a per-document preview only — it does
    NOT write into the org's live ContributionRate/TaxSlab policy tables,
    matching the "reference only, nothing is auto-applied" copy already
    shown in ComplianceDocuments.jsx. Applying extracted values to live
    policy should be an explicit, separate user action if that's wanted."""
    if not text:
        return {"contributionRates": [], "taxSlabs": [], "requirements": []}
    return {
        "contributionRates": _extract_contribution_rates(text, country),
        "taxSlabs": _extract_tax_slabs(text, country),
        "requirements": _extract_requirements(text),
        "registeredEntityDetails": _extract_registered_entity_details(text, country),
    }


def upload_compliance_document(
    db: Session,
    *,
    title: str,
    category: str,
    file_path: str,
    file_name: str,
    file_size: int,
    mime_type: str,
    organization_id: int,
    country: Optional[str] = None,
    description: Optional[str] = None,
    document_type: Optional[str] = None,
    uploaded_by: Optional[int] = None,
) -> ComplianceDocument:
    _os.makedirs(_COMPLIANCE_DOC_UPLOAD_DIR, exist_ok=True)

    doc = ComplianceDocument(
        organization_id=organization_id,
        title=title,
        document_type=document_type,
        category=category,
        description=description,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
        uploaded_by=uploaded_by,
        country=country,
        status=ComplianceDocumentStatus.PROCESSING.value,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extraction runs synchronously here (fine for typical single-page
    # notices/PDFs). If this ever needs to handle large multi-page scans,
    # move this to a background task/queue and have the client keep
    # polling GET /compliance/documents — the "processing" status above and
    # the polling loop already in ComplianceDocuments.jsx are built for
    # exactly that, they just weren't being fed real status until now.
    try:
        extracted_text = _extract_text_from_uploaded_document(file_path)

        # Trust the document's own content over whatever jurisdiction tab
        # was active in the UI when the file was dropped — that mismatch
        # (uploading a US notice while the India tab is selected, say) was
        # the actual root cause of "wrong country" extraction results.
        detected_country = detect_country_from_text(extracted_text)
        resolved_country = detected_country or country

        doc.extracted_data = _extract_compliance_data(extracted_text, resolved_country)
        doc.status = ComplianceDocumentStatus.PARSED.value

        # If the document names a jurisdiction that differs from the one it
        # was uploaded under, record what the document actually says so the
        # frontend can show a mismatch warning instead of silently mixing
        # this document's numbers into the wrong tab.
        if detected_country and country and detected_country != country:
            doc.country = detected_country
            doc.error_message = (
                f"This document appears to be for {detected_country}, "
                f"but was uploaded under {country}."
            )
        elif detected_country and not country:
            doc.country = detected_country

        # Populate CompanyComplianceDetails from extracted entity data so
        # the Compliance Overview tab shows jurisdiction, Tax ID, etc.
        # without the user having to fill the form manually.
        try:
            entity = (doc.extracted_data or {}).get("registeredEntityDetails") or {}
            if entity or resolved_country:
                company_row = get_company_details(db, organization_id)
                needs_commit = False

                if entity.get("name") and not company_row.name:
                    company_row.name = entity["name"]
                    needs_commit = True
                if entity.get("address") and not company_row.address:
                    company_row.address = entity["address"]
                    needs_commit = True
                if resolved_country and not company_row.jurisdiction_country:
                    company_row.jurisdiction_country = resolved_country
                    needs_commit = True
                if resolved_country and not company_row.compliance_pack:
                    pack_map = {"IN": "India Statutory", "US": "US Federal & State", "UK": "UK HMRC"}
                    company_row.compliance_pack = pack_map.get(resolved_country, "")
                    needs_commit = True

                # Country-specific tax-id / employer-id mapping
                if resolved_country == "IN":
                    if entity.get("pan") and not company_row.tax_no:
                        company_row.tax_no = entity["pan"].upper()
                        needs_commit = True
                    if entity.get("pfCode") and not company_row.employer_id:
                        company_row.employer_id = entity["pfCode"]
                        needs_commit = True
                elif resolved_country == "UK":
                    if entity.get("utr") and not company_row.tax_no:
                        company_row.tax_no = entity["utr"]
                        needs_commit = True
                    if entity.get("payeReference") and not company_row.employer_id:
                        company_row.employer_id = entity["payeReference"]
                        needs_commit = True
                elif resolved_country == "US":
                    if entity.get("ein") and not company_row.tax_no:
                        company_row.tax_no = entity["ein"]
                        needs_commit = True

                if needs_commit:
                    db.commit()
        except Exception:  # noqa: S110 - best-effort, must not break the upload
            pass
    except Exception as exc:  # noqa: BLE001 - surface it instead of swallowing it
        doc.status = ComplianceDocumentStatus.FAILED.value
        doc.error_message = f"Could not extract text from this document: {exc}"

    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_activity(db, organization_id, f"Compliance document '{title}' uploaded.", ActivityStatus.INFO)
    return doc


# ── Compliance ─────────────────────────────────────────────────────────

def get_company_details(db: Session, organization_id: int) -> CompanyComplianceDetails:
    row = db.query(CompanyComplianceDetails).filter(
        CompanyComplianceDetails.organization_id == organization_id
    ).first()
    if not row:
        row = CompanyComplianceDetails(organization_id=organization_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_company_details(db: Session, organization_id: int, data: CompanyDetailsUpdate) -> CompanyComplianceDetails:
    row = get_company_details(db, organization_id)
    field_map = {
        "name": "name", "type": "type", "taxNo": "tax_no", "employerId": "employer_id",
        "address": "address", "industry": "industry",
        "jurisdictionCountry": "jurisdiction_country", "jurisdictionState": "jurisdiction_state",
        "compliancePack": "compliance_pack", "schedule": "schedule",
        "settlementBank": "settlement_bank", "settlementAcc": "settlement_acc",
    }
    for camel_field, value in data.model_dump(exclude_unset=True).items():
        column = field_map.get(camel_field)
        if column:
            setattr(row, column, value)
    db.commit()
    db.refresh(row)
    log_activity(db, organization_id, "Company compliance details updated.", ActivityStatus.SUCCESS)
    return row


def get_compliance_data(db: Session, organization_id: int) -> dict:
    company = get_company_details(db, organization_id)
    # Placeholder for a future FilingRecord model (statutory filing due-dates,
    # e.g. PF/ESI monthly returns, TDS quarterly returns). Returned as an
    # empty list today rather than fabricated entries.
    filings: List[dict] = []
    return {"company": company, "filings": filings}


# ── Dashboard ──────────────────────────────────────────────────────────

def get_dashboard_summary(db: Session, organization_id: int = None) -> dict:
    employees_query = db.query(PayrollEmployee).filter(PayrollEmployee.organization_id == organization_id)

    headcount = employees_query.count()
    active_count = employees_query.filter(PayrollEmployee.status == EmployeeStatus.ACTIVE).count()
    on_leave_count = employees_query.filter(PayrollEmployee.status == EmployeeStatus.ON_LEAVE).count()

    runs_query = db.query(PayrollRun)
    runs_query = _apply_org_filter(runs_query, PayrollRun, organization_id)
    pending_approvals = runs_query.filter(
        PayrollRun.status.in_([PayrollStatus.REVIEW, PayrollStatus.APPROVED, PayrollStatus.AUTHORIZED])
    ).count()

    now = datetime.utcnow()
    this_month_start = date(now.year, now.month, 1)
    if now.month == 1:
        prev_month_start = date(now.year - 1, 12, 1)
    else:
        prev_month_start = date(now.year, now.month - 1, 1)

    this_month_cost = db.query(sa_func.coalesce(sa_func.sum(PayrollRun.total_net), 0)).filter(
        PayrollRun.pay_date >= this_month_start,
        *([PayrollRun.organization_id == organization_id] if organization_id else []),
    ).scalar() or Decimal("0")

    prev_month_cost = db.query(sa_func.coalesce(sa_func.sum(PayrollRun.total_net), 0)).filter(
        PayrollRun.pay_date >= prev_month_start,
        PayrollRun.pay_date < this_month_start,
        *([PayrollRun.organization_id == organization_id] if organization_id else []),
    ).scalar() or Decimal("0")

    change_pct = None
    if prev_month_cost and prev_month_cost > 0:
        change_pct = float(_round2((this_month_cost - prev_month_cost) / prev_month_cost * 100))

    return {
        "totalPayrollCost": this_month_cost,
        "totalPayrollCostChangePct": change_pct,
        "headcount": headcount,
        "activeCount": active_count,
        "onLeaveCount": on_leave_count,
        "pendingApprovals": pending_approvals,
    }


def get_dashboard_trend(db: Session, organization_id: int = None, months: int = 6) -> List[dict]:
    query = db.query(PayrollRun)
    query = _apply_org_filter(query, PayrollRun, organization_id)
    runs = query.order_by(PayrollRun.pay_date.desc()).limit(months * 3).all()  # headroom for multiple runs/month

    buckets: dict = {}
    for run in runs:
        key = (run.pay_date.year, run.pay_date.month)
        buckets.setdefault(key, Decimal("0"))
        buckets[key] += run.total_net or Decimal("0")

    ordered_keys = sorted(buckets.keys())[-months:]
    return [
        {"month": f"{month_name[m][:3]} {y}", "cost": buckets[(y, m)]}
        for (y, m) in ordered_keys
    ]


def get_recent_activity(db: Session, organization_id: int = None, limit: int = 20) -> List[dict]:
    query = db.query(PayrollActivityLog)
    query = _apply_org_filter(query, PayrollActivityLog, organization_id)
    rows = query.order_by(PayrollActivityLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(row.id),
            "description": row.description,
            "timestamp": row.created_at,
            "status": row.status,
        }
        for row in rows
    ]


# ── Leave Allocations ─────────────────────────────────────────────────────

def _enrich_leave_allocation(db: Session, record: PayrollLeaveAllocation) -> dict:
    emp = db.query(PayrollEmployee).filter(
        PayrollEmployee.id == record.employee_id,
    ).first()
    return {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": f"{emp.first_name} {emp.last_name}" if emp else None,
        "department": emp.department if emp else None,
        "leaveBalances": record.leave_balances or {},
        "periodLabel": record.period_label,
        "notes": record.notes,
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    }


def bulk_save_leaves(db: Session, data, organization_id: int) -> List[dict]:
    results = []
    for item in data.records:
        payload = item.model_dump()
        employee_id = payload.pop("employeeId")
        leave_balances = payload.pop("leaveBalances", None)
        mapped = {
            "leave_balances": leave_balances,
            "period_label": payload.pop("periodLabel", None),
            "notes": payload.pop("notes", None),
        }

        existing = db.query(PayrollLeaveAllocation).filter(
            PayrollLeaveAllocation.organization_id == organization_id,
            PayrollLeaveAllocation.employee_id == employee_id,
        ).first()

        if existing:
            for field, value in mapped.items():
                if value is not None or field != "leave_balances":
                    setattr(existing, field, value)
            record = existing
        else:
            record = PayrollLeaveAllocation(
                organization_id=organization_id,
                employee_id=employee_id,
                **mapped,
            )
            db.add(record)

        results.append(record)

    db.commit()
    for r in results:
        db.refresh(r)
    return [_enrich_leave_allocation(db, r) for r in results]


def get_leave_allocations(
    db: Session,
    organization_id: int,
    *,
    employee_id: Optional[int] = None,
) -> List[dict]:
    query = db.query(
        PayrollLeaveAllocation,
        PayrollEmployee.first_name,
        PayrollEmployee.last_name,
        PayrollEmployee.department,
    ).join(
        PayrollEmployee,
        PayrollLeaveAllocation.employee_id == PayrollEmployee.id,
    ).filter(
        PayrollLeaveAllocation.organization_id == organization_id
    )
    if employee_id:
        query = query.filter(PayrollLeaveAllocation.employee_id == employee_id)

    rows = query.all()
    return [
        {
            "id": record.id,
            "employeeId": record.employee_id,
            "employeeName": f"{first_name} {last_name}" if first_name else None,
            "department": department,
            "leaveBalances": record.leave_balances or {},
            "periodLabel": record.period_label,
            "notes": record.notes,
            "createdAt": record.created_at,
            "updatedAt": record.updated_at,
        }
        for record, first_name, last_name, department in rows
    ]