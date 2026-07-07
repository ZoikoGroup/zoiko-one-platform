import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  fetchCurrentUser,
  getCachedUser,
  isAuthenticated,
} from "../service/authService";

import {
  ROLE_ALLOWED_PREFIXES,
  ROLE_DEFAULT_REDIRECT,
  VALID_ROLES,
  PRODUCT_ALLOWED_PREFIXES,
  PRODUCTS,
} from "../config/roles";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedUser());
  const [loading, setLoading] = useState(isAuthenticated());
  const [error, setError] = useState(null);


  useEffect(() => {
    let active = true;
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await loginRequest(credentials);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      setError(err.message || "Unable to sign in");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    setLoading(true);
    try {
      const newUser = await registerRequest(payload);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message || "Unable to create account");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const product = user?.product || PRODUCTS.ALL;

  const canAccessProduct = (pathname) => {
    const allowedPrefixes = PRODUCT_ALLOWED_PREFIXES[product];
    if (!allowedPrefixes) return true; // "all" product = unrestricted
    return allowedPrefixes.some((prefix) => {
      if (prefix === "/") return pathname === "/";
      return pathname === prefix || pathname.startsWith(prefix);
    });
  };

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const role = user?.role && VALID_ROLES.includes(user.role) ? user.role : null;

  const hasRole = (roles) => {
    if (!role) return false;
    if (!Array.isArray(roles)) {
      return role === roles;
    }
    return roles.includes(role);
  };

  const canAccess = (pathname) => {
    if (!role) return false;
    const prefixes = ROLE_ALLOWED_PREFIXES[role] ?? [];
    return prefixes.some((prefix) => {
      if (!pathname) return false;
      if (prefix === "/") return pathname === "/";
      return pathname === prefix || pathname.startsWith(prefix);
    });
  };

  const defaultRedirect = role ? ROLE_DEFAULT_REDIRECT[role] : "/dashboard";

  const value = {
    user,
    role,
    product,
    isAuthenticated: Boolean(user) || isAuthenticated(),
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    canAccess,
    canAccessProduct,
    defaultRedirect,
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
