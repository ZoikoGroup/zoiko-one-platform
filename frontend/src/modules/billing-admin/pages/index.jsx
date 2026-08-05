/**
 * pages/index.jsx
 * ---------------
 * Billing Admin module entry barrel — the first-class module surface, mirroring
 * how modules/billing/index.jsx re-exports its pages.
 */

export { default as BillingAdminGuard } from "../auth/BillingAdminGuard";
export { BILLING_ADMIN_ACCESS_ROLES } from "../auth/billingAdminPolicy";
export { default as BillingAdminLayout } from "../layout/BillingAdminLayout";
export { default as BillingDashboardWrapper } from "../dashboard/BillingDashboardWrapper";
export { default as BillingAdminRoutes, billingAdminRoutePaths } from "../routes/BillingAdminRoutes";
export { useBillingAdminSession } from "../hooks/useBillingAdminSession";
export * from "../navigation/billingAdminNavigation";
