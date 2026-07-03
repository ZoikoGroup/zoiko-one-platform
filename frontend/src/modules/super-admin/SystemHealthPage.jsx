import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { Activity, Server, Database, HardDrive, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const STATUS_ICONS = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  down: XCircle,
};

const STATUS_COLORS = {
  healthy: "text-emerald-600 bg-emerald-50 border-emerald-200",
  degraded: "text-amber-600 bg-amber-50 border-amber-200",
  down: "text-red-600 bg-red-50 border-red-200",
};

const COMPONENT_ICONS = {
  API: Server,
  Database: Database,
  Storage: HardDrive,
  "Background Jobs": Activity,
};

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadHealth(); }, []);

  const loadHealth = async () => {
    try {
      setError(null);
      const data = await superAdminService.getSystemHealth();
      setHealth(data);
    } catch (e) {
      console.error("Failed to load system health", e);
      setError(e.message || "Failed to load system health.");
    } finally {
      setLoading(false);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      setError(null);
      const data = await superAdminService.runHealthCheck();
      setHealth(data);
    } catch (e) {
      console.error("Failed to run health check", e);
      setError(e.message || "Failed to run health check.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400 font-sans">Loading...</div>;

  const overallColor = health?.overall_status === "healthy" ? "text-emerald-600" : health?.overall_status === "degraded" ? "text-amber-600" : "text-red-600";
  const OverallIcon = STATUS_ICONS[health?.overall_status] || CheckCircle;

  return (
    <div className="space-y-6 font-sans">
      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadHealth} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <PageHeader
        title="System Health"
        description="Monitor platform components including API, database, storage, and background jobs."
        action={
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex items-center gap-2 rounded-full bg-[#FF7A00] hover:bg-[#e56e00] text-white px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Running Check..." : "Run Health Check"}
          </button>
        }
      />

      {/* Overall Status */}
      <div className={`rounded-3xl border p-6 shadow-sm flex items-center gap-4 ${
        health?.overall_status === "healthy" ? "bg-emerald-50 border-emerald-200" :
        health?.overall_status === "degraded" ? "bg-amber-50 border-amber-200" :
        "bg-red-50 border-red-200"
      }`}>
        <OverallIcon className={`h-8 w-8 ${overallColor}`} />
        <div>
          <p className={`text-lg font-bold capitalize ${overallColor}`}>{health?.overall_status || "Unknown"}</p>
          <p className="text-sm text-slate-500">Overall System Status</p>
        </div>
        {health?.last_checked && (
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            Last checked: {new Date(health.last_checked).toLocaleString()}
          </div>
        )}
      </div>

      {/* Component Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {health?.components?.map((c) => {
          const Icon = COMPONENT_ICONS[c.component] || Activity;
          const StatusIcon = STATUS_ICONS[c.status] || CheckCircle;
          return (
            <div key={c.component} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${STATUS_COLORS[c.status] || "bg-slate-50 border-slate-200"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{c.component}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${c.status === "healthy" ? "text-emerald-600" : c.status === "degraded" ? "text-amber-600" : "text-red-600"}`} />
                      <span className={`text-xs font-semibold capitalize ${c.status === "healthy" ? "text-emerald-600" : c.status === "degraded" ? "text-amber-600" : "text-red-600"}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>
                {c.response_time_ms != null && (
                  <span className="text-xs text-slate-400">{c.response_time_ms}ms</span>
                )}
              </div>
              {c.message && (
                <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">{c.message}</p>
              )}
            </div>
          );
        })}
      </div>

      {(!health?.components || health.components.length === 0) && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm text-center text-slate-400">
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No health check data yet. Run a health check to see component status.</p>
        </div>
      )}
    </div>
  );
}
