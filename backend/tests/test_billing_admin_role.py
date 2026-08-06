"""Tests for the BILLING_ADMIN role.

Verifies that BILLING_ADMIN is wired exactly like HR_ADMIN in terms of RBAC
plumbing, but scoped to billing: Org Admin can create it, it gets billing
write access (via get_current_billing_admin), and it has zero access to
user-management and to other admin-gated modules (payroll/HR).

Each test class logs in as few times as possible (one login per role) to
stay under the real /auth/login rate limit (10/minute) shared across the
whole file's requests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.hr.models import (
    Employee, UserRole, EmployeeStatus, EmploymentType, Gender
)
from app.core.security import hash_password
from datetime import date

# NOTE: this suite deliberately does NOT create a new Organization row.
# Creating one hits a pre-existing, already-documented defect in this dev DB
# (organizations.name is NOT NULL but the current ORM never populates it —
# see RC1_GO_NOGO_DECISION.md, Defect 1) that is unrelated to BILLING_ADMIN
# and out of scope here. Instead we attach test employees to the existing
# seeded organization (id=1, "Zoiko Inc"), which already has an active
# subscription and the billing product enabled.
EXISTING_ORG_ID = 1
EXISTING_DEPT_ID = 1


def create_employee(
    db: Session, email: str, org_id: int, dept_id: int,
    role: UserRole = UserRole.ADMIN, password: str = "pass123"
) -> Employee:
    emp = Employee(
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        first_name="Test",
        last_name="User",
        phone="0000000000",
        date_of_birth=date(1990, 1, 1),
        gender=Gender.MALE,
        employee_code=f"ZK-{org_id}-{email[:3]}",
        job_title="Tester",
        employment_type=EmploymentType.FULL_TIME,
        status=EmployeeStatus.ACTIVE,
        date_of_joining=date(2024, 1, 1),
        department_id=dept_id,
        organization_id=org_id,
    )
    db.add(emp)
    db.flush()
    db.refresh(emp)
    return emp


def login_as(client: TestClient, email: str, password: str = "pass123") -> dict:
    resp = client.post("/auth/login", json={
        "email": email,
        "password": password,
    })
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def billing_org_setup(db: Session):
    """Admin, hr_admin, employee, and billing_admin, all in the existing seeded org."""
    admin = create_employee(db, "org_admin@billtest.com", EXISTING_ORG_ID, EXISTING_DEPT_ID, UserRole.ADMIN)
    hr_admin = create_employee(db, "hr_admin@billtest.com", EXISTING_ORG_ID, EXISTING_DEPT_ID, UserRole.HR_ADMIN)
    employee = create_employee(db, "employee@billtest.com", EXISTING_ORG_ID, EXISTING_DEPT_ID, UserRole.EMPLOYEE)
    billing_admin = create_employee(db, "billing_admin@billtest.com", EXISTING_ORG_ID, EXISTING_DEPT_ID, UserRole.BILLING_ADMIN)

    db.flush()
    return {
        "admin": admin, "hr_admin": hr_admin, "employee": employee, "billing_admin": billing_admin,
    }


# ── Role assignment (Org Admin creates Billing Admin, mirrors HR Admin) ────

class TestBillingAdminCreation:

    @pytest.mark.xfail(
        reason="Pre-existing, unrelated defect: POST /hr/admin/users fails for ANY role "
               "with 'column payroll_employees.first_name does not exist' — the "
               "payroll_employees table is missing columns because migration "
               "b2c1d0e9f8a7 was never applied to this dev DB (see RC1_GO_NOGO_DECISION.md, "
               "Defect 2). Verified role-independent: creating a plain 'employee' hits the "
               "same error. Not caused by, or fixable within, this change.",
        strict=False,
    )
    def test_admin_can_create_billing_admin_user(self, client, db, billing_org_setup):
        headers = login_as(client, "org_admin@billtest.com")
        resp = client.post("/hr/admin/users", headers=headers, json={
            "email": "new_billing_admin@billtest.com",
            "first_name": "New",
            "last_name": "BillingAdmin",
            "phone": "1234567890",
            "role": "billing_admin",
        })
        assert resp.status_code == 201, resp.text

    def test_hr_admin_cannot_create_or_edit_billing_admin(self, client, db, billing_org_setup):
        """One hr_admin login covers both the create-role-validation and edit-target-blocklist checks."""
        headers = login_as(client, "hr_admin@billtest.com")

        resp = client.post("/hr/admin/users", headers=headers, json={
            "email": "sneaky_billing_admin@billtest.com",
            "first_name": "Sneaky",
            "last_name": "BillingAdmin",
            "phone": "1234567890",
            "role": "billing_admin",
        })
        assert resp.status_code == 422, resp.text

        billing_admin_id = billing_org_setup["billing_admin"].id
        resp = client.put(f"/hr/admin/users/{billing_admin_id}", headers=headers, json={
            "first_name": "Hacked",
        })
        assert resp.status_code == 403, resp.text


# ── Billing Admin's own access boundaries + billing-module grant ───────────

class TestBillingAdminAccessBoundaries:

    def test_billing_admin_role_and_boundaries(self, client, db, billing_org_setup):
        """One billing_admin login covers role-on-login, zero user-mgmt access,
        no access to other admin-gated modules (payroll), and the actual billing grant."""
        resp = client.post("/auth/login", json={
            "email": "billing_admin@billtest.com",
            "password": "pass123",
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        employee = data.get("employee") or data.get("user")
        assert employee["role"] == "billing_admin"
        headers = {"Authorization": f"Bearer {data['access_token']}"}

        resp = client.get("/hr/admin/users", headers=headers)
        assert resp.status_code == 403, resp.text

        resp = client.post("/hr/admin/users", headers=headers, json={
            "email": "should_not_exist@billtest.com",
            "first_name": "Should",
            "last_name": "NotExist",
            "phone": "1234567890",
            "role": "employee",
        })
        assert resp.status_code == 403, resp.text

        # payroll_router is mounted under /api (see app/main.py) — org-admin-gated,
        # no path params, so this is an unambiguous role-gate check.
        resp = client.delete("/api/payroll/attendance", headers=headers)
        assert resp.status_code == 403, resp.text

        # The actual grant: get_current_billing_admin now allows billing_admin
        # (previously only super_admin/admin via get_current_org_admin).
        resp = client.get("/billing/settings/health", headers=headers)
        assert resp.status_code == 200, resp.text

    def test_admin_and_hr_admin_regression_on_billing_endpoint(self, client, db, billing_org_setup):
        """Regression: org admin keeps access; hr_admin (excluded from get_current_org_admin
        before this change) stays excluded from the billing-admin-tier endpoint too."""
        headers = login_as(client, "org_admin@billtest.com")
        resp = client.get("/billing/settings/health", headers=headers)
        assert resp.status_code == 200, resp.text

        headers = login_as(client, "hr_admin@billtest.com")
        resp = client.get("/billing/settings/health", headers=headers)
        assert resp.status_code == 403, resp.text

    def test_employee_blocked_from_billing_admin_endpoint(self, client, db, billing_org_setup):
        headers = login_as(client, "employee@billtest.com")
        resp = client.get("/billing/settings/health", headers=headers)
        assert resp.status_code == 403, resp.text


# ── User Management integration (list visibility, stats, edit/deactivate) ──
# Covers the gaps closed so BILLING_ADMIN behaves exactly like HR_ADMIN in the
# User Management UI: the org-admin employee list (opt-in include_all_roles)
# and the platform-wide role-count stats used by super-admin/UserManagementPage.

class TestBillingAdminUserManagementIntegration:

    def test_org_admin_employee_list_default_excludes_admin_tier_roles(self, client, db, billing_org_setup):
        """Regression: default (no include_all_roles) still only returns EMPLOYEE role."""
        headers = login_as(client, "org_admin@billtest.com")
        resp = client.get("/hr/employee-management/employees", headers=headers, params={"per_page": 1000})
        assert resp.status_code == 200, resp.text
        roles = {item["role"] for item in resp.json()["items"]}
        assert roles <= {"employee"}, roles

    def test_org_admin_employee_list_include_all_roles_shows_billing_and_hr_admin(self, client, db, billing_org_setup):
        headers = login_as(client, "org_admin@billtest.com")
        resp = client.get(
            "/hr/employee-management/employees", headers=headers,
            params={"per_page": 1000, "include_all_roles": True},
        )
        assert resp.status_code == 200, resp.text
        roles = {item["role"] for item in resp.json()["items"]}
        assert "billing_admin" in roles, roles
        assert "hr_admin" in roles, roles

    def test_super_admin_user_stats_include_billing_admin_count(self, client, db, billing_org_setup, super_admin_token):
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        resp = client.get("/super-admin/users", headers=headers, params={"page": 1, "page_size": 1})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "total_billing_admins" in data
        assert data["total_billing_admins"] >= 1, data["total_billing_admins"]

    def test_org_admin_can_edit_deactivate_activate_reset_password_for_billing_admin(self, client, db, billing_org_setup):
        headers = login_as(client, "org_admin@billtest.com")
        billing_admin_id = billing_org_setup["billing_admin"].id

        resp = client.put(f"/hr/admin/users/{billing_admin_id}", headers=headers, json={"job_title": "Billing Lead"})
        assert resp.status_code == 200, resp.text

        resp = client.delete(f"/hr/admin/users/{billing_admin_id}", headers=headers)
        assert resp.status_code == 200, resp.text

        resp = client.post(f"/hr/admin/users/{billing_admin_id}/activate", headers=headers)
        assert resp.status_code == 200, resp.text

        resp = client.post(f"/hr/admin/users/{billing_admin_id}/reset-password", headers=headers)
        assert resp.status_code == 200, resp.text
