import { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/PageHeader";
import { Shield, Search, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

export default function SecurityCenter() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = { page, page_size: pageSize };
      if (severityFilter) params.severity = severityFilter;
      if (resolvedFilter === "resolved") params.is_resolved = true;
      if (resolvedFilter === "unresolved") params.is_resolved = false;
      const data = await superAdminService.getSecurityEvents(params);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to load security events", e);
      setError(e.message || "Failed to load security events.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, severityFilter, resolvedFilter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id) => {
    try {
      await superAdminService.resolveSecurityEvent(id, { resolved_by: 0 });
      load();
    } catch (e) { console.error(e); }
  };

  const totalPages = Math.ceil(total / pageSize);

  const severityIcon = (s) => {
    if (s === "critical") return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (s === "high") return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (s === "medium") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const severityColors = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
    info: "bg-slate-100 text-slate-600",
  };

  return (
    <div>
      <PageHeader
        title="Security Center"
        description="Monitor security events and threats across the platform"
        icon={Shield}
      />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-[#FF7A00] focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <select
            value={resolvedFilter}
            onChange={(e) => { setResolvedFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-[#FF7A00] focus:outline-none"
          >
            <option value="">All Events</option>
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <span className="text-sm text-slate-500">{total} event{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF7A00] border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Shield className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">No security events</p>
            <p className="text-sm">All clear — no threats detected</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((e) => (
              <div key={e.id} className={`flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50 ${!e.is_resolved ? "bg-red-50/30" : ""}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  {severityIcon(e.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{e.event_type}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[e.severity] || "bg-slate-100 text-slate-600"}`}>{e.severity}</span>
                    {!e.is_resolved ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Resolved</span>
                    )}
                  </div>
                  {e.description ? <p className="mt-1 text-sm text-slate-500">{e.description}</p> : null}
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    {e.source_ip ? <span>IP: {e.source_ip}</span> : null}
                    {e.user_email ? <span>User: {e.user_email}</span> : null}
                    {e.organization_name ? <span>Org: {e.organization_name}</span> : null}
                    <span>{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!e.is_resolved ? (
                    <button onClick={() => handleResolve(e.id)} className="rounded-lg p-2 text-slate-400 hover:bg-green-50 hover:text-green-500 transition" title="Resolve">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}