import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Repeat, Search, Filter, X, ChevronDown, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, FileText, PauseCircle, XCircle, ArrowUpDown, Download, Ban, DollarSign, User, Wallet, TrendingUp, Percent, Calendar, Loader2, Eye, Trash2, Receipt, Building, Phone, Mail, Hash, Layers, Package, CreditCard, Send, RotateCcw, Shield, Play,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { subscriptionApi, contractApi, customerApi, invoiceApi, paymentApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "trialing", label: "Trialing", color: "bg-blue-100 text-blue-700" },
  { value: "paused", label: "Paused", color: "bg-amber-100 text-amber-700" },
  { value: "past_due", label: "Past Due", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-slate-100 text-slate-500" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-700" },
];

const BILLING_PERIODS = [
  { value: "", label: "All Periods" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  if (!s) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status || "unknown"}</span>;
  const icons = { active: CheckCircle, trialing: Clock, paused: PauseCircle, past_due: AlertCircle, cancelled: XCircle, expired: Clock };
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
    contract_id: "", contract_number: "", contract_name: "", contract_value: 0,
    contract_currency: "USD", contract_billing_period: "monthly", contract_billing_day: 1,
    contract_start_date: "", contract_end_date: "", contract_auto_renew: false, contract_renewal_term: "",
    customer_id: "", customer_name: "", customer_email: "", customer_currency: "USD",
    plan_id: "", plan_name: "", plan_billing_period: "monthly", plan_unit_price: 0,
    quantity: 1, unit_price: 0, setup_fee: 0, discount_percentage: 0, tax_percentage: 0,
    subscription_number: "", start_date: new Date().toISOString().split("T")[0],
    current_term_end: "", trial_end_date: "",
    notes: "",
  });
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState(null);

  const [contractSearch, setContractSearch] = useState("");
  const [contractResults, setContractResults] = useState([]);
  const [contractSearching, setContractSearching] = useState(false);

  const [planSearch, setPlanSearch] = useState("");
  const [planResults, setPlanResults] = useState([]);
  const [planSearching, setPlanSearching] = useState(false);

  // Handle contract_id from query params for Contract → Subscription flow
  const [searchParams, setSearchParams] = useSearchParams();
  const contractIdParam = searchParams.get("contract_id");

  useEffect(() => {
    if (contractIdParam && !showWizard) {
      // Fetch contract details and open wizard with pre-selected contract
      contractApi.get(contractIdParam).then((c) => {
        if (c.status !== "active") {
          setError("Only active contracts can be used for subscription creation");
          const params = new URLSearchParams(searchParams);
          params.delete("contract_id");
          setSearchParams(params, { replace: true });
          return;
        }
        selectContract(c);
        setShowWizard(true);
        setWizardStep(1);
        // Clear the query param after using it
        const params = new URLSearchParams(searchParams);
        params.delete("contract_id");
        setSearchParams(params, { replace: true });
      }).catch(() => {
        setError("Failed to load contract for subscription creation");
      });
    }
  }, [contractIdParam, searchParams, setSearchParams]);

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
        else if (action === "resume") await subscriptionApi.activate(id);
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
      s.plan_name || s.plan?.name || "", s.amount || s.unit_price || 0, s.currency || "USD",
      s.status || "", s.next_billing_at || "", s.start_date || "", s.current_term_end || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subscriptions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const openWizard = () => {
    const prefix = "SUB-";
    const ts = Date.now().toString(36).toUpperCase();
    setWizardData({
      contract_id: "", contract_number: "", contract_name: "", contract_value: 0,
      contract_currency: "USD", contract_billing_period: "monthly", contract_billing_day: 1,
      contract_start_date: "", contract_end_date: "", contract_auto_renew: false, contract_renewal_term: "",
      customer_id: "", customer_name: "", customer_email: "", customer_currency: "USD",
      plan_id: "", plan_name: "", plan_billing_period: "monthly", plan_unit_price: 0,
      quantity: 1, unit_price: 0, setup_fee: 0, discount_percentage: 0, tax_percentage: 0,
      subscription_number: `${prefix}${ts}`, start_date: new Date().toISOString().split("T")[0],
      current_term_end: "", trial_end_date: "",
      notes: "",
    });
    setWizardStep(1); setWizardError(null); setShowWizard(true);
    setContractSearch(""); setContractResults([]);
    setPlanSearch(""); setPlanResults([]);
  };

  const searchContracts = useCallback(async (term) => {
    if (!term.trim()) { setContractResults([]); return; }
    setContractSearching(true);
    try {
      const data = await contractApi.list({ search_term: term, status: "active", per_page: 10 });
      setContractResults(extractArray(data));
    } catch { setContractResults([]); }
    finally { setContractSearching(false); }
  }, []);

  useEffect(() => {
    if (!showWizard || wizardStep !== 1) return;
    const timer = setTimeout(() => searchContracts(contractSearch), 300);
    return () => clearTimeout(timer);
  }, [contractSearch, showWizard, wizardStep, searchContracts]);

  const selectContract = async (c) => {
    setWizardData((p) => ({
      ...p,
      contract_id: c.id, contract_number: c.contract_number, contract_name: c.contract_name,
      contract_value: parseFloat(c.value || 0), contract_currency: c.currency || "USD",
      contract_billing_period: c.billing_period || "monthly", contract_billing_day: c.billing_day || 1,
      contract_start_date: c.start_date, contract_end_date: c.end_date || "",
      contract_auto_renew: c.auto_renew, contract_renewal_term: c.renewal_term_days || "",
      customer_id: c.customer_id,
    }));
    setContractResults([]); setContractSearch("");
    const cust = await customerApi.get(c.customer_id).catch(() => null);
    if (cust) {
      setWizardData((p) => ({
        ...p, customer_name: cust.display_name || cust.company_name || cust.name || `Customer #${cust.id}`,
        customer_email: cust.email || "", customer_currency: cust.currency || "USD",
      }));
    }
    const plans = await subscriptionApi.listPlans({ customer_id: c.customer_id, per_page: 20 }).catch(() => ({ items: [] }));
    setPlanResults(extractArray(plans));
  };

  const searchPlans = useCallback(async (term) => {
    if (!term.trim()) { setPlanResults([]); return; }
    setPlanSearching(true);
    try {
      const data = await subscriptionApi.listPlans({ search_term: term, per_page: 10 });
      setPlanResults(extractArray(data));
    } catch { setPlanResults([]); }
    finally { setPlanSearching(false); }
  }, []);

  useEffect(() => {
    if (!showWizard || wizardStep !== 3) return;
    const timer = setTimeout(() => searchPlans(planSearch), 300);
    return () => clearTimeout(timer);
  }, [planSearch, showWizard, wizardStep, searchPlans]);

  const selectPlan = (plan) => {
    setWizardData((p) => ({
      ...p,
      plan_id: plan.id, plan_name: plan.plan_name, plan_billing_period: plan.billing_period,
      plan_unit_price: parseFloat(plan.unit_price || plan.flat_fee || 0),
      unit_price: parseFloat(plan.unit_price || plan.flat_fee || 0),
      currency: plan.currency || "USD",
    }));
    setPlanResults([]); setPlanSearch("");
  };

  const computeCurrentTermEnd = (start, period) => {
    const d = new Date(start);
    if (period === "monthly") d.setMonth(d.getMonth() + 1);
    else if (period === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (period === "semi_annual") d.setMonth(d.getMonth() + 6);
    else if (period === "annual") d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };

  const handleCreateSubscription = async () => {
    if (!wizardData.contract_id || !wizardData.plan_id || !wizardData.start_date) return;
    setWizardLoading(true); setWizardError(null);
    try {
      const payload = {
        customer_id: Number(wizardData.customer_id),
        plan_id: Number(wizardData.plan_id),
        contract_id: Number(wizardData.contract_id),
        subscription_number: wizardData.subscription_number,
        quantity: parseInt(wizardData.quantity || 1),
        unit_price: parseFloat(wizardData.unit_price || 0),
        setup_fee: parseFloat(wizardData.setup_fee || 0),
        discount_percentage: parseFloat(wizardData.discount_percentage || 0),
        tax_percentage: parseFloat(wizardData.tax_percentage || 0),
        start_date: wizardData.start_date,
        current_term_start: wizardData.start_date,
        current_term_end: wizardData.current_term_end || computeCurrentTermEnd(wizardData.start_date, wizardData.plan_billing_period),
        trial_end_date: wizardData.trial_end_date || undefined,
      };
      const resp = await subscriptionApi.create(payload);
      setShowWizard(false);
      setCurrentPage(1);
      fetchSubscriptions();
      navigate(`/billing/subscriptions/${resp.id}`);
    } catch (err) {
      setWizardError(err?.detail || err?.message || "Failed to create subscription");
    } finally { setWizardLoading(false); }
  };

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const trialingSubs = subscriptions.filter((s) => s.status === "trialing");
  const pausedSubs = subscriptions.filter((s) => s.status === "paused");
  const cancelledSubs = subscriptions.filter((s) => s.status === "cancelled");
  const expiringSubs = activeSubs.filter((s) => {
    if (!s.current_term_end) return false;
    const end = new Date(s.current_term_end);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  });
  const mrr = activeSubs.reduce((sum, s) => {
    const amt = parseFloat(s.unit_price || s.amount || 0) * parseInt(s.quantity || 1);
    if (s.plan_billing_period === "monthly" || s.billing_period === "monthly") return sum + amt;
    if (s.plan_billing_period === "quarterly" || s.billing_period === "quarterly") return sum + amt / 3;
    if (s.plan_billing_period === "semi_annual" || s.billing_period === "semi_annual") return sum + amt / 6;
    if (s.plan_billing_period === "annual" || s.billing_period === "annual") return sum + amt / 12;
    return sum + amt / 12;
  }, 0);
  const arr = mrr * 12;
  const nextBillingAmount = subscriptions
    .filter((s) => s.next_billing_at)
    .reduce((sum, s) => sum + parseFloat(s.unit_price || s.amount || 0) * parseInt(s.quantity || 1), 0);

  if (loading) return <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine"><Spinner /></HRPage>;
  if (error && subscriptions.length === 0) return <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine"><ErrorState message={error} onRetry={() => fetchSubscriptions(true)} /></HRPage>;

  return (
    <HRPage title="Subscriptions" subtitle="Enterprise recurring billing engine">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard label="Active" value={activeSubs.length} color="text-emerald-600" icon={CheckCircle} />
          <KpiCard label="Trialing" value={trialingSubs.length} color="text-blue-600" icon={Clock} />
          <KpiCard label="Paused" value={pausedSubs.length} color="text-amber-600" icon={PauseCircle} />
          <KpiCard label="Cancelled" value={cancelledSubs.length} color="text-slate-600" icon={XCircle} />
          <KpiCard label="Expiring Soon (30d)" value={expiringSubs.length} color="text-red-600" icon={AlertCircle} />
          <KpiCard label="MRR" value={formatDisplayCurrency(mrr)} color="text-blue-600" icon={TrendingUp} />
          <KpiCard label="ARR" value={formatDisplayCurrency(arr)} color="text-purple-600" icon={Percent} />
          <KpiCard label="Next Billing Amt" value={formatDisplayCurrency(nextBillingAmount)} color="text-violet-600" icon={DollarSign} />
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
                <button onClick={openWizard}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                  <SortHeader field="amount" label="Amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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
                      <button onClick={() => navigate(`/billing/subscriptions/${s.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-slate-400" />
                          {s.subscription_number || `#${s.id}`}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{s.customer_name || s.customer?.name || `Customer #${s.customer_id}`}</td>
                    <td className="px-4 py-4 text-slate-600">{s.plan_name || s.plan?.name || `Plan #${s.plan_id}`}</td>
                    <td className="px-4 py-4 font-medium text-slate-800">{formatDisplayCurrency(s.amount || s.unit_price, s.currency)}</td>
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

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 overflow-y-auto" onClick={() => { if (!wizardLoading) setShowWizard(false); }}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl shadow-2xl mx-4 mb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Create Subscription</h2>
              <button onClick={() => { if (!wizardLoading) { setShowWizard(false); setWizardError(null); } }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="flex items-center justify-between mb-8 px-4">
              <WizardStep number={1} label="Select Contract" active={wizardStep === 1} completed={wizardStep > 1} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={2} label="Billing Schedule" active={wizardStep === 2} completed={wizardStep > 2} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={3} label="Plan & Pricing" active={wizardStep === 3} completed={wizardStep > 3} />
              <div className="flex-1 h-px bg-slate-200 mx-3" />
              <WizardStep number={4} label="Preview" active={wizardStep === 4} completed={wizardStep > 4} />
            </div>

            {wizardError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={16} />{wizardError}</div>}

            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><FileText size={20} className="text-violet-500" /> Select Active Contract</h3>
                  {wizardData.contract_id ? (
                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold">
                            {wizardData.contract_number?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{wizardData.contract_name}</p>
                            <p className="text-xs text-slate-500">{wizardData.contract_number} · {formatDisplayCurrency(wizardData.contract_value, wizardData.contract_currency)} · {wizardData.contract_billing_period?.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <button onClick={() => setWizardData((p) => ({ ...p, contract_id: "", contract_number: "", contract_name: "", customer_id: "" }))}
                          className="text-sm text-violet-600 hover:text-violet-800 font-medium">Change</button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-sm mb-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div><span className="text-xs text-slate-500">Term</span><p className="font-medium">{formatDisplayDate(wizardData.contract_start_date)} — {formatDisplayDate(wizardData.contract_end_date) || "Ongoing"}</p></div>
                        <div><span className="text-xs text-slate-500">Auto Renew</span><p className="font-medium">{wizardData.contract_auto_renew ? "Yes" + (wizardData.contract_renewal_term ? ` (${wizardData.contract_renewal_term} days)` : "") : "No"}</p></div>
                        <div><span className="text-xs text-slate-500">Notice</span><p className="font-medium">{wizardData.contract_notice_period || 30} days</p></div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="relative mb-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search active contracts by name or number..." value={contractSearch}
                          onChange={(e) => setContractSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                      {contractSearching && <p className="text-sm text-slate-400 text-center py-2">Searching...</p>}
                      {contractResults.length > 0 && (
                        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          {contractResults.map((c) => (
                            <button key={c.id} onClick={() => selectContract(c)}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${wizardData.contract_id === c.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}>
                            <p className="font-medium text-slate-800">{c.contract_name}</p>
                            <p className="text-xs text-slate-400">{c.contract_number} · {formatDisplayCurrency(c.value, c.currency)} · {formatDisplayDate(c.start_date)} — {formatDisplayDate(c.end_date) || "Ongoing"}</p>
                          </button>
                        ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Number *</label>
                    <input type="text" value={wizardData.subscription_number}
                      onChange={(e) => setWizardData((p) => ({ ...p, subscription_number: e.target.value }))}
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
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-violet-500" /> Billing Schedule (from Contract)</h3>

                {!wizardData.contract_id ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={16} /> No contract selected. Please select a contract in Step 1.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Period</p>
                        <p className="text-lg font-bold text-gray-900 mt-1 capitalize">{wizardData.contract_billing_period?.replace(/_/g, " ")}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Day</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">Day {wizardData.contract_billing_day || 1}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Term</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatDisplayDate(wizardData.contract_start_date)} — {formatDisplayDate(wizardData.contract_end_date) || "Ongoing"}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Renew</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{wizardData.contract_auto_renew ? "Yes" + (wizardData.contract_renewal_term ? ` (${wizardData.contract_renewal_term} days)` : "") : "No"}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3">Subscription Billing Alignment</h4>
                      <p className="text-sm text-slate-600 mb-3">The subscription will align its billing cycle with the contract's billing period.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">First Billing Date</label>
                          <input type="date" value={wizardData.start_date}
                            onChange={(e) => setWizardData((p) => ({ ...p, start_date: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Current Term End</label>
                          <input type="date" value={wizardData.current_term_end || computeCurrentTermEnd(wizardData.start_date, wizardData.contract_billing_period)}
                            onChange={(e) => setWizardData((p) => ({ ...p, current_term_end: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                      </div>
                    </div>

                    {wizardData.contract_auto_renew && wizardData.contract_renewal_term && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-sm font-medium text-emerald-800">Contract Auto-Renew Enabled</p>
                        <p className="text-xs text-emerald-600 mt-1">Subscription will auto-renew every {wizardData.contract_renewal_term} days per contract terms.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Package size={20} className="text-violet-500" /> Select Subscription Plan</h3>

                {!wizardData.contract_id ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={16} /> No contract selected. Please select a contract in Step 1.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search plans..." value={planSearch}
                          onChange={(e) => setPlanSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      </div>
                    </div>

                    {planSearching && <p className="text-sm text-slate-400 text-center py-2">Searching plans...</p>}
                    {planResults.length > 0 && (
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {planResults.map((plan) => (
                          <button key={plan.id} onClick={() => selectPlan(plan)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${wizardData.plan_id === plan.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-800">{plan.plan_name}</p>
                                <p className="text-xs text-slate-400">{plan.category || "General"} · {plan.billing_period?.replace(/_/g, " ")} · {formatDisplayCurrency(plan.unit_price || plan.flat_fee, plan.currency)}</p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                              }`}>{plan.is_active ? "Active" : "Inactive"}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {wizardData.plan_id && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-800">{wizardData.plan_name}</p>
                          <button onClick={() => setWizardData((p) => ({ ...p, plan_id: "", plan_name: "", plan_unit_price: 0 }))}
                            className="text-xs text-blue-600 hover:text-blue-800">Change</button>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div><span className="text-xs text-slate-500">Billing Period</span><p className="font-medium capitalize">{wizardData.plan_billing_period?.replace(/_/g, " ")}</p></div>
                          <div><span className="text-xs text-slate-500">Unit Price</span><p className="font-medium">{formatDisplayCurrency(wizardData.plan_unit_price, wizardData.customer_currency || "USD")}</p></div>
                          <div><span className="text-xs text-slate-500">Quantity</span>
                            <input type="number" min="1" value={wizardData.quantity}
                              onChange={(e) => setWizardData((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                          <div><span className="text-xs text-slate-500">Setup Fee</span>
                            <input type="number" min="0" step="0.01" value={wizardData.setup_fee}
                              onChange={(e) => setWizardData((p) => ({ ...p, setup_fee: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label>
                            <input type="number" min="0" max="100" step="0.01" value={wizardData.discount_percentage}
                              onChange={(e) => setWizardData((p) => ({ ...p, discount_percentage: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tax %</label>
                            <input type="number" min="0" max="100" step="0.01" value={wizardData.tax_percentage}
                              onChange={(e) => setWizardData((p) => ({ ...p, tax_percentage: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-violet-500" /> Preview Subscription</h3>
                <div className="border border-slate-200 rounded-xl p-6 bg-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">SUBSCRIPTION PREVIEW</h2>
                      <p className="text-sm text-slate-500 mt-1">#{wizardData.subscription_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Date: {formatDisplayDate(wizardData.start_date)}</p>
                      <p className="text-xs text-slate-400 mt-1">Status: Draft</p>
                    </div>
                  </div>
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Contract</p>
                    <p className="font-medium text-slate-800">{wizardData.contract_name || "—"}</p>
                    {wizardData.contract_number && <p className="text-sm text-slate-500">{wizardData.contract_number}</p>}
                  </div>
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                    <p className="font-medium text-slate-800">{wizardData.customer_name || "—"}</p>
                    {wizardData.customer_email && <p className="text-sm text-slate-500">{wizardData.customer_email}</p>}
                  </div>
                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Plan</span><span className="font-medium text-slate-800">{wizardData.plan_name || "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Billing Period</span><span className="font-medium text-slate-800 capitalize">{wizardData.plan_billing_period?.replace(/_/g, " ")}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Quantity</span><span className="font-medium text-slate-800">{wizardData.quantity}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Unit Price</span><span className="font-medium text-slate-800">{formatDisplayCurrency(wizardData.unit_price, wizardData.customer_currency || "USD")}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Setup Fee</span><span className="font-medium text-slate-800">{wizardData.setup_fee > 0 ? formatDisplayCurrency(wizardData.setup_fee, wizardData.customer_currency || "USD") : "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="font-medium text-red-500">{wizardData.discount_percentage > 0 ? `${wizardData.discount_percentage}%` : "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span className="font-medium text-slate-800">{wizardData.tax_percentage > 0 ? `${wizardData.tax_percentage}%` : "—"}</span></div>
                    <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-3 mt-2">
                      <span>Monthly Amount</span>
                      <span>{formatDisplayCurrency((wizardData.unit_price * wizardData.quantity) * (1 - wizardData.discount_percentage / 100) * (1 + wizardData.tax_percentage / 100), wizardData.customer_currency || "USD")}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea value={wizardData.notes} onChange={(e) => setWizardData((p) => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="Optional notes..."
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
                {wizardStep < 4 ? (
                  <button onClick={() => {
                    if (wizardStep === 1 && !wizardData.contract_id) { setWizardError("Please select a contract"); return; }
                    if (wizardStep === 3 && !wizardData.plan_id) { setWizardError("Please select a subscription plan"); return; }
                    setWizardError(null);
                    setWizardStep((s) => s + 1);
                  }} disabled={wizardStep === 1 && !wizardData.contract_id}
                    className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                    Continue
                  </button>
                ) : (
                  <button onClick={handleCreateSubscription} disabled={wizardLoading}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                    {wizardLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {wizardLoading ? "Creating..." : "Create Subscription"}
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