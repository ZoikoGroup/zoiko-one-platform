"""
modules/payroll/schemas.py
--------------------------
Pydantic schemas for the Zoiko Payroll module.

Response schemas use explicit `validation_alias` / `serialization_alias`
pairs so the JSON returned to the frontend matches the exact field names
already consumed by payrollService.js and the React components
(RunsTable, RunDetailPage, PayslipsPage, ContributionRatesTable,
TaxSlabTable, StatCards, CostTrendChart, RecentActivity, CompliancePage)
with zero client-side mapping.

IMPORTANT: every route that returns one of these models must pass
`response_model_by_alias=True` on the route decorator (see router.py) so
FastAPI serializes using the camelCase aliases instead of the snake_case
Python field names.
"""

from datetime import date, datetime
from typing import Optional, List, Annotated
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, BeforeValidator
from app.modules.payroll.models import PayrollStatus, PayslipStatus, ActivityStatus


def coerce_str(v):
    if v is None:
        return None
    return str(v)


CoercedStr = Annotated[Optional[str], BeforeValidator(coerce_str)]


# ── Employees ────────────────────────────────────────────────────────
# Backed by payroll's own PayrollEmployee model (models.py) — fully
# decoupled from app.modules.employee.Employee (the separate HR/auth
# login record). Full CRUD is appropriate here since this is payroll's
# own master data, org-scoped for multi-tenancy.

class EmployeeCreate(BaseModel):
    employee_code:    Optional[str] = None
    first_name:       Optional[str] = Field(None, validation_alias="firstName")
    last_name:        Optional[str] = Field(None, validation_alias="lastName")
    email:            Optional[str] = None
    phone:            Optional[str] = None
    department:       Optional[str] = None
    designation:      Optional[str] = None
    employment_type:  str = Field("Full-time", validation_alias="employmentType")
    status:           str = "Active"
    date_of_joining:  Optional[date] = Field(None, validation_alias="dateOfJoining")
    ctc:              Optional[Decimal] = Decimal("0")
    bank_name:        Optional[str] = None
    bank_account:     Optional[str] = Field(None, validation_alias="bankAccountNumber")
    pan:              Optional[str] = Field(None, validation_alias="panNumber")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class EmployeeUpdate(BaseModel):
    employee_code:    Optional[str] = None
    first_name:       Optional[str] = Field(None, validation_alias="firstName")
    last_name:        Optional[str] = Field(None, validation_alias="lastName")
    email:            Optional[str] = None
    phone:            Optional[str] = None
    department:       Optional[str] = None
    designation:      Optional[str] = None
    employment_type:  Optional[str] = Field(None, validation_alias="employmentType")
    status:           Optional[str] = None
    date_of_joining:  Optional[date] = Field(None, validation_alias="dateOfJoining")
    ctc:              Optional[Decimal] = None
    bank_name:        Optional[str] = None
    bank_account:     Optional[str] = Field(None, validation_alias="bankAccountNumber")
    pan:              Optional[str] = Field(None, validation_alias="panNumber")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class EmployeeResponse(BaseModel):
    id:              int
    employeeCode:    str = Field(validation_alias="employee_code", serialization_alias="employeeCode")
    firstName:       str = Field(validation_alias="first_name", serialization_alias="firstName")
    lastName:        str = Field(validation_alias="last_name", serialization_alias="lastName")
    email:           Optional[str] = None
    phone:           Optional[str] = None
    department:      Optional[str] = None
    designation:     Optional[str] = None
    employmentType:  str = Field(validation_alias="employment_type", serialization_alias="employmentType")
    status:          str
    dateOfJoining:   Optional[date] = Field(None, validation_alias="date_of_joining", serialization_alias="dateOfJoining")
    ctc:             Decimal = Decimal("0")
    bankName:        Optional[str] = Field(None, validation_alias="bank_name", serialization_alias="bankName")
    bankAccount:     Optional[str] = Field(None, validation_alias="bank_account", serialization_alias="bankAccount")
    pan:             Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class BulkEmployeeItem(BaseModel):
    firstName:         Optional[str] = None
    lastName:          Optional[str] = None
    email:             Optional[str] = None
    phone:             CoercedStr = None
    department:        Optional[str] = None
    designation:       Optional[str] = None
    employmentType:    Optional[str] = None
    status:            Optional[str] = None
    dateOfJoining:     CoercedStr = None
    ctc:               Optional[Decimal] = None
    bankAccountNumber: CoercedStr = None
    panNumber:         CoercedStr = None


class BulkEmployeeRequest(BaseModel):
    employees: List[BulkEmployeeItem]


class BulkDeleteRequest(BaseModel):
    employee_ids: List[int]


class BulkUpsertResponse(BaseModel):
    message: str
    created: int
    employees: List[EmployeeResponse]
    failed: List[dict] = []

    model_config = ConfigDict(populate_by_name=True)


# ── Payroll Runs ───────────────────────────────────────────────────────

class PayrollRunCreate(BaseModel):
    period_label: str = Field(..., description='Display label, e.g. "Jul 1-15, 2026"')
    period_start: date
    period_end:   date
    pay_date:     date
    notes:        Optional[str] = None
    # If true (default), payslip items are generated for every Active
    # employee in the org as soon as the run is created.
    auto_generate_payslips: bool = True

    model_config = ConfigDict(populate_by_name=True)


class PayrollRunUpdate(BaseModel):
    period_label: Optional[str] = None
    period_start: Optional[date] = None
    period_end:   Optional[date] = None
    pay_date:     Optional[date] = None
    notes:        Optional[str] = None


class PayrollRunResponse(BaseModel):
    id:                    int
    period:                str     = Field(validation_alias="period_label", serialization_alias="period")
    payDate:               date    = Field(validation_alias="pay_date", serialization_alias="payDate")
    status:                PayrollStatus
    employees:             int     = Field(validation_alias="employee_count", serialization_alias="employees")
    gross:                 Decimal = Field(validation_alias="total_gross", serialization_alias="gross")
    deductions:            Decimal = Field(validation_alias="total_deductions", serialization_alias="deductions")
    taxes:                 Decimal = Field(validation_alias="total_taxes", serialization_alias="taxes")
    employerContribution:  Decimal = Field(validation_alias="total_employer_contribution", serialization_alias="employerContribution")
    net:                   Decimal = Field(validation_alias="total_net", serialization_alias="net")
    notes:                 Optional[str] = None
    createdAt:             datetime = Field(validation_alias="created_at", serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ── Payslip Items ──────────────────────────────────────────────────────

class PayslipItemCreate(BaseModel):
    """Manually add/override a single employee's payslip within a run.
    (Runs created with auto_generate_payslips=True won't normally need this —
    it exists for corrections, off-cycle additions, or contractors.)
    """
    employee_id:    int
    basic_salary:   Decimal
    hra:            Optional[Decimal] = Decimal("0")
    special_allowance: Optional[Decimal] = Decimal("0")
    overtime:       Optional[Decimal] = Decimal("0")
    notes:          Optional[str] = None


class PayslipItemResponse(BaseModel):
    id:                 int
    employee:           str
    employeeId:         int
    department:         Optional[str] = None
    period:             str
    payDate:            date
    salary:             Decimal
    basicPay:           Decimal
    hra:                Decimal
    specialAllowance:   Decimal
    overtime:           Decimal
    tds:                Decimal
    pf:                 Decimal
    esi:                Decimal
    professionalTax:    Decimal
    netPay:             Decimal
    bankAccount:        Optional[str] = None
    pan:                Optional[str] = None
    status:             PayslipStatus

    model_config = ConfigDict(populate_by_name=True)


# ── Compliance ─────────────────────────────────────────────────────────

class CompanyDetails(BaseModel):
    name:                 str = ""
    type:                 str = ""
    taxNo:                str = Field("", validation_alias="tax_no", serialization_alias="taxNo")
    employerId:           str = Field("", validation_alias="employer_id", serialization_alias="employerId")
    address:              str = ""
    industry:             str = ""
    jurisdictionCountry:  str = Field("India", validation_alias="jurisdiction_country", serialization_alias="jurisdictionCountry")
    jurisdictionState:    str = Field("", validation_alias="jurisdiction_state", serialization_alias="jurisdictionState")
    compliancePack:       str = Field("", validation_alias="compliance_pack", serialization_alias="compliancePack")
    schedule:             str = ""
    settlementBank:       str = Field("", validation_alias="settlement_bank", serialization_alias="settlementBank")
    settlementAcc:        str = Field("", validation_alias="settlement_acc", serialization_alias="settlementAcc")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CompanyDetailsUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    taxNo: Optional[str] = None
    employerId: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    jurisdictionCountry: Optional[str] = None
    jurisdictionState: Optional[str] = None
    compliancePack: Optional[str] = None
    schedule: Optional[str] = None
    settlementBank: Optional[str] = None
    settlementAcc: Optional[str] = None


class ComplianceDataResponse(BaseModel):
    """Shape expected by CompliancePage.jsx: { company, filings }."""
    company: CompanyDetails
    filings: List[dict] = []


class ContributionRateResponse(BaseModel):
    id:       int
    label:    str
    employee: str = Field(validation_alias="employee_share", serialization_alias="employee")
    employer: str = Field(validation_alias="employer_share", serialization_alias="employer")
    total:    str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TaxSlabResponse(BaseModel):
    id:   int
    min:  Decimal = Field(validation_alias="min_amount", serialization_alias="min")
    max:  Optional[Decimal] = Field(None, validation_alias="max_amount", serialization_alias="max")
    rate: str = Field(validation_alias="rate_label", serialization_alias="rate")
    tax:  str = Field(validation_alias="tax_formula", serialization_alias="tax")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ── Dashboard ──────────────────────────────────────────────────────────

class DashboardSummaryResponse(BaseModel):
    totalPayrollCost:            Decimal
    totalPayrollCostChangePct:   Optional[float] = None
    headcount:                   int
    activeCount:                 Optional[int] = None
    onLeaveCount:                Optional[int] = None
    pendingApprovals:            int

    model_config = ConfigDict(populate_by_name=True)


class DashboardTrendPoint(BaseModel):
    month: str
    cost:  Decimal


class RecentActivityItem(BaseModel):
    id:          str
    description: str
    timestamp:   datetime
    status:      ActivityStatus


class SuccessResponse(BaseModel):
    message: str


# ── Compliance: Documents ─────────────────────────────────────────────

class ComplianceDocumentResponse(BaseModel):
    id:            int
    title:         str
    document_type: Optional[str] = None
    category:      str
    description:   Optional[str] = None
    file_name:     str
    file_size:     Optional[int] = None
    mime_type:     Optional[str] = None
    uploaded_by:   Optional[int] = None
    uploaded_at:   datetime

    model_config = ConfigDict(from_attributes=True)