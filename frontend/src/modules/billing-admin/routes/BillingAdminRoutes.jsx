/**
 * routes/BillingAdminRoutes.jsx
 * -----------------------------
 * Billing Admin route registration. This module loads the EXISTING Billing
 * routes (navigation.js flatRoutes, the single existing route registry) plus
 * the non-nav detail routes registered in App.jsx's routeOverrides — it never
 * re-implements a billing page. App.jsx uses `billingAdminRoutePaths` to route
 * the Billing Admin experience through BillingAdminGuard → BillingAdminLayout.
 *
 * No duplicated routing: every path below maps to a page that already exists
 * in modules/billing/ and is already registered exactly once in the app.
 */

import { flatRoutes } from "../../../navigation";
import BillingAdminGuard from "../auth/BillingAdminGuard";
import BillingAdminLayout from "../layout/BillingAdminLayout";
import {
  BILLING_ADMIN_DEFAULT_REDIRECT,
  isBillingProductPath,
} from "../navigation/billingAdminNavigation";

// Parameterized billing routes that exist in the app route table but have no
// sidebar navigation entry. Kept here (module-owned manifest) so the Billing
// Admin route surface stays complete without duplicating page code.
const BILLING_ADMIN_EXTRA_ROUTE_PATHS = [
  // ── Organization Workspace (Billing Admin module-owned pages) ──
  "/billing/workspace/dashboard",
  "/billing/workspace/organization",
  "/billing/workspace/subscription",
  "/billing/workspace/activity",
  "/billing/workspace/notifications",
  "/billing/workspace/help",
  // ── Billing product detail routes (also present in navigation.js flatRoutes) ──
  "/billing/customers/:id",
  "/billing/products/:id",
  "/billing/quotations/create",
  "/billing/quotations/:id",
  "/billing/contracts/create",
  "/billing/contracts/:id/edit",
  "/billing/contracts/:id",
  "/billing/subscriptions/:id",
  "/billing/invoices/:id",
  "/billing/collections/:id",
  "/billing/credit-notes/:id",
  "/billing/dunning/:id",
  "/billing/payments/:id",
  "/billing/refunds/:id",
  "/billing/write-offs/:id",
];

// The Billing Admin route surface = the existing Billing routes, derived (not
// re-declared) from navigation.js plus the module-owned detail-route manifest.
export const billingAdminRoutePaths = new Set([
  ...flatRoutes
    .map((r) => (r.href || "").split(/[?#]/)[0])
    .filter(isBillingProductPath),
  ...BILLING_ADMIN_EXTRA_ROUTE_PATHS,
]);

/**
 * Wraps a billing route element in the Billing Admin shell:
 * BillingAdminGuard → BillingAdminLayout (existing shared SuperAdminShell).
 */
export function BillingAdminRoutes({ children }) {
  return (
    <BillingAdminGuard>
      <BillingAdminLayout>{children}</BillingAdminLayout>
    </BillingAdminGuard>
  );
}

export { BILLING_ADMIN_DEFAULT_REDIRECT };

export default BillingAdminRoutes;
