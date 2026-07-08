import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt, Search, Filter, X, ChevronDown, ArrowUpDown, RefreshCw, Download,
  Plus, AlertCircle, CheckCircle, FileText, Ban, Send, Eye, Edit,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { creditNoteApi, customerApi, invoiceApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency, extractArray } from "../../../utils/billing-helpers";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_applied", label: "Partially Applied" },
  { value: "fully_applied", label: "Fully Applied" },
  { value: "voided", label: "Voided" },
];

const TYPE_OPTIONS = [
  { value: "refund", label: "Refund" },
  { value: "adjustment", label: "Adjustment" },
  { value: "promotional", label: "Promotional" },
  { value: "write_off", label: "Write Off" },
  { value: "cancellation", label: "Cancellation" },
];

export default function CreditNotesPage() {
  const navigate = useNavigate();

  const [creditNotes, setCreditNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedCN, setSelectedCN] = useState(null);
  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);

  const [createForm, setCreateForm] = useState({
    customer_id: "", invoice_id: "", credit_note_type: "refund",
    reason: "", total_amount: "", tax_amount: "0", subtotal: "",
    currency: "USD", issue_date: new Date().toISOString().split("T")[0],
  });
  const [editForm, setEditForm] = useState({ reason: "", total_amount: "", tax_amount: "", subtotal: "" });
  const [applyForm, setApplyForm] = useState({ invoice_id: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [formError, setFormError] = useState(null);

  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const sortParam = sortDir === "desc" ? `-${sortField}` : sortField;

  const fetchCreditNotes = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      const data = await creditNoteApi.list({
        page: safePage, per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
        credit_note_type: typeFilter || undefined,
      });
      setCreditNotes(extractArray(data));
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load credit notes");
      setCreditNotes([]); setTotal(0);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, typeFilter, loading]);

  useEffect(() => { fetchCreditNotes(); }, [fetchCreditNotes]);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages); }, [totalPages, currentPage]);

  const fetchCustomers = useCallback(async () => {
    try { const data = await customerApi.list({ per_page: 100 }); setCustomers(extractArray(data)); }
    catch (e) { /* silent */ }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try { const data = await invoiceApi.list({ per_page: 100, status: "sent,paid,partially_paid,overdue" }); setInvoices(extractArray(data)); }
    catch (e) { /* silent */ }
  }, []);

  const fetchOutstanding = useCallback(async () => {
    try { const data = await creditNoteApi.getOutstanding(); setOutstandingTotal(data.outstanding_credits || 0); }
    catch (e) { /* silent */ }
  }, []);

  useEffect(() => {
    if (showCreateModal) { fetchCustomers(); fetchInvoices(); }
  }, [showCreateModal, fetchCustomers, fetchInvoices]);

  useEffect(() => {
    fetchOutstanding();
  }, [fetchOutstanding]);

  const handleRefresh = () => { setRefreshing(true); fetchCreditNotes(); fetchOutstanding(); };
  const toggleSort = (field) => { setSortField(field); setSortDir((d) => d === "asc" ? "desc" : "asc"); };

  const openCreateModal = () => {
    setCreateForm({
      customer_id: "", invoice_id: "", credit_note_type: "refund",
      reason: "", total_amount: "", tax_amount: "0", subtotal: "",
      currency: "USD", issue_date: new Date().toISOString().split("T")[0],
    });
    setFormError(null); setShowCreateModal(true);
  };

  const openEditModal = (cn) => {
    setSelectedCN(cn);
    setEditForm({ reason: cn.reason || "", total_amount: String(cn.total_amount || ""), tax_amount: String(cn.tax_amount || "0"), subtotal: String(cn.subtotal || "") });
    setFormError(null); setShowEditModal(true);
  };

  const openApplyModal = (cn) => {
    setSelectedCN(cn);
    setApplyForm({ invoice_id: "", amount: String(cn.remaining_amount || cn.total_amount || "") });
    setFormError(null);
    fetchInvoices(); setShowApplyModal(true);
  };

  const openApplicationsModal = async (cn) => {
    try {
      setSelectedCN(cn);
      const data = await creditNoteApi.listApplications(cn.id);
      setApplications(Array.isArray(data) ? data : []);
      setShowApplicationsModal(true);
    } catch (err) {
      setFormError(err.message || "Failed to load applications");
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true); setFormError(null);
      await creditNoteApi.create({
        customer_id: Number(createForm.customer_id),
        invoice_id: createForm.invoice_id ? Number(createForm.invoice_id) : undefined,
        credit_note_number: `CN-${Date.now()}`,
        credit_note_type: createForm.credit_note_type,
        reason: createForm.reason || undefined,
        total_amount: Number(createForm.total_amount),
        tax_amount: Number(createForm.tax_amount || 0),
        subtotal: Number(createForm.subtotal || createForm.total_amount),
        currency: createForm.currency,
        issue_date: createForm.issue_date,
      });
      setShowCreateModal(false);
      fetchCreditNotes(); fetchOutstanding();
    } catch (err) {
      setFormError(err?.detail || err?.message || "Failed to create credit note");
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!selectedCN) return;
    try {
      setSaving(true); setFormError(null);
      await creditNoteApi.update(selectedCN.id, {
        reason: editForm.reason || undefined,
        total_amount: editForm.total_amount ? Number(editForm.total_amount) : undefined,
        tax_amount: editForm.tax_amount ? Number(editForm.tax_amount) : undefined,
        subtotal: editForm.subtotal ? Number(editForm.subtotal) : undefined,
      });
      setShowEditModal(false);
      fetchCreditNotes();
    } catch (err) {
      setFormError(err?.detail || err?.message || "Failed to update credit note");
    } finally { setSaving(false); }
  };

  const handleAction = async (action, actionFn) => {
    setActionLoading(action);
    try { await actionFn(); fetchCreditNotes(); fetchOutstanding(); }
    catch (err) { setError(err?.detail || err?.message || `Failed to ${action} credit note`); }
    finally { setActionLoading(null); }
  };

  const handleApply = async () => {
    if (!selectedCN) return;
    try {
      setSaving(true); setFormError(null);
      await creditNoteApi.applyToInvoice(selectedCN.id, {
        invoice_id: Number(applyForm.invoice_id),
        amount: Number(applyForm.amount),
      });
      setShowApplyModal(false);
      fetchCreditNotes(); fetchOutstanding();
    } catch (err) {
      setFormError(err?.detail || err?.message || "Failed to apply credit note");
    } finally { setSaving(false); }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(creditNotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "credit-notes.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Number", "Type", "Status", "Customer ID", "Invoice ID", "Total", "Remaining", "Currency", "Issue Date", "Reason"];
    const rows = creditNotes.map((cn) => [cn.id, cn.credit_note_number, cn.credit_note_type, cn.status, cn.customer_id, cn.invoice_id || "", cn.total_amount, cn.remaining_amount, cn.currency, cn.issue_date, cn.reason || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "credit-notes.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      issued: "bg-blue-100 text-blue-700",
      partially_applied: "bg-amber-100 text-amber-700",
      fully_applied: "bg-emerald-100 text-emerald-700",
      voided: "bg-red-100 text-red-700",
    };
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>{status?.replace(/_/g, " ") || "unknown"}</span>;
  };

  if (loading) {
    return (
      <HRPage title="Credit Notes" subtitle="Manage credit notes">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && creditNotes.length === 0) {
    return (
      <HRPage title="Credit Notes" subtitle="Manage credit notes">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh} className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Credit Notes" subtitle="Manage credit notes">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search credit notes..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
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
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
            Outstanding: {formatDisplayCurrency(outstandingTotal, "USD")}
          </span>
          <button onClick={handleExportJSON} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export JSON"><Download size={18} /></button>
          <button onClick={handleExportCSV} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Export CSV"><FileText size={18} /></button>
          <button onClick={openCreateModal} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">
            <Plus size={16} /> New Credit Note
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="relative">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("credit_note_number")}>
                  <span className="inline-flex items-center gap-1">Number <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("credit_note_type")}>
                  <span className="inline-flex items-center gap-1">Type <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("total_amount")}>
                  <span className="inline-flex items-center gap-1">Amount <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("issue_date")}>
                  <span className="inline-flex items-center gap-1">Date <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Receipt size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No credit notes found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter || typeFilter ? "Try adjusting your search or filters" : "Create your first credit note"}</p>
                    </div>
                  </td>
                </tr>
              ) : creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-800">{cn.credit_note_number || `#${cn.id}`}</td>
                  <td className="px-4 py-4 text-slate-600">{cn.customer_name || `#${cn.customer_id}`}</td>
                  <td className="px-4 py-4"><span className="capitalize text-slate-600">{cn.credit_note_type?.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-4"><StatusBadge status={cn.status} /></td>
                  <td className="px-4 py-4 text-right font-medium text-slate-800">{formatDisplayCurrency(cn.total_amount, cn.currency)}</td>
                  <td className="px-4 py-4 text-right font-medium text-slate-600">{formatDisplayCurrency(cn.remaining_amount, cn.currency)}</td>
                  <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{formatDisplayDate(cn.issue_date)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {cn.status === "draft" && (
                        <>
                          <button onClick={() => openEditModal(cn)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Edit size={15} /></button>
                          <button onClick={() => handleAction("issue", () => creditNoteApi.issue(cn.id))} disabled={actionLoading === "issue"}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40" title="Issue"><Send size={15} /></button>
                        </>
                      )}
                      {cn.status === "issued" && (
                        <button onClick={() => openApplyModal(cn)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="Apply to Invoice"><CheckCircle size={15} /></button>
                      )}
                      {(cn.status === "issued" || cn.status === "partially_applied") && (
                        <button onClick={() => openApplicationsModal(cn)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors" title="View Applications"><Eye size={15} /></button>
                      )}
                      {cn.status !== "voided" && cn.status !== "fully_applied" && (
                        <button onClick={() => handleAction("void", () => creditNoteApi.void(cn.id, "Voided by user"))} disabled={actionLoading === "void"}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40" title="Void"><Ban size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">{total} total credit note(s)</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
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
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Create Credit Note</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer *</label>
                <select value={createForm.customer_id} onChange={(e) => setCreateForm((p) => ({ ...p, customer_id: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.customer_name || `#${c.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice (optional)</label>
                <select value={createForm.invoice_id} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_id: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  <option value="">No invoice</option>
                  {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number || `#${inv.id}`} — {formatDisplayCurrency(inv.total_amount || inv.total, inv.currency)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                  <select value={createForm.credit_note_type} onChange={(e) => setCreateForm((p) => ({ ...p, credit_note_type: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Issue Date *</label>
                  <input type="date" value={createForm.issue_date} onChange={(e) => setCreateForm((p) => ({ ...p, issue_date: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount *</label>
                <input type="number" min="0" step="0.01" value={createForm.total_amount} onChange={(e) => setCreateForm((p) => ({ ...p, total_amount: e.target.value }))}
                  placeholder="0.00"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subtotal</label>
                  <input type="number" min="0" step="0.01" value={createForm.subtotal} onChange={(e) => setCreateForm((p) => ({ ...p, subtotal: e.target.value }))}
                    placeholder="0.00"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tax Amount</label>
                  <input type="number" min="0" step="0.01" value={createForm.tax_amount} onChange={(e) => setCreateForm((p) => ({ ...p, tax_amount: e.target.value }))}
                    placeholder="0.00"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                <textarea value={createForm.reason} onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={2} placeholder="Reason for credit note"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !createForm.customer_id || !createForm.total_amount}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Plus size={16} />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedCN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Edit {selectedCN.credit_note_number}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount</label>
                <input type="number" min="0" step="0.01" value={editForm.total_amount} onChange={(e) => setEditForm((p) => ({ ...p, total_amount: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subtotal</label>
                  <input type="number" min="0" step="0.01" value={editForm.subtotal} onChange={(e) => setEditForm((p) => ({ ...p, subtotal: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tax Amount</label>
                  <input type="number" min="0" step="0.01" value={editForm.tax_amount} onChange={(e) => setEditForm((p) => ({ ...p, tax_amount: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                <textarea value={editForm.reason} onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={2}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleEdit} disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle size={16} />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplyModal && selectedCN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowApplyModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Apply {selectedCN.credit_note_number}</h3>
              <button onClick={() => setShowApplyModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Remaining amount: <span className="font-semibold">{formatDisplayCurrency(selectedCN.remaining_amount, selectedCN.currency)}</span></p>
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice *</label>
                <select value={applyForm.invoice_id} onChange={(e) => setApplyForm((p) => ({ ...p, invoice_id: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  <option value="">Select invoice</option>
                  {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number || `#${inv.id}`} — {formatDisplayCurrency(inv.balance_due || inv.total_amount || inv.total, inv.currency)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount *</label>
                <input type="number" min="0" step="0.01" value={applyForm.amount} onChange={(e) => setApplyForm((p) => ({ ...p, amount: e.target.value }))}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowApplyModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleApply} disabled={saving || !applyForm.invoice_id || !applyForm.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle size={16} />} Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplicationsModal && selectedCN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowApplicationsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Applications — {selectedCN.credit_note_number}</h3>
              <button onClick={() => setShowApplicationsModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-6">
              {applications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No applications yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Invoice</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">Amount</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="border-b border-slate-50">
                        <td className="py-2 px-2 text-slate-700 font-medium">{app.invoice_id ? `#${app.invoice_id}` : "—"}</td>
                        <td className="py-2 px-2 text-right text-slate-700">{formatDisplayCurrency(app.amount, selectedCN.currency)}</td>
                        <td className="py-2 px-2 text-right text-slate-500">{formatDisplayDate(app.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowApplicationsModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
