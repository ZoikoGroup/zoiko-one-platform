import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Search, Filter, X, ChevronDown, RefreshCw, Plus, CheckCircle, Clock, XCircle, ArrowUpDown, Download, Ban, DollarSign, Wallet, TrendingUp, Percent, Loader2, Eye, Receipt,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { contractApi, customerApi, quoteApi, invoiceApi, subscriptionApi, pricingApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "pending", label: "Pending", color: "bg-blue-100 text-blue-700" },
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-700" },
  { value: "terminated", label: "Terminated", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-500" },
];

const BILLING_PERIODS = [
  { value: "", label: "All Periods" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
];

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  if (!s) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status || "unknown"}</span>;
  const icons = { active: CheckCircle, pending: Clock, draft: FileText, expired: Clock, terminated: XCircle, cancelled: Ban };
  const Icon = icons[status] || Clock;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}><Icon size={12} /> {s.label}</span>;
}

function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{label}</p>
        {Icon && <Icon size={16} className="text-slate-300 shrink-0" />}
      </div>
      <p className={`text-2xl font-bold truncate ${color || "text-slate-800"}`} title={typeof value === 'string' ? value : undefined}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function SortHeader({ field, label, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">{label}<ArrowUpDown size={12} className={`${active ? "text-violet-600" : "text-slate-300"}`} /></div>
    </th>
  );
}

export default function ContractListPage() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [billingFilter, setBillingFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchContracts = useCallback(async (isInitial = false) => {
    try {
      setError(null);
      if (!isInitial) setRefreshing(true);
      const sortBy = sortField === "value" ? "value" : sortField === "customer" ? "customer_id" : sortField === "start_date" ? "start_date" : sortField;
      const data = await contractApi.list({
        page: safePage, per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
        billing_period: billingFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy, sort_order: sortDir,
      });
      const items = extractArray(data);
      setContracts(items);
      setTotal(data?.total || items.length || 0);
    } catch (err) {
      setError(err.message || "Failed to load contracts");
      setContracts([]); setTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, billingFilter, dateFrom, dateTo, sortField, sortDir]);

  useEffect(() => { fetchContracts(true); }, [fetchContracts]);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(contracts.map((c) => c.id))); setSelectAll(true); }
  };

  const handleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
    setSelectAll(next.size === contracts.length && contracts.length > 0);
  };

  const handleBulkAction = async (status) => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Mark ${selectedIds.size} contract(s) as ${status}?`)) return;
    setBulkLoading(true);
    try {
      for (const id of selectedIds) {
        if (status === "active") await contractApi.activate(id);
        else if (status === "cancelled") await contractApi.cancel(id);
        else if (status === "terminated") await contractApi.terminate(id);
      }
      setSelectedIds(new Set()); setSelectAll(false);
      fetchContracts();
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally { setBulkLoading(false); }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(contracts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contracts.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["Contract #", "Name", "Customer", "Value", "Currency", "Status", "Start Date", "End Date", "Billing Period", "Auto Renew"];
    const rows = contracts.map((c) => [
      c.contract_number || `#${c.id}`, c.contract_name || "",
      c.customer_name || c.customer?.name || "", c.total_value || c.value || 0, c.currency || "",
      c.status || "", c.start_date || "", c.end_date || "",
      c.billing_period || "", c.auto_renew ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contracts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const defaultCurrency = contracts.length > 0
    ? (contracts.find((c) => c.currency)?.currency || "")
    : "";

  const filteredByStatus = (status) => contracts.filter((c) => c.status === status);
  const activeContracts = filteredByStatus("active");
  const expiringContracts = filteredByStatus("active").filter((c) => {
    if (!c.end_date) return false;
    const end = new Date(c.end_date);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  });
  const expiredContracts = filteredByStatus("expired");
  const totalValue = contracts.reduce((s, c) => s + parseFloat(c.total_value || c.value || 0), 0);
  const activeValue = activeContracts.reduce((s, c) => s + parseFloat(c.total_value || c.value || 0), 0);
  const mrr = activeContracts.reduce((s, c) => {
    const val = parseFloat(c.total_value || c.value || 0);
    if (c.billing_period === "monthly") return s + val;
    if (c.billing_period === "quarterly") return s + val / 3;
    if (c.billing_period === "semi_annually") return s + val / 6;
    if (c.billing_period === "annually") return s + val / 12;
    return s + val / 12;
  }, 0);
  const arr = mrr * 12;

  if (loading) return <HRPage title="Contracts" subtitle="Enterprise commercial agreement workspace"><Spinner /></HRPage>;
  if (error && contracts.length === 0) return <HRPage title="Contracts" subtitle="Enterprise commercial agreement workspace"><ErrorState message={error} onRetry={() => fetchContracts(true)} /></HRPage>;

  return (
    <HRPage title="Contracts" subtitle="Enterprise commercial agreement workspace">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
          <KpiCard label="Active Contracts" value={activeContracts.length} color="text-emerald-600" icon={FileText} />
          <KpiCard label="Expiring Soon (30d)" value={expiringContracts.length} color="text-amber-600" icon={Clock} />
          <KpiCard label="Expired" value={expiredContracts.length} color="text-gray-600" icon={XCircle} />
          <KpiCard label="Draft" value={filteredByStatus("draft").length} color="text-slate-600" icon={FileText} />
          <KpiCard label="Total Contract Value" value={formatDisplayCurrency(totalValue, defaultCurrency)} color="text-violet-600" icon={DollarSign} />
          <KpiCard label="Active Value" value={formatDisplayCurrency(activeValue, defaultCurrency)} color="text-emerald-600" icon={Wallet} />
          <KpiCard label="Monthly Recurring" value={formatDisplayCurrency(mrr, defaultCurrency)} color="text-blue-600" icon={TrendingUp} />
          <KpiCard label="Annual Recurring" value={formatDisplayCurrency(arr, defaultCurrency)} color="text-purple-600" icon={Percent} />
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search contracts..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  <Filter size={18} />
                </button>
                <button onClick={() => { setRefreshing(true); fetchContracts(); }} disabled={refreshing}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                  <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                </button>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{selectedIds.size} selected</span>
                    <button onClick={() => handleBulkAction("active")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                      {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Activate
                    </button>
                    <button onClick={() => handleBulkAction("cancelled")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50">
                      <XCircle size={12} /> Cancel
                    </button>
                    <button onClick={() => handleBulkAction("terminated")} disabled={bulkLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50">
                      <Ban size={12} /> Terminate
                    </button>
                    <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                )}
              </div>
<div className="flex items-center gap-2">
                <button onClick={handleExportJSON} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export JSON"><Download size={18} /></button>
                <button onClick={handleExportCSV} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export CSV"><FileText size={18} /></button>
                <button onClick={() => navigate("/billing/contracts/create")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
                  <Plus size={18} /> Create Contract
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
                  <select value={billingFilter} onChange={(e) => { setBillingFilter(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {BILLING_PERIODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                {(statusFilter || billingFilter || dateFrom || dateTo) && (
                  <button onClick={() => { setStatusFilter(""); setBillingFilter(""); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <SortHeader field="start_date" label="Start" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="end_date" label="End" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <FileText size={40} className="text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No contracts found</p>
                        <p className="text-slate-400 text-sm mt-1">{search || statusFilter ? "Try adjusting your search or filters" : "Create your first contract to get started"}</p>
                      </div>
                    </td>
                  </tr>
                ) : contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => navigate(`/billing/contracts/${c.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-slate-400" />
                          {c.contract_number || `#${c.id}`}
                        </div>
                        {c.contract_name && <p className="text-xs text-slate-400 mt-0.5">{c.contract_name}</p>}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{c.customer_name || c.customer?.name || `Customer #${c.customer_id}`}</td>
                    <td className="px-4 py-4 font-medium text-slate-800">{formatDisplayCurrency(c.total_value || c.value, c.currency)}</td>
                    <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(c.start_date)}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(c.end_date) || "—"}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs capitalize">{c.billing_period?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => navigate(`/billing/contracts/${c.id}`)}
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
              <span className="text-xs text-slate-400">{total} total contract(s)</span>
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