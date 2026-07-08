import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag, Search, Filter, X, ChevronDown, ArrowUpDown, RefreshCw, Download, Plus, AlertCircle, CheckCircle, Clock,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { pricingApi, productApi } from "../../../service/billingService";
import { getCurrencySelectOptions } from "../../../utils/currency";
import { formatDisplayDate, formatDisplayCurrency } from "../../../utils/billing-helpers";

const ITEMS_PER_PAGE = 10;

const FREQUENCY_OPTIONS = [
  { value: "one_time", label: "One-Time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

const CURRENCY_OPTIONS = getCurrencySelectOptions();

const SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "billing_frequency", label: "Frequency" },
  { key: "currency", label: "Currency" },
  { key: "created_at", label: "Created" },
];

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "active" ? <CheckCircle size={12} /> : <Clock size={12} />}
      {status || "unknown"}
    </span>
  );
}

export default function PricingPlansPage() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [newPlan, setNewPlan] = useState({
    name: "", description: "", price: "", currency: "USD", billing_frequency: "monthly",
    trial_days: "", setup_fee: "", product_id: "", status: "active",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchPlans = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      const params = {
        page: safePage, per_page: ITEMS_PER_PAGE,
      };
      const data = await pricingApi.list(params);
      const items = data.items || data.data || data || [];
      setPlans(Array.isArray(items) ? items : []);
      setTotal(data.total || items.length || 0);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err) {
      setError(err.message || "Failed to load pricing plans");
      setPlans([]); setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, freqFilter, sortField, sortDir, loading]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    productApi.list({ per_page: 100 }).then((data) => {
      const items = data.items || data.data || data || [];
      setProducts(Array.isArray(items) ? items : []);
    }).catch(() => {/* error logged by api layer */});
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchPlans(); };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(new Set(plans.map((p) => p.id)));
    else setSelectedIds(new Set());
    setSelectAll(checked);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectAll(next.size === plans.length && plans.length > 0);
      return next;
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "activate") return pricingApi.update(id, { status: "active" });
          if (action === "deactivate") return pricingApi.deactivate(id);
          return Promise.resolve();
        })
      );
      const failed = results.filter((r) => r.status === "rejected");
      setSelectedIds(new Set()); setSelectAll(false);
      fetchPlans();
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally { setBulkActionLoading(false); }
  };

  const handleExport = async (format) => {
    try {
      const allData = await pricingApi.list({ per_page: 100 });
      const items = allData.items || allData.data || allData || [];
      const rows = Array.isArray(items) ? items : [];
      const filename = `pricing-plans-${new Date().toISOString().split("T")[0]}`;
      if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${filename}.json`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const headers = ["Name", "Price", "Currency", "Frequency", "Trial Days", "Setup Fee", "Status", "Created"];
        const csv = [headers.join(","), ...rows.map((r) =>
          [`"${(r.name || "").replace(/"/g, '""')}"`, r.price || "", r.currency || "", r.billing_frequency || "", r.trial_days || "", r.setup_fee || "", r.status || "", r.created_at || ""].join(",")
        )].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      } catch (err) {
        setError(err.message || "Export failed");
      }
  };

  const handleCreate = async () => {
    setFormLoading(true); setFormError(null);
    try {
      if (!newPlan.product_id) {
        setFormError("Select a product before creating a pricing plan.");
        return;
      }
      await pricingApi.create({
        ...newPlan,
        price: parseFloat(newPlan.price) || 0,
        trial_days: parseInt(newPlan.trial_days) || 0,
        setup_fee: parseFloat(newPlan.setup_fee) || 0,
        product_id: newPlan.product_id || undefined,
      });
      setShowCreateModal(false);
      setNewPlan({ name: "", description: "", price: "", currency: "USD", billing_frequency: "monthly", trial_days: "", setup_fee: "", product_id: "", status: "active" });
      setCurrentPage(1);
      fetchPlans();
    } catch (err) { setFormError(err.message || "Failed to create plan"); }
    finally { setFormLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editPlan) return;
    setFormLoading(true); setFormError(null);
    try {
      await pricingApi.update(editPlan.id, {
        ...editPlan,
        price: parseFloat(editPlan.price) || 0,
        trial_days: parseInt(editPlan.trial_days) || 0,
        setup_fee: parseFloat(editPlan.setup_fee) || 0,
      });
      setShowEditModal(false); setEditPlan(null);
      fetchPlans();
    } catch (err) { setFormError(err.message || "Failed to update plan"); }
    finally { setFormLoading(false); }
  };

  const handleArchive = async (id) => {
    try { await pricingApi.deactivate(id); fetchPlans(); }
    catch (err) { setError(err.message || "Failed to archive plan"); }
  };

  const SortHeader = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={`${sortField === field ? "text-violet-600" : "text-slate-300"}`} />
      </div>
    </th>
  );

  const PlanFormFields = ({ data, onChange, includeStatus }) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
        <input type="text" value={data.name || ""} onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea value={data.description || ""} rows={2} onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
          <input type="number" step="0.01" min="0" value={data.price || ""} onChange={(e) => onChange({ ...data, price: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
          <select value={data.currency || "USD"} onChange={(e) => onChange({ ...data, currency: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Billing Frequency</label>
          <select value={data.billing_frequency || "monthly"} onChange={(e) => onChange({ ...data, billing_frequency: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Associated Product *</label>
          <select value={data.product_id || ""} onChange={(e) => onChange({ ...data, product_id: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Trial Days</label>
          <input type="number" min="0" value={data.trial_days || ""} onChange={(e) => onChange({ ...data, trial_days: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Setup Fee</label>
          <input type="number" step="0.01" min="0" value={data.setup_fee || ""} onChange={(e) => onChange({ ...data, setup_fee: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>
      {includeStatus && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select value={data.status || "active"} onChange={(e) => onChange({ ...data, status: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
    </div>
  );

  const renderModal = (isEdit) => {
    const show = isEdit ? showEditModal : showCreateModal;
    const setShow = isEdit ? setShowEditModal : setShowCreateModal;
    const data = isEdit ? editPlan : newPlan;
    const setData = isEdit ? setEditPlan : setNewPlan;
    const onSubmit = isEdit ? handleUpdate : handleCreate;
    const title = isEdit ? "Edit Pricing Plan" : "New Pricing Plan";
    const btnLabel = isEdit ? (formLoading ? "Saving..." : "Save Changes") : (formLoading ? "Creating..." : "Create Plan");
    if (!show) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button onClick={() => setShow(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
          </div>
          {formError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} />{formError}
            </div>
          )}
          <PlanFormFields data={data} onChange={setData} includeStatus={isEdit} />
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => setShow(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button onClick={onSubmit} disabled={formLoading || !data.name || !data.product_id}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
              {btnLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <HRPage title="Pricing Plans" subtitle="Manage your pricing plans">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading pricing plans...</p>
        </div>
      </HRPage>
    );
  }

  if (error && plans.length === 0) {
    return (
      <HRPage title="Pricing Plans" subtitle="Manage your pricing plans">
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
    <HRPage title="Pricing Plans" subtitle="Manage your pricing plans">

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                )}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Filter size={18} />
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => handleExport("csv")} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <Download size={16} /> Export
                </button>
              </div>
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
                <Plus size={18} /> Add Plan
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="relative">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={freqFilter} onChange={(e) => { setFreqFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Frequencies</option>
                  {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={sortField} onChange={(e) => setSortField(e.target.value)}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {SORT_FIELDS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                <ArrowUpDown size={14} /> {sortDir === "asc" ? "A-Z" : "Z-A"}
              </button>
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-violet-50 border-b border-violet-100">
            <span className="text-sm font-medium text-violet-700">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-violet-200" />
            <button onClick={() => handleBulkAction("activate")} disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={14} /> Activate
            </button>
            <button onClick={() => handleBulkAction("deactivate")} disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
              <Clock size={14} /> Deactivate
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                </th>
                <SortHeader field="name" label="Plan" />
                <SortHeader field="price" label="Price" />
                <SortHeader field="billing_frequency" label="Frequency" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trial</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Setup Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Tag size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No pricing plans found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter || freqFilter ? "Try adjusting your search or filters" : "Add your first pricing plan to get started"}</p>
                    </div>
                  </td>
                </tr>
              ) : plans.map((plan) => (
                <tr key={plan.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(plan.id) ? "bg-violet-50/50" : ""}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.has(plan.id)} onChange={() => handleSelectOne(plan.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-sm font-bold">
                        {(plan.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{plan.name || "Unnamed"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatDisplayCurrency(plan.price)}</td>
                  <td className="px-4 py-4 text-slate-600 capitalize">{plan.billing_frequency?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-4 text-slate-600">{plan.trial_days ? `${plan.trial_days}d` : "—"}</td>
                  <td className="px-4 py-4 text-slate-600">{plan.setup_fee ? formatDisplayCurrency(plan.setup_fee) : "—"}</td>
                  <td className="px-4 py-4 text-slate-600">{plan.product_name || plan.product?.name || "—"}</td>
                  <td className="px-4 py-4"><StatusBadge status={plan.status} /></td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/billing/pricing/tier-management?plan_id=${plan.id}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="Tiers">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </button>
                      <button onClick={() => { setEditPlan({ ...plan }); setShowEditModal(true); }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
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
                    className={`px-3 py-1.5 text-xs border rounded-lg ${page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"}`}>{page}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {renderModal(false)}
      {renderModal(true)}
    </HRPage>
  );
}
