import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, Search, Filter, X, ChevronDown, ArrowUpDown, RefreshCw, Download, Plus, AlertCircle, CheckCircle, Clock, Archive, Image, Eye, Copy, RotateCcw, CreditCard,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { productApi } from "../../../service/billingService";
import { formatDisplayDate, extractArray, downloadJSON } from "../../../utils/billing-helpers";
import { formatCurrency } from "../../../utils/locale";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived (Deleted)" },
];

const TYPE_OPTIONS = [
  { value: "service", label: "Service" },
  { value: "good", label: "Good" },
  { value: "subscription", label: "Subscription" },
  { value: "usage", label: "Usage-Based" },
  { value: "retainer", label: "Retainer" },
  { value: "other", label: "Other" },
];

const BILLING_FREQUENCY_OPTIONS = [
  { value: "one_time", label: "One Time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "usage_based", label: "Usage Based" },
  { value: "recurring", label: "Recurring" },
];

const SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "default_price", label: "Price" },
  { key: "created_at", label: "Created" },
];

const COLUMN_OPTIONS = [
  { key: "name", label: "Product" },
  { key: "code", label: "Code" },
  { key: "default_price", label: "Price" },
  { key: "product_type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
  { key: "image", label: "Image" },
];

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status === "active" ? <CheckCircle size={12} /> : status === "archived" ? <X size={12} /> : <Clock size={12} />}
      {status || "unknown"}
    </span>
  );
}

export default function ProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [categories, setCategories] = useState([]);

  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(new Set(COLUMN_OPTIONS.map((c) => c.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "", code: "", default_price: "", description: "", product_type: "service", is_active: true, image_url: "",
    category_id: "", brand: "", billing_frequency: "one_time", default_discount: "", invoice_description: "",
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

  const fetchProducts = useCallback(async (isInitial = false) => {
    try {
      setError(null);
      if (!isInitial) setRefreshing(true);

      const params = {
        page: safePage,
        per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        product_type: typeFilter || undefined,
        status: statusFilter || undefined,
        sort_by: sortField,
        sort_order: sortDir,
      };
      const data = await productApi.list(params);
      const items = data?.items || data?.data || data || [];
      setProducts(Array.isArray(items) ? items : []);
      setTotal(data?.total || items.length || 0);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err) {
      setError(err.message || "Failed to load products");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, typeFilter, sortField, sortDir]);

  useEffect(() => { fetchProducts(true); }, [fetchProducts]);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await productApi.listCategories({ root_only: true });
      const items = data?.items || data?.data || data || [];
      setCategories(Array.isArray(items) ? items : []);
    } catch {
      // silent
    }
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchProducts(); };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(new Set(products.map((p) => p.id)));
    else setSelectedIds(new Set());
    setSelectAll(checked);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectAll(next.size === products.length && products.length > 0);
      return next;
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const statusByAction = { activate: "active", deactivate: "inactive", archive: "archived", restore: "restored" };
      const result = await productApi.bulkStatus(ids, statusByAction[action]);
      const failed = result?.failed || [];
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchProducts();
      if (failed.length > 0) setError(`${failed.length} selected product(s) could not be updated.`);
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"? This action cannot be undone.`)) return;
    try {
      await productApi.delete(id);
      fetchProducts();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to delete product");
    }
  };

  const handleRestoreProduct = async (id) => {
    try {
      await productApi.restore(id);
      fetchProducts();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to restore product");
    }
  };

  const handleDuplicateProduct = async (id) => {
    try {
      await productApi.duplicate(id);
      setCurrentPage(1);
      fetchProducts();
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to duplicate product");
    }
  };

  const handleExport = async (format) => {
    try {
      const allData = await productApi.list({ per_page: 100 });
      const items = allData?.items || allData?.data || allData || [];
      const rows = Array.isArray(items) ? items : [];

      if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const headers = ["Name", "Code", "Default Price", "Type", "Status", "Created"];
        const csv = [headers.join(","), ...rows.map((r) =>
          [`"${(r.name || "").replace(/"/g, '""')}"`, r.code || "", r.default_price || "", r.product_type || "", r.status || "", r.created_at || ""].join(",")
        )].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.message || "Export failed");
    }
  };

  const handleCreate = async () => {
    setFormLoading(true);
    setFormError(null);

    const price = parseFloat(newProduct.default_price || 0);
    const discount = parseFloat(newProduct.default_discount || 0);
    if (price < 0) { setFormError("Default price cannot be negative."); setFormLoading(false); return; }
    if (discount < 0 || discount > 100) { setFormError("Default discount must be between 0 and 100."); setFormLoading(false); return; }

    try {
      await productApi.create({
        ...newProduct,
        category_id: newProduct.category_id ? parseInt(newProduct.category_id) : undefined,
        default_price: price,
        default_discount: discount,
        image_url: newProduct.image_url || undefined,
        brand: newProduct.brand || undefined,
        invoice_description: newProduct.invoice_description || undefined,
      });
      setShowCreateModal(false);
      setNewProduct({ name: "", code: "", default_price: "", description: "", product_type: "service", is_active: true, image_url: "", category_id: "", brand: "", billing_frequency: "one_time", default_discount: "", invoice_description: "" });
      setCurrentPage(1);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || "Failed to create product");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editProduct) return;
    setFormLoading(true);
    setFormError(null);

    const price = parseFloat(editProduct.default_price || 0);
    const discount = parseFloat(editProduct.default_discount || 0);
    if (price < 0) { setFormError("Default price cannot be negative."); setFormLoading(false); return; }
    if (discount < 0 || discount > 100) { setFormError("Default discount must be between 0 and 100."); setFormLoading(false); return; }

    try {
      await productApi.update(editProduct.id, {
        ...editProduct,
        category_id: editProduct.category_id ? parseInt(editProduct.category_id) : null,
        default_price: price,
        default_discount: discount,
        image_url: editProduct.image_url || null,
        brand: editProduct.brand || null,
        invoice_description: editProduct.invoice_description || null,
      });
      setShowEditModal(false);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || "Failed to update product");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const SortHeader = ({ field, label }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 ${!visibleColumns.has(field === "name" ? "name" : field) ? "hidden" : ""}`} onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={`${sortField === field ? "text-violet-600" : "text-slate-300"}`} />
      </div>
    </th>
  );

  const isSubscriptionType = (data) => data.product_type === "subscription";
  const isUsageType = (data) => data.product_type === "usage";
  const isPhysicalType = (data) => data.product_type === "good";
  const isServiceType = (data) => data.product_type === "service";

  const getFrequencyForType = (productType) => {
    const map = {
      good: "one_time",
      service: "one_time",
      subscription: "monthly",
      usage: "usage_based",
      retainer: "monthly",
    };
    return map[productType] || "one_time";
  };

  const handleTypeChange = (value, data, setData) => {
    const updates = { product_type: value, billing_frequency: getFrequencyForType(value) };
    if (value === "subscription") { updates.is_subscribable = true; updates.is_usage_billable = false; }
    else if (value === "usage") { updates.is_usage_billable = true; updates.is_subscribable = false; }
    else if (value === "good") { updates.is_subscribable = false; updates.is_usage_billable = false; }
    else if (value === "service") { updates.is_subscribable = false; updates.is_usage_billable = false; }
    setData((p) => ({ ...p, ...updates }));
  };

  const renderFormFields = (data, setData, includeImage = true) => (
    <div className="space-y-6">
      {/* ── Basic Information ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Package size={14} className="text-violet-500" /> Basic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
            <input type="text" value={data.name || ""}
              onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Code *</label>
            <input type="text" value={data.code || ""}
              onChange={(e) => setData((p) => ({ ...p, code: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea value={data.description || ""} rows={3}
            onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select value={data.category_id || ""}
              onChange={(e) => setData((p) => ({ ...p, category_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">No Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
            <input type="text" value={data.brand || ""} placeholder="e.g. Zoiko, Partner X"
              onChange={(e) => setData((p) => ({ ...p, brand: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
      </div>

      {/* ── Product Type & Status ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product Type *</label>
          <select value={data.product_type || "service"}
            onChange={(e) => handleTypeChange(e.target.value, data, setData)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isSubscriptionType(data) && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <CheckCircle size={12} /> Automatically subscribable
            </p>
          )}
          {isUsageType(data) && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Clock size={12} /> Usage-based billing enabled
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select value={data.is_active ? "active" : "inactive"}
            onChange={(e) => setData((p) => ({ ...p, is_active: e.target.value === "active" }))}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Billing Profile ── */}
      <div className="border-t border-slate-100 pt-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CreditCard size={14} className="text-violet-500" /> Billing Profile
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Price *</label>
            <input type="number" step="0.01" min="0" value={data.default_price || ""}
              onChange={(e) => setData((p) => ({ ...p, default_price: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Currency</label>
            <select value={data.currency || "USD"}
              onChange={(e) => setData((p) => ({ ...p, currency: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="KES">KES</option>
              <option value="NGN">NGN</option>
              <option value="ZAR">ZAR</option>
              <option value="GHS">GHS</option>
              <option value="TZS">TZS</option>
              <option value="UGX">UGX</option>
              <option value="RWF">RWF</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Billing Frequency</label>
            <select value={data.billing_frequency || "one_time"}
              onChange={(e) => setData((p) => ({ ...p, billing_frequency: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {BILLING_FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Default Discount (%)</label>
            <input type="number" step="0.01" min="0" max="100" value={data.default_discount || ""}
              onChange={(e) => setData((p) => ({ ...p, default_discount: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Description</label>
          <textarea value={data.invoice_description || ""} rows={2} placeholder="Default description shown on invoices when this product is selected"
            onChange={(e) => setData((p) => ({ ...p, invoice_description: e.target.value }))}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>

      {/* ── Advanced Fields (CEO UX: hidden by default) ── */}
      <div className="border-t border-slate-100 pt-4">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          {showAdvanced ? "Hide Advanced Fields" : "Show Advanced Fields"}
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit / Meter</label>
                <input type="text" value={data.unit_label || ""} placeholder="e.g. hours, licenses, seats"
                  onChange={(e) => setData((p) => ({ ...p, unit_label: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                <input type="number" step="0.01" min="0" value={data.cost_price || ""}
                  onChange={(e) => setData((p) => ({ ...p, cost_price: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                <input type="number" step="0.01" min="0" value={data.tax_percentage || ""}
                  onChange={(e) => setData((p) => ({ ...p, tax_percentage: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={data.tax_inclusive || false}
                    onChange={(e) => setData((p) => ({ ...p, tax_inclusive: e.target.checked }))}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  Tax Inclusive
                </label>
              </div>
            </div>
            {isPhysicalType(data) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <strong>Inventory Tracking:</strong> This is a physical product. Manage stock levels from the Inventory module.
              </div>
            )}
            {isServiceType(data) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <strong>Service Product:</strong> No inventory tracking needed. Configure delivery from the Service Delivery module.
              </div>
            )}
            {isSubscriptionType(data) && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700">
                <strong>Subscription Product:</strong> Configure recurring pricing plans from the Pricing Plans module.
              </div>
            )}
            {includeImage && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input type="text" value={data.image_url || ""} placeholder="https://example.com/image.jpg"
                  onChange={(e) => setData((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {data.image_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={data.image_url} alt="Preview" className="h-10 w-10 rounded-lg object-cover border" />
                    <button onClick={() => setData((p) => ({ ...p, image_url: "" }))} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">New Product</h2>
          <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} />{formError}
          </div>
        )}
        {renderFormFields(newProduct, (updater) => { setNewProduct(updater(newProduct)); })}
        <div className="flex justify-end gap-3 mt-8">
          <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={handleCreate} disabled={formLoading || !newProduct.name}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
            {formLoading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEditModal = () => {
    if (!editProduct) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Edit Product</h2>
            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
          </div>
          {formError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} />{formError}
            </div>
          )}
          {renderFormFields(editProduct, setEditProduct)}
          <div className="flex justify-end gap-3 mt-8">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button onClick={handleUpdate} disabled={formLoading}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
              {formLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <HRPage title="Products" subtitle="Manage your products">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading products...</p>
        </div>
      </HRPage>
    );
  }

  if (error && products.length === 0) {
    return (
      <HRPage title="Products" subtitle="Manage your products">
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
    <HRPage title="Products" subtitle="Manage your products">

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name, code..." value={search}
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
              <div className="relative">
                <button onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <Eye size={18} />
                </button>
                {showColumnMenu && (
                  <div className="absolute left-0 top-full mt-1 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2">
                    <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Columns</p>
                    {COLUMN_OPTIONS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
              <button onClick={() => { fetchCategories(); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
                <Plus size={18} /> Add Product
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
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
                <select value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Types</option>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
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
            <button onClick={() => handleBulkAction("archive")} disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 disabled:opacity-50">
              <Archive size={14} /> Archive
            </button>
            {statusFilter === "archived" && (
              <button onClick={() => handleBulkAction("restore")} disabled={bulkActionLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                <RotateCcw size={14} /> Restore
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                </th>
                {visibleColumns.has("image") && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">Image</th>
                )}
                {visibleColumns.has("name") && <SortHeader field="name" label="Product" />}
                {visibleColumns.has("code") && <SortHeader field="code" label="Code" />}
                {visibleColumns.has("default_price") && <SortHeader field="default_price" label="Price" />}
                {visibleColumns.has("product_type") && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                )}
                {visibleColumns.has("status") && <SortHeader field="status" label="Status" />}
                {visibleColumns.has("created_at") && <SortHeader field="created_at" label="Created" />}
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.size + 3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Package size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No products found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter || typeFilter ? "Try adjusting your search or filters" : "Add your first product to get started"}</p>
                    </div>
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(product.id) ? "bg-violet-50/50" : ""}`}
                  onClick={() => navigate(`/billing/products/${product.id}`)}>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(product.id)}
                      onChange={() => handleSelectOne(product.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  </td>
                  {visibleColumns.has("image") && (
                    <td className="px-4 py-4">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Image size={16} className="text-slate-400" />
                        </div>
                      )}
                    </td>
                  )}
                  {visibleColumns.has("name") && (
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold">
                          {(product.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{product.name || "Unnamed"}</p>
                          {product.description && <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has("code") && <td className="px-4 py-4 text-sm text-slate-600 font-mono">{product.code || "—"}</td>}
                  {visibleColumns.has("default_price") && <td className="px-4 py-4 text-sm font-medium text-slate-800">{formatCurrency(product.default_price || 0, product.currency || "USD")}</td>}
                  {visibleColumns.has("product_type") && (
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {product.product_type ? product.product_type.replace("_", " ") : "—"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has("status") && <td className="px-4 py-4"><StatusBadge status={product.status} /></td>}
                  {visibleColumns.has("created_at") && <td className="px-4 py-4 text-sm text-slate-500">{formatDisplayDate(product.created_at)}</td>}
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {product.status === "archived" ? (
                      <button onClick={() => handleRestoreProduct(product.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Restore">
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { fetchCategories(); setEditProduct({ ...product }); setShowEditModal(true); }}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button onClick={() => handleDuplicateProduct(product.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="Duplicate">
                          <Copy size={16} />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">{total} total product(s)</span>
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

      {showCreateModal && renderCreateModal()}
      {showEditModal && renderEditModal()}
    </HRPage>
  );
}
