import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, Filter, X, ChevronDown, RefreshCw, Download,
  CheckCircle, AlertCircle, Clock, UserCheck, UserX, Plus, ArrowUpDown,
  FileText, Mail, Phone, Building2, Globe, CreditCard, MapPin, ChevronUp
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { customerApi, settingsApi } from "../../../service/billingService";
import { formatDisplayDate } from "../../../utils/billing-helpers";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

const SORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
];

export default function CustomerListPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [kpiData, setKpiData] = useState(null);
  const [orgConfig, setOrgConfig] = useState(null);

  const [newCustomer, setNewCustomer] = useState({
    company_name: "", display_name: "", legal_name: "", email: "", phone: "", website: "",
    customer_type: "business", status: "active",
    gst_number: "", vat_number: "", pan: "", tin: "", tax_id: "",
    billing_address: "", shipping_address: "", shipping_same_as_billing: false,
    currency: "", payment_terms: "net_30", credit_limit: "", credit_days: "", price_list: "",
    notes: "",
  });

  useEffect(() => {
    customerApi.getKPI().then(setKpiData).catch(() => {/* error logged by api layer */});
    settingsApi.getConfig().then((cfg) => {
      setOrgConfig(cfg);
      setNewCustomer((prev) => ({
        ...prev,
        currency: cfg?.default_currency || prev.currency,
      }));
    }).catch(() => {/* org config unavailable */});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchCustomers = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);

      const data = await customerApi.list({
        page: safePage,
        per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });

      const items = data.items || data.data || data || [];
      setCustomers(Array.isArray(items) ? items : []);
      setTotal(data.total || items.length || 0);
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (err) {
      setError(err.message || "Failed to load customers");
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, sortField, sortDir, loading]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
    setSelectAll(checked);
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectAll(next.size === customers.length && customers.length > 0);
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
          if (action === "activate") return customerApi.activate(id);
          if (action === "deactivate") return customerApi.deactivate(id);
          if (action === "suspend") return customerApi.suspend(id);
          return Promise.resolve();
        })
      );
      const failed = results.filter((r) => r.status === "rejected");
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchCustomers();
    } catch (err) {
      setError(err.message || "Bulk action failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const allData = await customerApi.exportData();
      const items = allData.items || allData.data || allData || [];
      const rows = Array.isArray(items) ? items : [];

      if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customers-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const headers = ["Name", "Email", "Phone", "Company", "Status", "Created"];
        const csv = [headers.join(","), ...rows.map((r) =>
          [`"${((r.display_name || r.company_name || "").replace(/"/g, '""'))}"`, r.email || "", r.phone || "", r.company_name || "", r.status || "", r.created_at || ""].join(",")
        )].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
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
      const payload = {
        ...newCustomer,
        customer_code: newCustomer.customer_code || `CUST-${Date.now()}`,
      };
      await customerApi.create(payload);
      setShowCreateModal(false);
      setNewCustomer({
        company_name: "", display_name: "", legal_name: "", email: "", phone: "", website: "",
        customer_type: "business", status: "active",
        gst_number: "", vat_number: "", pan: "", tin: "", tax_id: "",
        billing_address: "", shipping_address: "", shipping_same_as_billing: false,
        currency: orgConfig?.default_currency || "", payment_terms: "net_30", credit_limit: "", credit_days: "", price_list: "",
        notes: "",
      });
      setShowAdvanced(false);
      setCurrentPage(1);
      fetchCustomers();
    } catch (err) {
      setFormError(err.message || "Failed to create customer");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editCustomer) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await customerApi.update(editCustomer.id, editCustomer);
      setShowEditModal(false);
      setEditCustomer(null);
      fetchCustomers();
    } catch (err) {
      setFormError(err.message || "Failed to update customer");
    } finally {
      setFormLoading(false);
    }
  };

  const SortHeader = ({ field, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={`${sortField === field ? "text-violet-600" : "text-slate-300"}`} />
      </div>
    </th>
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  const renderCreateModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={() => setShowCreateModal(false)}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">New Customer</h2>
          <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} />{formError}
          </div>
        )}

        {/* Customer Overview */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><User size={16} className="text-violet-600" /> Customer Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
              <input value={newCustomer.company_name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input value={newCustomer.display_name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, display_name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={newCustomer.email}
                onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={newCustomer.phone}
                onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input value={newCustomer.website}
                onChange={(e) => setNewCustomer((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type</label>
              <select value={newCustomer.customer_type}
                onChange={(e) => setNewCustomer((p) => ({ ...p, customer_type: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="business">Business</option>
                <option value="individual">Individual</option>
                <option value="non_profit">Non-Profit</option>
                <option value="government">Government</option>
              </select>
            </div>
          </div>
        </div>

        {/* Billing Profile */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><CreditCard size={16} className="text-violet-600" /> Billing Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
              <select value={newCustomer.currency}
                onChange={(e) => setNewCustomer((p) => ({ ...p, currency: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Select currency</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
              {orgConfig?.default_currency && (
                <p className="text-xs text-slate-400 mt-1">Org default: {orgConfig.default_currency}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <select value={newCustomer.payment_terms}
                onChange={(e) => setNewCustomer((p) => ({ ...p, payment_terms: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="due_on_receipt">Due on Receipt</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_45">Net 45</option>
                <option value="net_60">Net 60</option>
                <option value="net_90">Net 90</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
              <input type="number" min="0" step="0.01" value={newCustomer.credit_limit}
                onChange={(e) => setNewCustomer((p) => ({ ...p, credit_limit: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><MapPin size={16} className="text-violet-600" /> Addresses</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
              <textarea rows={2} value={newCustomer.billing_address}
                onChange={(e) => setNewCustomer((p) => ({ ...p, billing_address: e.target.value, shipping_same_as_billing: false }))}
                placeholder="Street, City, State, ZIP, Country"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                <input type="checkbox" checked={newCustomer.shipping_same_as_billing}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, shipping_same_as_billing: e.target.checked, shipping_address: e.target.checked ? p.billing_address : "" }))}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                Use Billing Address as Shipping Address
              </label>
              {!newCustomer.shipping_same_as_billing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Address</label>
                  <textarea rows={2} value={newCustomer.shipping_address}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, shipping_address: e.target.value }))}
                    placeholder="Street, City, State, ZIP, Country"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Fields Toggle */}
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium mb-3">
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showAdvanced ? "Hide Advanced Fields" : "Show Advanced Fields"}
        </button>

        {showAdvanced && (
          <>
            {/* Tax Information */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><Building2 size={16} className="text-violet-600" /> Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                  <input value={newCustomer.gst_number}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, gst_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VAT Number</label>
                  <input value={newCustomer.vat_number}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, vat_number: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN</label>
                  <input value={newCustomer.pan}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, pan: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TIN</label>
                  <input value={newCustomer.tin}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, tin: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea rows={2} value={newCustomer.notes}
                onChange={(e) => setNewCustomer((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={handleCreate} disabled={formLoading || !newCustomer.company_name}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
            {formLoading ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEditModal = () => {
    if (!editCustomer) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8" onClick={() => setShowEditModal(false)}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Edit Customer</h2>
            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
          </div>
          {formError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} />{formError}
            </div>
          )}

          {/* Customer Overview */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><User size={16} className="text-violet-600" /> Customer Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["company_name", "display_name", "email", "phone", "website"].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{field.replace(/_/g, ' ')}{field === "company_name" ? " *" : ""}</label>
                  <input type={field === "email" ? "email" : "text"} value={editCustomer[field] || ""}
                    onChange={(e) => setEditCustomer((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Type</label>
                <select value={editCustomer.customer_type || "business"}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, customer_type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="business">Business</option>
                  <option value="individual">Individual</option>
                  <option value="non_profit">Non-Profit</option>
                  <option value="government">Government</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Profile */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><CreditCard size={16} className="text-violet-600" /> Billing Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
                <select value={editCustomer.currency || ""}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Select currency</option>
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                  <option value="INR">INR</option><option value="AED">AED</option><option value="SAR">SAR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                <select value={editCustomer.payment_terms || "net_30"}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, payment_terms: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="net_60">Net 60</option>
                  <option value="net_90">Net 90</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
                <input type="number" min="0" step="0.01" value={editCustomer.credit_limit || ""}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, credit_limit: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3"><MapPin size={16} className="text-violet-600" /> Addresses</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea rows={2} value={editCustomer.billing_address || ""}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, billing_address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shipping Address</label>
                <textarea rows={2} value={editCustomer.shipping_address || ""}
                  onChange={(e) => setEditCustomer((p) => ({ ...p, shipping_address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
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

  const StatusBadge = ({ status }) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-700",
      suspended: "bg-amber-100 text-amber-700",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status === "active" ? <CheckCircle size={12} /> : status === "suspended" ? <AlertCircle size={12} /> : <Clock size={12} />}
        {status || "unknown"}
      </span>
    );
  };

  if (loading) {
    return (
      <HRPage title="Customers" subtitle="Manage your customers">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading customers...</p>
        </div>
      </HRPage>
    );
  }

  if (error && customers.length === 0) {
    return (
      <HRPage title="Customers" subtitle="Manage your customers">
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
    <HRPage title="Customers" subtitle="Manage your customers">

      {kpiData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p><p className="text-2xl font-bold text-slate-800 mt-1">{kpiData.total_customers || 0}</p></div>
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-emerald-600 mt-1">{kpiData.active_customers || 0}</p></div>
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive</p><p className="text-2xl font-bold text-slate-500 mt-1">{kpiData.inactive_customers || 0}</p></div>
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">New This Month</p><p className="text-2xl font-bold text-violet-600 mt-1">{kpiData.new_this_month || 0}</p></div>
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</p><p className="text-2xl font-bold text-slate-800 mt-1">${(kpiData.total_revenue || 0).toLocaleString()}</p></div>
          <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding</p><p className="text-2xl font-bold text-amber-600 mt-1">${(kpiData.outstanding_balance || 0).toLocaleString()}</p></div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by company, email, phone or GST/VAT" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <p className="mt-1 text-xs text-slate-400">Tip: search by company, contact, email, phone or tax ID to move faster.</p>
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
                <Plus size={18} /> Add Customer
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
              <UserCheck size={14} /> Activate
            </button>
            <button onClick={() => handleBulkAction("deactivate")} disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
              <UserX size={14} /> Deactivate
            </button>
            <button onClick={() => handleBulkAction("suspend")} disabled={bulkActionLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50">
              <AlertCircle size={14} /> Suspend
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
                <SortHeader field="name" label="Name" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <SortHeader field="created_at" label="Created" />
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Users size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No customers found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter ? "Try adjusting your search or filters" : "Add your first customer to get started"}</p>
                    </div>
                  </td>
                </tr>
              ) : customers.map((customer) => (
                <tr key={customer.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(customer.id) ? "bg-violet-50/50" : ""}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.has(customer.id)}
                      onChange={() => handleSelectOne(customer.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => navigate(`/billing/customers/${customer.id}`)} className="flex items-center gap-3 group">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold">
                        {(customer.display_name || customer.company_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-800 group-hover:text-violet-600 transition-colors">{customer.display_name || customer.company_name || "Unnamed"}</p>
                        <p className="text-xs text-slate-400">{customer.customer_code || customer.id}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-0.5">
                      {customer.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={12} />{customer.email}</span>}
                      {customer.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={12} />{customer.phone}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={customer.status} /></td>
                  <td className="px-4 py-4 text-sm text-slate-600">{customer.company_name || "—"}</td>
                  <td className="px-4 py-4 text-sm text-slate-500">{formatDisplayDate(customer.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/billing/customers/${customer.id}`)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="View">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => { setEditCustomer({ ...customer }); setShowEditModal(true); }}
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
            <span className="text-xs text-slate-400">{total} total customer(s)</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 5, totalPages - 9));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                      page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && renderCreateModal()}
      {showEditModal && renderEditModal()}
    </HRPage>
  );
}
