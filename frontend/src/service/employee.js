// Employee management service (production-ready)
// This module is the single integration layer for employee CRUD operations
// and employee-management endpoints.

import { api, API_BASE_URL } from "./api";

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

export const getEmployeeDashboard = () => api.get("/hr/employee-management/dashboard");

export const getEmployees = (params = {}) => api.get("/hr/employee-management/employees", { params });
export const getEmployeeById = (id) => api.get(`/hr/employee-management/employees/${id}`);

export const createEmployee = (payload) => api.post("/hr/employee-management/employees", payload);
export const updateEmployee = (id, payload) => api.put(`/hr/employee-management/employees/${id}`, payload);
export const deleteEmployee = (id) => api.delete(`/hr/employee-management/employees/${id}`);

export const getEmployeeProfile = (employeeId) => api.get(`/hr/employee-management/employees/${employeeId}/profile`);
export const updateEmployeeProfile = (employeeId, payload) => api.put(`/hr/employee-management/employees/${employeeId}/profile`, payload);

// ── Organization Structure ───────────────────────────────────────────────

export const getOrgChart = (organizationId) => api.get(`/hr/employee-management/org-chart?organization_id=${organizationId}`);
export const changeManager = (payload) => api.put("/hr/employee-management/change-manager", payload);

// ── Employee Lifecycle ───────────────────────────────────────────────────

export const getEmployeeLifecycle = (employeeId) => {
  const params = employeeId ? { employee_id: employeeId } : {};
  return api.get("/hr/employee-management/lifecycle", { params });
};

export const confirmProbation = (payload) => api.post("/hr/employee-management/confirm", payload);
export const promoteEmployee = (payload) => api.post("/hr/employee-management/promote", payload);
export const transferEmployee = (payload) => api.post("/hr/employee-management/transfer", payload);
export const resignEmployee = (payload) => api.post("/hr/employee-management/resign", payload);
export const exitEmployee = (payload) => api.post("/hr/employee-management/exit", payload);

// ── Reports ──────────────────────────────────────────────────────────────

export const getEmployeeReports = (filters) => api.get(`/hr/employee-management/reports`, { params: filters });
export const exportEmployeeReports = (payload) => api.post("/hr/employee-management/export", payload);

// ── Supporting Master Data ───────────────────────────────────────────────

export const getDepartments = () => api.get("/hr/departments").then((data) => data);
export const getDesignations = () => api.get("/hr/designations");

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — TRAVEL
// ════════════════════════════════════════════════════════════════════════════

export const getTravel = (employeeId) => api.get(`/hr/travel${employeeId ? `?employee_id=${employeeId}` : ''}`);
export const getTravelById = (id) => api.get(`/hr/travel/${id}`);
export const createTravel = (payload) => api.post("/hr/travel", payload);
export const updateTravel = (id, payload) => api.put(`/hr/travel/${id}`, payload);
export const deleteTravel = (id) => api.delete(`/hr/travel/${id}`);

export const createTravelExpense = (payload) => api.post("/hr/travel/expenses", payload);

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════

export const getDocuments = (params = {}) => {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return api.get(`/hr/documents${query ? `?${query}` : ""}`).then(data => ({ data }));
};

export const getDocumentById = (documentId) =>
  api.get(`/hr/documents/${documentId}`).then(data => ({ data }));

export async function uploadDocument(formData) {
  const { getAccessToken, API_BASE_URL: base } = await import("./api");
  const token = getAccessToken();
  const res = await fetch(`${base}/hr/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const err = new Error(`Upload failed: ${res.status}`);
    err.response = { data: detail };
    throw err;
  }
  const data = await res.json();
  return { data };
}

export const deleteDocument = (documentId) =>
  api.delete(`/hr/documents/${documentId}`).then(data => ({ data }));

export const updateDocumentStatus = (documentId, newStatus, rejectionReason = undefined) =>
  api.patch(`/hr/documents/${documentId}/status`, {
    status: newStatus,
    ...(rejectionReason !== undefined && { rejection_reason: rejectionReason }),
  }).then(data => ({ data }));

export const updateDocument = (documentId, updateData) =>
  api.put(`/hr/documents/${documentId}`, updateData).then(data => ({ data }));

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — LEAVE
// ════════════════════════════════════════════════════════════════════════════

export const getLeaveRequests = (employeeId, params = {}) => {
  const query = new URLSearchParams();
  if (employeeId) query.set("employee_id", employeeId);
  if (params.status) query.set("status", params.status);
  if (params.leave_type) query.set("leave_type", params.leave_type);
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  const qs = query.toString();
  return api.get(`/hr/leaves${qs ? `?${qs}` : ""}`);
};

export const getLeaveRequest = (id) => api.get(`/hr/leaves/${id}`);
export const createLeaveRequest = (payload) => api.post("/hr/leaves", payload);
export const updateLeaveRequest = (id, payload) => api.put(`/hr/leaves/${id}`, payload);
export const deleteLeaveRequest = (id) => api.delete(`/hr/leaves/${id}`);

export const getLeaveBalances = (employeeId) =>
  api.get(`/hr/leaves/balance${employeeId ? `?employee_id=${employeeId}` : ""}`);

export const getLeaveTypeConfigs = () => api.get("/hr/leaves/type-configs");
export const getLeaveDashboard = () => api.get("/hr/leaves/dashboard");
export const getLeaveCalendar = (params = {}) => {
  const query = new URLSearchParams();
  if (params.year) query.set("year", params.year);
  if (params.month) query.set("month", params.month);
  const qs = query.toString();
  return api.get(`/hr/leaves/calendar${qs ? `?${qs}` : ""}`);
};
export const getLeaveStatistics = () => api.get("/hr/leaves/statistics");

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — ESS (Employee Self Service)
// ════════════════════════════════════════════════════════════════════════════

export const getEss = (employeeId) => api.get(`/hr/ess${employeeId ? `?employee_id=${employeeId}` : ''}`);
export const createEss = (payload) => api.post("/hr/ess", payload);
export const updateEss = (id, payload) => api.put(`/hr/ess/${id}`, payload);
export const deleteEss = (id) => api.delete(`/hr/ess/${id}`);

// ── My Profile ──────────────────────────────────────────────────────────

export const getMyProfile = () => api.get("/hr/employees/me");
export const updateMyProfile = (payload) => api.put("/hr/employees/me", payload);

export const getHolidays = (params = {}) => api.get("/hr/attendance/holidays", { params });
export const getCourses = (params = {}) => api.get("/hr/learning/courses", { params });
export const getTrainingPrograms = (params = {}) => api.get("/hr/learning/programs", { params });
export const getAssessments = (courseId) => api.get(`/hr/learning/assessments${courseId ? `?course_id=${courseId}` : ''}`);
export const getQuizAttempts = (assessmentId, employeeId) => {
  let url = `/hr/learning/assessments/${assessmentId}/attempts`;
  const params = [];
  if (employeeId) params.push(`employee_id=${employeeId}`);
  if (params.length) url += `?${params.join("&")}`;
  return api.get(url);
};

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — ATTENDANCE
// ════════════════════════════════════════════════════════════════════════════

export const getAttendanceRecords = (params = {}) => api.get("/hr/attendance/records", { params });

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE — ASSETS
// ════════════════════════════════════════════════════════════════════════════

export const getMyAssets = (employeeId) => api.get(`/hr/assets${employeeId ? `?employee_id=${employeeId}` : ''}`);
export const createAssetRequest = (payload) => api.post("/hr/assets/requests", payload);
export const getAssetRequests = (params = {}) => api.get("/hr/assets/requests", { params });

// ════════════════════════════════════════════════════════════════════════════
// HR EMPLOYEES LIST (for manager/employee lookups)
// ════════════════════════════════════════════════════════════════════════════

export const getHrEmployees = (params = {}) => api.get("/hr/employees", { params });
