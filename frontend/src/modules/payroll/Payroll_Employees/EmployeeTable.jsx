// EmployeeTable.jsx
// Presentational table for the employee list. Purely controlled by props
// so it stays reusable and easy to test.

import React, { useState, useMemo } from "react";

const STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "On Leave": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Inactive;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status}
    </span>
  );
}

function formatCurrency(value, info) {
  if (value === null || value === undefined) return "—";
  if (!info) return value;
  try {
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: info.code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${info.symbol}${value}`;
  }
}

const COLUMNS = [
  { key: "employeeCode", label: "ID" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "ctc", label: "Annual CTC" },
  { key: "status", label: "Status" },
];

export default function EmployeeTable({ employees, loading, onRowClick, selectedEmployeeId, selectedIds, onSelectionChange, currencyInfo }) {
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    const rows = [...(employees || [])];
    rows.sort((a, b) => {
      const aVal = sortKey === "name" ? `${a.firstName} ${a.lastName}` : a[sortKey];
      const bVal = sortKey === "name" ? `${b.firstName} ${b.lastName}` : b[sortKey];
      if (aVal === bVal) return 0;
      const result = aVal > bVal ? 1 : -1;
      return sortDir === "asc" ? result : -result;
    });
    return rows;
  }, [employees, sortKey, sortDir]);

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500">
        Loading employees…
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <p className="text-sm font-medium text-slate-700">No employees found</p>
        <p className="text-sm text-slate-500">Try adjusting your filters, or add a new employee.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="w-10 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={sorted.length > 0 && sorted.every((e) => selectedIds?.has(e.id))}
                onChange={() => {
                  if (sorted.every((e) => selectedIds?.has(e.id))) {
                    onSelectionChange?.(new Set());
                  } else {
                    onSelectionChange?.(new Set(sorted.map((e) => e.id)));
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                onClick={() => toggleSort(col.key)}
                className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {sorted.map((emp) => (
            <tr
              key={emp.id}
              onClick={() => onRowClick?.(emp)}
              className={`cursor-pointer transition-colors hover:bg-indigo-50/50 ${
                selectedEmployeeId === emp.id ? "bg-indigo-50" : ""
              }`}
            >
              <td className="w-10 whitespace-nowrap px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds?.has(emp.id) || false}
                  onChange={() => {
                    const next = new Set(selectedIds);
                    if (next.has(emp.id)) next.delete(emp.id);
                    else next.add(emp.id);
                    onSelectionChange?.(next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{emp.employeeCode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                {emp.firstName} {emp.lastName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{emp.department}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{emp.designation}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatCurrency(emp.ctc, currencyInfo)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={emp.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}