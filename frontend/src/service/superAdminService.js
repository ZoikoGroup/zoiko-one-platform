import { api } from "./api";

export const superAdminService = {
  // Dashboard
  getDashboardStats: () => api.get("/super-admin/dashboard"),

  // Organizations
  getOrganizations: (params) => api.get("/super-admin/organizations", { params }),
  getOrganization: (id) => api.get(`/super-admin/organizations/${id}`),
  updateOrganization: (id, data) => api.put(`/super-admin/organizations/${id}`, data),
  suspendOrganization: (id) => api.put(`/super-admin/organizations/${id}/suspend`),
  putOnHold: (id) => api.put(`/super-admin/organizations/${id}/hold`),
  activateOrganization: (id) => api.put(`/super-admin/organizations/${id}/activate`),
  deleteOrganization: (id) => api.delete(`/super-admin/organizations/${id}`),
  getOrganizationStats: (id) => api.get(`/super-admin/organizations/${id}/stats`),
  getOrganizationUsers: (orgId, params) => api.get(`/super-admin/organizations/${orgId}/users`, { params }),
  createOrganization: (data) => api.post("/super-admin/organizations", data),

  // Products
  getProducts: () => api.get("/super-admin/products"),
  getProduct: (id) => api.get(`/super-admin/products/${id}`),
  updateProductStatus: (id, status) => api.put(`/super-admin/products/${id}/status`, null, { params: { status_val: status } }),
  getOrganizationProducts: (orgId) => api.get(`/super-admin/organizations/${orgId}/products`),
  toggleOrganizationProduct: (orgId, productId, isEnabled) => api.put(`/super-admin/organizations/${orgId}/products/${productId}/toggle`, { is_enabled: isEnabled }),

  // Subscriptions
  getSubscriptions: () => api.get("/super-admin/subscriptions"),
  getOrganizationSubscription: (orgId) => api.get(`/super-admin/subscriptions/${orgId}`),
  updateSubscription: (orgId, data) => api.put(`/super-admin/subscriptions/${orgId}`, data),

  // Platform Users - Read-only user view (no lifecycle management)
  getUsers: (params) => api.get("/super-admin/users", { params }),

  // Audit Logs
  getAuditLogs: (params) => api.get("/super-admin/audit-logs", { params }),

  // System Health
  getSystemHealth: () => api.get("/super-admin/system-health"),
  runHealthCheck: () => api.post("/super-admin/system-health/check"),

  // Platform Settings
  getSettings: () => api.get("/super-admin/settings"),
  getSetting: (id) => api.get(`/super-admin/settings/${id}`),
  createSetting: (data) => api.post("/super-admin/settings", data),
  updateSetting: (id, data) => api.put(`/super-admin/settings/${id}`, data),

  // Analytics
  getAnalytics: () => api.get("/super-admin/analytics"),

  // Revenue / Storage
  getRevenue: () => api.get("/super-admin/revenue"),
  getStorage: () => api.get("/super-admin/storage"),

  // Notifications
  getNotifications: (params) => api.get("/super-admin/notifications", { params }),
  createNotification: (data) => api.post("/super-admin/notifications", data),
  markNotificationRead: (id) => api.put(`/super-admin/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/super-admin/notifications/${id}`),

  // Support Tickets
  getSupportTickets: (params) => api.get("/super-admin/support-tickets", { params }),
  getSupportTicket: (id) => api.get(`/super-admin/support-tickets/${id}`),
  updateSupportTicket: (id, data) => api.put(`/super-admin/support-tickets/${id}`, data),

  // Security Events
  getSecurityEvents: (params) => api.get("/super-admin/security-events", { params }),
  resolveSecurityEvent: (id, data) => api.put(`/super-admin/security-events/${id}/resolve`, data),

  // Login Activity
  getLoginActivity: (params) => api.get("/super-admin/login-activity", { params }),

   // Approval Workflow
   getPendingOrganizations: (params) => api.get("/super-admin/organizations/pending", { params }),
   getApprovedOrganizations: (params) => api.get("/super-admin/organizations/approved", { params }),
   getRejectedOrganizations: (params) => api.get("/super-admin/organizations/rejected", { params }),
   getSuspendedOrganizations: (params) => api.get("/super-admin/organizations/suspended", { params }),
   getDeactivatedOrganizations: (params) => api.get("/super-admin/organizations/deactivated", { params }),
   getOrganizationDetail: (orgId) => api.get(`/super-admin/organizations/${orgId}/details`),
   approveOrganization: (orgId) => api.put(`/super-admin/organizations/${orgId}/approve`),
   rejectOrganization: (orgId, data) => api.put(`/super-admin/organizations/${orgId}/reject`, data),
   reactivateOrganization: (orgId) => api.put(`/super-admin/organizations/${orgId}/reactivate`),
   getApprovalHistory: (orgId) => api.get(`/super-admin/organizations/${orgId}/approval-history`),
   updateOrganizationStatus: (orgId, data) => api.put(`/super-admin/organizations/${orgId}/status`, data),
};
