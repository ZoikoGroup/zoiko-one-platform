import { useState, useEffect } from "react";
import { Check, Clock, ChevronRight, Loader2 } from "lucide-react";
import { getDashboardRecentRuns } from "../../../service/payrollService";

function fmtCurrency(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `\u20b9 ${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20b9 ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20b9 ${(v / 1000).toFixed(0)}K`;
  return `\u20b9 ${v.toLocaleString("en-IN")}`;
}

function StatusBadge({ status }) {
  const isPaid = status === "Paid";
  const isDraft = status === "Draft";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      isPaid ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
      isDraft ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400" :
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
    }`}>
      {isPaid ? <Check size={11} strokeWidth={3} /> : <Clock size={11} strokeWidth={3} />}
      {status || "Draft"}
    </span>
  );
}

const HEADERS = ["PAY PERIOD", "PAY DATE", "EMPLOYEES", "GROSS", "NET", "STATUS", ""];

export default function RecentActivity({ onViewAll }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardRecentRuns();
        if (!cancelled) setRuns(Array.isArray(res) ? res : []);
      } catch {
        if (!cancelled) setRuns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Payroll Runs</h3>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {loading ? "Loading..." : `${runs.length} recent run${runs.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
          >
            View All <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={18} className="animate-spin text-teal-500" />
        </div>
      ) : runs.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
          No payroll runs yet. Create your first run to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 transition hover:bg-slate-50 dark:hover:bg-slate-700/30 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-3 py-3.5 text-sm font-medium text-slate-900 dark:text-white">
                    {run.periodLabel || run.period_label || "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                    {run.payDate || run.pay_date || "\u2014"}
                  </td>
                  <td className="px-3 py-3.5 text-sm text-slate-600 dark:text-slate-400">
                    {run.employeeCount ?? run.employee_count ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-teal-600 dark:text-teal-400">
                    {fmtCurrency(run.totalGross ?? run.total_gross)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-sm font-bold text-teal-700 dark:text-teal-300">
                    {fmtCurrency(run.totalNet ?? run.total_net)}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-3 py-3.5 text-slate-300 dark:text-slate-600">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
