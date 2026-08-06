/**
 * dashboard/BillingDashboardWrapper.jsx
 * --------------------------------------
 * Billing landing page for every role that reaches the canonical /billing
 * entry (including Billing Admin). REUSES the existing Billing dashboard from
 * modules/billing — the single source of truth — exactly as Organization Admin
 * sees it. No Billing business logic lives here and no duplicate dashboard
 * exists. The Billing Admin organization workspace remains under
 * /billing/workspace/* and is unchanged.
 */

import BillingDashboard from "../../billing/dashboard/dashboard";

export default function BillingDashboardWrapper() {
  return <BillingDashboard />;
}
