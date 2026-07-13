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
from pydantic import BaseModel, ConfigDict, Field, BeforeValidator, model_validator
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
    period_label: Optional[str] = Field(None, alias="periodLabel", description='Display label, e.g. "Jul 1-15, 2026". Auto-generated from dates if omitted.')
    period_start: date = Field(..., alias="periodStart")
    period_end:   date = Field(..., alias="periodEnd")
    pay_date:     date = Field(..., alias="payDate")
    notes:        Optional[str] = None
    schedule:     Optional[str] = None
    employeeIds:  Optional[List[int]] = None
    totals:       Optional[dict] = None
    # If true (default), payslip items are generated for every Active
    # employee in the org as soon as the run is created.
    auto_generate_payslips: bool = True

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _auto_label(self) -> "PayrollRunCreate":
        if not self.period_label and self.period_start and self.period_end:
            from calendar import month_name
            s, e = self.period_start, self.period_end
            if s.month == e.month:
                self.period_label = f"{month_name[s.month][:3]} {s.day}-{e.day}, {s.year}"
            else:
                self.period_label = f"{month_name[s.month][:3]} {s.day} - {month_name[e.month][:3]} {e.day}, {s.year}"
        return self


class PayrollRunUpdate(BaseModel):
    period_label: Optional[str] = None
    period_start: Optional[date] = None
    period_end:   Optional[date] = None
    pay_date:     Optional[date] = None
    notes:        Optional[str] = None


class PayrollRunPreviewRequest(BaseModel):
    employee_ids: List[int] = Field(..., alias="employeeIds", description="Employee IDs to include in preview")
    country: str = Field(default="IN", description="Jurisdiction country code (IN/US/UK)")
    period_start: Optional[date] = Field(None, alias="periodStart",
        description="Optional — if provided, real attendance-recorded rewards/bonus/other compensation for this window are included in the preview.")
    period_end: Optional[date] = Field(None, alias="periodEnd")
    model_config = ConfigDict(populate_by_name=True)


class PayrollRunPreviewEmployee(BaseModel):
    employeeId: int
    employeeName: str
    department: Optional[str] = None
    attendanceStatus: str = "active"
    monthlyGross: float
    monthlyTax: float
    monthlyPf: float
    monthlyEsi: float
    monthlyPt: float
    monthlySocialSecurity: float = 0.0
    monthlyMedicare: float = 0.0
    monthlyNi: float = 0.0
    monthlyContributions: float
    monthlyNet: float
    employerPf: float = 0.0
    employerEsi: float = 0.0
    employerSs: float = 0.0
    employerMedicare: float = 0.0
    employerPension: float = 0.0
    taxSlabRate: str = "—"
    model_config = ConfigDict(populate_by_name=True)


class PayrollRunPreviewTotals(BaseModel):
    count: int
    totalGross: float
    totalTax: float
    totalContributions: float
    totalNet: float
    model_config = ConfigDict(populate_by_name=True)


class PayrollRunPreviewResponse(BaseModel):
    employees: List[PayrollRunPreviewEmployee]
    totals: PayrollRunPreviewTotals
    model_config = ConfigDict(populate_by_name=True)


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
    additionalCompensation: Decimal = Decimal("0")
    tds:                Decimal
    pf:                 Decimal
    esi:                Decimal
    professionalTax:    Decimal
    netPay:             Decimal
    bankAccount:        Optional[str] = None
    pan:                Optional[str] = None
    status:             PayslipStatus

    model_config = ConfigDict(populate_by_name=True)


# ── Leave Allocations ─────────────────────────────────────────────────

class LeaveAllocationCreate(BaseModel):
    employeeId:         int = Field(validation_alias="employeeId")
    leaveBalances:      Optional[dict] = Field(default=None, validation_alias="leaveBalances")
    periodLabel:        Optional[str] = Field(None, validation_alias="periodLabel")
    notes:              Optional[str] = Field(None, validation_alias="notes")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class BulkLeaveRequest(BaseModel):
    records: List[LeaveAllocationCreate]


class LeaveAllocationResponse(BaseModel):
    id:                 int
    employeeId:         int     = Field(validation_alias="employee_id", serialization_alias="employeeId")
    leaveBalances:      Optional[dict] = Field(default=None, validation_alias="leave_balances", serialization_alias="leaveBalances")
    periodLabel:        Optional[str] = Field(None, validation_alias="period_label", serialization_alias="periodLabel")
    notes:              Optional[str] = Field(None, validation_alias="notes", serialization_alias="notes")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ── Attendance & Compensation ──────────────────────────────────────────
# Backed by PayrollAttendanceRecord (models.py). Frontend sends/receives
# camelCase JSON that maps to snake_case DB columns.

class AttendanceRecordCreate(BaseModel):
    employeeId:         int    = Field(validation_alias="employeeId")
    date:               date
    checkIn:            Optional[str] = Field(None, validation_alias="checkIn")
    checkOut:           Optional[str] = Field(None, validation_alias="checkOut")
    status:             str = "present"
    hours:              Optional[str] = None
    rewards:            Optional[Decimal] = Decimal("0")
    bonus:              Optional[Decimal] = Decimal("0")
    otherCompensation:  Optional[Decimal] = Field(Decimal("0"), validation_alias="otherCompensation")
    notes:              Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class BulkAttendanceRequest(BaseModel):
    records: List[AttendanceRecordCreate]


class AttendanceRecordResponse(BaseModel):
    id:                 int
    employeeId:         int     = Field(validation_alias="employee_id", serialization_alias="employeeId")
    name:               Optional[str] = None
    firstName:          Optional[str] = Field(None, validation_alias="first_name", serialization_alias="firstName")
    lastName:           Optional[str] = Field(None, validation_alias="last_name", serialization_alias="lastName")
    department:         Optional[str] = None
    designation:        Optional[str] = None
    date:               date
    checkIn:            Optional[str] = Field(None, validation_alias="check_in", serialization_alias="checkIn")
    checkOut:           Optional[str] = Field(None, validation_alias="check_out", serialization_alias="checkOut")
    status:             str
    hours:              Optional[str] = None
    rewards:            Decimal = Decimal("0")
    bonus:              Decimal = Decimal("0")
    otherCompensation:  Decimal = Field(Decimal("0"), validation_alias="other_compensation", serialization_alias="otherCompensation")
    notes:              Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AttendanceSummaryResponse(BaseModel):
    total:   int
    present: int
    absent:  int
    leave:   int

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


# ── Compliance: Apply Extracted Rate ────────────────────────────────────
# Backs the "Apply" button added to ComplianceDocuments.jsx's extracted-rate
# preview. `row` intentionally accepts whatever shape the frontend already
# renders (label/employee/employer/total for rates; min/max/rate/tax for
# slabs) rather than a stricter schema, since it's echoing back exactly
# what ComplianceDocumentUpload displayed to the user before they clicked
# Apply — see service.apply_extracted_rate for how each kind is mapped
# onto ContributionRate / TaxSlab.

class ApplyExtractedRateRequest(BaseModel):
    documentId: str
    kind: str  # "contributionRate" | "taxSlab"
    row: dict
    countryCode: str = "IN"


class ApplyExtractedRateResponse(BaseModel):
    applied: bool
    componentKey: Optional[str] = None
    message: str = ""


# ── Compliance: Jurisdiction Pack ────────────────────────────────────────

class JurisdictionPackResponse(BaseModel):
    id:                  int
    packId:              str = Field(validation_alias="pack_id", serialization_alias="packId")
    jurisdictionCountry: str = Field(validation_alias="jurisdiction_country", serialization_alias="jurisdictionCountry")
    jurisdictionState:   Optional[str] = Field(None, validation_alias="jurisdiction_state", serialization_alias="jurisdictionState")
    version:             str
    status:              str
    effectiveFrom:       Optional[date] = Field(None, validation_alias="effective_from", serialization_alias="effectiveFrom")
    effectiveTo:         Optional[date] = Field(None, validation_alias="effective_to", serialization_alias="effectiveTo")
    complianceOwner:     str = Field("", validation_alias="compliance_owner", serialization_alias="complianceOwner")
    engineeringOwner:    str = Field("", validation_alias="engineering_owner", serialization_alias="engineeringOwner")
    sourceReferences:    str = Field("", validation_alias="source_references", serialization_alias="sourceReferences")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class JurisdictionPackUpsert(BaseModel):
    packId: str
    jurisdictionCountry: str
    jurisdictionState: Optional[str] = None
    version: str = "1.0"
    status: str = "Draft"
    effectiveFrom: Optional[date] = None
    effectiveTo: Optional[date] = None
    complianceOwner: str = ""
    engineeringOwner: str = ""
    sourceReferences: str = ""


# ── Dashboard ──────────────────────────────────────────────────────────

class DashboardSummaryResponse(BaseModel):
    totalPayrollCost:            Decimal
    totalPayrollCostChangePct:   Optional[float] = None
    totalGross:                  Optional[Decimal] = None
    totalTaxes:                  Optional[Decimal] = None
    totalNet:                    Optional[Decimal] = None
    headcount:                   int
    activeCount:                 Optional[int] = None
    onLeaveCount:                Optional[int] = None
    pendingApprovals:            int

    model_config = ConfigDict(populate_by_name=True)


class DashboardTrendPoint(BaseModel):
    month: str
    gross: Optional[Decimal] = None
    net:   Optional[Decimal] = None
    cost:  Optional[Decimal] = None


class RecentActivityItem(BaseModel):
    id:          str
    description: str
    timestamp:   datetime
    status:      ActivityStatus


class SuccessResponse(BaseModel):
    message: str


# ── Compliance: Documents ─────────────────────────────────────────────

class ExtractedContributionRate(BaseModel):
    id:       Optional[str] = None
    label:    str
    employee: str
    employer: str
    total:    str


class ExtractedTaxSlab(BaseModel):
    id:  Optional[str] = None
    min: str
    max: str
    rate: str
    tax:  str


class ExtractedRequirement(BaseModel):
    label: str
    note:  Optional[str] = None


class ExtractedRegisteredEntityDetails(BaseModel):
    # Common
    name:    Optional[str] = None
    address: Optional[str] = None

    # UK
    registrationNumber:    Optional[str] = None
    vatNumber:             Optional[str] = None
    payeReference:         Optional[str] = None
    utr:                   Optional[str] = None
    accountsReferenceDate: Optional[str] = None

    # India
    pan:     Optional[str] = None
    tan:     Optional[str] = None
    gst:     Optional[str] = None
    pfCode:  Optional[str] = None
    esiCode: Optional[str] = None

    # US
    ein:       Optional[str] = None
    stateId:   Optional[str] = None
    naicsCode: Optional[str] = None


class ExtractedComplianceData(BaseModel):
    contributionRates:      List[ExtractedContributionRate] = []
    taxSlabs:               List[ExtractedTaxSlab] = []
    requirements:           List[ExtractedRequirement] = []
    registeredEntityDetails: Optional[ExtractedRegisteredEntityDetails] = None


class ComplianceDocumentResponse(BaseModel):
    """Shape consumed by payrollService.js / ComplianceDocuments.jsx.
    Field names below are the exact contract documented in
    payrollService.js's uploadComplianceDocument() comment block —
    `response_model_by_alias=True` on the route serializes these as
    camelCase for the frontend while the Python side stays snake_case."""
    id:            int
    fileName:      str = Field(validation_alias="file_name", serialization_alias="fileName")
    title:         Optional[str] = None
    documentType:  Optional[str] = Field(None, validation_alias="document_type", serialization_alias="documentType")
    category:      str = "other"
    description:   Optional[str] = None
    fileSize:      Optional[int] = Field(None, validation_alias="file_size", serialization_alias="fileSize")
    mimeType:      Optional[str] = Field(None, validation_alias="mime_type", serialization_alias="mimeType")
    uploadedBy:    Optional[int] = Field(None, validation_alias="uploaded_by", serialization_alias="uploadedBy")
    uploadedAt:    datetime = Field(validation_alias="uploaded_at", serialization_alias="uploadedAt")
    country:       Optional[str] = None
    status:        str  # "processing" | "parsed" | "failed"
    extracted:     Optional[ExtractedComplianceData] = Field(None, validation_alias="extracted_data", serialization_alias="extracted")
    error:         Optional[str] = Field(None, validation_alias="error_message", serialization_alias="error")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)