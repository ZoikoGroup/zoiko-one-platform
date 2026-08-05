/**
 * navigation/billingAdminNavigation.js
 * ------------------------------------
 * Role-specific navigation and access configuration for the Billing Admin
 * module — the single owner of "what a Billing Admin can see and reach".
 *
 * This module is an orchestration shell around the existing Billing product.
 * It must NEVER duplicate Billing business pages; it only owns Billing Admin
 * role logic (sidebar filtering, route-prefix access, default redirect).
 *
 * Every constant below intentionally mirrors the values the Billing Admin role
 * has always had (config/roles.js + hooks/useFilteredNavigation.js), so this
 * module can take ownership of Billing Admin navigation WITHOUT changing any
 * rendered behavior for any existing role.
 *
 * Deliberately dependency-free (no imports from config/roles.js or
 * navigation.js) to avoid a module-init cycle: config/roles.js imports these
 * constants and navigation.js imports config/roles.js.
 */

// Post-login landing page for the Billing Admin role.
export const BILLING_ADMIN_DEFAULT_REDIRECT = "/billing";

// Route prefixes the Billing Admin role is allowed to reach. Scoped to the
// Billing product only (plus shared /settings/ and /shared/ pages) — NOT the
// blanket "all products" grant other roles receive.
export const BILLING_ADMIN_ALLOWED_PREFIXES = [
  "/dashboard",
  "/billing",
  "/settings/",
  "/shared/",
];

// Prefixes denied even though they match an allowed prefix.
// /settings/user-management is an admin-only page that would otherwise render
// and then 403 on every API call.
export const BILLING_ADMIN_DISALLOWED_PREFIXES = ["/settings/user-management"];

// Sidebar sections hidden from Billing Admin. Mirrors hr_admin: /shared/ is
// allowed for component access but its section is not meant to be a nav item.
export const BILLING_ADMIN_SECTION_EXCLUSIONS = ["SHARED LAYERS"];

const stripQuery = (path) => (path || "").split(/[?#]/)[0];

/**
 * True when a path is inside the Billing product tree (or is the Billing
 * product landing page itself).
 */
export function isBillingProductPath(pathname) {
  const clean = stripQuery(pathname);
  return clean === BILLING_ADMIN_DEFAULT_REDIRECT || clean.startsWith(BILLING_ADMIN_DEFAULT_REDIRECT + "/");
}

/**
 * True when a path is reachable by the Billing Admin role under its allowed
 * prefix matrix (mirrors the generic isAllowedPathForRole in
 * hooks/useFilteredNavigation.js for the billing_admin role specifically).
 */
export function isBillingAdminPath(pathname, allowedPrefixes = BILLING_ADMIN_ALLOWED_PREFIXES) {
  const clean = stripQuery(pathname);
  return allowedPrefixes.some((prefix) => {
    if (prefix === "/") return clean === "/";
    return clean === prefix || clean.startsWith(prefix.endsWith("/") ? prefix : prefix + "/");
  });
}
