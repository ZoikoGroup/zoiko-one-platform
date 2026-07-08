
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "zoiko_access_token";
const REFRESH_KEY = "zoiko_refresh_token";
const USER_KEY = "zoiko_user";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession({ accessToken, refreshToken, user } = {}) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Low level request helper. Talks to the FastAPI backend at VITE_API_BASE_URL.
 * Automatically attaches the bearer token (if present) and JSON headers,
 * and attempts a single silent refresh on a 401 response.
 */
export async function apiRequest(path, { method = "GET", body, headers = {}, auth = true, retry = true, params } = {}) {
  let url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    if (query) url += `${url.includes("?") ? "&" : "?"}${query}`;
  }

  const finalHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest(path, { method, body, headers, auth, retry: false });
    }
    clearSession();
  }

  if (!res.ok) {
    console.error(`API Error: ${method} ${url} failed with status ${res.status}`);
    let detail;
    try {
      const data = await res.json();
      detail = data?.detail || data?.message;
      if (Array.isArray(detail)) {
        // Handle FastAPI 422 validation errors nicely
        detail = detail.map(err => {
          const field = err.loc ? err.loc[err.loc.length - 1] : "Field";
          return `${field}: ${err.msg}`;
        }).join(", ");
      } else if (typeof detail === "object" && detail !== null) {
        detail = JSON.stringify(detail);
      }
      console.error("API Error Detail:", detail);
    } catch {
      detail = res.statusText;
      console.error("API Error Text:", detail);
    }
    const error = new Error(detail || `Request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

async function tryRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await apiRequest("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      auth: false,
      retry: false,
    });
    if (data?.access_token) {
      setSession({ accessToken: data.access_token, refreshToken: data.refresh_token });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: "DELETE" }),
};

export { API_BASE_URL };
