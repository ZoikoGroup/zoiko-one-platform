import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Repeat, Search, Filter, X, ChevronDown, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, FileText, PauseCircle, XCircle, ArrowUpDown, Download, Ban, DollarSign, User, Wallet, TrendingUp, Percent, Calendar, Loader2, Eye, Trash2, Receipt, Building, Phone, Mail, Hash, Layers, Package, CreditCard, Send, RotateCcw, Shield, Play,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { subscriptionApi, contractApi, customerApi, invoiceApi, paymentApi, settingsApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "paused", label: "Paused", color: "bg-amber-100 text-amber-700" },
  { value: "past_due", label: "Past Due", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-500" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-700" },
];

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  if (!s) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status || "unknown"}</span>;
  const icons = { active: CheckCircle, paused: PauseCircle, past_due: AlertCircle, cancelled: XCircle, expired: Clock };
  const Icon = icons[status] || Clock;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}><Icon size={12} /> {s.label}</span>;
}

function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{label}</p>
        {Icon && <Icon size={16} className="text-slate-300 shrink-0" />}
      </div>
      <p className={`text-xl font-bold whitespace-nowrap ${color || "text-slate-800"}`} title={typeof value === 'string' ? value : undefined}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function SortHeader({ field, label, sortField, sortDir, onSort, align }) {
  const active = sortField === field;
  return (
    <th className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 ${align === "right" ? "text-right" : "text-left"}`} onClick={() => onSort(field)}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>{label}<ArrowUpDown size={12} className={`${active ? "text-violet-600" : "text-slate-300"}`} /></div>
    </th>
  );
}

export default function SubscriptionListPage() {
  const navigate = useNavigate();

  const [subscriptions, setSubscriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [orgCurrency, setOrgCurrency] = useState("");
  const [reporting, setReporting] = useState(null);

  useEffect(() => {
    settingsApi.getConfig().then((cfg) => {
      if (cfg?.default_currency) setOrgCurrency(cfg.default_currency);
      else if (cfg?.currency) setOrgCurrency(cfg.currency);
    }).catch(() => {});
  }, []);

  // Backward-compat: redirect ?create=1 and ?contract_id to full-page create
  const [searchParams, setSearchParams] = useSearchParams();
  const createParam = searchParams.get("create");
  const contractIdParam = searchParams.get("contract_id");
  const customerIdParam = searchParams.get("customer_id");

  useEffect(() => {
    if (createParam === "1" || contractIdParam || customerIdParam) {
      const params = new URLSearchParams();
      if (contractIdParam) params.set("contract_id", contractIdParam);
      if (customerIdParam) params.set("customer_id", customerIdParam);
      const qs = params.toString();
      navigate(`/billing/subscriptions/create${qs ? `?${qs}` : ""}`, { replace: true });
    }
  }, [createParam, contractIdParam, customerIdParam, navigate]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchSubscriptions = useCallback(async (isInitial = false) => {
    try {
      setError(null);
      if (!isInitial) setRefreshing(true);
      const sortBy = sortField === "amount" ? "unit_price" : sortField === "customer" ? "customer_id" : sortField === "next_billing" ? "next_billing_at" : sortField;
      const data = await subscriptionApi.list({
        page: safePage, per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy, sort_order: sortDir,
      });
      const items = extractArray(data);
      setSubscriptions(items);
      setTotal(data?.total || items.length || 0);
      try {
        const rpt = await subscriptionApi.getReporting();
        setReporting(rpt);
        if (rpt?.reporting_currency) setOrgCurrency(rpt.reporting_currency);
      } catch { setReporting(null); }
    } catch (err) {
      setError(err.message || "Failed to load subscriptions");
      setSubscriptions([]); setTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, sortField, sortDir]);

  useEffect(() => { fetchSubscriptions(true); }, [fetchSubscriptions]);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(subscriptions.map((s) => s.id))); setSelectAll(true); }
  };

  const handleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === subscriptions.length && subscriptions.length > 0);
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const labels = { pause: "pause", resume: "resume", cancel: "cancel" };
    if (!window.confirm(`${labels[action]} ${selectedIds.size} subscription(s)?`)) return;
    setBulkLoading(true);
    try {
      for (const id of selectedIds) {
        if (action === "pause") await subscriptionApi.pause(id);
        else if (action === "resume") await subscriptionApi.resume(id);
        else if (action === "cancel") await subscriptionApi.cancel(id);
      }
      setSelectedIds(new Set()); setSelectAll(false);
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally { setBulkLoading(false); }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(subscriptions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscriptions.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["Subscription #", "Customer", "Plan", "Amount", "Currency", "Status", "Next Billing", "Start Date", "End Date"];
    const rows = subscriptions.map((s) => [
      s.subscription_number || `#${s.id}`, s.customer_name || s.customer?.name || "",
      s.plan_name || s.plan?.name || "", s.amount || s.unit_price || 0, s.currency || orgCurrency,
      s.status || "", s.next_billing_at || "", s.start_date || "", s.current_term_end || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscriptions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const pausedSubs = subscriptions.filter((s) => s.status === "paused");
  const cancelledSubs = subscriptions.filter((s) => s.status === "cancelled");
  const expiringSubs = activeSubs.filter((s) => {
    if (!s.current_term_end) return false;
    const end = new Date(s.current_term_end);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  });

  const mrr = reporting?.mrr != null ? parseFloat(reporting.mrr) : 0;
  const arr = reporting?.arr != null ? parseFloat(reporting.arr) : 0;
  const reportingCurrency = reporting?.reporting_currency || orgCurrency || "USD";
  const nextBillingAmount = subscriptions
    .filter((s) => s.next_billing_at)
    .reduce((sum, s) => sum + parseFloat(s.unit_price || s.amount || 0) * parseInt(s.quantity || 1), 0);

  if (loading) return <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine"><Spinner /></HRPage>;
  if (error && subscriptions.length === 0) return <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine"><ErrorState message={error} onRetry={() => fetchSubscriptions(true)} /></HRPage>;

  return (
    <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3">
          <KpiCard label="Active" value={activeSubs.length} color="text-emerald-600" icon={CheckCircle} />
          <KpiCard label="Paused" value={pausedSubs.length} color="text-amber-600" icon={PauseCircle} />
          <KpiCard label="Cancelled" value={cancelledSubs.length} color="text-slate-600" icon={XCircle} />
          <KpiCard label="Expiring Soon (30d)" value={expiringSubs.length} color="text-red-600" icon={AlertCircle} />
          <KpiCard label="MRR" value={formatDisplayCurrency(mrr, reportingCurrency)} color="text-blue-600" icon={TrendingUp} />
          <KpiCard label="ARR" value={formatDisplayCurrency(arr, reportingCurrency)} color="text-purple-600" icon={Percent} />
          <KpiCard label="Next Billing Amt" value={formatDisplayCurrency(nextBillingAmount, reportingCurrency)} color="text-violet-600" icon={DollarSign} />
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search subscriptions..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  <Filter size={18} />
                </button>
                <button onClick={() => { setRefreshing(true); fetchSubscriptions(); }} disabled={refreshing}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                  <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                </button>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{selectedIds.size} selected</span>
                    <button onClick={() => handleBulkAction("pause")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                      {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <PauseCircle size={12} />} Pause
                    </button>
                    <button onClick={() => handleBulkAction("resume")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                      <Play size={12} /> Resume
                    </button>
                    <button onClick={() => handleBulkAction("cancel")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50">
                      <XCircle size={12} /> Cancel
                    </button>
                    <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportJSON} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export JSON"><Download size={18} /></button>
                <button onClick={handleExportCSV} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export CSV"><FileText size={18} /></button>
                <button onClick={() => navigate("/billing/subscriptions/create")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
                  <Plus size={18} /> Create Subscription
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <div className="relative">
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="From" />
                </div>
                <div className="relative">
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="To" />
                </div>
                {(statusFilter || dateFrom || dateTo) && (
                  <button onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium">Clear filters</button>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                   <SortHeader field="amount" label="Amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <SortHeader field="next_billing" label="Next Billing" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="start_date" label="Start Date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <Repeat size={40} className="text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No subscriptions found</p>
                    <p className="text-slate-400 text-sm mt-1">{search || statusFilter ? "Try adjusting your search or filters" : "Create your first subscription to get started"}</p>
                    {!search && !statusFilter && (
                      <button onClick={() => navigate("/billing/subscriptions/create")}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                        <Plus size={16} /> Create your first subscription
                      </button>
                    )}
                      </div>
                    </td>
                  </tr>
                ) : subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => handleSelectOne(s.id)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => navigate(`/billing/subscriptions/${s.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-slate-400" />
                          {s.subscription_number || `#${s.id}`}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.customer_name || s.customer?.name || `Customer #${s.customer_id}`}</td>
                    <td className="px-4 py-4 text-slate-600">{s.plan_name || s.plan?.name || `Plan #${s.plan_id}`}</td>
                     <td className="px-4 py-4 font-medium text-slate-800 whitespace-nowrap text-right">{formatDisplayCurrency(s.amount || s.unit_price, s.currency)}</td>
                    <td className="px-4 py-4"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(s.next_billing_at)}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(s.start_date)}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs capitalize">{s.plan_billing_period || s.billing_period || "—"}</td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => navigate(`/billing/subscriptions/${s.id}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="View">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">{total} total subscription(s)</span>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 5, totalPages - 9));
                  const page = start + i;
                  if (page > totalPages) return null;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs border rounded-lg ${page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"}`}>{page}</button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </HRPage>
  );
}