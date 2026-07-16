import { api, setSession, clearSession, getStoredUser, getAccessToken } from "./api";

/**
 * Expects a FastAPI backend exposing:
 * POST /auth/login        { email, password }            -> { access_token, refresh_token, user }
 * POST /auth/register      { name, email, password, ... } -> { access_token, refresh_token, user }
 * GET  /auth/me             (bearer token)                -> user
 * POST /auth/logout         (bearer token)                -> 204
 * POST /auth/refresh        { refresh_token }             -> { access_token, refresh_token }
 *
 * Adjust the paths/payload shapes here if your FastAPI routes differ —
 * this file is the single integration point for authentication.
 */

export async function login({ email, password }) {
  try {
    const data = await api.post("/auth/login", { email, password }, { auth: false });
    const user = data.employee || data.user;
    console.log("[AUTH] Login response: user products =", user?.products, "count =", user?.products?.length);
    setSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user,
    });
    return user;
  } catch (err) {
    console.error("Login request failed:", err);
    throw err;
  }
}

export async function register({ name, email, password, organization, products }) {
  try {
    console.log("[AUTH] Register: sending products =", products, "count =", products?.length);
    const data = await api.post(
      "/auth/register",
      { name, email, password, organization, products },
      { auth: false }
    );
    console.log("[AUTH] Register: response =", data);
    return data;
  } catch (err) {
    console.error("Register request failed:", err);
    throw err;
  }
}

export async function fetchCurrentUser() {
  try {
    const user = await api.get("/auth/me");
    console.log("[AUTH] fetchCurrentUser: user products =", user?.products, "count =", user?.products?.length);
    return user;
  } catch (err) {
    console.warn("fetchCurrentUser failed:", err);
    const cached = getCachedUser();
    if (cached) return cached;
    clearSession();
    throw err;
  }
}

export async function logout() {
  try {
    if (getAccessToken()) {
      await api.post("/auth/logout", undefined);
    }
  } catch {
    // ignore network/auth errors on logout
  } finally {
    clearSession();
  }
}

export function getCachedUser() {
  return getStoredUser();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export async function getProducts() {
  try {
    return await api.get("/auth/products", { auth: false });
  } catch (err) {
    console.error("Failed to fetch products:", err);
    throw err;
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  try {
    const data = await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    // If backend returns new tokens (session rotation), update them
    if (data?.access_token) {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    }
    return data;
  } catch (err) {
    console.error("Change password failed:", err);
    throw err;
  }
}