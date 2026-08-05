/**
 * auth/billingAdminPolicy.js
 * --------------------------
 * Billing Admin permission policy — which roles may open the Billing module
 * in the UI. Derived from the authoritative frontend access matrix
 * (config/roles.js ROLE_ALLOWED_PREFIXES) so the guard can never drift from
 * what the sidebar / ProtectedRoute already allow, and so no existing role
 * loses access (regression safety).
 *
 * The backend remains the true enforcement point: billing routers gate on
 * get_current_billing_admin (super_admin / admin / billing_admin).
 */

import { ROLE_ALLOWED_PREFIXES } from "../../../config/roles";

export const BILLING_MODULE_PREFIX = "/billing";

// Roles allowed to open Billing pages, mirroring the current frontend matrix
// exactly (super_admin, admin, hr_admin, manager, billing_admin).
export const BILLING_ADMIN_ACCESS_ROLES = Object.keys(ROLE_ALLOWED_PREFIXES).filter(
  (role) =>
    (ROLE_ALLOWED_PREFIXES[role] || []).some(
      (prefix) =>
        prefix === BILLING_MODULE_PREFIX || prefix.startsWith(BILLING_MODULE_PREFIX + "/")
    )
);
