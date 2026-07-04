// EmployeeListPage.jsx
// Top-level page: search/filter employees, view list, open detail panel,
// and create new employees.

import React, { useEffect, useState, useCallback } from "react";
import { getEmployees, bulkDeleteEmployees, DEPARTMENTS, EMPLOYEE_STATUSES } from "../../../service/payrollService";
import EmployeeTable from "./EmployeeTable";
import EmployeeForm from "./EmployeeForm";
import EmployeeDetailPanel from "./EmployeeDetailPanel";
import EmployeeBulkImportModal from "./EmployeeBulkImportModal";

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getEmployees({ search, department, status });
      setEmployees(data?.items || data || []);
    } catch (err) {
      setLoadError(err.message || "Could not load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, department, status]);

  useEffect(() => {
    const timeout = setTimeout(loadEmployees, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [loadEmployees]);

  function handleEmployeeUpdated(updated) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelectedEmployee(updated);
  }

  function handleEmployeeDeleted(id) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setSelectedEmployee(null);
  }

  function handleEmployeeCreated(created) {
    setEmployees((prev) => [created, ...prev]);
    setShowCreateForm(false);
  }

  function handleEmployeesBulkImported(createdList) {
    setEmployees((prev) => [...createdList, ...prev]);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} employee${selectedIds.size > 1 ? "s" : ""}?`)) return;
    setDeleting(true);
    try {
      const res = await bulkDeleteEmployees([...selectedIds]);
      const deletedSet = new Set(res.deleted || []);
      setEmployees((prev) => prev.filter((e) => !deletedSet.has(e.id)));
      setSelectedIds(new Set());
      if (selectedEmployee && deletedSet.has(selectedEmployee.id)) {
        setSelectedEmployee(null);
      }
    } catch (err) {
      alert(err.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Manage employee records used in payroll processing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            ⭱ Import from Excel
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add employee
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name, ID, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:max-w-xs"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loadError && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {loadError}
        </div>
      )}

      <div className="mt-4">
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : `Delete selected`}
            </button>
          </div>
        )}
        <EmployeeTable
          employees={employees}
          loading={loading}
          onRowClick={setSelectedEmployee}
          selectedEmployeeId={selectedEmployee?.id}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {selectedEmployee && (
        <EmployeeDetailPanel
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onUpdated={handleEmployeeUpdated}
          onDeleted={handleEmployeeDeleted}
        />
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 px-4" onClick={() => setShowCreateForm(false)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Add employee</h2>
            <EmployeeForm onCancel={() => setShowCreateForm(false)} onSaved={handleEmployeeCreated} />
          </div>
        </div>
      )}

      {showBulkImport && (
        <EmployeeBulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImported={handleEmployeesBulkImported}
        />
      )}
    </div>
  );
}