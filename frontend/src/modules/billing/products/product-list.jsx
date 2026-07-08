import { useState, useEffect, useCallback } from "react";
import {
  Package, Search, Filter, X, ChevronDown, ArrowUpDown, RefreshCw, Download, Plus, AlertCircle, CheckCircle, Clock, Archive, Image, Eye, Upload,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { productApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency } from "../../../utils/billing-helpers";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const TYPE_OPTIONS = [
  { value: "one_time", label: "One-Time" },
  { value: "service", label: "Service" },
  { value: "usage", label: "Usage-Based" },
  { value: "subscription", label: "Subscription" },
];

const SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

const COLUMN_OPTIONS = [
  { key: "name", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "type", label: "Type" },
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

  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(new Set(COLUMN_OPTIONS.map((c) => c.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "", sku: "", price: "", description: "", category_id: "", type: "one_time", status: "active", image_url: "",
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

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);

      const params = {
        page: safePage,
        per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        product_type: typeFilter || undefined,
        status: statusFilter || undefined,
      };
      const data = await productApi.list(params);
      const items = data.items || data.data || data || [];
      setProducts(Array.isArray(items) ? items : []);
      setTotal(data.total || items.length || 0);
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
  }, [safePage, debouncedSearch, statusFilter, typeFilter, sortField, sortDir, loading]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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
      const results = await Promise.allSettled(
        ids.map((id) => {
          if (action === "activate") return productApi.update(id, { status: "active" });
          if (action === "deactivate") return productApi.update(id, { status: "inactive" });
          if (action === "archive") return productApi.delete(id);
          return Promise.resolve();
        })
      );
      const failed = results.filter((r) => r.status === "rejected");
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchProducts();
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const allData = await productApi.list({ per_page: 100 });
      const items = allData.items || allData.data || allData || [];
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
        const headers = ["Name", "SKU", "Price", "Type", "Status", "Created"];
        const csv = [headers.join(","), ...rows.map((r) =>
          [`"${(r.name || "").replace(/"/g, '""')}"`, r.sku || "", r.price || "", r.type || "", r.status || "", r.created_at || ""].join(",")
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
    try {
      await productApi.create({
        ...newProduct,
        price: parseFloat(newProduct.price) || 0,
        image_url: newProduct.image_url || undefined,
      });
      setShowCreateModal(false);
      setNewProduct({ name: "", sku: "", price: "", description: "", category_id: "", type: "one_time", status: "active", image_url: "" });
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
    try {
      await productApi.update(editProduct.id, {
        ...editProduct,
        price: parseFloat(editProduct.price) || 0,
        image_url: editProduct.image_url || undefined,
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

  const renderFormFields = (data, setData, includeImage = true) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
        <input type="text" value={data.name || ""}
          onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
        <input type="text" value={data.sku || ""}
          onChange={(e) => setData((p) => ({ ...p, sku: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
        <input type="number" step="0.01" min="0" value={data.price || ""}
          onChange={(e) => setData((p) => ({ ...p, price: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea value={data.description || ""} rows={3}
          onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
        <select value={data.type || "one_time"}
          onChange={(e) => setData((p) => ({ ...p, type: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select value={data.status || "active"}
          onChange={(e) => setData((p) => ({ ...p, status: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {includeImage && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
          <div className="flex gap-2">
            <input type="text" value={data.image_url || ""} placeholder="https://example.com/image.jpg"
              onChange={(e) => setData((p) => ({ ...p, image_url: e.target.value }))}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <label className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
              <Upload size={16} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setData((p) => ({ ...p, image_url: url }));
                }
              }} />
            </label>
          </div>
          {data.image_url && (
            <div className="mt-2 flex items-center gap-2">
              <img src={data.image_url} alt="Preview" className="h-10 w-10 rounded-lg object-cover border" />
              <button onClick={() => setData((p) => ({ ...p, image_url: "" }))} className="text-xs text-red-600 hover:text-red-800">Remove</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCreateModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">New Product</h2>
          <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} />{formError}
          </div>
        )}
        {renderFormFields({
          name: newProduct.name, sku: newProduct.sku, price: newProduct.price,
          description: newProduct.description, type: newProduct.type,
          status: newProduct.status, image_url: newProduct.image_url,
        }, (updater) => {
          const updated = updater(newProduct);
          setNewProduct(updated);
        })}
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
                <input type="text" placeholder="Search by name, SKU..." value={search}
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
              <button onClick={() => setShowCreateModal(true)}
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
                {visibleColumns.has("sku") && <SortHeader field="sku" label="SKU" />}
                {visibleColumns.has("price") && <SortHeader field="price" label="Price" />}
                {visibleColumns.has("type") && (
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
                <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(product.id) ? "bg-violet-50/50" : ""}`}>
                  <td className="px-4 py-4">
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
                  {visibleColumns.has("sku") && <td className="px-4 py-4 text-sm text-slate-600 font-mono">{product.sku || "—"}</td>}
                  {visibleColumns.has("price") && <td className="px-4 py-4 text-sm font-medium text-slate-800">{formatDisplayCurrency(product.price || 0, "USD")}</td>}
                  {visibleColumns.has("type") && (
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {product.type ? product.type.replace("_", " ") : "—"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has("status") && <td className="px-4 py-4"><StatusBadge status={product.status} /></td>}
                  {visibleColumns.has("created_at") && <td className="px-4 py-4 text-sm text-slate-500">{formatDisplayDate(product.created_at)}</td>}
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => { setEditProduct({ ...product }); setShowEditModal(true); }}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
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
