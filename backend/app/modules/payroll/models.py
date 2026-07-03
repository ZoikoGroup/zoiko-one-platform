"""
modules/payroll/models.py
-------------------------
SQLAlchemy ORM models for the Zoiko Payroll module.

Tables:
  - PayrollEmployee           → payroll's own employee master data (multi-tenant, org-scoped;
                                 intentionally NOT linked to app.modules.employee.Employee,
                                 which is the separate HR/auth login record)
  - PayrollRun                → a single payroll processing run (e.g. "Jun 1-15, 2026")
  - PayslipItem               → individual salary components per employee per run
  - ContributionRate           → statutory contribution rates (PF/ESI/PT/TDS) shown in Compliance
  - TaxSlab                    → income tax slab table shown in Compliance
  - CompanyComplianceDetails   → one row per organization; company/compliance profile
  - PayrollActivityLog         → audit trail feeding the dashboard "Recent activity" feed

NOTE: created_by / approved_by / actor_id below still reference the app-wide
`employees` table (app.modules.employee.Employee) since those track which
logged-in *user* performed an action, not a payroll employee record.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    ForeignKey, Text, Numeric, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ── Enums ──────────────────────────────────────────────────────────────
# NOTE: Enum *values* intentionally match the exact strings the frontend
# lifecycle UI expects (RunsTable.jsx / RunDetailPage.jsx `lifecycleSteps`),
# so API responses can be consumed with zero client-side mapping.

class PayrollStatus(str, enum.Enum):
    DRAFT       = "Draft"
    REVIEW      = "Review"
    APPROVED    = "Approved"
    AUTHORIZED  = "Authorized"
    PAID        = "Paid"
    CLOSED      = "Closed"


# Order matters — used to compute "next status" when a run is approved/advanced.
PAYROLL_STATUS_ORDER = [
    PayrollStatus.DRAFT,
    PayrollStatus.REVIEW,
    PayrollStatus.APPROVED,
    PayrollStatus.AUTHORIZED,
    PayrollStatus.PAID,
    PayrollStatus.CLOSED,
]


class PayslipStatus(str, enum.Enum):
    PENDING = "Pending"
    PAID    = "Paid"
    FAILED  = "Failed"


class ActivityStatus(str, enum.Enum):
    SUCCESS = "success"
    PENDING = "pending"
    INFO    = "info"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT  = "Contract"
    INTERN    = "Intern"


class EmployeeStatus(str, enum.Enum):
    ACTIVE   = "Active"
    ON_LEAVE = "On Leave"
    INACTIVE = "Inactive"


# ── Payroll Employee ─────────────────────────────────────────────────
# Owned entirely by the payroll module. Deliberately NOT linked to
# app.modules.employee.Employee (that model is the HR/auth login record
# for the whole app). In this multi-tenant setup, an organization may use
# payroll without the HR module, so payroll keeps its own employee master
# data, scoped by organization_id.

class PayrollEmployee(Base):
    __tablename__ = "payroll_employees"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    employee_code    = Column(String(20), nullable=False)
    first_name       = Column(String(100), nullable=False)
    last_name        = Column(String(100), nullable=False)
    email            = Column(String(255), nullable=True)
    phone            = Column(String(50), nullable=True)

    department       = Column(String(100), nullable=True)   # matches payrollService.js DEPARTMENTS
    designation      = Column(String(100), nullable=True)
    employment_type  = Column(String(50), default=EmploymentType.FULL_TIME.value, nullable=False)
    status           = Column(String(20), default=EmployeeStatus.ACTIVE.value, nullable=False, index=True)

    date_of_joining  = Column(Date, nullable=True)
    ctc              = Column(Numeric(12, 2), default=0)

    bank_name        = Column(String(100), nullable=True)
    bank_account     = Column(String(50), nullable=True)
    pan              = Column(String(20), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "employee_code", name="uq_payroll_employee_org_code"),
        Index("ix_payroll_employees_org_status", "organization_id", "status"),
    )

    def __repr__(self):
        return f"<PayrollEmployee id={self.id} code={self.employee_code} status={self.status}>"


# ── Payroll Run ────────────────────────────────────────────────────────

class PayrollRun(Base):
    """One payroll cycle (monthly/bi-weekly)."""
    __tablename__ = "payroll_runs"

    id            = Column(Integer, primary_key=True, index=True)

    # Display fields — map 1:1 onto RunsTable/RunDetailPage props.
    period_label  = Column(String(50), nullable=False)     # → run.period, e.g. "Jun 1-15, 2026"
    period_start  = Column(Date, nullable=False)
    period_end    = Column(Date, nullable=False)
    pay_date      = Column(Date, nullable=False)            # → run.payDate

    status        = Column(String(20), default=PayrollStatus.DRAFT.value, nullable=False, index=True)

    # Aggregates, recomputed whenever payslip items change.
    employee_count               = Column(Integer, default=0)                # → run.employees
    total_gross                  = Column(Numeric(14, 2), default=0)          # → run.gross
    total_deductions             = Column(Numeric(14, 2), default=0)          # → run.deductions (PF+ESI+PT, non-tax)
    total_taxes                  = Column(Numeric(14, 2), default=0)          # → run.taxes (TDS)
    total_employer_contribution  = Column(Numeric(14, 2), default=0)          # → run.employerContribution
    total_net                    = Column(Numeric(14, 2), default=0)          # → run.net

    notes         = Column(Text, nullable=True)
    created_by    = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_by   = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at   = Column(DateTime(timezone=True), nullable=True)

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    payslip_items = relationship("PayslipItem", back_populates="payroll_run", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_payroll_runs_org_status", "organization_id", "status"),
    )

    def __repr__(self):
        return f"<PayrollRun id={self.id} period={self.period_label} status={self.status}>"


# ── Payslip Item ───────────────────────────────────────────────────────

class PayslipItem(Base):
    """One employee's payslip within a payroll run.

    Employee identity/bank/PAN fields are *snapshotted* at generation time
    (rather than always joined live) so historical payslips stay accurate
    even if the employee's record changes or the employee later leaves —
    this is standard practice for payroll/financial documents.
    """
    __tablename__ = "payslip_items"

    id              = Column(Integer, primary_key=True, index=True)
    payroll_run_id  = Column(Integer, ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id     = Column(Integer, ForeignKey("payroll_employees.id"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    # Snapshot fields (denormalized on purpose).
    employee_name   = Column(String(150), nullable=False)
    department      = Column(String(100), nullable=True)
    bank_account    = Column(String(50), nullable=True)
    pan             = Column(String(20), nullable=True)

    # Earnings.
    basic_salary      = Column(Numeric(12, 2), default=0)
    hra               = Column(Numeric(12, 2), default=0)
    special_allowance = Column(Numeric(12, 2), default=0)
    overtime          = Column(Numeric(12, 2), default=0)
    gross_pay         = Column(Numeric(12, 2), default=0)

    # Statutory deductions (employee side).
    pf                = Column(Numeric(12, 2), default=0)
    esi               = Column(Numeric(12, 2), default=0)
    professional_tax  = Column(Numeric(12, 2), default=0)
    tds               = Column(Numeric(12, 2), default=0)   # income tax withheld
    total_deductions  = Column(Numeric(12, 2), default=0)   # pf + esi + professional_tax (excludes tds)

    # Employer-side contributions (informational, not deducted from employee).
    employer_pf       = Column(Numeric(12, 2), default=0)
    employer_esi       = Column(Numeric(12, 2), default=0)

    net_pay           = Column(Numeric(12, 2), default=0)

    status          = Column(String(20), default=PayslipStatus.PENDING.value, nullable=False, index=True)
    paid_at         = Column(DateTime(timezone=True), nullable=True)
    notes           = Column(Text, nullable=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    payroll_run = relationship("PayrollRun", back_populates="payslip_items")

    __table_args__ = (
        UniqueConstraint("payroll_run_id", "employee_id", name="uq_payslip_run_employee"),
        Index("ix_payslip_items_org_status", "organization_id", "status"),
    )

    def __repr__(self):
        return f"<PayslipItem id={self.id} employee_id={self.employee_id} net={self.net_pay}>"


# ── Compliance: Contribution Rates ────────────────────────────────────

class ContributionRate(Base):
    """Statutory contribution rate row (PF / ESI / PT / TDS) shown in
    Compliance > Contribution Rates. `employee_rate_pct` / `employer_rate_pct`
    are the actual numeric rates used by payslip generation; `*_share`
    columns are the human-readable display strings the table renders.
    """
    __tablename__ = "payroll_contribution_rates"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    component_key    = Column(String(20), nullable=False)   # "pf" | "esi" | "pt" | "tds"
    label            = Column(String(100), nullable=False)  # → r.label
    employee_share   = Column(String(50), nullable=False)   # → r.employee (display string)
    employer_share   = Column(String(50), nullable=False)   # → r.employer (display string)
    total            = Column(String(50), nullable=False)   # → r.total (display string)

    employee_rate_pct = Column(Numeric(6, 4), nullable=True)  # e.g. 0.1200 for 12%
    employer_rate_pct = Column(Numeric(6, 4), nullable=True)
    flat_amount        = Column(Numeric(10, 2), nullable=True)  # for flat components like PT

    sort_order       = Column(Integer, default=0)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "component_key", name="uq_contribution_rate_org_component"),
    )


# ── Compliance: Tax Slabs ──────────────────────────────────────────────

class TaxSlab(Base):
    """One income tax slab row shown in Compliance > Tax Slabs."""
    __tablename__ = "payroll_tax_slabs"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    min_amount       = Column(Numeric(14, 2), nullable=False)
    max_amount       = Column(Numeric(14, 2), nullable=True)   # null = "and above"
    rate_pct         = Column(Numeric(5, 2), nullable=False)   # e.g. 5.00 for 5%
    rate_label       = Column(String(20), nullable=False)      # → s.rate, e.g. "5%" or "Nil"
    tax_formula      = Column(String(150), nullable=False)     # → s.tax, display text
    sort_order       = Column(Integer, default=0)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())


# ── Compliance: Company Details ────────────────────────────────────────

class CompanyComplianceDetails(Base):
    """One row per organization holding the company's compliance profile."""
    __tablename__ = "payroll_company_compliance"

    id                    = Column(Integer, primary_key=True, index=True)
    organization_id       = Column(Integer, ForeignKey("organizations.id"), nullable=False, unique=True, index=True)

    name                  = Column(String(200), default="")
    type                  = Column(String(100), default="")
    tax_no                = Column(String(50), default="")
    employer_id           = Column(String(50), default="")
    address               = Column(String(300), default="")
    industry              = Column(String(100), default="")
    jurisdiction_country  = Column(String(100), default="India")
    jurisdiction_state    = Column(String(100), default="")
    compliance_pack       = Column(String(100), default="")
    schedule              = Column(String(100), default="")
    settlement_bank       = Column(String(100), default="")
    settlement_acc        = Column(String(50), default="")

    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    updated_at            = Column(DateTime(timezone=True), onupdate=func.now())


# ── Compliance: Documents ────────────────────────────────────────────

class ComplianceDocument(Base):
    """Uploaded compliance documents for payroll (e.g. statutory filings)."""
    __tablename__ = "payroll_compliance_documents"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    title            = Column(String(200), nullable=False)
    document_type    = Column(String(100), nullable=True)
    category         = Column(String(100), default="other")
    description      = Column(Text, nullable=True)

    file_path        = Column(String(500), nullable=False)
    file_name        = Column(String(255), nullable=False)
    file_size        = Column(Integer, nullable=True)
    mime_type        = Column(String(100), nullable=True)

    uploaded_by      = Column(Integer, ForeignKey("employees.id"), nullable=True)
    uploaded_at      = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ComplianceDocument id={self.id} title={self.title}>"


# ── Dashboard: Activity Log ────────────────────────────────────────────

class PayrollActivityLog(Base):
    """Audit-trail entries that back the dashboard 'Recent activity' feed.
    Written by service.py whenever a meaningful payroll action happens
    (run created, run advanced/approved, payslip generated, company
    details updated, etc.) so the dashboard reflects real events instead
    of being derived/faked.
    """
    __tablename__ = "payroll_activity_log"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    description      = Column(String(300), nullable=False)
    status           = Column(String(20), default=ActivityStatus.INFO.value, nullable=False)
    actor_id         = Column(Integer, ForeignKey("employees.id"), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now(), index=True)