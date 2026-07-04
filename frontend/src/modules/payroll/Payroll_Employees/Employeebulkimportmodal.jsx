// EmployeeBulkImportModal.jsx
// Modal for adding employees in bulk from an uploaded Excel (.xlsx/.csv) file.
// Flow: download template -> fill it -> upload -> preview parsed rows with
// per-row validation -> import valid rows -> show a result summary.
//
// Requires the "xlsx" (SheetJS) package: npm install xlsx

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { bulkCreateEmployees, EMPLOYMENT_TYPES, EMPLOYEE_STATUSES, DEPARTMENTS } from "../../../service/payrollService";

// Maps the human-readable Excel column headers to the field names used
// throughout the rest of the app (EmployeeForm, EmployeeTable, etc).
//
// IMPORTANT: header matching is normalized (trimmed, lower-cased, punctuation
// ignored) below in normalizeHeader(), and each canonical field also accepts
// a few common alternate header spellings via HEADER_ALIASES. This is the
// fix for a real bug: a template floating around had the date column headed
// "Date of Joining " (trailing space, no format hint) and the bank column
// headed "Bank A/c Number" instead of "Bank Account Number" — neither
// matched the old exact-string lookup, so every row's date came back empty
// and every import failed with "Date of joining is missing or invalid".
const COLUMN_MAP = {
  "First Name": "firstName",
  "Last Name": "lastName",
  "Email": "email",
  "Phone": "phone",
  "Department": "department",
  "Designation": "designation",
  "Employment Type": "employmentType",
  "Status": "status",
  "Date of Joining (YYYY-MM-DD)": "dateOfJoining",
  "CTC": "ctc",
  "Basic": "basic",
  "HRA": "hra",
  "Bank Account Number": "bankAccountNumber",
  "IFSC Code": "ifscCode",
  "PAN Number": "panNumber",
  "UAN": "uan",
};

// Extra header spellings seen in the wild, mapped to the same canonical field.
const HEADER_ALIASES = {
  "date of joining": "dateOfJoining",
  "doj": "dateOfJoining",
  "joining date": "dateOfJoining",
  "bank a/c number": "bankAccountNumber",
  "bank account no": "bankAccountNumber",
  "bank a/c no": "bankAccountNumber",
  "account number": "bankAccountNumber",
  "pan": "panNumber",
  "ifsc": "ifscCode",
  "uan number": "uan",
};

const TEMPLATE_HEADERS = Object.keys(COLUMN_MAP);

const TEMPLATE_SAMPLE_ROW = {
  "First Name": "Asha",
  "Last Name": "Rao",
  "Email": "asha.rao@example.com",
  "Phone": "9876543210",
  "Department": DEPARTMENTS[0],
  "Designation": "Software Engineer",
  "Employment Type": EMPLOYMENT_TYPES[0],
  "Status": "Active",
  "Date of Joining (YYYY-MM-DD)": "2026-01-15",
  "CTC": 1200000,
  "Basic": 600000,
  "HRA": 240000,
  "Bank Account Number": "123456789012",
  "IFSC Code": "HDFC0001234",
  "PAN Number": "ABCDE1234F",
  "UAN": "101234567890",
};

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([TEMPLATE_SAMPLE_ROW], { header: TEMPLATE_HEADERS });
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, "employee_bulk_import_template.xlsx");
}

// Normalizes a header string for robust matching: trims whitespace, lowercases,
// strips any "(...)" hint text, and collapses repeated spaces. This is what
// lets "Date of Joining " (trailing space) match "Date of Joining (YYYY-MM-DD)".
function normalizeHeader(header) {
  return String(header || "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Built once: normalized header text -> canonical field name, combining both
// the primary COLUMN_MAP and the alias list.
const NORMALIZED_FIELD_LOOKUP = (() => {
  const lookup = {};
  for (const [header, field] of Object.entries(COLUMN_MAP)) {
    lookup[normalizeHeader(header)] = field;
  }
  for (const [header, field] of Object.entries(HEADER_ALIASES)) {
    lookup[normalizeHeader(header)] = field;
  }
  return lookup;
})();

// Excel stores dates as JS Date objects (when cellDates is on) or serials.
// Normalize whatever comes in to a plain YYYY-MM-DD string.
function normalizeDate(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }
  const asString = String(value).trim();
  const parsed = new Date(asString);
  if (!isNaN(parsed) && /\d{4}/.test(asString)) {
    return parsed.toISOString().slice(0, 10);
  }
  return asString;
}

// Converts one raw sheet row (keyed by whatever headers the file actually
// has) into our canonical field shape, matching headers by normalized text
// rather than requiring an exact string match.
function toRowObject(rawRow) {
  const row = {};
  for (const [rawHeader, rawValue] of Object.entries(rawRow)) {
    const field = NORMALIZED_FIELD_LOOKUP[normalizeHeader(rawHeader)];
    if (field) row[field] = rawValue ?? "";
  }
  // Fill in any fields that didn't appear in this sheet at all so downstream
  // code always has every key, rather than throwing on undefined.
  for (const field of Object.values(COLUMN_MAP)) {
    if (!(field in row)) row[field] = "";
  }

  row.dateOfJoining = normalizeDate(row.dateOfJoining);
  row.department = row.department || DEPARTMENTS[0];
  row.employmentType = row.employmentType || EMPLOYMENT_TYPES[0];
  row.status = row.status || "Active";
  row.panNumber = row.panNumber ? String(row.panNumber).toUpperCase().trim() : "";
  row.ifscCode = row.ifscCode ? String(row.ifscCode).toUpperCase().trim() : "";
  row.bankAccountNumber = row.bankAccountNumber ? String(row.bankAccountNumber).trim() : "";
  row.ctc = row.ctc === "" ? "" : Number(row.ctc);
  row.basic = row.basic === "" ? "" : Number(row.basic);
  row.hra = row.hra === "" ? "" : Number(row.hra);
  return row;
}

function validateRow(row) {
  const errors = [];
  if (!String(row.firstName || "").trim()) errors.push("First name is required");
  if (!String(row.lastName || "").trim()) errors.push("Last name is required");
  if (!String(row.email || "").trim()) errors.push("Email is required");
  else if (!/^\S+@\S+\.\S+$/.test(row.email)) errors.push("Email format looks incorrect");
  if (!String(row.designation || "").trim()) errors.push("Designation is required");
  if (!row.dateOfJoining || isNaN(new Date(row.dateOfJoining))) errors.push("Date of joining is missing or invalid");
  if (!row.ctc || Number(row.ctc) <= 0) errors.push("CTC must be a positive number");
  if (row.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(row.panNumber)) {
    errors.push("PAN format looks incorrect (e.g. ABCDE1234F)");
  }
  if (!DEPARTMENTS.includes(row.department)) errors.push(`Department must be one of: ${DEPARTMENTS.join(", ")}`);
  if (!EMPLOYMENT_TYPES.includes(row.employmentType)) errors.push(`Employment type must be one of: ${EMPLOYMENT_TYPES.join(", ")}`);
  if (!EMPLOYEE_STATUSES.includes(row.status)) errors.push(`Status must be one of: ${EMPLOYEE_STATUSES.join(", ")}`);
  return errors;
}

export default function EmployeeBulkImportModal({ onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]); // [{ row, errors }]
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { importedCount, failed: [{ row, reason }] }

  const validCount = parsedRows.filter((r) => r.errors.length === 0).length;
  const invalidCount = parsedRows.length - validCount;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setParsedRows([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error("The file doesn't contain any sheets.");
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rawRows.length === 0) {
          setParseError("No data rows found. Make sure the first row has headers and there's at least one employee below it.");
          return;
        }

        const rows = rawRows.map((rawRow) => {
          const row = toRowObject(rawRow);
          return { row, errors: validateRow(row) };
        });
        setParsedRows(rows);
      } catch (err) {
        setParseError(err.message || "Could not read this file. Please check it's a valid .xlsx or .csv file.");
      }
    };
    reader.onerror = () => setParseError("Could not read this file. Please try again.");
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    const rowsToImport = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.row);
    if (rowsToImport.length === 0) return;

    setImporting(true);
    setParseError("");
    try {
      const payload = rowsToImport.map((row) => ({
        ...row,
        panNumber: row.panNumber || "",
      }));
      const response = await bulkCreateEmployees(payload);
      const created = response?.created || response || [];
      const failed = response?.failed || [];
      setResult({ importedCount: created.length, failed });
      if (created.length > 0) onImported?.(created);
    } catch (err) {
      setParseError(err.message || "Import failed. No employees were added. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  function handleReupload() {
    setFileName("");
    setParsedRows([]);
    setParseError("");
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function reset() {
    setFileName("");
    setParsedRows([]);
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Import employees from Excel</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div>
            <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Successfully imported {result.importedCount} employee{result.importedCount === 1 ? "" : "s"}.
            </div>

            {result.failed.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  {result.failed.length} row{result.failed.length === 1 ? "" : "s"} could not be imported:
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                  {result.failed.map((f, i) => (
                    <li key={i}>
                      {f.row?.email || f.row?.firstName || `Row ${i + 1}`}: {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={reset}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Import another file
              </button>
              <button
                onClick={onClose}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
              <p className="text-sm text-slate-600">
                Upload a spreadsheet with one employee per row. Not sure of the format?{" "}
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                >
                  Download the template
                </button>
                .
              </p>

              <div className="mt-3 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700"
                />
              </div>
              {fileName && <p className="mt-2 text-xs text-slate-500">Selected: {fileName}</p>}
            </div>

            {parseError && (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {parseError}
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-emerald-700">{validCount} ready to import</span>
                    {invalidCount > 0 && (
                      <span className="ml-2 text-red-600">· {invalidCount} with errors (won't be imported)</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleReupload}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                  >
                    Re-upload
                  </button>
                </div>

                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Department</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">CTC</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map(({ row, errors }, i) => (
                        <tr key={i} className={errors.length > 0 ? "bg-red-50/60" : ""}>
                          <td className="px-3 py-2 text-slate-800">
                            {row.firstName} {row.lastName}
                            {errors.length > 0 && (
                              <ul className="mt-1 list-disc pl-4 text-xs text-red-600">
                                {errors.map((e, j) => (
                                  <li key={j}>{e}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{row.email}</td>
                          <td className="px-3 py-2 text-slate-600">{row.department}</td>
                          <td className="px-3 py-2 text-slate-600">{row.ctc || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Importing…" : `Import ${validCount || ""} employee${validCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
