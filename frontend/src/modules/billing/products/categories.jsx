import React, { useState, useEffect, useCallback } from "react";
import { FolderTree, Search, X, RefreshCw, Plus, AlertCircle, ChevronRight, ChevronDown, Folder, Pencil, Trash2, CheckCircle, Archive } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { productApi } from "../../../service/billingService";
import { Spinner, ErrorState } from "../../../components/billing-shared";

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [childrenMap, setChildrenMap] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const getDefaultFormData = () => ({ name: "", code: "", description: "", parent_id: "" });
  const [formData, setFormData] = useState(getDefaultFormData());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchCategories = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setError(null);
      if (!isInitial) setRefreshing(true);
      const data = await productApi.listCategories({ root_only: false });
      const items = Array.isArray(data) ? data : data?.items || data?.categories || data?.data || [];
      
      const rootItems = items.filter(c => !c.parent_id);
      setCategories(rootItems);
      
      const nextChildrenMap = {};
      for (const item of items) {
        if (item.parent_id) {
          if (!nextChildrenMap[item.parent_id]) nextChildrenMap[item.parent_id] = [];
          nextChildrenMap[item.parent_id].push(item);
        }
      }
      setChildrenMap(nextChildrenMap);
    } catch (err) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchChildren = useCallback(async (parentId) => {
    try {
      const data = await productApi.listChildCategories(parentId);
      const items = Array.isArray(data) ? data : data?.items || data?.categories || data?.data || [];
      setChildrenMap((prev) => ({ ...prev, [parentId]: items }));
      return items;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => { fetchCategories(true); }, [fetchCategories]);

  const toggleExpand = async (id) => {
    if (expandedIds.has(id)) {
      setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } else {
      if (!childrenMap[id]) await fetchChildren(id);
      setExpandedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const payload = { name: formData.name, code: formData.code, description: formData.description };
      if (editCategory) payload.parent_id = formData.parent_id ? Number(formData.parent_id) : null;
      else if (formData.parent_id) payload.parent_id = Number(formData.parent_id);
      if (editCategory) {
        await productApi.updateCategory(editCategory.id, payload);
      } else {
        await productApi.createCategory(payload);
      }
      setShowForm(false);
      setEditCategory(null);
      setFormData(getDefaultFormData());
      fetchCategories();
    } catch (err) {
      setFormError(err.message || "Failed to save category");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category? This action cannot be undone.")) return;
    try {
      await productApi.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      setError(err.message || "Failed to delete category");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected categor${selectedIds.size === 1 ? "y" : "ies"}? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => productApi.deleteCategory(id))
      );
      const failed = results.filter((r) => r.status === "rejected");
      setSelectedIds(new Set());
      fetchCategories();
      if (failed.length > 0) {
        setError(`${failed.length} categor${failed.length === 1 ? "y" : "ies"} could not be deleted.`);
      }
    } catch (err) {
      setError(err.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setEditCategory(cat);
    setFormData({ name: cat.name || "", code: cat.code || "", description: cat.description || "", parent_id: cat.parent_id || "" });
    setShowForm(true);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allCategories = [...categories, ...Object.values(childrenMap).flat()];
  const filteredCategories = allCategories.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );
  const rootCategories = search ? filteredCategories : categories.filter((c) => !c.parent_id);

  const getProductCount = (cat) => cat.product_count ?? cat.products_count ?? 0;
  const getDescendantIds = (id) => {
    const descendants = new Set();
    const walk = (parentId) => {
      for (const child of childrenMap[parentId] || []) {
        descendants.add(child.id);
        walk(child.id);
      }
    };
    walk(id);
    return descendants;
  };

  function renderCategoryTree(cats, depth = 0) {
    return cats.map((cat) => {
      const hasChildren = childrenMap[cat.id] === undefined || childrenMap[cat.id].length > 0;
      const isExpanded = expandedIds.has(cat.id);
      const children = childrenMap[cat.id] || [];
      const isSelected = selectedIds.has(cat.id);

      return (
        <div key={cat.id}>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors group ${depth > 0 ? "ml-8" : ""} ${isSelected ? "bg-violet-50/50" : ""}`}>
            <input type="checkbox" checked={isSelected}
              onChange={() => toggleSelect(cat.id)}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <button onClick={() => toggleExpand(cat.id)} className="p-0.5 text-slate-400 hover:text-slate-600">
              {(hasChildren || children.length > 0) ? (
                isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              ) : (
                <span className="w-[14px]" />
              )}
            </button>
            <Folder size={16} className="text-violet-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{getProductCount(cat)} products</span>
            <button onClick={() => handleEdit(cat)} className="p-1 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" title="Edit">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleDelete(cat.id)} className="p-1 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
          {isExpanded && children.length > 0 && renderCategoryTree(children, depth + 1)}
        </div>
      );
    });
  }

  if (loading) {
    return (
      <HRPage title="Product Categories" subtitle="Organize products into categories">
        <Spinner />
      </HRPage>
    );
  }

  if (error && categories.length === 0) {
    return (
      <HRPage title="Product Categories" subtitle="Organize products into categories">
        <ErrorState message={error} onRetry={fetchCategories} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Product Categories" subtitle="Organize products into categories">

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search categories..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50">
              <Archive size={16} /> Delete ({selectedIds.size})
            </button>
          )}
          <button onClick={() => { setRefreshing(true); fetchCategories(); }} disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => { setShowForm(true); setEditCategory(null); setFormData(getDefaultFormData()); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg">
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {formError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {formError}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="text-base font-semibold text-slate-800 mb-4">{editCategory ? "Edit Category" : "New Category"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                <input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category</label>
              <select value={formData.parent_id} onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">None (root category)</option>
                {(function renderDropdownOptions(cats, depth = 0) {
                  return cats.map(c => {
                    if (editCategory && (c.id === editCategory.id || getDescendantIds(editCategory.id).has(c.id))) return null;
                    const children = childrenMap[c.id] || [];
                    return (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{"\u00A0\u00A0".repeat(depth)}{c.name}</option>
                        {children.length > 0 && renderDropdownOptions(children, depth + 1)}
                      </React.Fragment>
                    );
                  });
                })(categories)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={formData.description} rows={2} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={formLoading || !formData.name}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
              {formLoading ? "Saving..." : editCategory ? "Update Category" : "Create Category"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditCategory(null); setFormError(null); setFormData(getDefaultFormData()); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          </div>
        </form>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-4 px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-3">
          <CheckCircle size={16} className="text-violet-600" />
          <span className="text-sm font-medium text-violet-700">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-violet-600 hover:text-violet-800">Clear</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <FolderTree size={40} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No categories found</p>
            <p className="text-slate-400 text-sm mt-1">{search ? "Try a different search" : "Add your first category to get started"}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderCategoryTree(rootCategories)}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4">{filteredCategories.length} categor{filteredCategories.length === 1 ? "y" : "ies"}</p>
      </div>
    </HRPage>
  );
}
