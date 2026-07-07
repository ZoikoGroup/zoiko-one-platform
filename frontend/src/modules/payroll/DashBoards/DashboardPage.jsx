 import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, LayoutDashboard, TrendingUp, Activity } from "lucide-react";
import StatCards from "./StatCards";
import CostTrendChart from "./CostTrendChart";
import RecentActivity from "./RecentActivity";
import { getDashboardSummary, getDashboardTrend, getRecentActivity } from "../../../service/payrollService";

const tabs = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { id: "cost-trends",  label: "Cost Trends",  icon: TrendingUp },
  { id: "activity",     label: "Activity",     icon: Activity },
];

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-80 rounded-xl bg-slate-100 lg:col-span-2" />
        <div className="h-80 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 p-10 text-center">
      <AlertCircle className="mb-3 text-red-500" size={28} />
      <p className="text-sm font-medium text-red-700">Couldn't load the dashboard</p>
      <p className="mt-1 text-xs text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, trendData, activityData] = await Promise.all([
        getDashboardSummary(),
        getDashboardTrend(),
        getRecentActivity(),
      ]);
      setSummary(summaryData);
      setTrend(trendData);
      setActivity(activityData);
    } catch (err) {
      setError(err.message || "Something went wrong while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const sharedLoading = loading && activeTab !== "cost-trends" && activeTab !== "activity";

  return (
    <div className="p-6 lg:p-8">
      {/* Header with tabs */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payroll dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of payroll cost, headcount, and pending activity
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {activeTab === "dashboard" && (
        <>
          {loading && <DashboardSkeleton />}
          {!loading && error && <DashboardError message={error} onRetry={loadDashboard} />}
          {!loading && !error && (
            <div className="space-y-6">
              <StatCards summaryData={summary} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <CostTrendChart trendData={trend} />
                </div>
                <div>
                  <RecentActivity activities={activity} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cost Trends tab */}
      {activeTab === "cost-trends" && (
        <div className="space-y-6">
          <CostTrendChart trendData={trend} />
        </div>
      )}

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <RecentActivity activities={activity} />
        </div>
      )}
    </div>
  );
} 