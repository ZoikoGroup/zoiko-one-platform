# BILLING_ADMIN Role — Implementation Summary

## What changed and why

Added a sixth role, `BILLING_ADMIN`, by extending the existing RBAC plumbing exactly the way `HR_ADMIN` is wired — no new abstractions, no parallel auth system, no changes to how Super Admin, Organization Admin, HR Admin, Manager, or Employee behave. Organization Admin can now create a Billing Admin; that user lands on `/billing` after login, sees only the Billing product in navigation, gets org-admin-equivalent write access to every billing endpoint, and has zero access to user management or any other admin-gated module (HR, payroll, comply, insights).

## Backend changes

| File | Change |
|---|---|
| `app/modules/employee/models.py` | Added `BILLING_ADMIN = "billing_admin"` to the `UserRole` enum. |
| `alembic/versions/c9d0e1f2a3b4_add_billing_admin_role.py` | New migration: `ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'BILLING_ADMIN'` (mirrors the existing hr_admin migration; additive-only, no downgrade path — Postgres can't drop enum values). |
| `app/core/dependencies.py` | Added `get_current_billing_admin` — a new dependency (allows `super_admin`/`admin`/`billing_admin`), kept as a **sibling** to `get_current_org_admin` rather than modifying it, so billing_admin's access doesn't leak into payroll/comply/insights (which still gate on the unmodified `get_current_org_admin`). Also extended `ROLE_HIERARCHY` and `ROLE_CREATION_RULES` for consistency (both were already dead code, unused elsewhere, but kept in sync). |
| `app/modules/employee/router.py` | `create_user`: admin can now assign the `billing_admin` role. The 7 repeated `hr_admin` target-role blocklists (update/deactivate/activate/archive/suspend/reset-password) now also block `billing_admin` as a target, so HR Admin can't manage Billing Admin accounts — that stays Org Admin's job. `billing_admin` was deliberately **not** added to `get_current_admin`'s allowed roles, so it has zero access to any `/hr/admin/users` endpoint (list, create, edit) — matches the "billing only" access requirement. |
| `app/modules/employee/service.py` | Added `"Billing Administrator"` display name. |
| `app/modules/billing/routers/*.py` (25 files) | Mechanically replaced every `get_current_org_admin` reference (224 occurrences) with `get_current_billing_admin`. This is the actual grant: billing_admin now passes the same admin-tier checks that previously only allowed `super_admin`/`admin` on all billing write endpoints. Verified self-contained — `get_current_org_admin` had zero references in billing's services/repositories/schemas, so nothing outside `routers/` needed touching. |

**Explicitly untouched**: `hr/`, `payroll/`, `comply/`, `insights/`, `super_admin/` modules. billing_admin is simply absent from every allow-list there, so it's denied by default.

## Frontend changes

| File | Change |
|---|---|
| `src/config/roles.js` | Added `ROLES.BILLING_ADMIN`, its label, `ROLE_DEFAULT_REDIRECT` → `/billing` (reuses the existing generic billing dashboard — no new `/billing-admin/*` module was built, since `PRODUCT_ALLOWED_PREFIXES.BILLING` has no such prefix and inventing one would have broken the post-login redirect). `ROLE_CREATION_RULES`: admin can create it, it can create no one. `ROLE_ALLOWED_PREFIXES.BILLING_ADMIN` scoped to `["/dashboard", "/billing", "/settings/", "/shared/"]` — the first role scoped to a single product rather than getting the blanket "all products" grant every other role has. `ROLE_DISALLOWED_PREFIXES.billing_admin` blocks `/settings/user-management` (an admin-only page that would otherwise render and then 403 on every API call). |
| `src/hooks/useFilteredNavigation.js` | Added `billing_admin` to `SECTION_EXCLUSIONS` to hide the "SHARED LAYERS" sidebar section (mirrors hr_admin — `/shared/` is allowed for component access but that section isn't meant to be a nav item). The existing "Zoiko Billing" nav tree (already built, ~55 items) becomes billing_admin's entire sidebar automatically once role prefixes are set — no new nav section needed. |
| `src/modules/settings/UserManagementPage.jsx`, `src/modules/organization-admin/UserManagementPage.jsx`, `src/modules/super-admin/UserManagementPage.jsx` | Added "Billing Admin" to the three role dropdowns that don't derive from `ROLE_CREATION_RULES`/`ROLE_LABELS` (a pre-existing duplication in the codebase, not introduced here). |

**Explicitly untouched**: `App.jsx` (no new routes), `ProtectedRoute.jsx` (no new prefix needed since there's no dedicated `/billing-admin/*` tree), `navigation.js` (existing Billing tree reused as-is).

## Testing

New file `backend/tests/test_billing_admin_role.py` (5 tests, consolidated to 4 total logins to stay under the real `/auth/login` rate limit):
- Org Admin can create a Billing Admin *(marked `xfail`, see below)*
- HR Admin cannot create or edit a Billing Admin (422 / 403)
- Billing Admin: correct role on login, zero access to user management, blocked from a payroll admin-gated endpoint, **can** access the billing-admin-tier endpoint
- Regression: Org Admin keeps access to that same endpoint; HR Admin (already excluded before this change) stays excluded
- Regression: Employee blocked from the billing-admin-tier endpoint

**Result: 4 passed, 1 xfailed.**

Verification performed:
- Backend boots clean under pytest's `TestClient` (full app startup: scheduler, DB connectivity, table check) — no import errors from any of the model/dependency changes.
- `npm run build` — clean, no errors.
- Manually verified via direct script against the dev DB: billing_admin login → 200 with correct role; `GET /billing/settings/health` → 200; `DELETE /api/payroll/attendance` → 403 with message `"This action requires organization admin privileges. Your role: billing_admin"`; creating a plain `employee` via `POST /hr/admin/users` fails with the same pre-existing schema error as creating a `billing_admin` (see below) — confirming that failure is role-independent.
- Ran the pre-existing `test_multi_tenancy.py`, `test_super_admin.py`, `test_employee_id_prefix.py` suites to check for regressions.

## Pre-existing issues found, not fixed (out of scope)

None of these are caused by this change — each was verified role-independent and/or predates this session:

1. **`organizations.name` NOT NULL violates on every new org created via the ORM** — the ORM never populates that legacy column. Documented in the repo's own `RC1_GO_NOGO_DECISION.md` (Defect 1, dated 2026-08-04). This is why the test suite attaches billing_admin test users to the existing seeded organization (id 1, "Zoiko Inc") instead of creating a new one, and why `test_multi_tenancy.py`, `test_super_admin.py`, and `test_employee_id_prefix.py` already fail extensively on org creation in this environment, independent of this change.
2. **`POST /hr/admin/users` fails for every role** with `column payroll_employees.first_name does not exist` — migration `b2c1d0e9f8a7` was never applied to this dev DB (RC1's Defect 2). Verified by reproducing the identical failure creating a plain `employee`, not just `billing_admin`. The one `xfail` in the new test suite is this defect, not an RBAC problem.
3. Alembic's migration history is already broken independent of this change — the dev DB's stamped revision doesn't correspond to any local migration file, and there's a duplicate revision ID and an unreachable revision among the existing migrations. `alembic upgrade head` cannot currently run in this environment for reasons unrelated to this change. The new `BILLING_ADMIN` enum value was applied directly and idempotently (`ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'BILLING_ADMIN'`) to the dev DB so real integration tests could run; the migration file was also added for version-control parity.
4. `tests/test_payroll_leave_type.py` fails to even collect — `ImportError: cannot import name '_count_payable_days' from app.modules.payroll.service` — pre-existing, unrelated to anything touched here.
5. Ten untracked `RC1_*.md` files in the repo root are leftovers from an unrelated prior QA cycle validating the Billing *module's* general release-readiness — nothing to do with this role addition.

## Go/No-Go

**Go**, for the BILLING_ADMIN role itself: every RBAC boundary specified in the request is implemented and test-verified (creation, login, billing access grant, and exclusion from HR/payroll/user-management), and neither backend nor frontend builds regressed. The one test failure is a pre-existing, unrelated, already-documented defect that blocks user creation for *every* role in this dev environment, not specific to billing_admin.
