/**
 * auth/BillingAdminGuard.jsx
 * --------------------------
 * Route protection / permission filtering for the Billing Admin experience.
 *
 * Login flow:  Auth (JWT) → Role Detection → BillingAdminGuard →
 * BillingAdminLayout → Billing Dashboard.
 *
 * The guard is deliberately inclusive of every role the existing frontend
 * access matrix already lets into /billing (see billingAdminPolicy.js), so no
 * existing role's behavior changes. Billing business logic / backend
 * authorization is untouched — get_current_billing_admin remains the real
 * enforcement on the server.
 */

import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useBillingAdminSession } from "../hooks/useBillingAdminSession";

export default function BillingAdminGuard({ children }) {
  const { isAuthenticated, loading, canAccessBilling, defaultRedirect } = useBillingAdminSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0F1C] text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessBilling) {
    return <Navigate to={defaultRedirect} replace />;
  }

  return children;
}
