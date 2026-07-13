import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Receipt, Search, Filter, X, ChevronDown, RefreshCw,
  AlertCircle, CheckCircle, Clock, FileText, Plus,
  Calendar, DollarSign, Eye, ArrowUpDown, Send, Ban, Download,
  Wallet, BarChart3
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi } from "../../../service/billingService";
import { getCurrencySelectOptions } from "../../../utils/currency";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import InvoiceDashboard from "./invoice-dashboard";
import CreateInvoiceWizard from "./create-invoice-wizard";

const ITEMS_PER_PAGE = 15;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-700" },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-700" },
  { value: "overdue", label: "Overdue", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-amber-100 text-amber-700" },
  { value: "partially_paid", label: "Partially Paid", color: "bg-purple-100 text-purple-700" },
  { value: "refunded", label: "Refunded", color: "bg-pink-100 text-pink-700" },
];

const CURRENCY_OPTIONS = getCurrencySelectOptions();

const STATUS_ICONS = {
  draft: Clock, sent: Send, paid: CheckCircle, overdue: AlertCircle,
  cancelled: Ban, partially_paid: Wallet, refunded: Receipt,
};

export default function InvoicingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [viewMode, setViewMode] = useState("table");
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      const data = await invoiceApi.list({
        page: safePage,
        per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
        currency: currencyFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_amount: minAmount || undefined,
        max_amount: maxAmount || undefined,
        sort_by: sortField,
        sort_order: sortDir,
      });
      const items = data.items || data.data || data || [];
      setInvoices(Array.isArray(items) ? items : []);
      setTotal(data.total || items.length || 0);
    } catch (err) {
      setError(err.message || "Failed to load invoices");
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, currencyFilter, dateFrom, dateTo, minAmount, maxAmount, sortField, sortDir, loading]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    if (searchParams.get("create") === "1") setSearchParams({}, { replace: true });
  };

  useEffect(() => {
    const requestedStatus = searchParams.get("status");
    if (requestedStatus) setStatusFilter(requestedStatus);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("create") === "1" && !showCreateModal) openCreateModal();
  }, [searchParams, showCreateModal]);

  const handleRefresh = () => { setRefreshing(true); fetchInvoices(); };

  const StatusBadge = ({ status }) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-amber-100 text-amber-700",
      partially_paid: "bg-purple-100 text-purple-700",
      refunded: "bg-pink-100 text-pink-700",
      void: "bg-gray-100 text-gray-500",
    };
    const Icon = STATUS_ICONS[status] || Clock;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        <Icon size={12} />
        {(status || "unknown").replace(/_/g, " ")}
      </span>
    );
  };

  const toggleSort = (field) => {
    setSortField(field);
    setSortDir((d) => (field === sortField ? (d === "asc" ? "desc" : "asc") : "asc"));
  };

  const displayInvoices = [...invoices].sort((a, b) => {
    const aVal = a[sortField] || "";
    const bVal = b[sortField] || "";
    if (sortField === "total_amount" || sortField === "total") {
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at || b.issue_date || 0) - new Date(a.created_at || a.issue_date || 0))
    .slice(0, 3);

  const toggleInvoiceSelection = (id) => {
    setSelectedInvoices((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleAllVisible = () => {
    const visibleIds = displayInvoices.map((inv) => inv.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedInvoices.includes(id));
    setSelectedInvoices(allSelected ? selectedInvoices.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedInvoices, ...visibleIds])));
  };

  const runBulkInvoiceAction = async (action) => {
    if (selectedInvoices.length === 0) return;
    try {
      setRefreshing(true);
      const calls = selectedInvoices.map((id) => {
        if (action === "finalize") return invoiceApi.finalize(id);
        if (action === "send") return invoiceApi.markSent(id);
        if (action === "cancel") return invoiceApi.cancel(id, "Cancelled from invoice list");
        return Promise.resolve();
      });
      await Promise.allSettled(calls);
      setSelectedInvoices([]);
      await fetchInvoices();
    } catch (err) {
      setError(err?.detail || err?.message || "Bulk action failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <HRPage title="Invoices" subtitle="Manage invoices">
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-100 p-8">
            <h1 className="text-3xl font-extrabold text-slate-800">Invoices</h1>
            <p className="mt-2 text-slate-600">Enterprise invoicing management</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-10 bg-slate-200 rounded-xl w-64" />
              <div className="h-10 bg-slate-200 rounded-xl w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </HRPage>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <HRPage title="Invoices" subtitle="Manage invoices">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4"><AlertCircle size={32} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Invoices" subtitle="Create, send, and collect customer invoices">
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-100 p-8 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Invoices</h1>
            <p className="mt-1 text-slate-500">Manage, send, and track customer invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/billing/invoices/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <BarChart3 size={16} /> Dashboard
            </button>
            <button onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
              <Plus size={16} /> Create Invoice
            </button>
          </div>
        </div>
        {recentInvoices.length > 0 && (
          <div className="mt-4 border-t border-violet-100/50 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recently Created</p>
              <button onClick={() => { setStatusFilter(""); setCurrentPage(1); }} className="text-xs font-medium text-violet-600 hover:text-violet-700">View all</button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {recentInvoices.map((inv) => (
                <button key={inv.id} onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                  className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-left transition-colors hover:border-violet-200 hover:bg-violet-50">
                  <span className="block text-sm font-semibold text-slate-800">{inv.invoice_number || `#${inv.id}`}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{inv.customer_name || `Customer #${inv.customer_id || "—"}`} &middot; {formatDisplayCurrency(inv.total || inv.total_amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by invoice number, customer, PO..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search invoices"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search"><X size={16} /></button>
                )}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                aria-label="Toggle filters">
                <Filter size={18} />
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50" aria-label="Refresh">
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">{total} invoice(s)</span>
              <button onClick={openCreateModal} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">
                <Plus size={16} /> Create Invoice
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={currencyFilter}
                    onChange={(e) => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
                    className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">All Currencies</option>
                    {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label="Date from" />
                  <span className="text-slate-400">to</span>
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label="Date to" />
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-slate-400" />
                  <input type="number" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setCurrentPage(1); }}
                    placeholder="Min" className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label="Minimum amount" />
                  <span className="text-slate-400">-</span>
                  <input type="number" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setCurrentPage(1); }}
                    placeholder="Max" className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" aria-label="Maximum amount" />
                </div>
                {(statusFilter || currencyFilter || dateFrom || dateTo || minAmount || maxAmount) && (
                  <button onClick={() => { setStatusFilter(""); setCurrencyFilter(""); setDateFrom(""); setDateTo(""); setMinAmount(""); setMaxAmount(""); setCurrentPage(1); }}
                    className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1">
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick filters</span>
              {[{ value: "", label: "All" }, ...STATUS_OPTIONS].map((o) => (
                <button key={o.value || "all"} onClick={() => { setStatusFilter(o.value); setCurrentPage(1); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === o.value ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {o.label}
                </button>
              ))}
            </div>
            {selectedInvoices.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
                <span className="text-xs font-semibold text-violet-700">{selectedInvoices.length} selected</span>
                <button onClick={() => runBulkInvoiceAction("finalize")} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-violet-700">
                  <CheckCircle size={13} /> Finalize
                </button>
                <button onClick={() => runBulkInvoiceAction("send")} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700">
                  <Send size={13} /> Send
                </button>
                <button onClick={() => runBulkInvoiceAction("cancel")} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700">
                  <Ban size={13} /> Cancel
                </button>
                <button onClick={() => runBulkInvoiceAction("export")} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-green-700">
                  <Download size={13} /> Export
                </button>
                <button onClick={() => { setSelectedInvoices([]); }} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900">
                  <X size={13} /> Clear
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={displayInvoices.length > 0 && displayInvoices.every((inv) => selectedInvoices.includes(inv.id))}
                    onChange={toggleAllVisible} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" aria-label="Select all" />
                </th>
                <th onClick={() => toggleSort("invoice_number")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1">Invoice <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("customer_name")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1">Customer <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("issue_date")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1">Invoice Date <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("due_date")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1">Due Date <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("total_amount")} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1 justify-end">Amount <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Currency</th>
                <th onClick={() => toggleSort("status")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-violet-600">
                  <span className="inline-flex items-center gap-1">Status <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayInvoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Receipt size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No invoices found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter || currencyFilter || dateFrom || dateTo ? "Try adjusting your search or filters" : "No invoices yet"}</p>
                      {!search && !statusFilter && !currencyFilter && (
                        <button onClick={openCreateModal} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                          <Plus size={16} /> Create your first invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : displayInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedInvoices.includes(inv.id)}
                      onChange={() => toggleInvoiceSelection(inv.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" aria-label={`Select invoice ${inv.invoice_number || inv.id}`} />
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => navigate(`/billing/invoices/${inv.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors">
                      {inv.invoice_number || `#${inv.id}`}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{inv.customer_name || inv.customer?.name || "—"}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(inv.issue_date)}</td>
                  <td className="px-4 py-4 text-slate-500 text-xs">{formatDisplayDate(inv.due_date)}</td>
                  <td className="px-4 py-4 text-right font-medium text-slate-800">{formatDisplayCurrency(inv.total || inv.total_amount)}</td>
                  <td className="px-4 py-4 text-right text-sm text-green-600">{formatDisplayCurrency(inv.paid_amount)}</td>
                  <td className="px-4 py-4 text-right text-sm text-red-600">{formatDisplayCurrency(inv.balance_due)}</td>
                  <td className="px-4 py-4 text-center text-xs font-medium text-slate-500">{inv.currency || "USD"}</td>
                  <td className="px-4 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-4 text-xs text-slate-400">{inv.updated_at ? new Date(inv.updated_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="View" aria-label={`View invoice ${inv.invoice_number || inv.id}`}>
                        <FileText size={16} />
                      </button>
                      <button onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Details" aria-label={`Invoice details`}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">{total} total invoice(s)</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Prev</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 5, totalPages - 9));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"}`}>{page}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeCreateModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CreateInvoiceWizard onClose={closeCreateModal} onCreated={(id) => { closeCreateModal(); navigate(`/billing/invoices/${id}`); }} />
          </div>
        </div>
      )}
    </HRPage>
  );
}
