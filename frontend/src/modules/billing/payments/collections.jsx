import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, Search, Filter, X, RefreshCw, AlertCircle,
  CheckCircle, ArrowUpCircle, FileText,
  Plus, Loader2,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { collectionApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "escalated", label: "Escalated" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function getStatusStyle(status) {
  const map = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-slate-100 text-slate-500",
    escalated: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

function getPriorityStyle(priority) {
  const map = {
    low: "bg-slate-100 text-slate-600",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return map[priority] || "bg-gray-100 text-gray-600";
}

export default function CollectionsPage() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [resolveModal, setResolveModal] = useState({ open: false, caseId: null, resolution: "" });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: safePage, per_page: ITEMS_PER_PAGE };
      if (debouncedSearch) params.search_term = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await collectionApi.listCases(params);
      const items = extractArray(data);
      setCases(items);
      setTotal(data?.total || data?.total_count || items.length);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load collections cases");
    } finally {
      setLoading(false);
    }
  }, [safePage, debouncedSearch, statusFilter, priorityFilter]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await fetchCases();
    setRefreshing(false);
  }, [fetchCases]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleEscalate = async (caseId) => {
    setActionLoading(`escalate-${caseId}`);
    try {
      await collectionApi.escalateCase(caseId);
      await fetchCases();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to escalate case");
    } finally { setActionLoading(null); }
  };

  const handleResolve = async () => {
    if (!resolveModal.caseId || !resolveModal.resolution.trim()) return;
    setActionLoading("resolve");
    try {
      await collectionApi.resolveCase(resolveModal.caseId, resolveModal.resolution);
      setResolveModal({ open: false, caseId: null, resolution: "" });
      await fetchCases();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to resolve case");
    } finally { setActionLoading(null); }
  };

  const handleClose = async (caseId) => {
    setActionLoading(`close-${caseId}`);
    try {
      await collectionApi.closeCase(caseId);
      await fetchCases();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to close case");
    } finally { setActionLoading(null); }
  };

  const activeCases = cases.filter((c) => c.status === "open" || c.status === "in_progress" || c.status === "escalated");
  const resolvedCases = cases.filter((c) => c.status === "resolved");
  const escalatedCases = cases.filter((c) => c.status === "escalated");

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setCurrentPage(1);
  }

  const hasActiveFilters = debouncedSearch || statusFilter || priorityFilter;

  return (
    <>
    <HRPage title="Collections" subtitle="Manage collections cases">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search cases..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 w-64" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}>
            <Filter className="h-4 w-4" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-violet-500" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
        <button onClick={refreshAll} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-violet-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Cases</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCases.length}</p>
          <p className="text-xs text-gray-400 mt-1">{cases.length} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved (MTD)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{resolvedCases.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="h-5 w-5 text-red-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Escalated</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{escalatedCases.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchCases} />
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No collections cases found</p>
            <p className="text-xs text-gray-400">{hasActiveFilters ? "Try adjusting your filters." : "No active collections cases at this time."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Case</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Outstanding</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Assigned To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{c.case_number || `#${c.id}`}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{c.customer_name || `Customer #${c.customer_id}`}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">{formatDisplayCurrency(c.total_outstanding, c.currency)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(c.status)}`}>
                        {c.status ? c.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(c.priority)}`}>
                        {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : "Normal"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {c.assigned_to_name || c.assigned_to ? `User #${c.assigned_to}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/billing/payments/collections/${c.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100">
                          <FileText className="h-3.5 w-3.5" /> View
                        </button>
                        {(c.status === "open" || c.status === "in_progress" || c.status === "escalated") && (
                          <>
                            <button onClick={() => handleEscalate(c.id)} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                              {actionLoading === `escalate-${c.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpCircle className="h-3 w-3" />}
                            </button>
                            <button onClick={() => setResolveModal({ open: true, caseId: c.id, resolution: "" })} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                              <CheckCircle className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleClose(c.id)} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50">
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, total)}–{Math.min(safePage * ITEMS_PER_PAGE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      page === safePage ? "bg-violet-600 text-white" : "text-gray-600 bg-gray-100 hover:bg-gray-200"
                    }`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </HRPage>
    {resolveModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (actionLoading !== "resolve") setResolveModal({ open: false, caseId: null, resolution: "" }); }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Collections Case</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Resolution *</label>
            <textarea value={resolveModal.resolution} onChange={(e) => setResolveModal((p) => ({ ...p, resolution: e.target.value }))} rows={3}
              placeholder="Describe how this case was resolved..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setResolveModal({ open: false, caseId: null, resolution: "" })} disabled={actionLoading === "resolve"}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleResolve} disabled={actionLoading === "resolve" || !resolveModal.resolution.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
              {actionLoading === "resolve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Resolve
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
