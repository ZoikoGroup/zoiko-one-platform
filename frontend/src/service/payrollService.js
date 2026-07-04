import { api } from "./api";

// ── Compliance packs (inlined from compliancePacks.js) ──
export const COMPLIANCE_COUNTRIES = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
];

export const DEFAULT_COUNTRY = "IN";

const COUNTRY_META = {
  IN: { name: "India" },
  US: { name: "United States" },
  UK: { name: "United Kingdom" },
};

export function getCountryMeta(country) {
  return COUNTRY_META[country] || COUNTRY_META[DEFAULT_COUNTRY];
}

export function getFieldPack(country) {
  return [
    { label: "Company Legal Name", field: "name", type: "text" },
    { label: "Company Type", field: "type", type: "text" },
    { label: "Tax Registration No. (PAN/GST)", field: "taxNo", type: "text" },
    { label: "Employer ID", field: "employerId", type: "text" },
    { label: "Registered Address", field: "address", type: "text" },
    { label: "Industry", field: "industry", type: "text" },
    { label: "Jurisdiction — Country", field: "jurisdictionCountry", type: "text" },
    { label: "Jurisdiction — State", field: "jurisdictionState", type: "text" },
    { label: "Compliance Pack", field: "compliancePack", type: "text" },
  ];
}

const RATES_BY_COUNTRY = {
  IN: {
    rows: [
      { id: "pf", label: "Provident Fund", employee: "12%", employer: "12%", total: "24%" },
      { id: "esi", label: "ESI", employee: "0.75%", employer: "3.25%", total: "4%" },
      { id: "pt", label: "Professional Tax", employee: "₹200", employer: "—", total: "₹200" },
      { id: "gratuity", label: "Gratuity", employee: "—", employer: "4.81%", total: "4.81%" },
    ],
  },
  US: {
    rows: [
      { id: "social-security", label: "Social Security", employee: "6.2%", employer: "6.2%", total: "12.4%" },
      { id: "medicare", label: "Medicare", employee: "1.45%", employer: "1.45%", total: "2.9%" },
      { id: "federal-unemployment", label: "Federal Unemployment (FUTA)", employee: "—", employer: "6%", total: "6%" },
    ],
  },
  UK: {
    rows: [
      { id: "national-insurance", label: "National Insurance", employee: "12%", employer: "13.8%", total: "25.8%" },
      { id: "pension", label: "Workplace Pension", employee: "5%", employer: "3%", total: "8%" },
    ],
  },
};

export function getComplianceRates(country) {
  return RATES_BY_COUNTRY[country] || RATES_BY_COUNTRY[DEFAULT_COUNTRY];
}

const SLABS_BY_COUNTRY = {
  IN: {
    slabs: [
      { id: "in-1", min: "₹0", max: "₹3,00,000", rate: "Nil", tax: "No tax" },
      { id: "in-2", min: "₹3,00,001", max: "₹6,00,000", rate: "5%", tax: "5% of income over ₹3L" },
      { id: "in-3", min: "₹6,00,001", max: "₹9,00,000", rate: "10%", tax: "₹15,000 + 10% over ₹6L" },
      { id: "in-4", min: "₹9,00,001", max: "₹12,00,000", rate: "15%", tax: "₹45,000 + 15% over ₹9L" },
      { id: "in-5", min: "₹12,00,001", max: "₹15,00,000", rate: "20%", tax: "₹90,000 + 20% over ₹12L" },
      { id: "in-6", min: "₹15,00,001", max: "Above", rate: "30%", tax: "₹1,50,000 + 30% over ₹15L" },
    ],
  },
  US: {
    slabs: [
      { id: "us-1", min: "$0", max: "$11,000", rate: "10%", tax: "10% of income" },
      { id: "us-2", min: "$11,001", max: "$44,725", rate: "12%", tax: "$1,100 + 12% over $11,000" },
      { id: "us-3", min: "$44,726", max: "$95,375", rate: "22%", tax: "$5,147 + 22% over $44,725" },
      { id: "us-4", min: "$95,376", max: "$182,100", rate: "24%", tax: "$16,290 + 24% over $95,375" },
      { id: "us-5", min: "$182,101", max: "$231,250", rate: "32%", tax: "$37,104 + 32% over $182,100" },
      { id: "us-6", min: "$231,251", max: "$578,125", rate: "35%", tax: "$52,832 + 35% over $231,250" },
      { id: "us-7", min: "$578,126", max: "Above", rate: "37%", tax: "$174,238 + 37% over $578,125" },
    ],
  },
  UK: {
    slabs: [
      { id: "uk-1", min: "£0", max: "£12,570", rate: "0%", tax: "Personal allowance" },
      { id: "uk-2", min: "£12,571", max: "£50,270", rate: "20%", tax: "20% over £12,570" },
      { id: "uk-3", min: "£50,271", max: "£125,140", rate: "40%", tax: "£7,540 + 40% over £50,270" },
      { id: "uk-4", min: "£125,141", max: "Above", rate: "45%", tax: "£37,488 + 45% over £125,140" },
    ],
  },
};

export function getTaxSlabs(country) {
  return SLABS_BY_COUNTRY[country] || SLABS_BY_COUNTRY[DEFAULT_COUNTRY];
}

export function getPolicyBasedExtraction(countryCode = DEFAULT_COUNTRY) {
  const contributionRates = (getComplianceRates(countryCode).rows || []).map((row) => ({
    id: row.id,
    label: row.label,
    employee: row.employee,
    employer: row.employer,
    total: row.total,
  }));

  const taxSlabs = (getTaxSlabs(countryCode).slabs || []).map((row) => ({
    id: row.id,
    min: row.min,
    max: row.max,
    rate: row.rate,
    tax: row.tax,
  }));

  return {
    contributionRates,
    taxSlabs,
    requirements: [
      {
        label: "Company policy pack",
        note: `Using the configured ${getCountryMeta(countryCode).name} compliance policy defaults.`,
      },
    ],
  };
}

export function normalizeComplianceDocument(doc, countryCode = DEFAULT_COUNTRY) {
  const normalized = { ...doc };
  const hasExtractedData = Boolean(
    normalized?.extracted &&
      ((normalized.extracted.contributionRates && normalized.extracted.contributionRates.length > 0) ||
        (normalized.extracted.taxSlabs && normalized.extracted.taxSlabs.length > 0) ||
        (normalized.extracted.requirements && normalized.extracted.requirements.length > 0))
  );

  if ((normalized.status === "parsed" || normalized.status === "failed") && !hasExtractedData) {
    normalized.extracted = getPolicyBasedExtraction(countryCode);
    normalized.extractionSource = "policy";
  } else if (normalized.status === "processing" && !hasExtractedData) {
    normalized.extracted = null;
    normalized.extractionSource = null;
  } else if (hasExtractedData) {
    normalized.extractionSource = "backend";
  }

  return normalized;
}

// ── Dashboard ──────────────────────────────────────────
export const getDashboardSummary = async () => {
  try {
    return await api.get("/api/payroll/dashboard/summary");
  } catch (err) {
    throw err;
  }
};

export const getDashboardTrend = async () => {
  try {
    const res = await api.get("/api/payroll/dashboard/trend");
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

export const getRecentActivity = async () => {
  try {
    const res = await api.get("/api/payroll/dashboard/activity");
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

// ── Employees ──────────────────────────────────────────
export const getEmployees = async (params) => {
  try {
    const res = await api.get("/api/payroll/employees", { params });
    return res?.items || res?.data || res || [];
  } catch {
    return [];
  }
};

export const getEmployeeById = async (id) => {
  try {
    return await api.get(`/api/payroll/employees/${id}`);
  } catch (err) {
    throw err;
  }
};

export const createEmployee = async (payload) => {
  try {
    return await api.post("/api/payroll/employees", payload);
  } catch (err) {
    throw err;
  }
};

export const updateEmployee = async (id, payload) => {
  try {
    return await api.put(`/api/payroll/employees/${id}`, payload);
  } catch (err) {
    throw err;
  }
};

export const deleteEmployee = async (id) => {
  try {
    return await api.delete(`/api/payroll/employees/${id}`);
  } catch (err) {
    throw err;
  }
};

export const bulkCreateEmployees = async (employees) => {
  try {
    // Expected response shape: { created: [...employees], failed: [{ row, reason }] }
    return await api.post("/api/payroll/employees/bulk", { employees });
  } catch (err) {
    throw err;
  }
};

export const bulkDeleteEmployees = async (employeeIds) => {
  try {
    return await api.post("/api/payroll/employees/bulk-delete", { employee_ids: employeeIds });
  } catch (err) {
    throw err;
  }
};

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
export const EMPLOYEE_STATUSES = ["Active", "On Leave", "Inactive"];
export const DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "Human Resources",
  "Operations",
  "Support",
];

// ── Payroll Runs ───────────────────────────────────────
export const fetchRuns = async (params) => {
  try {
    const res = await api.get("/api/payroll/runs", { params });
    return Array.isArray(res) ? res : res?.data || res?.items || [];
  } catch {
    return [];
  }
};

export const createRun = async (payload) => {
  try {
    return await api.post("/api/payroll/runs", payload);
  } catch (err) {
    throw err;
  }
};

export const approveRun = async (id) => {
  try {
    return await api.put(`/api/payroll/runs/${id}/approve`);
  } catch (err) {
    throw err;
  }
};

export const updateRun = async (id, payload) => {
  try {
    return await api.put(`/api/payroll/runs/${id}`, payload);
  } catch (err) {
    throw err;
  }
};

export const deletePayRun = async (id) => {
  try {
    return await api.delete(`/api/payroll/runs/${id}`);
  } catch (err) {
    throw err;
  }
};

// ── Payslips ───────────────────────────────────────────
export const getPayslips = async (params) => {
  try {
    const res = await api.get("/api/payroll/payslips", { params });
    return Array.isArray(res) ? res : res?.data || res?.items || [];
  } catch {
    return [];
  }
};

export const getPayslipById = async (id) => {
  try {
    return await api.get(`/api/payroll/payslips/${id}`);
  } catch (err) {
    throw err;
  }
};

export const downloadPayslip = async (payslip) => {
  const res = await api.get(`/api/payroll/payslips/${payslip.id}/download`, { responseType: "blob" });
  const blob = res instanceof Blob ? res : res?.data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslip-${payslip.id || "download"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Compliance / Filings ───────────────────────────────
//
// fetchContributionRates / fetchTaxSlabs are now country-aware:
//   1. They ask the backend for country-specific data (?country=XX).
//   2. If the backend returns nothing yet (most backends won't have
//      per-country data on day one) they fall back to the local
//      compliancePacks.js lookup, so the UI is never empty and never
//      silently shows the wrong country's numbers.
//
// This is the seam described in the earlier analysis: once the backend
// grows real per-country compliance data, only the "if (data.length > 0)"
// branch matters — no component changes needed.

export const fetchComplianceData = async (params) => {
  try {
    const res = await api.get("/api/payroll/filings", { params });
    return Array.isArray(res) ? res : res?.data || res?.items || [];
  } catch {
    return [];
  }
};

export const fetchContributionRates = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const res = await api.get("/api/payroll/compliance/contribution-rates", {
      params: { country: countryCode },
    });
    const data = Array.isArray(res) ? res : res?.data || res?.items || [];
    if (data.length > 0) return data;
    return getComplianceRates(countryCode).rows;
  } catch {
    // Backend not reachable / not country-aware yet — use the local pack.
    return getComplianceRates(countryCode).rows;
  }
};

export const fetchTaxSlabs = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const res = await api.get("/api/payroll/compliance/tax-slabs", {
      params: { country: countryCode },
    });
    const data = Array.isArray(res) ? res : res?.data || res?.items || [];
    if (data.length > 0) return data;
    return getTaxSlabs(countryCode).slabs;
  } catch {
    return getTaxSlabs(countryCode).slabs;
  }
};

export const updateCompanyDetails = async (payload) => {
  try {
    return await api.put("/api/payroll/compliance/company-details", payload);
  } catch (err) {
    throw err;
  }
};

// ── Compliance Documents (upload → extraction) ─────────
//
// This endpoint doesn't exist on the backend yet. Contract it should
// follow, so the frontend (ComplianceDocumentUpload.jsx) already works
// once it's built — no component changes needed, just implement this:
//
// POST /api/payroll/compliance/documents   (multipart/form-data)
//   fields: file, country  (ISO-ish code, e.g. "IN" / "US" / "UK")
//   response 201:
//   {
//     id: string,
//     fileName: string,
//     uploadedAt: string (ISO timestamp),
//     country: string,
//     status: "processing" | "parsed" | "failed",
//     extracted: {
//       contributionRates: [{ id, label, employee, employer, total }] | null,
//       taxSlabs: [{ id, min, max, rate, tax }] | null,
//       requirements: [{ label, note }] | null
//     } | null,
//     error: string | null
//   }
//
// GET /api/payroll/compliance/documents?country=XX
//   response 200: array of the same document shape as above
//
// DELETE /api/payroll/compliance/documents/:id
//   response 204
//
// Until this exists, uploadComplianceDocument() rejects and the UI marks
// the file "unavailable" (queued, not lost) rather than failing silently.

export const uploadComplianceDocument = async (file, countryCode = DEFAULT_COUNTRY) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("country", countryCode);
  try {
    return await api.post("/api/payroll/compliance/documents", formData);
  } catch (err) {
    throw err;
  }
};

export const fetchComplianceDocuments = async (countryCode = DEFAULT_COUNTRY) => {
  try {
    const res = await api.get("/api/payroll/compliance/documents", { params: { country: countryCode } });
    return Array.isArray(res) ? res : res?.data || res?.items || [];
  } catch {
    return [];
  }
};

export const deleteComplianceDocument = async (id) => {
  try {
    return await api.delete(`/api/payroll/compliance/documents/${id}`);
  } catch (err) {
    throw err;
  }
};