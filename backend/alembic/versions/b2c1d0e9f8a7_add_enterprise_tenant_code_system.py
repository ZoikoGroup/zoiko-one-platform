"""add_enterprise_tenant_code_system

Add enterprise multi-tenant SaaS code system:
  - Organization: uuid, organization_code, organization_name, display_name, language, website, logo_url
  - OrganizationProduct: tenant_code
  - Department: department_code
  - Designation: designation_code
  - Employee: legacy_code
  - PayrollEmployee: legacy_code
  - PayrollRun: run_code
  - PayslipItem: payslip_number
  - PayrollAttendanceRecord: batch_code
  - PayrollLeaveRequest: request_code

Backfills existing rows with generated codes.

Revision ID: b2c1d0e9f8a7
Revises: f9e8d7c6b5a4
Create Date: 2026-07-20 12:30:00.000000

"""
from typing import Sequence, Union
import uuid as uuid_lib
import re

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, func

revision: str = 'b2c1d0e9f8a7'
down_revision: Union[str, None] = 'f9e8d7c6b5a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _generate_org_code(name: str) -> str:
    """Generate a stable abbreviation from an organization name."""
    words = name.strip().split()
    significant = [w for w in words if len(w) >= 3]
    if len(significant) >= 3:
        code = "".join(w[0].upper() for w in significant[:3])
    elif len(significant) >= 2:
        code = "".join(w[0].upper() for w in significant)
    else:
        code = name.strip()[:3].upper()
    return code


def _sanitize_code(raw: str) -> str:
    """Strip non-alphanumeric chars and uppercase."""
    return re.sub(r'[^A-Za-z0-9]', '', raw).upper()


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # ════════════════════════════════════════════════════════════════════════
    # 1. ORGANIZATIONS — add new columns
    # ════════════════════════════════════════════════════════════════════════
    org_cols = {c["name"] for c in inspector.get_columns("organizations")}
    new_org_columns = [
        ("uuid", sa.String(36)),
        ("organization_code", sa.String(10)),
        ("organization_name", sa.String(200)),
        ("display_name", sa.String(200)),
        ("language", sa.String(10)),
        ("website", sa.String(255)),
        ("logo_url", sa.String(500)),
    ]
    for col_name, col_type in new_org_columns:
        if col_name not in org_cols:
            default_val = "en" if col_name == "language" else None
            op.add_column("organizations", sa.Column(col_name, col_type, nullable=True, server_default=default_val))
            print(f"[migrate] Added column '{col_name}' to organizations")

    # Backfill existing organizations
    orgs = conn.execute(text("SELECT id, name, code FROM organizations ORDER BY id")).fetchall()
    used_org_codes = set()
    for org_id, org_name, org_code in orgs:
        uuid_val = str(uuid_lib.uuid4())
        # Derive organization_code from name
        org_code_new = _generate_org_code(org_name) if org_name else "UNK"
        # Handle duplicate organization_code by appending a numeric suffix
        if org_code_new in used_org_codes:
            suffix = 1
            while f"{org_code_new}_{suffix}" in used_org_codes:
                suffix += 1
            org_code_new = f"{org_code_new}_{suffix}"
        used_org_codes.add(org_code_new)
        conn.execute(
            text("""
                UPDATE organizations
                SET uuid = :uuid,
                    organization_code = :org_code,
                    organization_name = COALESCE(organization_name, name),
                    language = COALESCE(language, 'en')
                WHERE id = :org_id
            """),
            {"uuid": uuid_val, "org_code": org_code_new, "org_id": org_id},
        )
    print(f"[migrate] Backfilled {len(orgs)} organizations with uuid, organization_code, organization_name")

    # Add unique constraint on organization_code AFTER backfill (so duplicates are resolved)
    org_unique_constraints = {c["name"] for c in inspector.get_unique_constraints("organizations")}
    if "uq_organizations_organization_code" not in org_unique_constraints:
        try:
            op.create_unique_constraint("uq_organizations_organization_code", "organizations", ["organization_code"])
            print("[migrate] Created unique constraint on organizations.organization_code")
        except Exception as e:
            print(f"[migrate] Could not create unique constraint: {e}")

    # ════════════════════════════════════════════════════════════════════════
    # 2. SUPER_ADMIN_ORGANIZATION_PRODUCTS — add tenant_code
    # ════════════════════════════════════════════════════════════════════════
    op_cols = {c["name"] for c in inspector.get_columns("super_admin_organization_products")}
    if "tenant_code" not in op_cols:
        op.add_column("super_admin_organization_products", sa.Column("tenant_code", sa.String(20), nullable=True, unique=True))
        print("[migrate] Added column 'tenant_code' to super_admin_organization_products")

    # Backfill tenant codes
    ops = conn.execute(text("""
        SELECT op.id, o.organization_code, p.code
        FROM super_admin_organization_products op
        JOIN organizations o ON o.id = op.organization_id
        JOIN super_admin_products p ON p.id = op.product_id
        WHERE op.tenant_code IS NULL
    """)).fetchall()
    for op_id, org_code, prod_code in ops:
        tenant_code = f"{org_code}{prod_code.upper()}"
        conn.execute(
            text("UPDATE super_admin_organization_products SET tenant_code = :tc WHERE id = :id"),
            {"tc": tenant_code, "id": op_id},
        )
    print(f"[migrate] Backfilled {len(ops)} organization products with tenant_code")

    # ════════════════════════════════════════════════════════════════════════
    # 3. DEPARTMENTS — add department_code
    # ════════════════════════════════════════════════════════════════════════
    dept_cols = {c["name"] for c in inspector.get_columns("departments")}
    if "department_code" not in dept_cols:
        op.add_column("departments", sa.Column("department_code", sa.String(20), nullable=True, unique=True))
        print("[migrate] Added column 'department_code' to departments")

    # Backfill department codes: {OrgCode}DEP{seq}
    depts = conn.execute(text("""
        SELECT d.id, d.name, o.organization_code, d.organization_id
        FROM departments d
        JOIN organizations o ON o.id = d.organization_id
        WHERE d.department_code IS NULL
        ORDER BY d.organization_id, d.id
    """)).fetchall()

    dept_counters = {}
    for dept_id, dept_name, org_code, org_id in depts:
        dept_counters.setdefault(org_code, 0)
        dept_counters[org_code] += 1
        dept_code = f"{org_code}DEP{dept_counters[org_code]:03d}"
        conn.execute(
            text("UPDATE departments SET department_code = :dc WHERE id = :id"),
            {"dc": dept_code, "id": dept_id},
        )
    print(f"[migrate] Backfilled {len(depts)} departments with department_code")

    # ════════════════════════════════════════════════════════════════════════
    # 4. DESIGNATIONS — add designation_code
    # ════════════════════════════════════════════════════════════════════════
    des_cols = {c["name"] for c in inspector.get_columns("designations")}
    if "designation_code" not in des_cols:
        op.add_column("designations", sa.Column("designation_code", sa.String(20), nullable=True, unique=True))
        print("[migrate] Added column 'designation_code' to designations")

    # Backfill designation codes
    des_list = conn.execute(text("""
        SELECT d.id, d.title, o.organization_code, d.organization_id
        FROM designations d
        JOIN organizations o ON o.id = d.organization_id
        WHERE d.designation_code IS NULL
        ORDER BY d.organization_id, d.id
    """)).fetchall()

    des_counters = {}
    for des_id, title, org_code, org_id in des_list:
        des_counters.setdefault(org_code, 0)
        des_counters[org_code] += 1
        des_code = f"{org_code}DES{des_counters[org_code]:03d}"
        conn.execute(
            text("UPDATE designations SET designation_code = :dc WHERE id = :id"),
            {"dc": des_code, "id": des_id},
        )
    print(f"[migrate] Backfilled {len(des_list)} designations with designation_code")

    # ════════════════════════════════════════════════════════════════════════
    # 5. EMPLOYEES — add legacy_code
    # ════════════════════════════════════════════════════════════════════════
    emp_cols = {c["name"] for c in inspector.get_columns("employees")}
    if "legacy_code" not in emp_cols:
        op.add_column("employees", sa.Column("legacy_code", sa.String(20), nullable=True))
        print("[migrate] Added column 'legacy_code' to employees")

    # Backfill: store the current employee_code as legacy_code
    conn.execute(text("""
        UPDATE employees SET legacy_code = employee_code WHERE legacy_code IS NULL
    """))
    print("[migrate] Backfilled employees.legacy_code with current employee_code")

    # ════════════════════════════════════════════════════════════════════════
    # 6. PAYROLL_EMPLOYEES — add legacy_code
    # ════════════════════════════════════════════════════════════════════════
    pe_cols = {c["name"] for c in inspector.get_columns("payroll_employees")}
    if "legacy_code" not in pe_cols:
        op.add_column("payroll_employees", sa.Column("legacy_code", sa.String(20), nullable=True))
        print("[migrate] Added column 'legacy_code' to payroll_employees")

    conn.execute(text("""
        UPDATE payroll_employees SET legacy_code = employee_code WHERE legacy_code IS NULL
    """))
    print("[migrate] Backfilled payroll_employees.legacy_code with current employee_code")

    # ════════════════════════════════════════════════════════════════════════
    # 7. PAYROLL_RUNS — add run_code
    # ════════════════════════════════════════════════════════════════════════
    pr_cols = {c["name"] for c in inspector.get_columns("payroll_runs")}
    if "run_code" not in pr_cols:
        op.add_column("payroll_runs", sa.Column("run_code", sa.String(30), nullable=True, unique=True))
        print("[migrate] Added column 'run_code' to payroll_runs")

    # Backfill payroll run codes
    runs = conn.execute(text("""
        SELECT pr.id, pr.period_start, o.organization_code, pr.organization_id
        FROM payroll_runs pr
        JOIN organizations o ON o.id = pr.organization_id
        WHERE pr.run_code IS NULL
        ORDER BY pr.organization_id, pr.id
    """)).fetchall()

    run_counters = {}
    for run_id, period_start, org_code, org_id in runs:
        run_counters.setdefault(org_code, 0)
        run_counters[org_code] += 1
        date_part = period_start.strftime("%Y%m") if period_start else "000000"
        run_code = f"{org_code}PY{date_part}{run_counters[org_code]:03d}"
        conn.execute(
            text("UPDATE payroll_runs SET run_code = :rc WHERE id = :id"),
            {"rc": run_code, "id": run_id},
        )
    print(f"[migrate] Backfilled {len(runs)} payroll runs with run_code")

    # ════════════════════════════════════════════════════════════════════════
    # 8. PAYSLIP_ITEMS — add payslip_number
    # ════════════════════════════════════════════════════════════════════════
    psi_cols = {c["name"] for c in inspector.get_columns("payslip_items")}
    if "payslip_number" not in psi_cols:
        op.add_column("payslip_items", sa.Column("payslip_number", sa.String(30), nullable=True, unique=True))
        print("[migrate] Added column 'payslip_number' to payslip_items")

    # Backfill payslip numbers
    slips = conn.execute(text("""
        SELECT psi.id, pr.period_start, o.organization_code, psi.organization_id
        FROM payslip_items psi
        JOIN payroll_runs pr ON pr.id = psi.payroll_run_id
        JOIN organizations o ON o.id = psi.organization_id
        WHERE psi.payslip_number IS NULL
        ORDER BY psi.organization_id, psi.id
    """)).fetchall()

    slip_counters = {}
    for slip_id, period_start, org_code, org_id in slips:
        slip_counters.setdefault(org_code, 0)
        slip_counters[org_code] += 1
        date_part = period_start.strftime("%Y%m") if period_start else "000000"
        slip_number = f"{org_code}PSL{date_part}{slip_counters[org_code]:05d}"
        conn.execute(
            text("UPDATE payslip_items SET payslip_number = :pn WHERE id = :id"),
            {"pn": slip_number, "id": slip_id},
        )
    print(f"[migrate] Backfilled {len(slips)} payslip items with payslip_number")

    # ════════════════════════════════════════════════════════════════════════
    # 9. PAYROLL_ATTENDANCE_RECORDS — add batch_code
    # ════════════════════════════════════════════════════════════════════════
    par_cols = {c["name"] for c in inspector.get_columns("payroll_attendance_records")}
    if "batch_code" not in par_cols:
        op.add_column("payroll_attendance_records", sa.Column("batch_code", sa.String(30), nullable=True))
        print("[migrate] Added column 'batch_code' to payroll_attendance_records")

    # Backfill batch codes (date-based)
    atts = conn.execute(text("""
        SELECT par.id, par.date, o.organization_code, par.organization_id
        FROM payroll_attendance_records par
        JOIN organizations o ON o.id = par.organization_id
        WHERE par.batch_code IS NULL
        ORDER BY par.organization_id, par.id
    """)).fetchall()

    att_counters = {}
    for att_id, att_date, org_code, org_id in atts:
        date_part = att_date.strftime("%Y%m%d") if att_date else "00000000"
        batch_key = f"{org_code}{date_part}"
        att_counters.setdefault(batch_key, 0)
        att_counters[batch_key] += 1
        # batch_code uses date, not seq — multiple records share the same batch for a given date
        batch_code = f"{org_code}TM{date_part}"
        conn.execute(
            text("UPDATE payroll_attendance_records SET batch_code = :bc WHERE id = :id"),
            {"bc": batch_code, "id": att_id},
        )
    print(f"[migrate] Backfilled {len(atts)} attendance records with batch_code")

    # ════════════════════════════════════════════════════════════════════════
    # 10. PAYROLL_LEAVE_REQUESTS — add request_code
    # ════════════════════════════════════════════════════════════════════════
    plr_cols = {c["name"] for c in inspector.get_columns("payroll_leave_requests")}
    if "request_code" not in plr_cols:
        op.add_column("payroll_leave_requests", sa.Column("request_code", sa.String(30), nullable=True, unique=True))
        print("[migrate] Added column 'request_code' to payroll_leave_requests")

    # Backfill leave request codes
    lvs = conn.execute(text("""
        SELECT plr.id, o.organization_code, plr.organization_id
        FROM payroll_leave_requests plr
        JOIN organizations o ON o.id = plr.organization_id
        WHERE plr.request_code IS NULL
        ORDER BY plr.organization_id, plr.id
    """)).fetchall()

    lv_counters = {}
    for lv_id, org_code, org_id in lvs:
        lv_counters.setdefault(org_code, 0)
        lv_counters[org_code] += 1
        lv_code = f"{org_code}LV{lv_counters[org_code]:06d}"
        conn.execute(
            text("UPDATE payroll_leave_requests SET request_code = :lc WHERE id = :id"),
            {"lc": lv_code, "id": lv_id},
        )
    print(f"[migrate] Backfilled {len(lvs)} leave requests with request_code")


def downgrade() -> None:
    # Drop columns in reverse order (safe — all additive)
    tables_and_cols = [
        ("payroll_leave_requests", "request_code"),
        ("payroll_attendance_records", "batch_code"),
        ("payslip_items", "payslip_number"),
        ("payroll_runs", "run_code"),
        ("payroll_employees", "legacy_code"),
        ("employees", "legacy_code"),
        ("designations", "designation_code"),
        ("departments", "department_code"),
        ("super_admin_organization_products", "tenant_code"),
        ("organizations", "uuid"),
        ("organizations", "organization_code"),
        ("organizations", "organization_name"),
        ("organizations", "display_name"),
        ("organizations", "language"),
        ("organizations", "website"),
        ("organizations", "logo_url"),
    ]
    for table, col in tables_and_cols:
        try:
            op.drop_column(table, col)
            print(f"[downgrade] Dropped column '{col}' from '{table}'")
        except Exception as e:
            print(f"[downgrade] Could not drop '{col}' from '{table}': {e}")

    # Drop constraints
    try:
        op.drop_constraint("uq_organizations_organization_code", "organizations", type_="unique")
    except Exception:
        pass
