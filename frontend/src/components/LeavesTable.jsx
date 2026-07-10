import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, User } from "lucide-react";

/**
 * LeavesTable – professional, sortable leave-allocations table.
 *
 * Props:
 *  - allocations:       Array<{ employeeId, name, department, used }>
 *  - monthLeaveCounts:  Record<employeeId, number>
 *  - getAvailableLeaves: (alloc) => number
 *  - getUtilizedLeaves:  (alloc) => number
 */

const LEAVE_BADGE = {
  utilized: "bg-amber-100 text-amber-800 border border-amber-200",
  available: "bg-teal-100 text-teal-800 border border-teal-200",
  month: "bg-blue-100 text-blue-800 border border-blue-200",
};

function SortIcon({ col, sortKey, sortOrder }) {
  if (sortKey !== col) return <ChevronsUpDown size={13} className="text-slate-400 ml-1 inline" />;
  return sortOrder === "asc"
    ? <ChevronUp size={13} className="text-teal-600 ml-1 inline" />
    : <ChevronDown size={13} className="text-teal-600 ml-1 inline" />;
}

function InitialsAvatar({ name }) {
  const parts = (name || "").trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (parts[0]?.[0] || "?");

  // Deterministic color from name
  const colors = [
    "bg-teal-500", "bg-emerald-500", "bg-blue-500",
    "bg-violet-500", "bg-rose-500", "bg-amber-500",
  ];
  const idx = (name || "").charCodeAt(0) % colors.length;

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${colors[idx]}`}>
      {initials.toUpperCase()}
    </div>
  );
}

function Badge({ label, variant }) {
  const cls = LEAVE_BADGE[variant] || "bg-slate-100 text-slate-700 border border-slate-200";
  return (
    <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function LeavesTable({
  allocations = [],
  monthLeaveCounts = {},
  getAvailableLeaves,
  getUtilizedLeaves,
}) {
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...allocations].sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "name":       av = a.name || "";                   bv = b.name || "";                   break;
        case "department": av = a.department || "";             bv = b.department || "";             break;
        case "utilized":   av = getUtilizedLeaves(a);           bv = getUtilizedLeaves(b);           break;
        case "available":  av = getAvailableLeaves(a);          bv = getAvailableLeaves(b);          break;
        case "thisMonth":  av = monthLeaveCounts[a.employeeId] || 0; bv = monthLeaveCounts[b.employeeId] || 0; break;
        default:           av = a.name || "";                   bv = b.name || "";
      }
      if (typeof av === "string") {
        const cmp = av.localeCompare(bv);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      return sortOrder === "asc" ? av - bv : bv - av;
    });
  }, [allocations, sortKey, sortOrder, getAvailableLeaves, getUtilizedLeaves, monthLeaveCounts]);

  const thCls = "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide select-none whitespace-nowrap";
  const thCenterCls = "px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide select-none whitespace-nowrap";

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Sticky header wrapper needs max-h on parent for sticky to work */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                className={`${thCls} w-64 cursor-pointer hover:bg-slate-100 transition-colors`}
                onClick={() => toggleSort("name")}
              >
                Employee <SortIcon col="name" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className={`${thCls} cursor-pointer hover:bg-slate-100 transition-colors`}
                onClick={() => toggleSort("department")}
              >
                Department <SortIcon col="department" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className={`${thCenterCls} cursor-pointer hover:bg-slate-100 transition-colors`}
                onClick={() => toggleSort("utilized")}
              >
                Utilized <SortIcon col="utilized" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className={`${thCenterCls} cursor-pointer hover:bg-slate-100 transition-colors`}
                onClick={() => toggleSort("available")}
              >
                Available <SortIcon col="available" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
              <th
                className={`${thCenterCls} cursor-pointer hover:bg-slate-100 transition-colors`}
                onClick={() => toggleSort("thisMonth")}
              >
                This Month <SortIcon col="thisMonth" sortKey={sortKey} sortOrder={sortOrder} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((a, idx) => {
              const utilized = getUtilizedLeaves(a);
              const available = getAvailableLeaves(a);
              const thisMonth = monthLeaveCounts[a.employeeId] || 0;
              return (
                <tr
                  key={a.employeeId}
                  className={`transition-colors hover:bg-teal-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  {/* Employee */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={a.name} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{a.name || "—"}</p>
                        <p className="text-xs text-slate-400">ID #{a.employeeId}</p>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3">
                    {a.department ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                        {a.department}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Utilized */}
                  <td className="px-4 py-3 text-center">
                    <Badge label={utilized} variant="utilized" />
                  </td>

                  {/* Available */}
                  <td className="px-4 py-3 text-center">
                    <Badge label={available} variant="available" />
                  </td>

                  {/* This Month */}
                  <td className="px-4 py-3 text-center">
                    {thisMonth > 0 ? (
                      <Badge label={thisMonth} variant="month" />
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{sorted.length}</span> employee{sorted.length !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-slate-400">
          Click column headers to sort
        </p>
      </div>
    </div>
  );
}
