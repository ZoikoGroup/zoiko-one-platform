/**
 * dashboard/BillingDashboardWrapper.jsx
 * --------------------------------------
 * Billing Admin landing page. REUSES the existing Billing dashboard from
 * modules/billing (the single source of truth). For the billing_admin role
 * this wrapper performs a one-time redirect from the canonical /billing entry
 * into the Organization Workspace dashboard (/billing/workspace/dashboard);
 * every other role renders the existing Billing dashboard unchanged. No
 * Billing business logic lives here.
 */

import { Navigate } from "react-router-dom";
import BillingDashboard from "../../billing/dashboard/dashboard";
import { ROLES } from "../../../config/roles";
import { useAuth } from "../../../context/AuthContext";

const ORGANIZATION_WORKSPACE_DASHBOARD = "/billing/workspace/dashboard";

export default function BillingDashboardWrapper() {
  const { role } = useAuth();

  if (role === ROLES.BILLING_ADMIN) {
    return <Navigate to={ORGANIZATION_WORKSPACE_DASHBOARD} replace />;
  }

  return <BillingDashboard />;
}
