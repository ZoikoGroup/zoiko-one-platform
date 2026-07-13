import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import StatCards from "./StatCards";
import CostTrendChart from "./CostTrendChart";
import BreakdownsChart from "./BreakdownsChart";
import RecentActivity from "./RecentActivity";
import { getDashboardSummary } from "../../../service/payrollService";

export default function DashboardPage({ onNewPayrollRun }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardSummary();
        if (!cancelled) setSummary(res);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payroll Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {loading ? "Loading..." : `Overview for ${monthLabel}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Data
            </span>

            <button
              onClick={onNewPayrollRun}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 shadow-lg shadow-teal-600/25"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Payroll Run
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <StatCards />

        {/* Trend Chart */}
        <CostTrendChart />

        {/* Breakdowns: Department Donut + Pay Type Bar + Deductions */}
        <BreakdownsChart />

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  );
}
