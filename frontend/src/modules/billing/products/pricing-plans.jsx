import { useState, useEffect, useCallback } from "react";
import { DollarSign, Search, X, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, Layers, Trash2, Pencil, ChevronDown, ArrowUpDown } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { pricingApi, productApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState } from "../../../components/billing-shared";

const ITEMS_PER_PAGE = 10;

const PLAN_TYPE_OPTIONS = [
  { value: "flat", label: "Flat Rate" },
  { value: "tiered", label: "Tiered" },
  { value: "volume", label: "Volume" },
  { value: "custom", label: "Custom" },
];

const BILLING_INTERVAL_OPTIONS = [
  { value: "one_time", label: "One-Time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-gray-100 text-gray-600",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "active" ? <CheckCircle size={12} /> : <Clock size={12} />}
      {status || "unknown"}
    </span>
  );
}

export default function ProductPricingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: "", description: "", plan_type: "flat", price: "", currency: "USD",
    billing_interval: "monthly", status: "active", trial_days: "", setup_fee: "", product_id: "",
  });

  const [showTierModal, setShowTierModal] = useState(false);
  const [tierPlanId, setTierPlanId] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [tierFormData, setTierFormData] = useState({ from: "", to: "", price: "", flat_fee: "" });
  const [tierFormLoading, setTierFormLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      const params = { page: safePage, per_page: ITEMS_PER_PAGE, search_term: debouncedSearch || undefined, plan_type: typeFilter || undefined };
      const data = await pricingApi.list(params);
      const items = extractArray(data);
      setPlans(items);
      setTotal(data.total || items.length || 0);
    } catch (err) {
      setError(err.message || "Failed to load pricing plans");
      setPlans([]); setTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [safePage, debouncedSearch, typeFilter, statusFilter, sortField, sortDir, loading]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => {
    productApi.list({ per_page: 100 })
      .then((data) => setProducts(extractArray(data)))
      .catch(() => setProducts([]));
  }, []);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const fetchTiers = useCallback(async (planId) => {
    try {
      const data = await pricingApi.listTiers(planId);
      const items = Array.isArray(data) ? data : data?.items || data?.data || [];
      setTiers(items);
    } catch { setTiers([]); }
  }, []);

  const openTierModal = async (planId) => {
    setTierPlanId(planId);
    setTiers([]);
    setTierFormData({ from: "", to: "", price: "", flat_fee: "" });
    setShowTierModal(true);
    await fetchTiers(planId);
  };

  const addTier = async () => {
    if (!tierPlanId || !tierFormData.from || !tierFormData.price) return;
    setTierFormLoading(true);
    try {
      await pricingApi.addTier(tierPlanId, {
        from: parseFloat(tierFormData.from),
        to: tierFormData.to ? parseFloat(tierFormData.to) : null,
        price: parseFloat(tierFormData.price),
        flat_fee: tierFormData.flat_fee ? parseFloat(tierFormData.flat_fee) : 0,
      });
      setTierFormData({ from: "", to: "", price: "", flat_fee: "" });
      await fetchTiers(tierPlanId);
    } catch {
    } finally { setTierFormLoading(false); }
  };

  const removeTier = async (tierId) => {
    if (!tierPlanId) return;
    try { await pricingApi.removeTier(tierPlanId, tierId); await fetchTiers(tierPlanId); }
    catch {};
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleSubmit = async () => {
    setFormLoading(true); setFormError(null);
    try {
      if (!formData.product_id) {
        setFormError("Select a product before saving a pricing plan.");
        return;
      }
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        trial_days: formData.trial_days ? parseInt(formData.trial_days) : undefined,
        setup_fee: formData.setup_fee ? parseFloat(formData.setup_fee) : undefined,
      };
      if (editPlan) await pricingApi.update(editPlan.id, payload);
      else await pricingApi.create(payload);
      setShowForm(false); setEditPlan(null);
      setFormData({ name: "", description: "", plan_type: "flat", price: "", currency: "USD", billing_interval: "monthly", status: "active", trial_days: "", setup_fee: "", product_id: "" });
      setCurrentPage(1); fetchPlans();
    } catch (err) {
      setFormError(err.message || "Failed to save pricing plan");
    } finally { setFormLoading(false); }
  };

  const sortedPlans = [...plans].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return (a.name || "").localeCompare(b.name || "") * dir;
    if (sortField === "price") return (parseFloat(a.price || 0) - parseFloat(b.price || 0)) * dir;
    if (sortField === "status") return (a.status || "").localeCompare(b.status || "") * dir;
    if (sortField === "created_at") return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * dir;
    return 0;
  });

  const SortHeader = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">{label}<ArrowUpDown size={12} className={`${sortField === field ? "text-violet-600" : "text-slate-300"}`} /></div>
    </th>
  );

  if (loading) {
    return <HRPage title="Pricing Plans" subtitle="Product pricing plans"><Spinner /></HRPage>;
  }

  if (error && plans.length === 0) {
    return <HRPage title="Pricing Plans" subtitle="Product pricing plans"><ErrorState message={error} onRetry={fetchPlans} /></HRPage>;
  }

  return (
    <HRPage title="Pricing Plans" subtitle="Product pricing plans">

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search pricing plans..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Search size={18} />
              </button>
              <button onClick={() => { setRefreshing(true); fetchPlans(); }} disabled={refreshing}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <button onClick={() => { setShowForm(true); setEditPlan(null); setFormData({ name: "", description: "", plan_type: "flat", price: "", currency: "USD", billing_interval: "monthly", status: "active", trial_days: "", setup_fee: "", product_id: "" }); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
              <Plus size={18} /> Add Plan
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="relative">
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Types</option>
                  {PLAN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <SortHeader field="name" label="Plan Name" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <SortHeader field="price" label="Price" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing</th>
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiers</th>
                <SortHeader field="created_at" label="Created" />
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <DollarSign size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No pricing plans found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || typeFilter ? "Try adjusting your search or filters" : "Add your first pricing plan to get started"}</p>
                    </div>
                  </td>
                </tr>
              ) : sortedPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold">
                        {(plan.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{plan.name || "Unnamed"}</p>
                        {plan.description && <p className="text-xs text-slate-400 line-clamp-1">{plan.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                      {plan.plan_type?.replace("_", " ") || "flat"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-800">{formatDisplayCurrency(plan.price || 0)}</td>
                  <td className="px-4 py-4 text-sm text-slate-600 capitalize">{plan.billing_interval?.replace("_", " ") || "—"}</td>
                  <td className="px-4 py-4"><StatusBadge status={plan.status} /></td>
                  <td className="px-4 py-4">
                    {plan.plan_type === "tiered" || plan.plan_type === "volume" ? (
                      <button onClick={() => openTierModal(plan.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100">
                        <Layers size={12} /> Tiers
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">{formatDisplayDate(plan.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => { setEditPlan(plan); setFormData({ name: plan.name || "", description: plan.description || "", plan_type: plan.plan_type || "flat", price: plan.price?.toString() || "", currency: plan.currency || "USD", billing_interval: plan.billing_interval || "monthly", status: plan.status || "active", trial_days: plan.trial_days?.toString() || "", setup_fee: plan.setup_fee?.toString() || "", product_id: plan.product_id || "" }); setShowForm(true); }}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">{total} total plan(s)</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 5, totalPages - 9));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs border rounded-lg ${page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); setFormError(null); }}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editPlan ? "Edit Pricing Plan" : "New Pricing Plan"}</h2>
              <button onClick={() => { setShowForm(false); setFormError(null); }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            {formError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle size={16} />{formError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product *</label>
                <select value={formData.product_id} onChange={(e) => setFormData((p) => ({ ...p, product_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={formData.plan_type} onChange={(e) => setFormData((p) => ({ ...p, plan_type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {PLAN_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Billing Interval</label>
                  <select value={formData.billing_interval} onChange={(e) => setFormData((p) => ({ ...p, billing_interval: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {BILLING_INTERVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
                  <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Setup Fee</label>
                  <input type="number" step="0.01" min="0" value={formData.setup_fee} onChange={(e) => setFormData((p) => ({ ...p, setup_fee: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trial Days</label>
                  <input type="number" min="0" value={formData.trial_days} onChange={(e) => setFormData((p) => ({ ...p, trial_days: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => { setShowForm(false); setFormError(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleSubmit} disabled={formLoading || !formData.name || !formData.product_id}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
                {formLoading ? "Saving..." : editPlan ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTierModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Pricing Tiers</h2>
              <button onClick={() => setShowTierModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              <input type="number" placeholder="From" value={tierFormData.from} onChange={(e) => setTierFormData((p) => ({ ...p, from: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <input type="number" placeholder="To" value={tierFormData.to} onChange={(e) => setTierFormData((p) => ({ ...p, to: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <input type="number" step="0.01" placeholder="Price" value={tierFormData.price} onChange={(e) => setTierFormData((p) => ({ ...p, price: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={addTier} disabled={tierFormLoading || !tierFormData.from || !tierFormData.price}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                {tierFormLoading ? "..." : "Add"}
              </button>
            </div>

            {tiers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No tiers configured yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tiers.map((tier, i) => (
                  <div key={tier.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium text-slate-800">{tier.from}</span>
                      <span className="text-slate-400"> — </span>
                      <span className="font-medium text-slate-800">{tier.to ?? "∞"}</span>
                      <span className="text-slate-400 ml-2">@ {formatDisplayCurrency(tier.price)}</span>
                      {tier.flat_fee > 0 && <span className="text-slate-400 ml-1">+ {formatDisplayCurrency(tier.flat_fee)} flat</span>}
                    </div>
                    <button onClick={() => removeTier(tier.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowTierModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
