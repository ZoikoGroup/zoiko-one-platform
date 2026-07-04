// EmployeeForm.jsx
// Controlled form used for both creating and editing an employee.
// Pass an `employee` prop to edit; omit it to create a new record.

import React, { useState } from "react";
import { createEmployee, updateEmployee, EMPLOYMENT_TYPES, EMPLOYEE_STATUSES, DEPARTMENTS } from "../../../service/payrollService";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: DEPARTMENTS[0],
  designation: "",
  employmentType: EMPLOYMENT_TYPES[0],
  status: "Active",
  dateOfJoining: "",
  ctc: "",
  basic: "",
  hra: "",
  bankAccountNumber: "",
  ifscCode: "",
  panNumber: "",
  uan: "",
};

function Field({ label, children, error }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email";
  if (!form.designation.trim()) errors.designation = "Designation is required";
  if (!form.dateOfJoining) errors.dateOfJoining = "Date of joining is required";
  if (!form.ctc || Number(form.ctc) <= 0) errors.ctc = "Enter a valid annual CTC";
  if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.toUpperCase())) {
    errors.panNumber = "PAN format looks incorrect (e.g. ABCDE1234F)";
  }
  return errors;
}

export default function EmployeeForm({ employee, onSaved, onCancel }) {
  const isEdit = Boolean(employee?.id);
  const [form, setForm] = useState(() => (employee ? { ...EMPTY_FORM, ...employee } : EMPTY_FORM));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        ctc: Number(form.ctc),
        basic: form.basic ? Number(form.basic) : undefined,
        hra: form.hra ? Number(form.hra) : undefined,
        panNumber: form.panNumber ? form.panNumber.toUpperCase() : "",
      };
      const saved = isEdit ? await updateEmployee(employee.id, payload) : await createEmployee(payload);
      onSaved?.(saved);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal details</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName}>
            <input className={inputClass} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <input className={inputClass} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department">
            <select className={inputClass} value={form.department} onChange={(e) => update("department", e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation" error={errors.designation}>
            <input className={inputClass} value={form.designation} onChange={(e) => update("designation", e.target.value)} />
          </Field>
          <Field label="Employment type">
            <select className={inputClass} value={form.employmentType} onChange={(e) => update("employmentType", e.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => update("status", e.target.value)}>
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Date of joining" error={errors.dateOfJoining}>
            <input type="date" className={inputClass} value={form.dateOfJoining} onChange={(e) => update("dateOfJoining", e.target.value)} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Salary structure (annual)</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="CTC (₹)" error={errors.ctc}>
            <input type="number" min="0" className={inputClass} value={form.ctc} onChange={(e) => update("ctc", e.target.value)} />
          </Field>
          <Field label="Basic (₹)">
            <input type="number" min="0" className={inputClass} value={form.basic} onChange={(e) => update("basic", e.target.value)} />
          </Field>
          <Field label="HRA (₹)">
            <input type="number" min="0" className={inputClass} value={form.hra} onChange={(e) => update("hra", e.target.value)} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Statutory & bank details</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bank account number">
            <input className={inputClass} value={form.bankAccountNumber} onChange={(e) => update("bankAccountNumber", e.target.value)} />
          </Field>
          <Field label="IFSC code">
            <input className={inputClass} value={form.ifscCode} onChange={(e) => update("ifscCode", e.target.value.toUpperCase())} />
          </Field>
          <Field label="PAN number" error={errors.panNumber}>
            <input className={inputClass} value={form.panNumber} onChange={(e) => update("panNumber", e.target.value.toUpperCase())} />
          </Field>
          <Field label="UAN (PF)">
            <input className={inputClass} value={form.uan} onChange={(e) => update("uan", e.target.value)} />
          </Field>
        </div>
      </div>

      {submitError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
        </button>
      </div>
    </form>
  );
}