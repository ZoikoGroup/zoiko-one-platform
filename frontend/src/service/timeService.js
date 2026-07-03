import { api } from "./api";
import { createResourceClient } from "./resourceClient";

export const getTimeEntries = (employeeId) =>
  api.get(`/time/entries${employeeId ? `?employee_id=${employeeId}` : ""}`);

export const createTimeEntry = (payload) => api.post("/time/entries", payload);

export const updateTimeEntry = (id, payload) => api.put(`/time/entries/${id}`, payload);

export const getLeaveRequests = (employeeId) =>
  api.get(`/time/leaves${employeeId ? `?employee_id=${employeeId}` : ""}`);

export const createLeaveRequest = (payload) => api.post("/time/leaves", payload);

export const reviewLeaveRequest = (id, payload) => api.put(`/time/leaves/${id}/review`, payload);

const mockData = {
  overview: { message: "ZoikoTime overview (mock)" },
  timesheets: [],
  shifts: [],
  schedules: [],
  approvals: [],
};

const client = createResourceClient("/api/zoikotime", mockData);

export const getOverview = () => client.list("overview");
export const getTimesheets = (params) => client.list("timesheets", params);
export const getShifts = (params) => client.list("shifts", params);
export const getSchedules = (params) => client.list("schedules", params);
export const getApprovals = (params) => client.list("approvals", params);

export const createTimesheet = (payload) => client.create("timesheets", payload);
export const updateTimesheet = (id, payload) => client.update("timesheets", id, payload);
export const deleteTimesheet = (id) => client.remove("timesheets", id);

export default client;
