import csv
import hashlib
import io
import re
import secrets
import string
import tempfile
from datetime import date, datetime, timedelta
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import cast, extract, func, Integer, text
from sqlalchemy.orm import Session

from app.modules.employee.models import (
    Employee, EmploymentType, EmployeeStatus, UserRole, Gender,
)
from app.modules.employee.schema import (
    EmployeeCreate, EmployeeUpdate,
    UserCreateRequest, UserUpdateRequest,
    LoginRequest, RegisterRequest,
    ChangeManagerRequest, ConfirmProbationRequest,
    PromoteEmployeeRequest, TransferEmployeeRequest,
    ResignationRequest, ExitEmployeeRequest, EmployeeExportRequest,
    EmployeeCompensationCreate, EmployeeCompensationUpdate,
    EmployeeBenefitCreate,
)
from app.modules.hr.models import (
    Organization, OrganizationStatus, Department, Designation,
    EmployeeProfile, EmployeeReporting, EmployeeLifecycle, EmployeeHistory,
    EmployeeCompensation, EmployeeBenefit,
)
from app.modules.super_admin.models import PlatformProduct, OrganizationProduct, ProductStatus
from app.core.security import hash_password, verify_password, create_access_token
from app.core.exceptions import (
    NotFoundException, AlreadyExistsException,
    UnauthorizedException, BadRequestException,
)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_employee_code(db: Session) -> str:
    max_id = db.query(func.max(Employee.id)).scalar()
    next_number = (max_id + 1) if max_id else 1
    return f"ZK-{next_number:05d}"


def derive_employee_id_prefix(org_name: str) -> str:
    """Derive a 2-letter employee-ID prefix from an organization name.

    Rules:
    - Strip all non-alpha characters from org_name.
    - Take the first two letters, uppercased.
    - If fewer than 2 alpha chars exist, pad with 'X' (e.g. "A1" -> "AX").
    - If no alpha chars at all, fall back to "OR".
    """
    alpha_only = re.sub(r"[^A-Za-z]", "", org_name or "")
    if len(alpha_only) >= 2:
        return alpha_only[:2].upper()
    if len(alpha_only) == 1:
        return (alpha_only + "X").upper()
    return "OR"


def _generate_employee_id(db: Session, organization_id: int) -> str:
    """Generate a concurrency-safe, organization-scoped Employee ID.

    Format: <org_prefix><4-digit serial>, e.g. ZO0001, AC0002.
    Serial is scoped per organization.  The org prefix is stored once at
    creation time in ``Organization.employee_id_prefix`` and never changes
    even if the org is later renamed.

    Concurrency is handled via ``pg_advisory_xact_lock(organization_id)``.
    The unique constraint ``uq_org_employee_id`` is the final integrity
    backstop.

    Historical note: organizations created before this change had their
    employees issued ``EMP####``-style IDs.  Those values are left
    untouched.  New employees going forward use the org-specific prefix.
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise BadRequestException(f"Organization {organization_id} not found")
    if not org.employee_id_prefix:
        raise BadRequestException(
            f"Organization '{org.name}' (id={organization_id}) is missing "
            "employee_id_prefix.  This should have been set at creation time."
        )

    prefix = org.employee_id_prefix
    prefix_len = len(prefix)

    db.execute(
        text("SELECT pg_advisory_xact_lock(:org_key)"),
        {"org_key": organization_id},
    )

    max_num: Optional[int] = (
        db.query(
            func.max(
                cast(func.substring(Employee.employee_id, prefix_len + 1), Integer)
            )
        )
        .filter(
            Employee.organization_id == organization_id,
            Employee.employee_id.isnot(None),
            Employee.employee_id.like(f"{prefix}%"),
        )
        .scalar()
    )
    return f"{prefix}{(max_num or 0) + 1:04d}"


def _generate_temp_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def _role_to_default_title(role: UserRole) -> str:
    titles = {
        UserRole.ADMIN: "Organization Administrator",
        UserRole.HR_ADMIN: "HR Administrator",
        UserRole.EMPLOYEE: "Employee",
        UserRole.HR_MANAGER: "HR Manager",
        UserRole.MANAGER: "Manager",
        UserRole.SUPER_ADMIN: "Super Administrator",
    }
    return titles.get(role, "Employee")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

def login_employee(db: Session, data: LoginRequest) -> dict:
    employee = db.query(Employee).filter(Employee.email == data.email).first()
    if not employee:
        raise UnauthorizedException("Invalid email or password.")

    if not verify_password(data.password, employee.hashed_password):
        raise UnauthorizedException("Invalid email or password.")

    if employee.organization_id:
        org = db.query(Organization).filter(Organization.id == employee.organization_id).first()
        if org:
            if org.status == OrganizationStatus.PENDING:
                raise UnauthorizedException(
                    "Your organization registration is awaiting Super Admin approval. "
                    "You will be able to sign in after approval."
                )
            elif org.status == OrganizationStatus.REJECTED:
                reason = f" Reason: {org.rejection_reason}" if org.rejection_reason else ""
                raise UnauthorizedException(
                    f"Your organization registration has been rejected.{reason}"
                )
            elif org.status == OrganizationStatus.SUSPENDED:
                raise UnauthorizedException(
                    "Your organization has been suspended. Please contact support."
                )

    if not employee.is_active:
        raise UnauthorizedException("Your account has been deactivated.")

    token = create_access_token(data={
        "sub":  employee.email,
        "role": employee.role.value,
        "id":   employee.id,
        "organization_id": employee.organization_id,
    })

    refresh_token = create_access_token(
        data={"sub": employee.email, "id": employee.id, "organization_id": employee.organization_id},
        expires_delta=timedelta(days=7),
    )

    # Serialize employee object using Pydantic schema
    from app.modules.employee.schema import EmployeeResponse
    emp_data = EmployeeResponse.model_validate(employee).model_dump()
    # Include the org's enabled products for sidebar filtering
    if employee.organization_id:
        product_rows = db.query(PlatformProduct.code).join(OrganizationProduct).filter(
            OrganizationProduct.organization_id == employee.organization_id,
            OrganizationProduct.is_enabled == True,
        ).all()
        emp_data["products"] = [r[0] for r in product_rows]
        print(f"[PRODUCTS] Login: user={employee.email} org_id={employee.organization_id} products={emp_data['products']}")
    else:
        print(f"[PRODUCTS] Login: user={employee.email} no organization, products=[]")
    employee_serialized = EmployeeResponse.model_validate(emp_data)

    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "employee": employee_serialized,
    }


_PRODUCT_DISPLAY_NAMES = {
    "hr": "Zoiko HR",
    "time": "ZoikoTime",
    "payroll": "Zoiko Payroll",
    "billing": "Zoiko Billing",
    "projects": "Zoiko Projects",
    "comply": "Zoiko Comply",
    "insights": "Zoiko Insights",
    "spend": "Zoiko Spend",
    "inventory": "Zoiko Inventory",
    "docs": "Zoiko Docs Pro",
}

def _ensure_platform_products(db: Session, codes: list[str]) -> list[PlatformProduct]:
    """Ensure PlatformProduct rows exist for the given codes; create any missing ones."""
    if not codes:
        return []
    existing = db.query(PlatformProduct).filter(
        PlatformProduct.code.in_(codes),
    ).all()
    existing_map = {p.code: p for p in existing}
    missing = [c for c in codes if c not in existing_map]
    if missing:
        print(f"[PRODUCTS] Creating missing PlatformProduct records: {missing}")
    for code in codes:
        if code not in existing_map:
            prod = PlatformProduct(
                code=code,
                name=_PRODUCT_DISPLAY_NAMES.get(code, code.title()),
                description=f"{code} module",
                status=ProductStatus.ACTIVE,
            )
            db.add(prod)
            db.flush()
            existing_map[code] = prod
    result = list(existing_map.values())
    print(f"[PRODUCTS] _ensure_platform_products(codes={codes}) -> {len(result)} products: {[p.code for p in result]}")
    return result

def _save_org_products(db: Session, org_id: int, product_codes) -> None:
    print(f"[PRODUCTS] _save_org_products(org_id={org_id}, product_codes={product_codes})")
    if isinstance(product_codes, str):
        product_codes = [product_codes]
    if not product_codes or "all" in product_codes:
        products = db.query(PlatformProduct).filter(
            PlatformProduct.status == ProductStatus.ACTIVE,
        ).all()
        print(f"[PRODUCTS] No specific products selected, assigning ALL active: {[p.code for p in products]}")
    else:
        products = _ensure_platform_products(db, product_codes)
    created = 0
    for prod in products:
        existing = db.query(OrganizationProduct).filter(
            OrganizationProduct.organization_id == org_id,
            OrganizationProduct.product_id == prod.id,
        ).first()
        if not existing:
            db.add(OrganizationProduct(
                organization_id=org_id,
                product_id=prod.id,
                is_enabled=True,
            ))
            created += 1
    print(f"[PRODUCTS] _save_org_products: {created} new OrganizationProduct records created for org_id={org_id}")
    # Verify what was saved
    all_saved = db.query(OrganizationProduct).filter(
        OrganizationProduct.organization_id == org_id,
    ).all()
    saved_codes = []
    for op in all_saved:
        pp = db.query(PlatformProduct).filter(PlatformProduct.id == op.product_id).first()
        if pp:
            saved_codes.append(pp.code)
    print(f"[PRODUCTS] Verification: org_id={org_id} now has {len(saved_codes)} products: {saved_codes}")

# TODO: This function is duplicated in hr/service.py.  Changes here must be
# mirrored there, or the two copies should be consolidated into one.
def register_enterprise(db: Session, data: RegisterRequest) -> dict:
    existing = db.query(Employee).filter(Employee.email == data.email).first()
    if existing:
        raise AlreadyExistsException("Employee", "email")

    org_code = data.organization[:50].upper().replace(" ", "_")
    suffix = 1
    while db.query(Organization).filter(Organization.code == org_code).first():
        org_code = f"{data.organization[:45].upper().replace(' ', '_')}_{suffix}"
        suffix += 1

    org = Organization(
        name=data.organization,
        code=org_code,
        status=OrganizationStatus.PENDING,
        address=data.address,
        city=data.city,
        state=data.state,
        country=data.country,
        timezone=data.timezone or "UTC",
        industry=data.industry,
        employee_id_prefix=derive_employee_id_prefix(data.organization),
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    dept_code = f"MGMT_{org.id}"
    dept = Department(name="Management", code=dept_code, description="Company management", organization_id=org.id)
    db.add(dept)
    db.commit()
    db.refresh(dept)

    name_parts = data.name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "Admin"

    employee = Employee(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.ADMIN,
        is_active=True,
        first_name=first_name,
        last_name=last_name,
        phone="",
        employee_code=_generate_employee_code(db),
        employee_id=_generate_employee_id(db, organization_id=org.id),
        job_title="System Administrator",
        employment_type=EmploymentType.FULL_TIME,
        status=EmployeeStatus.ACTIVE,
        date_of_joining=date.today(),
        department_id=dept.id,
        organization_id=org.id,
    )
    db.add(employee)
    db.flush()
    employee.employee_code = f"ZK-{employee.id:05d}"
    db.commit()
    db.refresh(employee)

    from app.modules.super_admin.models import AuditLog, AuditAction, Notification
    audit = AuditLog(
        action=AuditAction.CREATE,
        entity_type="Organization",
        entity_id=org.id,
        performed_by=employee.id,
        performed_by_email=employee.email,
        details={"organization": org.name, "code": org.code, "status": "PENDING"},
    )
    db.add(audit)

    notification = Notification(
        title="New Organization Registration",
        message=f"Organization '{org.name}' has registered and is awaiting approval.",
        notification_type="org_registration",
        priority="high",
        target_org_id=org.id,
        target_user_id=employee.id,
    )
    db.add(notification)

    # Save product selection (if provided) as OrganizationProduct records
    selected_products = data.products or ([data.product] if data.product else None)
    print(f"[PRODUCTS] Register: org='{data.organization}' data.products={data.products} data.product={data.product} -> selected_products={selected_products}")
    _save_org_products(db, org.id, selected_products)

    db.commit()

    return {
        "message": "Organization registered successfully. Awaiting Super Admin approval.",
        "organization_id": org.id,
        "organization_name": org.name,
    }


def change_password(
    db: Session,
    employee_id: int,
    current_password: str,
    new_password: str,
) -> dict:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise NotFoundException("Employee", employee_id)

    if not verify_password(current_password, employee.hashed_password):
        raise UnauthorizedException("Current password is incorrect.")

    employee.hashed_password = hash_password(new_password)
    db.commit()
    db.refresh(employee)

    return {"message": "Password changed successfully."}


# ═══════════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT SERVICE (Organization Admin)
# ═══════════════════════════════════════════════════════════════════════════════

def create_organization_user(
    db: Session,
    data: "UserCreateRequest",
    organization_id: int,
    created_by_id: int,
) -> Employee:
    existing = db.query(Employee).filter(Employee.email == data.email).first()
    if existing:
        raise AlreadyExistsException("User", "email")

    temp_password = _generate_temp_password()
    role = data.role

    employee = Employee(
        email=data.email,
        hashed_password=hash_password(temp_password),
        employee_code=_generate_employee_code(db),
        employee_id=_generate_employee_id(db, organization_id=organization_id),
        role=role,
        is_active=True,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone or "",
        job_title=_role_to_default_title(role),
        employment_type=EmploymentType.FULL_TIME,
        status=EmployeeStatus.ACTIVE,
        date_of_joining=date.today(),
        organization_id=organization_id,
        created_by=created_by_id,
    )
    db.add(employee)
    db.flush()
    employee.employee_code = f"ZK-{employee.id:05d}"
    db.commit()
    db.refresh(employee)

    return employee, temp_password


def get_organization_users(
    db: Session,
    organization_id: int,
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    per_page = min(per_page, 100)
    query = db.query(Employee).filter(Employee.organization_id == organization_id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            (Employee.first_name.ilike(term)) |
            (Employee.last_name.ilike(term)) |
            (Employee.email.ilike(term)) |
            (Employee.employee_id.ilike(term)) |
            (Employee.employee_code.ilike(term))
        )

    if role:
        query = query.filter(Employee.role == role)

    if status:
        if status == "active":
            query = query.filter(Employee.is_active == True)
        elif status == "inactive":
            query = query.filter(Employee.is_active == False)

    total = query.count()
    users = query.order_by(Employee.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return {"total": total, "page": page, "per_page": per_page, "items": users}


def get_organization_user(
    db: Session,
    user_id: int,
    organization_id: int,
) -> Employee:
    user = db.query(Employee).filter(
        Employee.id == user_id,
        Employee.organization_id == organization_id,
    ).first()
    if not user:
        raise NotFoundException("User", user_id)
    return user


def update_organization_user(
    db: Session,
    user_id: int,
    data: "UserUpdateRequest",
    organization_id: int,
    updated_by_id: int,
) -> Employee:
    user = get_organization_user(db, user_id, organization_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_by = updated_by_id
    db.commit()
    db.refresh(user)
    return user


def deactivate_organization_user(
    db: Session,
    user_id: int,
    organization_id: int,
    updated_by_id: int,
) -> Employee:
    user = get_organization_user(db, user_id, organization_id)
    user.is_active = False
    user.status = EmployeeStatus.INACTIVE
    user.updated_by = updated_by_id
    db.commit()
    db.refresh(user)
    return user


def activate_organization_user(
    db: Session,
    user_id: int,
    organization_id: int,
    updated_by_id: int,
) -> Employee:
    user = get_organization_user(db, user_id, organization_id)
    user.is_active = True
    user.status = EmployeeStatus.ACTIVE
    user.updated_by = updated_by_id
    db.commit()
    db.refresh(user)
    return user


def reset_user_password(
    db: Session,
    user_id: int,
    organization_id: int,
    updated_by_id: int,
) -> tuple[Employee, str]:
    user = get_organization_user(db, user_id, organization_id)
    temp_password = _generate_temp_password()
    user.hashed_password = hash_password(temp_password)
    user.updated_by = updated_by_id
    db.commit()
    db.refresh(user)
    return user, temp_password


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE CRUD
# ═══════════════════════════════════════════════════════════════════════════════

def create_employee(db: Session, data: EmployeeCreate, organization_id: Optional[int] = None) -> Employee:
    existing = db.query(Employee).filter(Employee.email == data.email).first()
    if existing:
        raise AlreadyExistsException("Employee", "email")

    if data.department_id:
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        if not dept:
            raise NotFoundException("Department", data.department_id)

    employee_data = data.model_dump(exclude={"password"})
    employee_data.pop("employee_id", None)
    resolved_org_id = organization_id or employee_data.get("organization_id")
    if not resolved_org_id:
        raise BadRequestException("organization_id is required to create an employee")
    employee = Employee(
        **employee_data,
        hashed_password=hash_password(data.password),
        employee_code=_generate_employee_code(db),
        employee_id=_generate_employee_id(db, organization_id=resolved_org_id),
        organization_id=resolved_org_id,
    )

    db.add(employee)
    db.flush()
    employee.employee_code = f"ZK-{employee.id:05d}"
    db.commit()
    db.refresh(employee)
    return employee


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE IMPORT
# ═══════════════════════════════════════════════════════════════════════════════

_COLUMN_MAP = {
    "employee id": "employee_id",
    "employee_id": "employee_id",
    "employee code": "employee_code",
    "employee_code": "employee_code",
    "first name": "first_name",
    "first_name": "first_name",
    "last name": "last_name",
    "last_name": "last_name",
    "email": "email",
    "password": "password",
    "phone": "phone",
    "job title": "job_title",
    "job_title": "job_title",
    "department": "department_name",
    "designation": "designation_name",
    "reporting manager": "reporting_manager",
    "reporting_manager": "reporting_manager",
    "employment type": "employment_type",
    "employment_type": "employment_type",
    "status": "status",
    "date of joining": "date_of_joining",
    "date_of_joining": "date_of_joining",
    "date of birth": "date_of_birth",
    "date_of_birth": "date_of_birth",
    "gender": "gender",
    "basic salary": "basic_salary",
    "basic_salary": "basic_salary",
    "ctc": "ctc",
    "work email": "work_email",
    "work_email": "work_email",
    "personal email": "personal_email",
    "personal_email": "personal_email",
    "confirmation date": "confirmation_date",
    "confirmation_date": "confirmation_date",
    "company": "company",
    "business unit": "business_unit",
    "business_unit": "business_unit",
    "division": "division",
    "team": "team",
    "current address": "current_address",
    "current_address": "current_address",
    "permanent address": "permanent_address",
    "permanent_address": "permanent_address",
    "city": "city",
    "state": "state",
    "country": "country",
    "pincode": "pincode",
    "address": "address",
}

_DATE_FIELDS = {"date_of_joining", "date_of_birth", "confirmation_date"}
_DECIMAL_FIELDS = {"basic_salary", "ctc"}
_ENUM_FIELDS = {
    "employment_type": {"full_time", "part_time", "contract", "intern", "probation"},
    "status": {"active", "inactive", "pending", "on_leave", "terminated", "resigned", "deactivated", "suspended", "locked", "archived", "password_reset_required"},
    "gender": {"male", "female", "other"},
}
_REQUIRED_FIELDS = {"first_name", "last_name", "email", "job_title", "date_of_joining"}


def _normalise_header(h: str) -> str:
    return _COLUMN_MAP.get(h.strip().lower(), h.strip().lower())


def _parse_date(val, row_num: int, field: str, errors: list) -> Optional[date]:
    if not val or str(val).strip() == "":
        return None
    try:
        if isinstance(val, date):
            return val
        if isinstance(val, datetime):
            return val.date()
        cleaned = str(val).strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(cleaned, fmt).date()
            except ValueError:
                continue
        # Excel serial date number
        try:
            from datetime import timedelta as td
            serial = float(cleaned)
            if 1 <= serial <= 2958465:
                return datetime(1899, 12, 30) + td(days=int(serial))
        except (ValueError, TypeError):
            pass
        errors.append({"row": row_num, "employee_id": "", "email": "", "field": field, "error": f"Invalid date for {field}: {val}"})
    except Exception:
        errors.append({"row": row_num, "employee_id": "", "email": "", "field": field, "error": f"Invalid date for {field}: {val}"})
    return None


def _parse_decimal(val, row_num: int, field: str, errors: list):
    if val is None or str(val).strip() == "":
        return None
    try:
        return Decimal(str(val).replace(",", ""))
    except Exception:
        errors.append({"row": row_num, "employee_id": "", "email": "", "field": field, "error": f"Invalid number for {field}: {val}"})
    return None


def _parse_enum(val, field: str):
    if not val or str(val).strip() == "":
        return None
    cleaned = str(val).strip().lower().replace(" ", "_").replace("-", "_")
    allowed = _ENUM_FIELDS.get(field, set())
    if cleaned in allowed:
        return cleaned
    if not allowed:
        return val
    return None


def import_employees_from_file(
    db: Session,
    file_bytes: bytes,
    filename: str,
    organization_id: int,
    current_user_id: int,
) -> dict:
    result = {
        "total_rows": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "departments_created": 0,
        "designations_created": 0,
        "errors": [],
    }

    try:
        rows = _parse_file(file_bytes, filename, result)
    except Exception as e:
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "file", "error": f"Failed to parse file: {e}"})
        return result

    if not rows:
        return result

    seen_emails = set()
    seen_import_ids = set()

    # Use savepoints so individual row failures don't rollback valid rows
    for row_num, row in enumerate(rows, start=2):
        norm = {}
        for k, v in row.items():
            field = _normalise_header(k)
            norm[field] = v
        row_data = norm

        employee_id_val = str(row_data.get("employee_id", "")).strip() if row_data.get("employee_id") else ""
        email_val = str(row_data.get("email", "")).strip() if row_data.get("email") else ""

        # Validate required fields
        missing = [f for f in _REQUIRED_FIELDS if not row_data.get(f) or str(row_data.get(f, "")).strip() == ""]
        if missing:
            result["skipped"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": ", ".join(missing), "error": f"Missing required fields: {', '.join(missing)}"})
            continue

        # Validate email format
        email_val = str(row_data["email"]).strip()
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email_val):
            result["skipped"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": "email", "error": "Invalid email format"})
            continue

        # Check duplicate by email
        existing = db.query(Employee).filter(Employee.email == email_val).first()
        if existing and existing.organization_id != organization_id:
            result["skipped"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": "email", "error": "Email already used in another organization"})
            continue

        # Check in-batch duplicates
        if email_val in seen_emails:
            result["skipped"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": "email", "error": "Duplicate email within import file"})
            continue
        seen_emails.add(email_val)

        if employee_id_val and employee_id_val in seen_import_ids:
            result["skipped"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": "employee_id", "error": "Duplicate employee ID within import file"})
            continue
        if employee_id_val:
            seen_import_ids.add(employee_id_val)

        # Parse fields
        payload = {
            "first_name": str(row_data.get("first_name", "")).strip(),
            "last_name": str(row_data.get("last_name", "")).strip(),
            "email": email_val,
            "phone": str(row_data.get("phone", "")).strip() or None,
            "job_title": str(row_data.get("job_title", "")).strip(),
            "work_email": str(row_data.get("work_email", "")).strip() or None,
            "personal_email": str(row_data.get("personal_email", "")).strip() or None,
            "company": str(row_data.get("company", "")).strip() or None,
            "business_unit": str(row_data.get("business_unit", "")).strip() or None,
            "division": str(row_data.get("division", "")).strip() or None,
            "team": str(row_data.get("team", "")).strip() or None,
            "current_address": str(row_data.get("current_address", "")).strip() or None,
            "permanent_address": str(row_data.get("permanent_address", "")).strip() or None,
            "city": str(row_data.get("city", "")).strip() or None,
            "state": str(row_data.get("state", "")).strip() or None,
            "country": str(row_data.get("country", "")).strip() or None,
            "pincode": str(row_data.get("pincode", "")).strip() or None,
            "address": str(row_data.get("address", "")).strip() or None,
        }

        # Date fields
        for f in _DATE_FIELDS:
            val = _parse_date(row_data.get(f), row_num, f, result["errors"])
            if val:
                payload[f] = val

        # Decimal fields
        for f in _DECIMAL_FIELDS:
            val = _parse_decimal(row_data.get(f), row_num, f, result["errors"])
            if val is not None:
                payload[f] = val

        # Enum fields
        row_invalid = False
        for f in ("employment_type", "status", "gender"):
            raw = row_data.get(f)
            parsed = _parse_enum(raw, f)
            if parsed:
                payload[f] = parsed
            elif raw and str(raw).strip():
                result["skipped"] += 1
                result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": f, "error": f"Invalid {f}: {raw}. Allowed: {', '.join(_ENUM_FIELDS.get(f, []))}"})
                row_invalid = True
                break
        if row_invalid:
            continue

        # Resolve department by name – auto-create if not found
        dept_name = str(row_data.get("department_name", "")).strip()
        if dept_name:
            dept = db.query(Department).filter(
                Department.name.ilike(dept_name),
                Department.organization_id == organization_id,
            ).first()
            if dept:
                payload["department_id"] = dept.id
            else:
                dept_code = "DEPT" + hashlib.md5(f"{dept_name}_{organization_id}".encode()).hexdigest()[:6].upper()
                dept = Department(
                    name=dept_name,
                    code=dept_code,
                    description="Auto-created from employee import",
                    organization_id=organization_id,
                )
                db.add(dept)
                db.flush()
                payload["department_id"] = dept.id
                result["departments_created"] += 1

        # Resolve designation by title – auto-create if not found
        designation_name = str(row_data.get("designation_name", "")).strip()
        if designation_name:
            desig = db.query(Designation).filter(
                Designation.title.ilike(designation_name),
                Designation.organization_id == organization_id,
            ).first()
            if desig:
                payload["designation_id"] = desig.id
            else:
                desig = Designation(
                    title=designation_name,
                    department_name=dept_name or None,
                    organization_id=organization_id,
                )
                db.add(desig)
                db.flush()
                payload["designation_id"] = desig.id
                result["designations_created"] += 1

        # Password
        password = str(row_data.get("password", "")).strip() if row_data.get("password") else None
        if not password:
            password = _generate_temp_password()

        # Use savepoint per row so failures don't rollback valid rows
        try:
            with db.begin_nested():
                if existing:
                    for field, value in payload.items():
                        if value is not None:
                            setattr(existing, field, value)
                    existing.updated_by = current_user_id
                    result["updated"] += 1
                else:
                    emp_data = {k: v for k, v in payload.items() if v is not None}
                    employee = Employee(
                        **emp_data,
                        hashed_password=hash_password(password),
                        employee_code=_generate_employee_code(db),
                        employee_id=_generate_employee_id(db, organization_id=organization_id),
                        organization_id=organization_id,
                        role=UserRole.EMPLOYEE,
                        is_active=True,
                        created_by=current_user_id,
                    )
                    db.add(employee)
                    db.flush()
                    employee.employee_code = f"ZK-{employee.id:05d}"
                    result["created"] += 1
        except Exception as e:
            result["failed"] += 1
            result["errors"].append({"row": row_num, "employee_id": employee_id_val, "email": email_val, "field": "general", "error": f"{'Update' if existing else 'Create'} failed: {str(e)[:200]}"})

        result["total_rows"] = row_num - 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        result["failed"] = result["total_rows"]
        result["created"] = 0
        result["updated"] = 0
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "general", "error": f"Bulk commit failed: {str(e)[:300]}"})

    result["total_rows"] = len(rows)
    return result


def _parse_file(file_bytes: bytes, filename: str, result: dict) -> list[dict]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("xlsx", "xls"):
        return _parse_excel(file_bytes, result)
    elif ext == "csv":
        return _parse_csv(file_bytes, result)
    else:
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "file", "error": f"Unsupported file format: .{ext}. Use .xlsx, .xls, or .csv"})
        return []


def _parse_excel(file_bytes: bytes, result: dict) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb.active
    if ws is None:
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "file", "error": "Excel file has no sheets"})
        return []

    rows_iter = ws.iter_rows(values_only=True)
    try:
        headers = [str(c).strip() if c else "" for c in next(rows_iter)]
    except StopIteration:
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "file", "error": "Excel file is empty"})
        return []

    parsed = []
    for row_idx, row in enumerate(rows_iter, start=2):
        record = {}
        has_data = False
        for col_idx, val in enumerate(row):
            if col_idx < len(headers) and headers[col_idx]:
                record[headers[col_idx]] = val
                if val is not None and str(val).strip():
                    has_data = True
        if has_data:
            parsed.append(record)

    wb.close()
    return parsed


def _parse_csv(file_bytes: bytes, result: dict) -> list[dict]:
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        result["errors"].append({"row": 0, "employee_id": "", "email": "", "field": "file", "error": "CSV file has no headers"})
        return []

    parsed = []
    for row_idx, row in enumerate(reader, start=2):
        cleaned = {k.strip(): v.strip() if v else "" for k, v in row.items()}
        has_data = any(v for v in cleaned.values())
        if has_data:
            parsed.append(cleaned)

    return parsed


def _generate_import_template_bytes() -> dict:
    """Generate sample import file bytes (.xlsx) and return as bytes."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Employee Import Template"

    headers = [
        "Employee ID", "First Name", "Last Name", "Email", "Password",
        "Phone", "Job Title", "Department", "Designation", "Reporting Manager",
        "Employment Type", "Status", "Date of Joining", "Date of Birth",
        "Gender", "Basic Salary", "CTC", "Work Email", "Personal Email",
        "Confirmation Date", "Company", "Business Unit", "Division", "Team",
        "Current Address", "Permanent Address", "City", "State", "Country",
        "Pincode", "Address",
    ]

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    # Sample data row
    sample = [
        "ZO0001", "John", "Doe", "john.doe@example.com", "Pass@1234",
        "+91-9876543210", "Software Engineer", "Engineering", "Senior Developer", "Jane Smith",
        "Full Time", "Active", "2024-01-15", "1995-06-15",
        "Male", "75000", "1200000", "john@company.com", "john@gmail.com",
        "2024-07-15", "ZoikoOne", "Enterprise", "Engineering", "Frontend",
        "123 Main St, Mumbai", "456 Oak Ave, Mumbai", "Mumbai", "Maharashtra", "India",
        "400001", "",
    ]

    for col_idx, val in enumerate(sample, start=1):
        ws.cell(row=2, column=col_idx, value=val)

    # Column widths
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max_len + 3, 40)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    wb.close()
    return buf.read()


def get_all_employees(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    status: Optional[EmployeeStatus] = None,
    organization_id: Optional[int] = None,
    visible_roles: Optional[list] = None,
) -> dict:
    per_page = min(per_page, 100)
    query = db.query(Employee)

    if organization_id:
        query = query.filter(Employee.organization_id == organization_id)

    if visible_roles:
        query = query.filter(Employee.role.in_(visible_roles))

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Employee.first_name.ilike(search_term)) |
            (Employee.last_name.ilike(search_term)) |
            (Employee.email.ilike(search_term)) |
            (Employee.employee_id.ilike(search_term)) |
            (Employee.employee_code.ilike(search_term))
        )

    if department_id:
        query = query.filter(Employee.department_id == department_id)

    if status:
        query = query.filter(Employee.status == status)

    total = query.count()
    employees = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "items":    employees,
    }


def get_employees(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    status: Optional[EmployeeStatus] = None,
    employment_type: Optional[EmploymentType] = None,
    organization_id: Optional[int] = None,
    visible_roles: Optional[list] = None,
) -> dict:
    per_page = min(per_page, 10000)
    query = db.query(Employee)

    if organization_id:
        query = query.filter(Employee.organization_id == organization_id)

    # Exclude administrative roles from employee listing if not explicitly provided
    if visible_roles:
        query = query.filter(Employee.role.in_(visible_roles))
    else:
        # Default to excluding admin roles if not specified
        employee_roles = [UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE]
        query = query.filter(Employee.role.in_(employee_roles))

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Employee.first_name.ilike(search_term)) |
            (Employee.last_name.ilike(search_term)) |
            (Employee.email.ilike(search_term)) |
            (Employee.employee_id.ilike(search_term)) |
            (Employee.employee_code.ilike(search_term)) |
            (Employee.job_title.ilike(search_term))
        )

    if department_id:
        query = query.filter(Employee.department_id == department_id)

    if status:
        query = query.filter(Employee.status == status)

    if employment_type:
        query = query.filter(Employee.employment_type == employment_type)

    total = query.count()
    employees = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "items":    employees,
    }


def get_employee_by_id(db: Session, employee_id: int, organization_id: Optional[int] = None) -> Employee:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise NotFoundException("Employee", employee_id)
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate, organization_id: Optional[int] = None) -> Employee:
    employee = get_employee_by_id(db, employee_id)

    if data.department_id:
        dept = db.query(Department).filter(Department.id == data.department_id).first()
        if not dept:
            raise NotFoundException("Department", data.department_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee


def deactivate_employee(db: Session, employee_id: int, organization_id: Optional[int] = None) -> Employee:
    employee = get_employee_by_id(db, employee_id)
    employee.is_active = False
    employee.status = EmployeeStatus.TERMINATED

    event = EmployeeLifecycle(
        employee_id=employee_id,
        organization_id=employee.organization_id,
        event_type="exit",
        event_date=datetime.now().date(),
        status="completed",
        reason="Employee deactivated via admin action",
    )
    db.add(event)
    db.commit()
    db.refresh(employee)
    return employee


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

def get_employee_dashboard(db: Session, organization_id: Optional[int] = None) -> dict:
    # Exclude administrative roles from employee counts
    employee_roles = [UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE]
    
    base_filter = [Employee.organization_id == organization_id] if organization_id else []
    employee_filter = base_filter + [Employee.role.in_(employee_roles)]

    total = db.query(Employee).filter(*employee_filter).count()
    active = db.query(Employee).filter(*employee_filter, Employee.status == EmployeeStatus.ACTIVE).count()
    inactive = db.query(Employee).filter(*employee_filter, Employee.status != EmployeeStatus.ACTIVE).count()

    lc_filter = [EmployeeLifecycle.organization_id == organization_id] if organization_id else []
    probation = db.query(EmployeeLifecycle).filter(
        *lc_filter,
        EmployeeLifecycle.event_type == "probation_start",
        EmployeeLifecycle.status == "pending"
    ).count()

    from datetime import date as dt_date
    new_hires_this_month = db.query(Employee).filter(
        *employee_filter,
        extract("month", Employee.date_of_joining) == extract("month", dt_date.today()),
        extract("year", Employee.date_of_joining) == extract("year", dt_date.today())
    ).count()

    exits_this_month = db.query(Employee).filter(
        *employee_filter,
        extract("month", Employee.updated_at) == extract("month", dt_date.today()),
        extract("year", Employee.updated_at) == extract("year", dt_date.today()),
        Employee.status == EmployeeStatus.TERMINATED
    ).count()

    dept_breakdown = (
        db.query(Department.name, func.count(Employee.id))
        .join(Employee, Employee.department_id == Department.id, isouter=True)
        .filter(*employee_filter, Employee.status == EmployeeStatus.ACTIVE)
        .group_by(Department.name)
        .all()
    )

    designation_breakdown = (
        db.query(Employee.job_title, func.count(Employee.id))
        .filter(*employee_filter, Employee.status == EmployeeStatus.ACTIVE)
        .group_by(Employee.job_title)
        .all()
    )

    location_breakdown = (
        db.query(Employee.address, func.count(Employee.id))
        .filter(*employee_filter, Employee.status == EmployeeStatus.ACTIVE, Employee.address != None)
        .group_by(Employee.address)
        .all()
    )

    recent_lifecycle_events = []
    lifecycle_query = db.query(
        Employee.id, Employee.first_name, Employee.last_name,
        EmployeeLifecycle.event_type, EmployeeLifecycle.event_date,
        EmployeeLifecycle.status
    ).join(
        EmployeeLifecycle, Employee.id == EmployeeLifecycle.employee_id
    ).filter(*lc_filter).order_by(
        EmployeeLifecycle.created_at.desc()
    ).limit(10)

    for emp_id, first_name, last_name, event_type, event_date, status in lifecycle_query.all():
        recent_lifecycle_events.append({
            "employee_id": emp_id,
            "employee_name": f"{first_name} {last_name}",
            "event_type": event_type,
            "event_date": event_date,
            "status": status,
        })

    upcoming_probation_end = []
    for emp_id, first_name, last_name, event_date in db.query(
        Employee.id, Employee.first_name, Employee.last_name,
        EmployeeLifecycle.event_date
    ).join(
        EmployeeLifecycle, Employee.id == EmployeeLifecycle.employee_id
    ).filter(
        *lc_filter,
        EmployeeLifecycle.event_type == "probation_end",
        EmployeeLifecycle.status == "pending"
    ).order_by(EmployeeLifecycle.event_date).limit(5).all():
        upcoming_probation_end.append({
            "employee_id": emp_id,
            "employee_name": f"{first_name} {last_name}",
            "probation_end_date": event_date,
        })

    upcoming_confirmations = []
    for emp_id, first_name, last_name, event_date in db.query(
        Employee.id, Employee.first_name, Employee.last_name,
        EmployeeLifecycle.event_date
    ).join(
        EmployeeLifecycle, Employee.id == EmployeeLifecycle.employee_id
    ).filter(
        *lc_filter,
        EmployeeLifecycle.event_type == "confirmation",
        EmployeeLifecycle.status == "pending"
    ).order_by(EmployeeLifecycle.event_date).limit(5).all():
        upcoming_confirmations.append({
            "employee_id": emp_id,
            "employee_name": f"{first_name} {last_name}",
            "confirmation_date": event_date,
        })

    upcoming_anniversaries = []
    for emp_id, first_name, last_name, joining_date in db.query(
        Employee.id, Employee.first_name, Employee.last_name,
        Employee.date_of_joining
    ).filter(
        *base_filter,
        Employee.status == EmployeeStatus.ACTIVE,
        Employee.date_of_birth != None
    ).order_by(
        extract("month", Employee.date_of_birth),
        extract("day", Employee.date_of_birth)
    ).limit(5).all():
        today = dt_date.today()
        next_birthday = dt_date(today.year, joining_date.month, joining_date.day)
        if next_birthday < today:
            next_birthday = dt_date(today.year + 1, joining_date.month, joining_date.day)

        upcoming_anniversaries.append({
            "employee_id": emp_id,
            "employee_name": f"{first_name} {last_name}",
            "next_birthday": next_birthday,
            "join_date": joining_date,
        })

    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "on_probation": probation,
        "new_hires_this_month": new_hires_this_month,
        "exits_this_month": exits_this_month,
        "department_distribution": [{"department": d, "count": c} for d, c in dept_breakdown],
        "designation_distribution": [{"designation": d, "count": c} for d, c in designation_breakdown],
        "location_distribution": [{"location": l, "count": c} for l, c in location_breakdown],
        "lifecycle_events": recent_lifecycle_events,
        "upcoming_probation_end": upcoming_probation_end,
        "upcoming_confirmations": upcoming_confirmations,
        "upcoming_anniversaries": upcoming_anniversaries,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

def get_employee_profile(db: Session, employee_id: int, **kwargs) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.employee_id == employee_id).first()
    if not profile:
        raise NotFoundException("EmployeeProfile", employee_id)
    return profile


def create_employee_profile(db: Session, data) -> EmployeeProfile:
    profile = EmployeeProfile(**data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_employee_profile(db: Session, employee_id: int, data, organization_id: Optional[int] = None) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.employee_id == employee_id).first()
    update_data = data.model_dump(exclude_unset=True)

    if not profile:
        profile = EmployeeProfile(
            employee_id=employee_id,
            organization_id=organization_id or 0,
            **update_data,
        )
        db.add(profile)
    else:
        for field, value in update_data.items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE REPORTING
# ═══════════════════════════════════════════════════════════════════════════════

def get_employee_reporting(db: Session, employee_id: int) -> EmployeeReporting:
    reporting = db.query(EmployeeReporting).filter(EmployeeReporting.employee_id == employee_id).first()
    if not reporting:
        raise NotFoundException("EmployeeReporting", employee_id)
    return reporting


def create_employee_reporting(db: Session, data) -> EmployeeReporting:
    reporting = EmployeeReporting(**data.model_dump())
    db.add(reporting)
    db.commit()
    db.refresh(reporting)
    return reporting


def update_employee_reporting(db: Session, employee_id: int, data) -> EmployeeReporting:
    reporting = get_employee_reporting(db, employee_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reporting, field, value)
    db.commit()
    db.refresh(reporting)
    return reporting


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════════

def get_employee_lifecycle(db: Session, employee_id: Optional[int] = None, organization_id: Optional[int] = None) -> list[EmployeeLifecycle]:
    query = db.query(EmployeeLifecycle)
    if organization_id:
        query = query.filter(EmployeeLifecycle.organization_id == organization_id)
    if employee_id:
        query = query.filter(EmployeeLifecycle.employee_id == employee_id)
    return query.order_by(EmployeeLifecycle.event_date.desc()).all()


def create_employee_lifecycle_event(db: Session, data) -> EmployeeLifecycle:
    event = EmployeeLifecycle(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_employee_lifecycle_event(db: Session, event_id: int, data) -> EmployeeLifecycle:
    event = db.query(EmployeeLifecycle).filter(EmployeeLifecycle.id == event_id).first()
    if not event:
        raise NotFoundException("EmployeeLifecycle", event_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

def get_employee_history(db: Session, employee_id: int) -> list[EmployeeHistory]:
    return db.query(EmployeeHistory).filter(
        EmployeeHistory.employee_id == employee_id
    ).order_by(EmployeeHistory.created_at.desc()).all()


def create_employee_history_entry(
    db: Session,
    employee_id: int,
    field_name: str,
    old_value: str,
    new_value: str,
    changed_by: Optional[int] = None,
    change_reason: Optional[str] = None,
) -> EmployeeHistory:
    history = EmployeeHistory(
        employee_id=employee_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        change_reason=change_reason,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


# ═══════════════════════════════════════════════════════════════════════════════
# ORG CHART
# ═══════════════════════════════════════════════════════════════════════════════

def get_org_chart(db: Session, organization_id: int) -> dict:
    employees = db.query(
        Employee.id, Employee.first_name, Employee.last_name,
        Employee.job_title, Employee.department_id, Employee.status
    ).filter(
        Employee.organization_id == organization_id,
        Employee.status == EmployeeStatus.ACTIVE
    ).all()

    reporting = db.query(
        EmployeeReporting.employee_id, EmployeeReporting.manager_id
    ).filter(
        EmployeeReporting.organization_id == organization_id
    ).all()

    report_map = {r.employee_id: r.manager_id for r in reporting}

    departments = db.query(
        Department.id, Department.name
    ).filter(
        Department.id.in_([e.department_id for e in employees if e.department_id])
    ).all()

    dept_map = {d.id: d.name for d in departments}

    employee_map = {}
    for emp in employees:
        employee_map[emp.id] = {
            "id": emp.id,
            "name": f"{emp.first_name} {emp.last_name}",
            "job_title": emp.job_title,
            "department": dept_map.get(emp.department_id) if emp.department_id else None,
            "manager_id": report_map.get(emp.id),
            "status": emp.status,
            "children": [],
        }

    reporting_structure = []
    for emp in employees:
        manager_id = report_map.get(emp.id)
        if manager_id and manager_id in employee_map:
            employee_map[emp.id]["manager_name"] = employee_map[manager_id]["name"]
            employee_map[manager_id]["children"].append(employee_map[emp.id])
        else:
            reporting_structure.append(employee_map[emp.id])

    return {
        "employees": list(employee_map.values()),
        "reporting_structure": reporting_structure,
        "departments": dept_map,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE LIFECYCLE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def change_manager(db: Session, data: ChangeManagerRequest) -> Employee:
    employee = get_employee_by_id(db, data.employee_id)

    reporting = db.query(EmployeeReporting).filter(
        EmployeeReporting.employee_id == data.employee_id
    ).first()

    old_manager_id = reporting.manager_id if reporting else None

    if not reporting:
        reporting = EmployeeReporting(
            employee_id=data.employee_id,
            organization_id=employee.organization_id or 1,
            manager_id=data.new_manager_id,
            effective_from=date.today(),
        )
        db.add(reporting)
    else:
        reporting.manager_id = data.new_manager_id

    db.commit()

    create_employee_history_entry(
        db, data.employee_id, "manager_id",
        str(old_manager_id), str(data.new_manager_id),
        change_reason=data.reason,
    )

    return employee


def confirm_probation(db: Session, data: ConfirmProbationRequest, organization_id: Optional[int] = None) -> EmployeeLifecycle:
    employee = get_employee_by_id(db, data.employee_id)

    employee.status = EmployeeStatus.ACTIVE
    employee.confirmation_date = data.confirmation_date

    event = EmployeeLifecycle(
        employee_id=data.employee_id,
        organization_id=employee.organization_id,
        event_type="confirmation",
        event_date=data.confirmation_date,
        status="completed",
        reason=data.notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def promote_employee(db: Session, data: PromoteEmployeeRequest, organization_id: Optional[int] = None) -> EmployeeLifecycle:
    employee = get_employee_by_id(db, data.employee_id)

    if data.new_designation_id:
        employee.designation_id = data.new_designation_id
    if data.new_salary:
        employee.basic_salary = data.new_salary

    event = EmployeeLifecycle(
        employee_id=data.employee_id,
        organization_id=employee.organization_id,
        event_type="promotion",
        event_date=data.effective_date,
        status="completed",
        new_value={"designation_id": data.new_designation_id, "salary": str(data.new_salary)},
        reason=data.reason,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def transfer_employee(db: Session, data: TransferEmployeeRequest, organization_id: Optional[int] = None) -> EmployeeLifecycle:
    employee = get_employee_by_id(db, data.employee_id)

    if data.new_department_id:
        employee.department_id = data.new_department_id
    if data.new_manager_id:
        employee.reporting_manager_id = data.new_manager_id

    event = EmployeeLifecycle(
        employee_id=data.employee_id,
        organization_id=employee.organization_id,
        event_type="transfer",
        event_date=data.effective_date,
        status="completed",
        new_value={
            "department_id": data.new_department_id,
            "manager_id": data.new_manager_id,
            "location": data.new_location,
        },
        reason=data.reason,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def resign_employee(db: Session, data: ResignationRequest, organization_id: Optional[int] = None) -> EmployeeLifecycle:
    employee = get_employee_by_id(db, data.employee_id)

    employee.status = EmployeeStatus.RESIGNED
    employee.is_active = False

    event = EmployeeLifecycle(
        employee_id=data.employee_id,
        organization_id=employee.organization_id,
        event_type="resignation",
        event_date=data.resignation_date,
        status="completed",
        new_value={
            "status": "resigned",
            "last_working_date": str(data.last_working_date),
        },
        reason=data.reason,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def exit_employee(db: Session, data: ExitEmployeeRequest, organization_id: Optional[int] = None) -> EmployeeLifecycle:
    employee = get_employee_by_id(db, data.employee_id)

    employee.status = EmployeeStatus.TERMINATED
    employee.is_active = False

    event = EmployeeLifecycle(
        employee_id=data.employee_id,
        organization_id=employee.organization_id,
        event_type="exit",
        event_date=data.exit_date,
        status="completed",
        new_value={
            "status": data.exit_type,
            "final_settlement_date": str(data.final_settlement_date),
        },
        reason=data.reason,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return event


def get_employee_reports(db: Session, filters: Optional[dict] = None, organization_id: Optional[int] = None) -> list:
    query = db.query(Employee)
    if organization_id:
        query = query.filter(Employee.organization_id == organization_id)
    if filters:
        if "department_id" in filters:
            query = query.filter(Employee.department_id == filters["department_id"])
        if "status" in filters:
            query = query.filter(Employee.status == filters["status"])
        if "search" in filters:
            search_term = f"%{filters['search']}%"
            query = query.filter(
                (Employee.first_name.ilike(search_term)) |
                (Employee.last_name.ilike(search_term)) |
                (Employee.email.ilike(search_term)) |
                (Employee.employee_id.ilike(search_term)) |
                (Employee.employee_code.ilike(search_term))
            )

    return query.order_by(Employee.created_at.desc()).all()


def export_employee_reports(db: Session, data: EmployeeExportRequest, organization_id: Optional[int] = None) -> list:
    return get_employee_reports(db, data.filters, organization_id)


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEE COMPENSATION & BENEFITS
# ═══════════════════════════════════════════════════════════════════════════════

def create_employee_compensation(db: Session, data: EmployeeCompensationCreate, org_id: int) -> EmployeeCompensation:
    comp = EmployeeCompensation(**data.model_dump(), organization_id=org_id)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

def get_employee_compensations(db: Session, org_id: int, employee_id: Optional[int] = None) -> list[EmployeeCompensation]:
    query = db.query(EmployeeCompensation).filter(EmployeeCompensation.organization_id == org_id)
    if employee_id:
        query = query.filter(EmployeeCompensation.employee_id == employee_id)
    return query.all()

def get_employee_compensation(db: Session, comp_id: int, org_id: int) -> EmployeeCompensation:
    comp = db.query(EmployeeCompensation).filter(EmployeeCompensation.id == comp_id, EmployeeCompensation.organization_id == org_id).first()
    if not comp:
        raise NotFoundException("EmployeeCompensation", comp_id)
    return comp

def update_employee_compensation(db: Session, comp_id: int, data: EmployeeCompensationUpdate, org_id: int) -> EmployeeCompensation:
    comp = db.query(EmployeeCompensation).filter(EmployeeCompensation.id == comp_id, EmployeeCompensation.organization_id == org_id).first()
    if not comp:
        raise NotFoundException("EmployeeCompensation", comp_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(comp, key, value)
    db.commit()
    db.refresh(comp)
    return comp

def delete_employee_compensation(db: Session, comp_id: int, org_id: int) -> None:
    comp = db.query(EmployeeCompensation).filter(EmployeeCompensation.id == comp_id, EmployeeCompensation.organization_id == org_id).first()
    if not comp:
        raise NotFoundException("EmployeeCompensation", comp_id)
    from app.modules.hr.models import SalaryRevision
    db.query(SalaryRevision).filter(SalaryRevision.employee_compensation_id == comp_id).delete()
    db.delete(comp)
    db.commit()

def create_employee_benefit(db: Session, data: EmployeeBenefitCreate, org_id: int) -> EmployeeBenefit:
    emp_benefit = EmployeeBenefit(**data.model_dump(), organization_id=org_id)
    db.add(emp_benefit)
    db.commit()
    db.refresh(emp_benefit)
    return emp_benefit

def get_employee_benefits(db: Session, org_id: int) -> list[EmployeeBenefit]:
    return db.query(EmployeeBenefit).filter(EmployeeBenefit.organization_id == org_id).all()

def delete_employee_benefit(db: Session, emp_benefit_id: int, org_id: int) -> None:
    emp_benefit = db.query(EmployeeBenefit).filter(EmployeeBenefit.id == emp_benefit_id, EmployeeBenefit.organization_id == org_id).first()
    if not emp_benefit:
        raise NotFoundException("EmployeeBenefit", emp_benefit_id)
    db.delete(emp_benefit)
    db.commit()
