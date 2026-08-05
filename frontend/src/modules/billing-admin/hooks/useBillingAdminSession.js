/**
 * hooks/useBillingAdminSession.js
 * -------------------------------
 * Billing Admin session initialization — reads the shared AuthContext session
 * (JWT auth, role detection) and exposes Billing Admin / Billing-module access
 * state. Does NOT own authentication; the existing AuthContext does.
 */

import { ROLES } from "../../../config/roles";
import { useAuth } from "../../../context/AuthContext";
import { BILLING_ADMIN_ACCESS_ROLES } from "../auth/billingAdminPolicy";

export function useBillingAdminSession() {
  const { role, isAuthenticated, loading, defaultRedirect, products } = useAuth();

  return {
    role,
    products,
    isAuthenticated,
    loading,
    isBillingAdmin: role === ROLES.BILLING_ADMIN,
    canAccessBilling: Boolean(role) && BILLING_ADMIN_ACCESS_ROLES.includes(role),
    defaultRedirect,
  };
}

export default useBillingAdminSession;
