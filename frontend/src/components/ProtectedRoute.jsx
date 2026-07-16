import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";

import { useMemo } from "react";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, hasRole, canAccessProduct, getFirstAccessibleRoute, defaultRedirect, products, role } = useAuth();
  const location = useLocation();
  
  // DEBUG
  console.log('[ProtectedRoute] Render:', { isAuthenticated, loading, location: location.pathname });

  const normalizedAllowedRoles = useMemo(() => {
    if (!allowedRoles) return null;
    return Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  }, [allowedRoles]);


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
    console.warn('[ProtectedRoute] Redirecting to login - not authenticated:', { isAuthenticated, location: location.pathname });
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (normalizedAllowedRoles && !hasRole(normalizedAllowedRoles)) {
    console.warn('[ProtectedRoute] Redirecting - insufficient role:', { allowedRoles: normalizedAllowedRoles, defaultRedirect });
    return <Navigate to={defaultRedirect} replace />;
  }

  if (role !== ROLES.SUPER_ADMIN && products.length > 0 && !canAccessProduct(location.pathname)) {
    const safeTarget = getFirstAccessibleRoute();
    return <Navigate to={safeTarget} replace />;
  }

  return children;
}

