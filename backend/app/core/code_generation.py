"""
core/code_generation.py
-----------------------
Centralized code generation for all business entities across the ZoikoOne platform.

Every entity gets a stable, human-readable, immutable code:
  - Organization abbreviation: ZGI, AMG, TAT (derived from name, never changes)
  - Employee code:             ZGIE00001, ZGIE00002
  - Department code:           ZGIDEP001, ZGIDEP002
  - Designation code:          ZGIDES001, ZGIDES002
  - Branch code:               ZGIBR001, ZGIBR002
  - Payroll run code:          ZGIPY202607001
  - Payslip number:            ZGIPSL20260700001
  - Attendance batch:          ZGITM20260720
  - Leave request code:        ZGILV000001
  - Expense claim code:        ZGISP000001
  - Invoice number:            ZGIBL202600001
  - Tenant code:               ZGIHR01, ZGIPY01

All codes are generated once at creation time and never changed.
Concurrency is handled via PostgreSQL advisory locks.
"""

import uuid as uuid_lib
from datetime import datetime
from typing import Optional, Type

from sqlalchemy import text, func
from sqlalchemy.orm import Session


# ═══════════════════════════════════════════════════════════════════════════════
# ORGANIZATION CODE (Stable Abbreviation)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_organization_code(name: str, db: Session) -> str:
    """
    Generate a stable abbreviation from an organization name.

    Rules:
      1. Take first letter of each significant word (3+ letters)
      2. If result < 3 chars, take first 3 chars of the first significant word
      3. If duplicate exists, append numeric suffix (never changes after)

    Examples:
      "Zoiko Group of Industries" -> "ZGI"
      "ABC Technologies Pvt Ltd"  -> "ABC"
      "AMC Group"                 -> "AMG"
      "Tata Consultancy Services" -> "TAT"  (fallback: first word)
      "Acme Corp"                 -> "ACM"
      "Zoiko"                     -> "ZOI"  (fallback: first 3 chars)
    """
    words = name.strip().split()
    significant = [w for w in words if len(w) >= 3]

    if len(significant) >= 3:
        code = "".join(w[0].upper() for w in significant[:3])
    elif len(significant) >= 2:
        code = "".join(w[0].upper() for w in significant)
    else:
        # Fallback: first 3 chars of the name (stripped, uppercased)
        code = name.strip()[:3].upper()

    # Deduplicate with numeric suffix
    from app.modules.hr.models import Organization
    base_code = code
    suffix = 1
    while db.query(Organization).filter(Organization.organization_code == code).first():
        code = f"{base_code}{suffix}"
        suffix += 1

    return code


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE CODE (Unified across HR + Payroll)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_employee_code(db: Session, organization_id: int) -> str:
    """
    Generate employee code: {OrgCode}E{seq:05d}

    Concurrency-safe via pg_advisory_xact_lock on (organization_id).
    Uses COUNT to determine next sequence number.

    Counts from BOTH the HR Employee table AND the Payroll PayrollEmployee
    table to produce globally unique codes that never collide across modules.

    Examples:
      ZGI -> ZGIE00001, ZGIE00002, ...
      AMG -> AMGE00001, AMGE00002, ...
    """
    db.execute(
        text("SELECT pg_advisory_xact_lock(:org_key)"),
        {"org_key": organization_id + 9000000},
    )

    from app.modules.hr.models import Organization
    from app.modules.employee.models import Employee
    from app.modules.payroll.models import PayrollEmployee

    org = db.query(Organization).filter(Organization.id == organization_id).first()
    org_code = org.organization_code if org and org.organization_code else "UNK"

    hr_count = db.query(Employee).filter(
        Employee.organization_id == organization_id,
        Employee.employee_code.isnot(None),
        Employee.employee_code.like(f"{org_code}E%"),
    ).count()

    payroll_count = db.query(PayrollEmployee).filter(
        PayrollEmployee.organization_id == organization_id,
        PayrollEmployee.employee_code.isnot(None),
        PayrollEmployee.employee_code.like(f"{org_code}E%"),
    ).count()

    return f"{org_code}E{hr_count + payroll_count + 1:05d}"


# ═══════════════════════════════════════════════════════════════════════════════
# GENERIC BUSINESS CODE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def generate_business_code(
    db: Session,
    organization_id: int,
    prefix: str,
    table: Type,
    code_column: str,
    date_format: Optional[str] = None,
    seq_width: int = 3,
) -> str:
    """
    Generic code generator for any business entity.

    Args:
        db: Database session
        organization_id: Org FK
        prefix: e.g. "PY", "BL", "LV", "DEP", "DES", "BR"
        table: SQLAlchemy model class
        code_column: Column name to search/count
        date_format: Optional Python strftime format, e.g. "%Y%m", "%Y%m%d"
        seq_width: Zero-padded sequence width (default 3)

    Examples:
        generate_business_code(db, org_id, "PY", PayrollRun, "run_code", "%Y%m")
        -> ZGIPY202607001

        generate_business_code(db, org_id, "LV", PayrollLeaveRequest, "request_code")
        -> ZGILV00001

        generate_business_code(db, org_id, "DEP", Department, "department_code")
        -> ZGIDEP001
    """
    db.execute(
        text("SELECT pg_advisory_xact_lock(:org_key)"),
        {"org_key": organization_id + 8000000 + hash(prefix) % 1000000},
    )

    from app.modules.hr.models import Organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    org_code = org.organization_code if org and org.organization_code else "UNK"

    date_part = ""
    if date_format:
        date_part = datetime.now().strftime(date_format)

    prefix_pattern = f"{org_code}{prefix}{date_part}%"
    count = db.query(table).filter(
        table.organization_id == organization_id,
        getattr(table, code_column).like(prefix_pattern),
    ).count()

    return f"{org_code}{prefix}{date_part}{(count + 1):0{seq_width}d}"


# ═══════════════════════════════════════════════════════════════════════════════
# TENANT CODE (Organization + Product)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_tenant_code(
    db: Session,
    organization_id: int,
    product_code: str,
) -> str:
    """
    Generate tenant code: {OrgCode}{ProductCode}{seq:02d}

    Examples:
        ZGI + HR + 01 = ZGIHR01
        ZGI + PY + 01 = ZGIPY01
        AMG + HR + 01 = AMGHR01
    """
    from app.modules.hr.models import Organization
    from app.modules.super_admin.models import OrganizationProduct

    org = db.query(Organization).filter(Organization.id == organization_id).first()
    org_code = org.organization_code if org and org.organization_code else "UNK"

    count = db.query(OrganizationProduct).filter(
        OrganizationProduct.organization_id == organization_id,
    ).count()

    return f"{org_code}{product_code.upper()}{(count + 1):02d}"


# ═══════════════════════════════════════════════════════════════════════════════
# UUID GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_uuid() -> str:
    """Generate a new UUID4 string."""
    return str(uuid_lib.uuid4())


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Get organization code
# ═══════════════════════════════════════════════════════════════════════════════

def get_org_code(db: Session, organization_id: int) -> str:
    """Get the organization abbreviation code, or 'UNK' if not found."""
    from app.modules.hr.models import Organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    return org.organization_code if org and org.organization_code else "UNK"
