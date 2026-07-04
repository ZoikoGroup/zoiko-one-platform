// EmployeeDetailPanel.jsx
// Slide-over panel showing a single employee's details, with inline
// edit (via EmployeeForm) and delete actions.

import React, { useState } from "react";
import EmployeeForm from "./EmployeeForm";
import { deleteEmployee } from "../../../service/payrollService";

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}

export default function EmployeeDetailPanel({ employee, onClose, onUpdated, onDeleted }) {
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!employee) return null;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteEmployee(employee.id);
      onDeleted?.(employee.id);
    } catch (err) {
      setDeleteError(err.message || "Could not remove this employee. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "edit" ? "Edit employee" : `${employee.firstName} ${employee.lastName}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === "edit" ? (
            <EmployeeForm
              employee={employee}
              onCancel={() => setMode("view")}
              onSaved={(updated) => {
                setMode("view");
                onUpdated?.(updated);
              }}
            />
          ) : (
            <>
              <span className="mb-4 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                {employee.employeeCode}
              </span>

              <dl className="divide-y divide-slate-100">
                <DetailRow label="Email" value={employee.email} />
                <DetailRow label="Phone" value={employee.phone} />
                <DetailRow label="Department" value={employee.department} />
                <DetailRow label="Designation" value={employee.designation} />
                <DetailRow label="Employment type" value={employee.employmentType} />
                <DetailRow label="Status" value={employee.status} />
                <DetailRow label="Date of joining" value={employee.dateOfJoining} />
              </dl>

              <h3 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Salary structure
              </h3>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Annual CTC" value={formatCurrency(employee.ctc)} />
              </dl>

              <h3 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Statutory & bank
              </h3>
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Bank account" value={employee.bankAccount} />
                <DetailRow label="PAN" value={employee.pan} />
              </dl>

              {deleteError && (
                <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                  {deleteError}
                </div>
              )}
            </>
          )}
        </div>

        {mode === "view" && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            {confirmingDelete ? (
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm text-slate-600">Remove this employee?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? "Removing…" : "Confirm remove"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remove employee
                </button>
                <button
                  onClick={() => setMode("edit")}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Edit details
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}