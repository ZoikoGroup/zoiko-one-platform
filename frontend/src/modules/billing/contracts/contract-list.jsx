import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Search, Filter, X, ChevronDown, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, XCircle, ArrowUpDown, Download, Ban, DollarSign, User, Wallet, TrendingUp, Percent, Calendar, Loader2, Eye, Trash2, Receipt, Building, Phone, Mail, Hash, Layers, Package, CreditCard, Send, RotateCcw, Shield,
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

function WizardStep({ number, label, active, completed }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
        completed ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"
      }`}>
        {completed ? <CheckCircle size={16} /> : number}
      </div>
      <span className={`text-sm font-medium ${active ? "text-violet-700" : completed ? "text-emerald-600" : "text-slate-500"}`}>{label}</span>
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && <Icon size={16} className="text-slate-300" />}
      </div>
      <p className={`text-2xl font-bold ${color || "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    customer_id: "", customer_name: "", customer_email: "", customer_phone: "", customer_currency: "USD", customer_payment_terms: "", customer_tax_id: "",
    quotation_id: "", quotation_number: "", quotation_total: 0, quotation_items: [],
    contract_number: "", contract_name: "", status: "draft",
    start_date: new Date().toISOString().split("T")[0], end_date: "",
    notice_period_days: 30, auto_renew: false, renewal_term_days: "",
    value: 0, currency: "USD",
    billing_period: "monthly", billing_day: 1,
    products: [], pricing: [],
    notes: "", terms: "",
  });
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);

  const [quotationSearch, setQuotationSearch] = useState("");
  const [quotationResults, setQuotationResults] = useState([]);
  const [quotationSearching, setQuotationSearching] = useState(false);

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
        customer_id: billingFilter || undefined,
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
  }, [safePage, debouncedSearch, statusFilter, billingFilter, sortField, sortDir]);

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
      c.customer_name || c.customer?.name || "", c.total_value || c.value || 0, c.currency || "USD",
      c.status || "", c.start_date || "", c.end_date || "",
      c.billing_period || "", c.auto_renew ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contracts.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const openWizard = () => {
    const prefix = "CTR-";
    const ts = Date.now().toString(36).toUpperCase();
    setWizardData({
      customer_id: "", customer_name: "", customer_email: "", customer_phone: "", customer_currency: "USD", customer_payment_terms: "", customer_tax_id: "",
      quotation_id: "", quotation_number: "", quotation_total: 0, quotation_items: [],
      contract_number: `${prefix}${ts}`, contract_name: "", status: "draft",
      start_date: new Date().toISOString().split("T")[0], end_date: "",
      notice_period_days: 30, auto_renew: false, renewal_term_days: "",
      value: 0, currency: "USD",
      billing_period: "monthly", billing_day: 1,
      products: [], pricing: [],
      notes: "", terms: "",
    });
    setWizardStep(1); setWizardError(null); setShowWizard(true);
    setCustomerSearch(""); setCustomerResults([]);
    setQuotationSearch(""); setQuotationResults([]);
  };

  const searchCustomers = useCallback(async (term) => {
    if (!term.trim()) { setCustomerResults([]); return; }
    setCustomerSearching(true);
    try {
      const data = await customerApi.search(term, 10);
      setCustomerResults(Array.isArray(data) ? data : data?.items || data?.data || []);
    } catch { setCustomerResults([]); }
    finally { setCustomerSearching(false); }
  }, []);

  useEffect(() => {
    if (!showWizard || wizardStep !== 1) return;
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, showWizard, wizardStep, searchCustomers]);

  const loadCustomerData = async (customerId) => {
    try {
      const c = await customerApi.get(customerId);
      const currency = c.currency || "USD";
      setWizardData((p) => ({
        ...p, customer_id: c.id,
        customer_name: c.display_name || c.company_name || c.name || `Customer #${c.id}`,
        customer_email: c.email || "", customer_phone: c.phone || "", customer_currency: currency, currency,
        customer_payment_terms: c.payment_terms || "", customer_tax_id: c.tax_id || "",
      }));
    } catch {}
  };

  const selectCustomer = async (c) => {
    const currency = c.currency || "USD";
    setWizardData((p) => ({
      ...p, customer_id: c.id,
      customer_name: c.display_name || c.company_name || c.name || `Customer #${c.id}`,
      customer_email: c.email || "", customer_phone: c.phone || "", customer_currency: currency, currency,
      customer_payment_terms: c.payment_terms || "", customer_tax_id: c.tax_id || "",
    }));
    setCustomerResults([]); setCustomerSearch("");
    await loadCustomerData(c.id);
  };

  const searchQuotations = useCallback(async (term) => {
    if (!term.trim()) { setQuotationResults([]); return; }
    setQuotationSearching(true);
    try {
      const data = await quoteApi.list({ search_term: term, status: "accepted", per_page: 10 });
      const items = extractArray(data);
      const accepted = items.filter((q) => q.status === "accepted");
      setQuotationResults(accepted);
    } catch { setQuotationResults([]); }
    finally { setQuotationSearching(false); }
  }, []);

  useEffect(() => {
    if (!showWizard || wizardStep !== 1) return;
    const timer = setTimeout(() => searchQuotations(quotationSearch), 300);
    return () => clearTimeout(timer);
  }, [quotationSearch, showWizard, wizardStep, searchQuotations]);

  const selectQuotation = async (q) => {
    setWizardData((p) => ({
      ...p,
      quotation_id: q.id, quotation_number: q.quote_number, quotation_total: parseFloat(q.total_amount || 0),
      customer_id: q.customer_id,
      contract_name: q.subject || `Contract from ${q.quote_number}`,
      value: parseFloat(q.total_amount || 0),
      currency: q.currency || "USD",
    }));
    setQuotationResults([]); setQuotationSearch("");
    if (q.customer_id) await loadCustomerData(q.customer_id);
    const items = await quoteApi.listItems(q.id).catch(() => ({ items: [] }));
    const quotationItems = extractArray(items);
    setWizardData((p) => ({ ...p, quotation_items: quotationItems }));
  };

  const loadPricingForProducts = async (productIds) => {
    try {
      const pricingData = await Promise.all(productIds.map((pid) => pricingApi.listByProduct(pid).catch(() => ({ items: [] }))));
      const allTiers = pricingData.flatMap((d) => extractArray(d));
      setWizardData((p) => ({ ...p, pricing: allTiers }));
    } catch {}
  };

  const updateProductQuantity = (idx, qty) => {
    setWizardData((p) => {
      const prods = [...p.products];
      if (prods[idx]) prods[idx] = { ...prods[idx], quantity: Math.max(0, parseFloat(qty) || 0) };
      return { ...p, products: prods };
    });
  };

  const calcTotalValue = () => {
    return wizardData.products.reduce((s, prod) => s + (parseFloat(prod.quantity || 0) * parseFloat(prod.unit_price || 0)), 0);
  };

  const handleCreateContract = async () => {
    if (!wizardData.customer_id || !wizardData.contract_name || !wizardData.start_date) return;
    setWizardLoading(true); setWizardError(null);
    try {
      const contractPayload = {
        customer_id: Number(wizardData.customer_id),
        contract_number: wizardData.contract_number,
        contract_name: wizardData.contract_name,
        status: wizardData.status,
        start_date: wizardData.start_date,
        end_date: wizardData.end_date || undefined,
        notice_period_days: parseInt(wizardData.notice_period_days || 30),
        auto_renew: wizardData.auto_renew,
        renewal_term_days: wizardData.renewal_term_days ? parseInt(wizardData.renewal_term_days) : undefined,
        value: parseFloat(wizardData.value || 0),
        notes: wizardData.notes || undefined,
      };
      const resp = await contractApi.create(contractPayload);
      const contractId = resp.id;
      if (wizardData.products.length > 0) {
        // Note: backend may need separate endpoint for contract items - using contract.update with items if supported
        await contractApi.update(contractId, { items: wizardData.products });
      }
      setShowWizard(false);
      setCurrentPage(1);
      fetchContracts();
      navigate(`/billing/contracts/${contractId}`);
    } catch (err) {
      setWizardError(err?.detail || err?.message || "Failed to create contract");
    } finally { setWizardLoading(false); }
  };

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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard label="Active Contracts" value={activeContracts.length} color="text-emerald-600" icon={FileText} />
          <KpiCard label="Expiring Soon (30d)" value={expiringContracts.length} color="text-amber-600" icon={Clock} />
          <KpiCard label="Expired" value={expiredContracts.length} color="text-gray-600" icon={XCircle} />
          <KpiCard label="Draft" value={filteredByStatus("draft").length} color="text-slate-600" icon={FileText} />
          <KpiCard label="Total Contract Value" value={formatDisplayCurrency(totalValue)} color="text-violet-600" icon={DollarSign} />
          <KpiCard label="Active Value" value={formatDisplayCurrency(activeValue)} color="text-emerald-600" icon={Wallet} />
          <KpiCard label="Monthly Recurring" value={formatDisplayCurrency(mrr)} color="text-blue-600" icon={TrendingUp} />
          <KpiCard label="Annual Recurring" value={formatDisplayCurrency(arr)} color="text-purple-600" icon={Percent} />
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
                <button onClick={openWizard}
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

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto" onClick={() => { if (!wizardLoading) setShowWizard(false); }}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl shadow-2xl mx-4 mb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Create Contract</h2>
              <button onClick={() => { if (!wizardLoading) { setShowWizard(false); setWizardError(null); } }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="flex items-center justify-between mb-8 px-4">
              <WizardStep number={1} label="Customer / Quote" active={wizardStep === 1} completed={wizardStep > 1} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={2} label="Products" active={wizardStep === 2} completed={wizardStep > 2} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={3} label="Pricing Review" active={wizardStep === 3} completed={wizardStep > 3} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={4} label="Billing Schedule" active={wizardStep === 4} completed={wizardStep > 4} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={5} label="Preview" active={wizardStep === 5} completed={wizardStep > 5} />
            </div>

            {wizardError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={16} />{wizardError}</div>}

            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><User size={20} className="text-violet-500" /> Select Customer</h3>
                  {wizardData.customer_id ? (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold">
                            {wizardData.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{wizardData.customer_name}</p>
                            <p className="text-xs text-slate-500">{wizardData.customer_email}{wizardData.customer_phone ? ` · ${wizardData.customer_phone}` : ""}</p>
                          </div>
                        </div>
                        <button onClick={() => setWizardData((p) => ({ ...p, customer_id: "", customer_name: "", customer_email: "", customer_phone: "", quotation_id: "", quotation_number: "" }))}
                          className="text-sm text-violet-600 hover:text-violet-800 font-medium">Change</button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-sm mb-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div><span className="text-xs text-slate-500">Currency</span><p className="font-medium">{wizardData.customer_currency}</p></div>
                        <div><span className="text-xs text-slate-500">Payment Terms</span><p className="font-medium capitalize">{wizardData.customer_payment_terms?.replace(/_/g, " ") || "—"}</p></div>
                        <div><span className="text-xs text-slate-500">Tax ID</span><p className="font-medium">{wizardData.customer_tax_id || "—"}</p></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mb-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search customers by name, email, or phone..." value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      {customerSearching && <p className="text-sm text-slate-400 text-center py-2">Searching...</p>}
                      {customerResults.length > 0 && (
                        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          {customerResults.map((c) => (
                            <button key={c.id} onClick={() => selectCustomer(c)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                              <p className="font-medium text-slate-800">{c.display_name || c.company_name || c.name || `Customer #${c.id}`}</p>
                              <p className="text-xs text-slate-400">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><FileInvoice size={20} className="text-violet-500" /> Accepted Quotation (Optional)</h3>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search accepted quotations..." value={quotationSearch}
                        onChange={(e) => setQuotationSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    </div>
                    <button onClick={() => { if (quotationSearch.trim()) searchQuotations(quotationSearch.trim()); }}
                      className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700">Search</button>
                  </div>

                  {quotationSearching && <p className="text-sm text-slate-400 text-center py-2">Searching quotations...</p>}
                  {quotationResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {quotationResults.map((q) => (
                        <button key={q.id} onClick={() => selectQuotation(q)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${wizardData.quotation_id === q.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}>
                          <p className="font-medium text-slate-800">{q.quote_number}</p>
                          <p className="text-xs text-slate-400">{q.subject || "No subject"} · {formatDisplayCurrency(q.total_amount, q.currency)} · {formatDisplayDate(q.accepted_at || q.updated_at)}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {wizardData.quotation_id && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-800">{wizardData.quotation_number}</p>
                        <button onClick={() => setWizardData((p) => ({ ...p, quotation_id: "", quotation_number: "", quotation_total: 0, quotation_items: [] }))}
                          className="text-xs text-blue-600 hover:text-blue-800">Clear</button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div><span className="text-xs text-slate-500">Total</span><p className="font-medium">{formatDisplayCurrency(wizardData.quotation_total)}</p></div>
                        <div><span className="text-xs text-slate-500">Items</span><p className="font-medium">{wizardData.quotation_items.length}</p></div>
                        <div><span className="text-xs text-slate-500">Currency</span><p className="font-medium">{wizardData.currency}</p></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contract Number *</label>
                    <input type="text" value={wizardData.contract_number}
                      onChange={(e) => setWizardData((p) => ({ ...p, contract_number: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="date" value={wizardData.start_date}
                      onChange={(e) => setWizardData((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Package size={20} className="text-violet-500" /> Products & Services</h3>

                {wizardData.quotation_items.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm font-medium text-blue-800 mb-2">{wizardData.quotation_items.length} products loaded from quotation {wizardData.quotation_number}</p>
                    <div className="space-y-2">
                      {wizardData.quotation_items.map((item, i) => (
                        <div key={item.id || i} className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800">{item.description || "Item"}</p>
                              <p className="text-xs text-slate-400">Qty: {parseFloat(item.quantity || 1).toFixed(2)} · Unit: {formatDisplayCurrency(item.unit_price, wizardData.currency)}</p>
                            </div>
                            <span className="text-sm font-medium text-emerald-600">{formatDisplayCurrency(parseFloat(item.total_amount || 0), wizardData.currency)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => {
                      const prods = wizardData.quotation_items.map((item) => ({
                        product_id: item.product_id,
                        description: item.description,
                        quantity: parseFloat(item.quantity || 1),
                        unit_price: parseFloat(item.unit_price || 0),
                        discount_percentage: parseFloat(item.discount_percentage || 0),
                        tax_percentage: parseFloat(item.tax_percentage || 0),
                      }));
                      setWizardData((p) => ({ ...p, products: prods }));
                    }} className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                      Use These Products
                    </button>
                  </div>
                )}

                {wizardData.products.length === 0 && !wizardData.quotation_id && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={16} /> No products added. Add products or select an accepted quotation in Step 1.
                  </div>
                )}

                {wizardData.products.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-slate-50">
                          <th className="text-left py-3 px-4">#</th>
                          <th className="text-left py-3 px-4">Description</th>
                          <th className="text-right py-3 px-4">Qty</th>
                          <th className="text-right py-3 px-4">Unit Price</th>
                          <th className="text-right py-3 px-4">Disc %</th>
                          <th className="text-right py-3 px-4">Tax %</th>
                          <th className="text-right py-3 px-4">Total</th>
                          <th className="text-right py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {wizardData.products.map((prod, i) => (
                          <tr key={prod.id || i} className="text-sm text-gray-900">
                            <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                            <td className="py-3 px-4">
                              <input type="text" value={prod.description || ""} onChange={(e) => setWizardData((p) => { const ps = [...p.products]; ps[i] = { ...ps[i], description: e.target.value }; return { ...p, products: ps }; })} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input type="number" min="0" step="0.01" value={prod.quantity || 0}
                                onChange={(e) => updateProductQuantity(i, e.target.value)}
                                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input type="number" min="0" step="0.01" value={prod.unit_price || 0}
                                onChange={(e) => setWizardData((p) => { const ps = [...p.products]; ps[i] = { ...ps[i], unit_price: parseFloat(e.target.value) || 0 }; return { ...p, products: ps }; })} className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input type="number" min="0" max="100" step="0.01" value={prod.discount_percentage || 0}
                                onChange={(e) => setWizardData((p) => { const ps = [...p.products]; ps[i] = { ...ps[i], discount_percentage: parseFloat(e.target.value) || 0 }; return { ...p, products: ps }; })} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input type="number" min="0" max="100" step="0.01" value={prod.tax_percentage || 0}
                                onChange={(e) => setWizardData((p) => { const ps = [...p.products]; ps[i] = { ...ps[i], tax_percentage: parseFloat(e.target.value) || 0 }; return { ...p, products: ps }; })} className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatDisplayCurrency(
                                (parseFloat(prod.quantity || 0) * parseFloat(prod.unit_price || 0)) * (1 - (parseFloat(prod.discount_percentage || 0) / 100)) * (1 + (parseFloat(prod.tax_percentage || 0) / 100)),
                                wizardData.currency
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button onClick={() => setWizardData((p) => ({ ...p, products: p.products.filter((_, idx) => idx !== i) }))}
                                className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Contract Value (from products)</span>
                    <span className="font-medium text-slate-800">{formatDisplayCurrency(calcTotalValue(), wizardData.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-2 mt-1">
                    <span>Total Items</span>
                    <span>{wizardData.products.length}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setWizardData((p) => ({ ...p, products: [...p.products, { description: "", quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 0 }] }))}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 flex items-center gap-2">
                    <Plus size={16} /> Add Product
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><CreditCard size={20} className="text-violet-500" /> Pricing Review</h3>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="text-sm font-medium text-slate-800">{wizardData.customer_name || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Currency</p>
                      <p className="text-sm font-medium text-slate-800">{wizardData.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Hash size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Quotation</p>
                      <p className="text-sm font-medium text-slate-800">{wizardData.quotation_number || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Layers size={16} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Products</p>
                      <p className="text-sm font-medium text-slate-800">{wizardData.products.length} items</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-slate-800">{formatDisplayCurrency(wizardData.products.reduce((s, p) => s + (parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0)), 0), wizardData.currency)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Discounts</span><span className="font-medium text-red-500">-{formatDisplayCurrency(wizardData.products.reduce((s, p) => s + (parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0) * (parseFloat(p.discount_percentage || 0) / 100)), 0), wizardData.currency)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span className="font-medium text-slate-800">{formatDisplayCurrency(wizardData.products.reduce((s, p) => s + ((parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0) * (1 - (parseFloat(p.discount_percentage || 0) / 100))) * (parseFloat(p.tax_percentage || 0) / 100)), 0), wizardData.currency)}</span></div>
                  <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-3">
                    <span>Total</span>
                    <span>{formatDisplayCurrency(calcTotalValue(), wizardData.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-violet-500" /> Billing Schedule</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billing Period</label>
                    <select value={wizardData.billing_period}
                      onChange={(e) => setWizardData((p) => ({ ...p, billing_period: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {BILLING_PERIODS.filter((b) => b.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billing Day of Month</label>
                    <input type="number" min="1" max="31" value={wizardData.billing_day}
                      onChange={(e) => setWizardData((p) => ({ ...p, billing_day: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input type="date" value={wizardData.end_date}
                      onChange={(e) => setWizardData((p) => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period (Days)</label>
                    <input type="number" min="0" value={wizardData.notice_period_days}
                      onChange={(e) => setWizardData((p) => ({ ...p, notice_period_days: parseInt(e.target.value) || 30 }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="auto_renew" checked={wizardData.auto_renew}
                    onChange={(e) => setWizardData((p) => ({ ...p, auto_renew: e.target.checked }))}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <label htmlFor="auto_renew" className="text-sm font-medium text-slate-700">Auto Renew</label>
                </div>

                {wizardData.auto_renew && (
                  <div className="ml-6 pt-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Term (Days)</label>
                    <input type="number" min="1" value={wizardData.renewal_term_days}
                      onChange={(e) => setWizardData((p) => ({ ...p, renewal_term_days: e.target.value }))}
                      className="w-full max-w-xs px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="e.g., 365 for annual renewal" />
                  </div>
                )}
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-violet-500" /> Preview Contract</h3>
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">CONTRACT PREVIEW</h2>
                      <p className="text-sm text-slate-500 mt-1">#{wizardData.contract_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Date: {formatDisplayDate(wizardData.start_date)}</p>
                      <p className="text-xs text-slate-400 mt-1">Status: Draft</p>
                    </div>
                  </div>
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                    <p className="font-medium text-slate-800">{wizardData.customer_name}</p>
                    {wizardData.customer_email && <p className="text-sm text-slate-500">{wizardData.customer_email}</p>}
                    {wizardData.customer_phone && <p className="text-sm text-slate-500">{wizardData.customer_phone}</p>}
                  </div>
                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Contract Name</span><span className="font-medium text-slate-800">{wizardData.contract_name}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Contract Value</span><span className="font-medium text-slate-800">{formatDisplayCurrency(calcTotalValue() || wizardData.value, wizardData.currency)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Billing Period</span><span className="font-medium text-slate-800 capitalize">{wizardData.billing_period?.replace(/_/g, " ")}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Term</span><span className="font-medium text-slate-800">{formatDisplayDate(wizardData.start_date)} — {wizardData.end_date ? formatDisplayDate(wizardData.end_date) : "Ongoing"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Auto Renew</span><span className="font-medium text-slate-800">{wizardData.auto_renew ? "Yes" + (wizardData.renewal_term_days ? ` (every ${wizardData.renewal_term_days} days)` : "") : "No"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Notice Period</span><span className="font-medium text-slate-800">{wizardData.notice_period_days} days</span></div>
                    {wizardData.quotation_id && (
                      <div className="flex justify-between text-sm"><span className="text-slate-500">From Quotation</span><span className="font-medium text-blue-600">{wizardData.quotation_number}</span></div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea value={wizardData.notes} onChange={(e) => setWizardData((p) => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Optional notes..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea value={wizardData.terms} onChange={(e) => setWizardData((p) => ({ ...p, terms: e.target.value }))}
                    rows={3} placeholder="Optional terms..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
              <div>
                {wizardStep > 1 && (
                  <button onClick={() => setWizardStep((s) => s - 1)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Back</button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowWizard(false); setWizardError(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                {wizardStep < 5 ? (
                  <button onClick={() => {
                    if (wizardStep === 1 && !wizardData.customer_id) { setWizardError("Please select a customer"); return; }
                    if (wizardStep === 2 && wizardData.products.length === 0) { setWizardError("Please add at least one product"); return; }
                    if (wizardStep === 4 && wizardData.auto_renew && !wizardData.renewal_term_days) { setWizardError("Please enter renewal term for auto-renew"); return; }
                    setWizardError(null);
                    setWizardStep((s) => s + 1);
                  }} disabled={wizardStep === 1 && !wizardData.customer_id}
                    className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                    Continue
                  </button>
                ) : (
                  <button onClick={handleCreateContract} disabled={wizardLoading}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                    {wizardLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {wizardLoading ? "Creating..." : "Create Contract"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}