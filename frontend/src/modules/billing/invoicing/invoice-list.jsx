import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Receipt, Search, Filter, X, ChevronDown, RefreshCw,
  AlertCircle, CheckCircle, Clock, FileText, Plus, Trash2, Loader2,
  User, Calendar, DollarSign, ChevronLeft, ChevronRight, Eye, MapPin, Package,
  ArrowUpDown, Send, Ban, Download, Copy
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { invoiceApi, customerApi, productApi, settingsApi, taxApi, pricingApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency } from "../../../utils/billing-helpers";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
  { value: "void", label: "Void" },
];

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
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [orgSettings, setOrgSettings] = useState(null);
  const [taxRates, setTaxRates] = useState([]);

  const [createForm, setCreateForm] = useState({
    customer_id: "", customer_name: "", customer_status: "active",
    billing_address: "", shipping_address: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "", notes: "", payment_terms: "net_30",
    discount_percentage: 0, po_number: "",
  });
  const [selectedTaxRate, setSelectedTaxRate] = useState({ id: null, name: "", rate: 0 });

  const [lineItems, setLineItems] = useState([]);

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef(null);

  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

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
  }, [safePage, debouncedSearch, statusFilter, loading]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (!showCreateModal) { setWizardStep(1); return; }
    Promise.allSettled([settingsApi.getConfig(), settingsApi.get()]).then(([configRes, settingsRes]) => {
      const config = configRes.status === "fulfilled" ? configRes.value || {} : {};
      const settings = settingsRes.status === "fulfilled" ? settingsRes.value || {} : {};
      const merged = { ...config, ...settings };
      setOrgSettings(merged);
      if (merged?.default_payment_terms && !createForm.customer_id) {
        setCreateForm((p) => ({
          ...p,
          payment_terms: merged.default_payment_terms,
          due_date: calcDueDate(merged.default_payment_terms, p.issue_date),
          currency: p.currency || merged.default_currency || "USD",
        }));
      }
      if (merged?.default_tax_rate_id) {
        taxApi.get(merged.default_tax_rate_id).then((tr) => {
          if (tr) setSelectedTaxRate({ id: tr.id, name: tr.name, rate: Number(tr.rate || 0) });
        }).catch(() => {});
      }
    }).catch(() => {});
    taxApi.list({ is_active: true }).then((data) => {
      const rates = Array.isArray(data) ? data : data?.items || data?.data || [];
      setTaxRates(rates);
    }).catch(() => {});
  }, [showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;
    const timer = setTimeout(async () => {
      if (!customerSearchTerm.trim()) { setCustomerSearchResults([]); setCustomerSearching(false); return; }
      setCustomerSearching(true);
      try {
        const data = await customerApi.search(customerSearchTerm);
        setCustomerSearchResults(Array.isArray(data) ? data : data?.items || data?.data || []);
      } catch { setCustomerSearchResults([]); }
      finally { setCustomerSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm, showCreateModal]);

  useEffect(() => {
    if (wizardStep !== 2 || !showCreateModal) return;
    const timer = setTimeout(async () => {
      if (!productSearchTerm.trim()) { setProductSearchResults([]); setProductSearching(false); return; }
      setProductSearching(true);
      try {
        const data = await productApi.list({ search_term: productSearchTerm, per_page: 15 });
        setProductSearchResults(Array.isArray(data) ? data : data?.items || data?.data || []);
      } catch { setProductSearchResults([]); }
      finally { setProductSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchTerm, wizardStep, showCreateModal]);

  const calcDueDate = (paymentTerms, fromDate) => {
    const d = fromDate ? new Date(fromDate) : new Date();
    if (!paymentTerms || paymentTerms === "due_on_receipt") return d.toISOString().split("T")[0];
    const match = paymentTerms.match(/net[_\s]?(\d+)/i);
    if (match) { d.setDate(d.getDate() + parseInt(match[1])); return d.toISOString().split("T")[0]; }
    return new Date(d.getTime() + 30 * 86400000).toISOString().split("T")[0];
  };

  const handleCustomerSelect = async (c) => {
    try {
      const full = await customerApi.get(c.id);
      const ccy = full.currency || full.default_currency || orgSettings?.default_currency || "USD";
      const terms = full.payment_terms || full.default_payment_terms || orgSettings?.default_payment_terms || "net_30";
      const billingAddress = full.billing_address || full.address || full.primary_billing_address || "";
      const shippingAddress = full.shipping_address || full.delivery_address || billingAddress;
      const customerDiscount = Number(full.discount_percentage ?? full.default_discount ?? full.discount ?? 0) || 0;
      setCreateForm({
        customer_id: String(full.id), customer_name: full.display_name || full.company_name || full.name || `#${full.id}`,
        customer_status: full.status || "active",
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        issue_date: createForm.issue_date || new Date().toISOString().split("T")[0],
        due_date: calcDueDate(terms, createForm.issue_date),
        currency: ccy, notes: full.notes || "",
        payment_terms: terms,
        discount_percentage: customerDiscount, po_number: "",
      });
      setCustomerSearchTerm(full.display_name || full.company_name || full.name || `#${full.id}`);
      setShowCustomerDropdown(false);
      if (full.tax_category) {
        const matched = taxRates.find((tr) => tr.code === full.tax_category || tr.name === full.tax_category);
        if (matched) setSelectedTaxRate({ id: matched.id, name: matched.name, rate: Number(matched.rate || 0) });
      }
    } catch { /* silent */ }
  };

  const resolveProductPrice = async (productId) => {
    try {
      const plans = await pricingApi.listByProduct(productId);
      const items = Array.isArray(plans) ? plans : plans?.items || [];
      const activeItems = items.filter((pl) => pl.status !== "inactive");
      const flatPlan = activeItems.find((pl) => pl.plan_type === "flat");
      if (flatPlan?.price > 0) return Number(flatPlan.price);
      const perUnitPlan = activeItems.find((pl) => pl.plan_type === "per_unit");
      if (perUnitPlan?.price > 0) return Number(perUnitPlan.price);
    } catch { /* pricing unavailable, fall through */ }
    return null;
  };

  const handleProductSelect = async (p) => {
    try {
      const full = p.description ? p : await productApi.get(p.id);
      const pricingPrice = await resolveProductPrice(full.id);
      const price = pricingPrice !== null ? pricingPrice : Number(full.default_price || full.unit_price || full.price || 0);
      const taxPct = Number(full.tax_percentage || selectedTaxRate?.rate || 0);
      setLineItems((prev) => [...prev, {
        product_id: full.id,
        description: full.description || full.name,
        quantity: 1,
        unit_price: price,
        discount_percentage: Number(full.discount_percentage ?? createForm.discount_percentage ?? 0) || 0,
        tax_percentage: taxPct,
        unit_label: full.unit_label || "",
        category_name: full.category_name || "",
      }]);
      setProductSearchTerm("");
      setProductSearchResults([]);
      setShowProductDropdown(false);
    } catch { /* silent */ }
  };

  const openCreateModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const defaultTerms = orgSettings?.default_payment_terms || "net_30";
    setWizardStep(1);
    setShowAdvanced(false);
    setCreateForm({
      customer_id: "", customer_name: "", customer_status: "active",
      billing_address: "", shipping_address: "",
      issue_date: today,
      due_date: calcDueDate(defaultTerms, today),
      currency: orgSettings?.default_currency || "USD", notes: orgSettings?.invoice_notes || "", payment_terms: defaultTerms,
      discount_percentage: 0, po_number: "",
    });
    setSelectedTaxRate((p) => p?.id ? p : { id: null, name: "", rate: 0 });
    setLineItems([]);
    setCustomerSearchTerm(""); setCustomerSearchResults([]);
    setProductSearchTerm(""); setProductSearchResults([]);
    setFormError(null);
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

  useEffect(() => {
    const requestedCustomerId = searchParams.get("customer_id");
    if (!showCreateModal || !requestedCustomerId || createForm.customer_id) return;
    const loadRequestedCustomer = async () => {
      try {
        const customer = await customerApi.get(requestedCustomerId);
        handleCustomerSelect(customer);
      } catch {
        // Ignore customer prefill failures and keep existing flow intact
      }
    };
    loadRequestedCustomer();
  }, [searchParams, showCreateModal, createForm.customer_id]);

  const addLineItem = () => setLineItems((p) => [...p, { product_id: null, description: "", quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: selectedTaxRate?.rate || 0, unit_label: "", category_name: "" }]);

  const removeLineItem = (index) => setLineItems((p) => p.filter((_, i) => i !== index));

  const updateLineItem = (index, field, value) => setLineItems((p) => {
    const next = [...p];
    next[index] = { ...next[index], [field]: ["description", "unit_label", "category_name"].includes(field) ? value : Number(value) };
    return next;
  });

  const calcItemTotal = (item) => {
    const qty = item.quantity || 0;
    const price = item.unit_price || 0;
    return qty * price;
  };

  const calcItemDiscount = (item) => {
    const total = calcItemTotal(item);
    return total * (item.discount_percentage || 0) / 100;
  };

  const calcItemNet = (item) => {
    const total = calcItemTotal(item);
    const discount = calcItemDiscount(item);
    const taxable = total - discount;
    const tax = taxable * (item.tax_percentage || 0) / 100;
    return taxable + tax;
  };

  const lineSubtotal = lineItems.reduce((s, item) => s + calcItemTotal(item), 0);
  const lineDiscount = lineItems.reduce((s, item) => s + calcItemDiscount(item), 0);
  const lineTaxTotal = lineItems.reduce((s, item) => {
    const total = calcItemTotal(item);
    const discount = calcItemDiscount(item);
    return s + ((total - discount) * (item.tax_percentage || 0) / 100);
  }, 0);
  const lineGrandTotal = lineItems.reduce((s, item) => s + calcItemNet(item), 0);

  const getDuplicateProductIds = () => {
    const ids = lineItems.map((item) => item.product_id).filter(Boolean);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  };

  const validateStep1 = () => {
    if (!createForm.customer_id) return "Please select a customer";
    if (createForm.customer_status && createForm.customer_status !== "active") return `Customer status is "${createForm.customer_status}". Only active customers should be invoiced.`;
    if (!createForm.issue_date) return "Issue date is required";
    if (!createForm.due_date) return "Due date is required";
    if (createForm.due_date < createForm.issue_date) return "Due date cannot be before issue date";
    return null;
  };

  const validateStep2 = () => {
    if (lineItems.length === 0) return "Add at least one product or line item";
    const validItems = lineItems.filter((item) => item.description && item.quantity > 0);
    if (validItems.length === 0) return "At least one line item with a description and quantity is required";
    const negativeQty = lineItems.find((item) => item.quantity < 0);
    if (negativeQty) return "Quantity cannot be negative";
    const invalidPrice = lineItems.find((item) => item.unit_price < 0);
    if (invalidPrice) return "Unit price cannot be negative";
    const dupIds = getDuplicateProductIds();
    if (dupIds.length > 0) return `Duplicate products detected (ID: ${dupIds.join(", ")}). Remove duplicates before continuing.`;
    return null;
  };

  const buildInvoicePayload = () => ({
    customer_id: Number(createForm.customer_id),
    issue_date: createForm.issue_date,
    due_date: createForm.due_date,
    currency: createForm.currency || orgSettings?.default_currency || "USD",
    notes: createForm.notes || undefined,
    payment_terms: createForm.payment_terms || "net_30",
    po_number: createForm.po_number || undefined,
    discount_percentage: Number(createForm.discount_percentage) || 0,
  });

  const buildItemsPayload = () =>
    lineItems
      .filter((item) => item.description && item.quantity > 0)
      .map((item) => ({
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_percentage: Number(item.discount_percentage) || 0,
        tax_percentage: Number(item.tax_percentage) || 0,
        total: calcItemNet(item),
      }));

  const createInvoiceWithItems = async (invoicePayload, itemsPayload) => {
    const created = await invoiceApi.create(invoicePayload);
    const invoiceId = created.id || created.invoice_id;
    if (itemsPayload.length > 0) await invoiceApi.bulkSetItems(invoiceId, itemsPayload);
    return invoiceId;
  };

  const handleCreateDraft = async () => {
    const err1 = validateStep1();
    if (err1) { setFormError(err1); return; }
    const err2 = validateStep2();
    if (err2) { setFormError(err2); return; }
    try {
      setSaving(true); setFormError(null);
      const invoiceId = await createInvoiceWithItems(buildInvoicePayload(), buildItemsPayload());
      closeCreateModal();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setFormError(err?.detail || err?.message || "Failed to create invoice");
    } finally { setSaving(false); }
  };

  const handleCreateAndFinalize = async () => {
    const err1 = validateStep1();
    if (err1) { setFormError(err1); return; }
    const err2 = validateStep2();
    if (err2) { setFormError(err2); return; }
    if (lineItems.length === 0) { setFormError("Cannot finalize an empty invoice. Add at least one item."); return; }
    try {
      setSaving(true); setFormError(null);
      const invoiceId = await createInvoiceWithItems(buildInvoicePayload(), buildItemsPayload());
      await invoiceApi.finalize(invoiceId);
      closeCreateModal();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setFormError(err?.detail || err?.message || "Failed to create invoice");
    } finally { setSaving(false); }
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      const err = validateStep1();
      if (err) { setFormError(err); return; }
      setFormError(null);
      setWizardStep(2);
    } else if (wizardStep === 2) {
      const err = validateStep2();
      if (err) { setFormError(err); return; }
      setFormError(null);
      setWizardStep(3);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const handleRefresh = () => { setRefreshing(true); fetchInvoices(); };

  const StatusBadge = ({ status }) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-amber-100 text-amber-700",
      void: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status === "paid" ? <CheckCircle size={12} /> : status === "overdue" ? <AlertCircle size={12} /> : <Clock size={12} />}
        {status || "unknown"}
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
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading invoices...</p>
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
      <div className="mb-5 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Invoice first</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Start with a customer. We will fill the finance details.</h2>
            <p className="mt-1 text-sm text-slate-500">Customer terms, currency, addresses, pricing, discounts, tax, and totals are reused in the wizard.</p>
          </div>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
            <Plus size={16} /> Create Invoice
          </button>
        </div>
        {recentInvoices.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recently Created</p>
              <button onClick={() => setStatusFilter("")} className="text-xs font-medium text-violet-600 hover:text-violet-700">View all</button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {recentInvoices.map((inv) => (
                <button key={inv.id} onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-violet-200 hover:bg-violet-50">
                  <span className="block text-sm font-semibold text-slate-800">{inv.invoice_number || `#${inv.id}`}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{inv.customer_name || `Customer #${inv.customer_id || "—"}`} - {formatDisplayCurrency(inv.total || inv.total_amount)}</span>
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
                <input type="text" placeholder="Search invoices..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
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
            <button onClick={openCreateModal} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">
              <Plus size={16} /> Create Invoice
            </button>
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
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick filters</span>
              {[{ value: "", label: "All" }, ...STATUS_OPTIONS.slice(0, 5)].map((o) => (
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
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={displayInvoices.length > 0 && displayInvoices.every((inv) => selectedInvoices.includes(inv.id))}
                    onChange={toggleAllVisible} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                </th>
                <th onClick={() => toggleSort("invoice_number")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                  <span className="inline-flex items-center gap-1">Invoice <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("customer_name")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                  <span className="inline-flex items-center gap-1">Customer <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("total_amount")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                  <span className="inline-flex items-center gap-1">Amount <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("status")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                  <span className="inline-flex items-center gap-1">Status <ArrowUpDown size={12} /></span>
                </th>
                <th onClick={() => toggleSort("due_date")} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">
                  <span className="inline-flex items-center gap-1">Due Date <ArrowUpDown size={12} /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Receipt size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No invoices found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter ? "Try adjusting your search or filters" : "No invoices yet"}</p>
                      {!search && !statusFilter && (
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
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => navigate(`/billing/invoices/${inv.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors">
                      {inv.invoice_number || `#${inv.id}`}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{inv.customer_name || inv.customer?.name || "—"}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatDisplayCurrency(inv.total || inv.total_amount)}</td>
                  <td className="px-4 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-4 text-slate-500">{formatDisplayDate(inv.due_date)}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="View">
                      <FileText size={16} />
                    </button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                {wizardStep === 1 ? "Create Invoice — Select Customer" :
                 wizardStep === 2 ? "Create Invoice — Add Products" :
                 "Review & Finalize Invoice"}
              </h3>
              <button onClick={closeCreateModal} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${wizardStep >= 1 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  <User size={12} /> Customer
                </div>
                <ChevronRight size={14} className="text-slate-300" />
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${wizardStep >= 2 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  <Package size={12} /> Products
                </div>
                <ChevronRight size={14} className="text-slate-300" />
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${wizardStep >= 3 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                  <Eye size={12} /> Review
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}
                </div>
              )}

              {/* ====== STEP 1: CUSTOMER ====== */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="relative" ref={customerSearchRef}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Search Customer *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Type customer name..." value={customerSearchTerm}
                        onChange={(e) => { setCustomerSearchTerm(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                      {customerSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                    </div>
                    {showCustomerDropdown && customerSearchTerm && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {customerSearchResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-slate-400">{customerSearching ? "Searching..." : "No customers found"}</p>
                        ) : customerSearchResults.map((c) => (
                          <button key={c.id} type="button"
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700">
                            {c.display_name || c.company_name || c.name || c.customer_name || `#${c.id}`}
                            <span className="text-xs text-slate-400 ml-2">{c.email || c.customer_email || ""}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {createForm.customer_id && (
                    <>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{createForm.customer_name}</span>
                          {createForm.customer_status !== "active" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              {createForm.customer_status}
                            </span>
                          )}
                        </div>
                        {createForm.billing_address && (
                          <div className="flex items-start gap-2 text-xs text-slate-600">
                            <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{createForm.billing_address}</span>
                          </div>
                        )}
                        {createForm.shipping_address && createForm.shipping_address !== createForm.billing_address && (
                          <div className="flex items-start gap-2 text-xs text-slate-500">
                            <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                            <span>Shipping: {createForm.shipping_address}</span>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Terms: {createForm.payment_terms?.replace(/_/g, " ") || "Net 30"}</span>
                          <span>Currency: {createForm.currency || orgSettings?.default_currency || "USD"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Issue Date *</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="date" value={createForm.issue_date}
                              onChange={(e) => setCreateForm((p) => ({ ...p, issue_date: e.target.value, due_date: calcDueDate(p.payment_terms, e.target.value) }))}
                              className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
                          <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="date" value={createForm.due_date}
                              onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))}
                              className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Auto-calculated from {createForm.payment_terms?.replace(/_/g, " ") || "net_30"}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
                          <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select value={createForm.currency || orgSettings?.default_currency || "USD"}
                              onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value }))}
                              className="block w-full rounded-lg border border-slate-200 pl-9 pr-8 py-2 text-sm appearance-none bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                              <option value="CAD">CAD</option>
                              <option value="AUD">AUD</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{createForm.customer_name ? "From customer profile" : "Org default"}</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate</label>
                        <select value={selectedTaxRate.id || ""}
                          onChange={(e) => {
                            const tr = taxRates.find((r) => r.id === Number(e.target.value));
                            setSelectedTaxRate(tr ? { id: tr.id, name: tr.name, rate: tr.rate } : { id: null, name: "", rate: 0 });
                          }}
                          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                          <option value="">No tax</option>
                          {taxRates.map((tr) => (
                            <option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Auto-selected from {selectedTaxRate.name ? "customer/organization profile" : "default settings"}</p>
                      </div>

                      <div>
                        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                          className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                          <ChevronDown size={12} className={showAdvanced ? "rotate-180" : ""} /> {showAdvanced ? "Hide" : "Show"} advanced
                        </button>
                        {showAdvanced && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                              <input type="number" min="0" max="100" step="0.01" value={createForm.discount_percentage}
                                onChange={(e) => setCreateForm((p) => ({ ...p, discount_percentage: e.target.value }))}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">PO Number</label>
                              <input type="text" value={createForm.po_number}
                                onChange={(e) => setCreateForm((p) => ({ ...p, po_number: e.target.value }))}
                                placeholder="Optional"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                              <textarea value={createForm.notes}
                                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                                rows={2} placeholder="Optional notes or terms..."
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ====== STEP 2: PRODUCTS ====== */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="relative" ref={productSearchRef}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Search Products</label>
                    <div className="relative">
                      <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Type product name to add..." value={productSearchTerm}
                        onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                        onFocus={() => setShowProductDropdown(true)}
                        className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                      {productSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                    </div>
                    {showProductDropdown && productSearchTerm && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {productSearchResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-slate-400">{productSearching ? "Searching..." : "No products found"}</p>
                        ) : productSearchResults.map((p) => (
                          <button key={p.id} type="button"
                            onClick={() => handleProductSelect(p)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700 flex justify-between items-center">
                            <span>{p.name} {p.code ? `(${p.code})` : ""}</span>
                            <span className="text-xs text-slate-400">{formatDisplayCurrency(p.default_price || p.unit_price || 0)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">Disc%</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">Tax%</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Net Total</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                              No items yet. Search and select products above, or add manually.
                            </td>
                          </tr>
                        ) : lineItems.map((item, i) => {
                          const isDup = item.product_id && getDuplicateProductIds().includes(item.product_id);
                          return (
                            <tr key={i} className={isDup ? "bg-red-50" : ""}>
                              <td className="px-3 py-2">
                                {item.product_id ? (
                                  <div className="flex flex-col">
                                    <input type="text" value={item.description}
                                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                                      className="w-full border-0 bg-transparent text-sm font-medium focus:outline-none focus:ring-0" />
                                    {item.unit_label && <span className="text-xs text-slate-400">{item.unit_label}{item.category_name ? ` · ${item.category_name}` : ""}</span>}
                                  </div>
                                ) : (
                                  <input type="text" value={item.description}
                                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                                    placeholder="Manual item"
                                    className="w-full border-0 bg-transparent text-sm focus:outline-none focus:ring-0 placeholder:text-slate-300" />
                                )}
                                {isDup && <span className="text-xs text-red-500">Duplicate product</span>}
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" step="1" value={item.quantity}
                                  onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                                  className="w-full text-right border-0 bg-transparent text-sm focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" step="0.01" value={item.unit_price}
                                  onChange={(e) => updateLineItem(i, "unit_price", e.target.value)}
                                  className="w-full text-right border-0 bg-transparent text-sm focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" max="100" step="0.01" value={item.discount_percentage}
                                  onChange={(e) => updateLineItem(i, "discount_percentage", e.target.value)}
                                  className="w-full text-right border-0 bg-transparent text-sm focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" max="100" step="0.01" value={item.tax_percentage}
                                  onChange={(e) => updateLineItem(i, "tax_percentage", e.target.value)}
                                  className="w-full text-right border-0 bg-transparent text-sm focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium text-slate-700">
                                {formatDisplayCurrency(calcItemNet(item))}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button type="button" onClick={() => removeLineItem(i)}
                                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {lineItems.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-100">
                            <td colSpan={2}></td>
                            <td colSpan={3} className="px-3 py-2 text-right text-sm text-slate-600">Subtotal</td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-slate-800">{formatDisplayCurrency(lineSubtotal)}</td>
                            <td></td>
                          </tr>
                          {lineDiscount > 0 && (
                            <tr className="bg-slate-50">
                              <td colSpan={2}></td>
                              <td colSpan={3} className="px-3 py-2 text-right text-sm text-slate-600">Discount</td>
                              <td className="px-3 py-2 text-right text-sm text-red-600">-{formatDisplayCurrency(lineDiscount)}</td>
                              <td></td>
                            </tr>
                          )}
                          {lineTaxTotal > 0 && (
                            <tr className="bg-slate-50">
                              <td colSpan={2}></td>
                              <td colSpan={3} className="px-3 py-2 text-right text-sm text-slate-600">Tax</td>
                              <td className="px-3 py-2 text-right text-sm text-slate-600">{formatDisplayCurrency(lineTaxTotal)}</td>
                              <td></td>
                            </tr>
                          )}
                          <tr className="bg-violet-50 border-t border-slate-100">
                            <td colSpan={2}></td>
                            <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-slate-700">Grand Total</td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">{formatDisplayCurrency(lineGrandTotal)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  <div className="flex justify-between">
                    <button type="button" onClick={addLineItem}
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700">
                      <Plus size={14} /> Add Manual Item
                    </button>
                  </div>
                </div>
              )}

              {/* ====== STEP 3: REVIEW ====== */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                      <h4 className="text-sm font-semibold text-slate-700">Invoice Preview</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Customer</p>
                          <p className="text-sm font-semibold text-slate-800">{createForm.customer_name}</p>
                          {createForm.billing_address && <p className="text-xs text-slate-500 mt-0.5">{createForm.billing_address}</p>}
                          {createForm.shipping_address && createForm.shipping_address !== createForm.billing_address && (
                            <p className="text-xs text-slate-400 mt-0.5">Shipping: {createForm.shipping_address}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Invoice</p>
                          <p className="text-sm text-slate-700">Auto-generated</p>
                          <p className="text-xs text-slate-400 mt-0.5">{createForm.issue_date} → {createForm.due_date}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Disc</th>
                              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax</th>
                              <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {lineItems.map((item, i) => (
                              <tr key={i}>
                                <td className="py-2 text-slate-700">{item.description}</td>
                                <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                                <td className="py-2 text-right text-slate-600">{formatDisplayCurrency(item.unit_price)}</td>
                                <td className="py-2 text-right text-slate-600">{item.discount_percentage > 0 ? `${item.discount_percentage}%` : "—"}</td>
                                <td className="py-2 text-right text-slate-600">{item.tax_percentage > 0 ? `${item.tax_percentage}%` : "—"}</td>
                                <td className="py-2 text-right font-medium text-slate-800">{formatDisplayCurrency(calcItemNet(item))}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={5} className="py-2 text-right text-sm text-slate-600">Subtotal</td>
                              <td className="py-2 text-right text-sm font-medium text-slate-800">{formatDisplayCurrency(lineSubtotal)}</td>
                            </tr>
                            {lineDiscount > 0 && (
                              <tr>
                                <td colSpan={5} className="py-1 text-right text-sm text-slate-600">Discount</td>
                                <td className="py-1 text-right text-sm text-red-600">-{formatDisplayCurrency(lineDiscount)}</td>
                              </tr>
                            )}
                            {lineTaxTotal > 0 && (
                              <tr>
                                <td colSpan={5} className="py-1 text-right text-sm text-slate-600">Tax</td>
                                <td className="py-1 text-right text-sm text-slate-600">{formatDisplayCurrency(lineTaxTotal)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-slate-200">
                              <td colSpan={5} className="py-2 text-right text-sm font-bold text-slate-800">Grand Total</td>
                              <td className="py-2 text-right text-sm font-bold text-slate-900">{formatDisplayCurrency(lineGrandTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Currency:</span>
                          <span className="ml-1 text-slate-700 font-medium">{createForm.currency || orgSettings?.default_currency || "USD"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Payment Terms:</span>
                          <span className="ml-1 text-slate-700 font-medium capitalize">{createForm.payment_terms?.replace(/_/g, " ")}</span>
                        </div>
                        {createForm.po_number && (
                          <div>
                            <span className="text-slate-500">PO Number:</span>
                            <span className="ml-1 text-slate-700 font-medium">{createForm.po_number}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Items:</span>
                          <span className="ml-1 text-slate-700 font-medium">{lineItems.length}</span>
                        </div>
                      </div>

                      {createForm.notes && (
                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap">{createForm.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 text-center">Review the invoice details above before finalizing.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200">
              <div>
                {wizardStep > 1 ? (
                  <button onClick={handlePrevStep} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : (
                  <button onClick={closeCreateModal} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {wizardStep < 3 ? (
                  <button onClick={handleNextStep} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <>
                    <button onClick={handleCreateDraft} disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 flex items-center gap-1.5">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Save Draft
                    </button>
                    <button onClick={handleCreateAndFinalize} disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Finalize
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
