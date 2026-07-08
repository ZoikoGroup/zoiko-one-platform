import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, Search, Filter, X, RefreshCw, AlertCircle,
  Clock, ArrowRight, FileText,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const AGING_OPTIONS = [
  { value: "", label: "All Aging" },
  { value: "current", label: "Current (0-30d)" },
  { value: "31-60", label: "31-60 Days" },
  { value: "61-90", label: "61-90 Days" },
  { value: "90+", label: "90+ Days" },
];

function getAgingBucket(invoice) {
  if (!invoice.due_date) return "current";
  const dueDate = new Date(invoice.due_date);
  const now = new Date();
  const diffDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "current";
  if (diffDays <= 30) return "31-60";
  if (diffDays <= 60) return "61-90";
  return "90+";
}

function getBucketLabel(bucket) {
  const map = {
    current: "Current (0-30d)",
    "31-60": "31-60 Days",
    "61-90": "61-90 Days",
    "90+": "90+ Days",
  };
  return map[bucket] || bucket;
}

function getBucketStyle(bucket) {
  const map = {
    current: "text-emerald-600 bg-emerald-50",
    "31-60": "text-amber-600 bg-amber-50",
    "61-90": "text-orange-600 bg-orange-50",
    "90+": "text-red-600 bg-red-50",
  };
  return map[bucket] || "text-gray-600 bg-gray-50";
}

export default function ReceivablesPage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [agingFilter, setAgingFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchReceivables = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: safePage, per_page: ITEMS_PER_PAGE, status: "sent" };
      if (debouncedSearch) params.search_term = debouncedSearch;
      const data = await invoiceApi.list(params);
      const items = extractArray(data);
      setInvoices(items);
      setTotal(data?.total || data?.total_count || items.length);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load receivables");
    } finally {
      setLoading(false);
    }
  }, [safePage, debouncedSearch]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await fetchReceivables();
    setRefreshing(false);
  }, [fetchReceivables]);

  useEffect(() => { fetchReceivables(); }, [fetchReceivables]);

  const filteredInvoices = invoices.filter((inv) => {
    if (!agingFilter) return true;
    return getAgingBucket(inv) === agingFilter;
  });

  const agingBuckets = invoices.reduce((acc, inv) => {
    const bucket = getAgingBucket(inv);
    acc[bucket] = (acc[bucket] || 0) + Number(inv.total_amount || inv.amount || 0);
    return acc;
  }, {});

  const totalReceivables = Object.values(agingBuckets).reduce((s, v) => s + v, 0);
  const currentAmount = agingBuckets["current"] || 0;
  const overdueAmount = (agingBuckets["31-60"] || 0) + (agingBuckets["61-90"] || 0);
  const badDebtAmount = agingBuckets["90+"] || 0;

  const displayInvoices = filteredInvoices;

  function clearFilters() {
    setSearch("");
    setAgingFilter("");
    setCurrentPage(1);
  }

  const hasActiveFilters = debouncedSearch || agingFilter;

  return (
    <HRPage title="Receivables" subtitle="Manage outstanding receivables and aging">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search invoices..." value={search}
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
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Aging Bucket</label>
              <select value={agingFilter} onChange={(e) => { setAgingFilter(e.target.value); setCurrentPage(1); }}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {AGING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-violet-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Receivables</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDisplayCurrency(totalReceivables)}</p>
          <p className="text-xs text-gray-400 mt-1">{invoices.length} outstanding invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current (0-30d)</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatDisplayCurrency(currentAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-5 w-5 text-amber-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue (31-90d)</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatDisplayCurrency(overdueAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bad Debt (90+)</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatDisplayCurrency(badDebtAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchReceivables} />
        ) : displayInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No receivables found</p>
            <p className="text-xs text-gray-400">{hasActiveFilters ? "Try adjusting your filters." : "No outstanding invoices at this time."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Invoice</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Aging</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayInvoices.map((inv) => {
                  const bucket = getAgingBucket(inv);
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{inv.invoice_number || `#${inv.id}`}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{inv.customer_name || `Customer #${inv.customer_id}`}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{formatDisplayCurrency(inv.total_amount || inv.amount)}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDisplayDate(inv.due_date)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBucketStyle(bucket)}`}>
                          {getBucketLabel(bucket)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100">
                          <FileText className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
  );
}
