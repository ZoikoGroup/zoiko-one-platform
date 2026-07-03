import { createResourceClient } from "./resourceClient";

const mockData = {
  overview: { message: "Zoiko Payroll overview (mock)" },
  payruns: [],
  payslips: [],
  deductions: [],
  filings: [],
};

const client = createResourceClient("/api/payroll", mockData);

export const getOverview = () => client.list("overview");
export const getPayRuns = (params) => client.list("payruns", params);
export const getPayslips = (params) => client.list("payslips", params);
export const getDeductions = (params) => client.list("deductions", params);
export const getFilings = (params) => client.list("filings", params);

export const createPayRun = (payload) => client.create("payruns", payload);
export const approvePayRun = (id) => client.update("payruns", id, { status: "approved" });
export const updatePayRun = (id, payload) => client.update("payruns", id, payload);

export default client;
