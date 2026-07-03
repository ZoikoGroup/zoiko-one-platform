import { api } from "./api";

export const getOrganizationDetails = () => api.get("/hr/organization");
export const getOrganizationDashboardStats = () => api.get("/hr/organization/dashboard");
