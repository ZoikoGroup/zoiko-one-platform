import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Package, FileText, Calculator, Eye, Download, Send,
  ChevronRight, ChevronLeft, Plus, Trash2, Copy, AlertCircle,
  CheckCircle, MapPin, Calendar, DollarSign, Loader2, X,
  Receipt, Printer, CreditCard, Globe, Hash, Search
} from "lucide-react";
import { invoiceApi, customerApi, productApi, settingsApi, taxApi, pricingApi } from "../../../service/billingService";
import { formatDisplayCurrency } from "../../../utils/billing-helpers";
import { getCurrencySelectOptions, getSupportedCurrencyCodes } from "../../../utils/currency";
import InvoicePDFPreview from "./invoice-pdf-preview";

const WIZARD_STEPS = [
  { id: 1, label: "Customer", icon: User, description: "Select customer & addresses" },
  { id: 2, label: "Invoice Details", icon: FileText, description: "Dates, currency, terms" },
  { id: 3, label: "Line Items", icon: Package, description: "Products & pricing" },
  { id: 4, label: "Taxes & Discounts", icon: Calculator, description: "Tax rates & adjustments" },
  { id: 5, label: "Review", icon: Eye, description: "Verify all details" },
  { id: 6, label: "PDF Preview", icon: Download, description: "Live preview" },
  { id: 7, label: "Actions", icon: Send, description: "Save & send" },
];

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_7", label: "Net 7" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
];

const CURRENCY_OPTIONS = getCurrencySelectOptions();

const COUNTRY_CURRENCY_MAP = {
  IN: "INR", US: "USD", GB: "GBP", AE: "AED", AU: "AUD",
  CA: "CAD", SG: "SGD", DE: "EUR", FR: "EUR",
};

export default function CreateInvoiceWizard({ onClose, onCreated }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [orgSettings, setOrgSettings] = useState(null);
  const [taxRates, setTaxRates] = useState([]);

  const [form, setForm] = useState({
    customer_id: "", customer_name: "", customer_status: "active",
    billing_address: "", shipping_address: "",
    invoice_number: "", issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    currency: "USD", notes: "", payment_terms: "net_30",
    discount_percentage: 0, po_number: "", sales_person: "",
  });
  const [selectedTaxRate, setSelectedTaxRate] = useState({ id: null, name: "", rate: 0 });
  const [lineItems, setLineItems] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);

  useEffect(() => {
    settingsApi.getConfig().then((cfg) => {
      const config = cfg || {};
      setOrgSettings(config);
      if (config.default_payment_terms && !form.customer_id) {
        setForm((p) => ({
          ...p,
          payment_terms: config.default_payment_terms,
          due_date: calcDueDate(config.default_payment_terms, p.issue_date),
          currency: p.currency || config.default_currency || "USD",
        }));
      }
    }).catch(() => {});
    settingsApi.get().then((s) => {
      const settings = s || {};
      setOrgSettings((prev) => ({ ...prev, ...settings }));
      if (settings.default_tax_rate_id) {
        taxApi.get(settings.default_tax_rate_id).then((tr) => {
          if (tr) setSelectedTaxRate({ id: tr.id, name: tr.name, rate: Number(tr.rate || 0) });
        }).catch(() => {});
      }
    }).catch(() => {});
    taxApi.list({ is_active: true }).then((data) => {
      setTaxRates(Array.isArray(data) ? data : data?.items || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!customerSearchTerm.trim()) { setCustomerSearchResults([]); setCustomerSearching(false); return; }
      setCustomerSearching(true);
      try {
        const data = await customerApi.search(customerSearchTerm);
        setCustomerSearchResults(Array.isArray(data) ? data : data?.items || []);
      } catch { setCustomerSearchResults([]); }
      finally { setCustomerSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productSearchTerm.trim()) { setProductSearchResults([]); setProductSearching(false); return; }
      setProductSearching(true);
      try {
        const data = await productApi.list({ search_term: productSearchTerm, per_page: 15 });
        setProductSearchResults(Array.isArray(data) ? data : data?.items || []);
      } catch { setProductSearchResults([]); }
      finally { setProductSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchTerm]);

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
      const ccy = full.currency || orgSettings?.default_currency || "USD";
      const terms = full.payment_terms || orgSettings?.default_payment_terms || "net_30";
      const billingAddress = full.billing_address || full.address || "";
      const shippingAddress = full.shipping_address || full.delivery_address || billingAddress;
      setForm((p) => ({
        ...p,
        customer_id: String(full.id),
        customer_name: full.display_name || full.company_name || `#${full.id}`,
        customer_status: full.status || "active",
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        currency: ccy,
        payment_terms: terms,
        due_date: calcDueDate(terms, p.issue_date),
      }));
      setCustomerSearchTerm(full.display_name || full.company_name || `#${full.id}`);
      setShowCustomerDropdown(false);
    } catch { /* silent */ }
  };

  const handleProductSelect = async (p) => {
    try {
      const full = p.description ? p : await productApi.get(p.id);
      let price = Number(full.default_price || full.unit_price || full.price || 0);
      try {
        const plans = await pricingApi.listByProduct(full.id);
        const items = Array.isArray(plans) ? plans : plans?.items || [];
        const flat = items.find((pl) => pl.plan_type === "flat");
        if (flat?.price > 0) price = Number(flat.price);
      } catch { /* pricing unavailable */ }
      setLineItems((prev) => [...prev, {
        product_id: full.id,
        description: full.description || full.name,
        quantity: 1,
        unit_price: price,
        discount_percentage: 0,
        tax_percentage: selectedTaxRate?.rate || 0,
      }]);
      setProductSearchTerm("");
      setProductSearchResults([]);
      setShowProductDropdown(false);
    } catch { /* silent */ }
  };

  const addLineItem = () => setLineItems((p) => [...p, {
    product_id: null, description: "", quantity: 1, unit_price: 0,
    discount_percentage: 0, tax_percentage: selectedTaxRate?.rate || 0,
  }]);

  const removeLineItem = (index) => setLineItems((p) => p.filter((_, i) => i !== index));

  const duplicateLineItem = (index) => setLineItems((p) => {
    const item = p[index];
    const copy = { ...item, description: `${item.description} (copy)` };
    return [...p.slice(0, index + 1), copy, ...p.slice(index + 1)];
  });

  const updateLineItem = (index, field, value) => setLineItems((p) => {
    const next = [...p];
    next[index] = { ...next[index], [field]: ["description"].includes(field) ? value : Number(value) };
    return next;
  });

  const calcItemTotal = (item) => (item.quantity || 0) * (item.unit_price || 0);
  const calcItemDiscount = (item) => calcItemTotal(item) * (item.discount_percentage || 0) / 100;
  const calcItemNet = (item) => {
    const total = calcItemTotal(item);
    const discount = calcItemDiscount(item);
    return (total - discount) + (total - discount) * (item.tax_percentage || 0) / 100;
  };

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((s, item) => s + calcItemTotal(item), 0);
    const discount = lineItems.reduce((s, item) => s + calcItemDiscount(item), 0);
    const tax = lineItems.reduce((s, item) => {
      const total = calcItemTotal(item);
      const disc = calcItemDiscount(item);
      return s + ((total - disc) * (item.tax_percentage || 0) / 100);
    }, 0);
    const globalDiscount = subtotal * (form.discount_percentage || 0) / 100;
    const grandTotal = subtotal - discount - globalDiscount + tax + (shippingAmount || 0) + (roundOff || 0);
    return { subtotal, discount: discount + globalDiscount, tax, grandTotal, shipping: shippingAmount || 0, roundOff: roundOff || 0 };
  }, [lineItems, form.discount_percentage, shippingAmount, roundOff]);

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.customer_id) return "Please select a customer";
      if (!form.issue_date) return "Issue date is required";
      if (!form.due_date) return "Due date is required";
      if (form.due_date < form.issue_date) return "Due date cannot be before issue date";
      return null;
    }
    if (s === 2) {
      if (!form.invoice_number && orgSettings?.auto_generate_invoice_number !== false) return null;
      if (!form.invoice_number) return "Invoice number is required";
      if (!form.currency) return "Currency is required";
      return null;
    }
    if (s === 3) {
      if (lineItems.length === 0) return "Add at least one line item";
      const invalid = lineItems.find((item) => !item.description || item.quantity <= 0);
      if (invalid) return "Each line item needs a description and quantity > 0";
      return null;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setFormError(err); return; }
    setFormError(null);
    setStep((s) => Math.min(7, s + 1));
  };

  const handlePrev = () => {
    setFormError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const buildPayload = () => ({
    customer_id: Number(form.customer_id),
    invoice_number: form.invoice_number || `INV-${Date.now()}`,
    issue_date: form.issue_date,
    due_date: form.due_date,
    currency: form.currency || "USD",
    notes: form.notes || undefined,
    payment_terms: form.payment_terms || "net_30",
    po_number: form.po_number || undefined,
    discount_percentage: Number(form.discount_percentage) || 0,
  });

  const buildItemsPayload = () => lineItems
    .filter((item) => item.description && item.quantity > 0)
    .map((item, idx) => ({
      line_number: idx + 1,
      product_id: item.product_id || undefined,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      discount_percentage: Number(item.discount_percentage) || 0,
      tax_percentage: Number(item.tax_percentage) || 0,
      total: calcItemNet(item),
    }));

  const handleSaveDraft = async () => {
    try {
      setSaving(true); setError(null);
      const created = await invoiceApi.create(buildPayload());
      const invoiceId = created.id;
      const items = buildItemsPayload();
      if (items.length > 0) await invoiceApi.bulkSetItems(invoiceId, items);
      onCreated?.();
      onClose?.();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to save draft");
    } finally { setSaving(false); }
  };

  const handleSaveAndSend = async () => {
    try {
      setSaving(true); setError(null);
      const created = await invoiceApi.create(buildPayload());
      const invoiceId = created.id;
      const items = buildItemsPayload();
      if (items.length > 0) await invoiceApi.bulkSetItems(invoiceId, items);
      await invoiceApi.finalize(invoiceId);
      onCreated?.();
      onClose?.();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to save and send");
    } finally { setSaving(false); }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-4">
          <div className="relative" ref={customerSearchRef}>
            <label className="block text-xs font-medium text-slate-600 mb-1">Search Customer *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Type customer name..." value={customerSearchTerm}
                onChange={(e) => { setCustomerSearchTerm(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                aria-label="Search customer"
                className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              {customerSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
            {showCustomerDropdown && customerSearchTerm && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {customerSearchResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">{customerSearching ? "Searching..." : "No customers found"}</p>
                ) : customerSearchResults.map((c) => (
                  <button key={c.id} type="button" onClick={() => handleCustomerSelect(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700">
                    {c.display_name || c.company_name || `#${c.id}`}
                    <span className="text-xs text-slate-400 ml-2">{c.email || ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {form.customer_id && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{form.customer_name}</span>
                  {form.customer_status !== "active" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{form.customer_status}</span>
                  )}
                </div>
                {form.billing_address && (
                  <div className="flex items-start gap-2 text-xs text-slate-600 mt-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>{form.billing_address}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                <textarea value={form.billing_address} onChange={(e) => setForm((p) => ({ ...p, billing_address: e.target.value }))}
                  rows={2} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Address</label>
                <textarea value={form.shipping_address} onChange={(e) => setForm((p) => ({ ...p, shipping_address: e.target.value }))}
                  rows={2} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </>
          )}
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Number</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={form.invoice_number} onChange={(e) => setForm((p) => ({ ...p, invoice_number: e.target.value }))}
                  placeholder={orgSettings?.auto_generate_invoice_number ? "Auto-generated" : "INV-000001"}
                  aria-label="Invoice number"
                  readOnly={orgSettings?.auto_generate_invoice_number && !form.invoice_number}
                  className={`block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${orgSettings?.auto_generate_invoice_number && !form.invoice_number ? "bg-slate-50 cursor-not-allowed" : ""}`} />
              </div>
              {orgSettings?.auto_generate_invoice_number && !form.invoice_number && (
                <p className="text-xs text-slate-400 mt-1">Will be auto-generated on save</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  aria-label="Currency"
                  className="block w-full rounded-lg border border-slate-200 pl-9 pr-8 py-2.5 text-sm appearance-none bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.issue_date}
                  onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value, due_date: calcDueDate(p.payment_terms, e.target.value) }))}
                  aria-label="Invoice date"
                  className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                  aria-label="Due date"
                  className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={(e) => setForm((p) => ({ ...p, payment_terms: e.target.value, due_date: calcDueDate(e.target.value, p.issue_date) }))}
                aria-label="Payment terms"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {PAYMENT_TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PO Number</label>
              <input type="text" value={form.po_number} onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                placeholder="Optional" aria-label="PO number"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Additional notes or terms..." aria-label="Notes"
              className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="relative" ref={productSearchRef}>
            <label className="block text-xs font-medium text-slate-600 mb-1">Search Products</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Type product name to add..." value={productSearchTerm}
                onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                aria-label="Search products"
                className="block w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              {productSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
            {showProductDropdown && productSearchTerm && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {productSearchResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">{productSearching ? "Searching..." : "No products found"}</p>
                ) : productSearchResults.map((p) => (
                  <button key={p.id} type="button" onClick={() => handleProductSelect(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700">
                    {p.name || p.description || `#${p.id}`}
                    <span className="text-xs text-slate-400 ml-2">{formatDisplayCurrency(p.default_price || p.unit_price || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Item #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => duplicateLineItem(idx)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600" title="Duplicate" aria-label={`Duplicate item ${idx + 1}`}>
                      <Copy size={14} />
                    </button>
                    <button onClick={() => removeLineItem(idx)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600" title="Remove" aria-label={`Remove item ${idx + 1}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                    <input type="text" value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      placeholder="Product or service description" aria-label={`Description for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                    <input type="number" min="0" step="1" value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                      aria-label={`Quantity for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price</label>
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, "unit_price", e.target.value)}
                      aria-label={`Unit price for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                    <input type="number" min="0" max="100" step="0.01" value={item.discount_percentage}
                      onChange={(e) => updateLineItem(idx, "discount_percentage", e.target.value)}
                      aria-label={`Discount for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                    <input type="number" min="0" max="100" step="0.01" value={item.tax_percentage}
                      onChange={(e) => updateLineItem(idx, "tax_percentage", e.target.value)}
                      aria-label={`Tax for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-700">Amount: {formatDisplayCurrency(calcItemNet(item))}</span>
                </div>
              </div>
            ))}
            <button onClick={addLineItem}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Add Line Item
            </button>
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate</label>
              <select value={selectedTaxRate.id || ""}
                onChange={(e) => {
                  const tr = taxRates.find((r) => r.id === Number(e.target.value));
                  setSelectedTaxRate(tr ? { id: tr.id, name: tr.name, rate: tr.rate } : { id: null, name: "", rate: 0 });
                  setLineItems((prev) => prev.map((item) => ({ ...item, tax_percentage: tr ? Number(tr.rate) : 0 })));
                }}
                aria-label="Tax rate"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                <option value="">No tax</option>
                {taxRates.map((tr) => <option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
              <input type="number" min="0" max="100" step="0.01" value={form.discount_percentage}
                onChange={(e) => setForm((p) => ({ ...p, discount_percentage: e.target.value }))}
                aria-label="Global discount"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Amount</label>
              <input type="number" min="0" step="0.01" value={shippingAmount}
                onChange={(e) => setShippingAmount(Number(e.target.value))}
                aria-label="Shipping amount"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Round Off</label>
              <input type="number" step="0.01" value={roundOff}
                onChange={(e) => setRoundOff(Number(e.target.value))}
                aria-label="Round off"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatDisplayCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="font-medium text-red-600">-{formatDisplayCurrency(totals.discount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span className="font-medium">{formatDisplayCurrency(totals.tax)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Shipping</span><span className="font-medium">{formatDisplayCurrency(totals.shipping)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Round Off</span><span className="font-medium">{formatDisplayCurrency(totals.roundOff)}</span></div>
            <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-800">Grand Total</span><span className="font-bold text-lg text-violet-600">{formatDisplayCurrency(totals.grandTotal)}</span></div>
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Customer</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Name:</span> <span className="font-medium">{form.customer_name}</span></div>
              <div><span className="text-slate-500">Currency:</span> <span className="font-medium">{form.currency}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Billing:</span> <span className="text-slate-700">{form.billing_address || "—"}</span></div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Invoice Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Number:</span> 
                <span className="font-medium font-mono text-violet-600">
                  {form.invoice_number || (orgSettings?.auto_generate_invoice_number ? "Auto-generated on save" : "—")}
                </span>
              </div>
              <div><span className="text-slate-500">Date:</span> <span className="font-medium">{form.issue_date}</span></div>
              <div><span className="text-slate-500">Due:</span> <span className="font-medium">{form.due_date}</span></div>
              <div><span className="text-slate-500">Terms:</span> <span className="font-medium">{form.payment_terms?.replace(/_/g, " ")}</span></div>
              <div><span className="text-slate-500">PO:</span> <span className="font-medium">{form.po_number || "—"}</span></div>
              <div><span className="text-slate-500">Discount:</span> <span className="font-medium">{form.discount_percentage || 0}%</span></div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Line Items ({lineItems.length})</h4>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.description || `Item ${idx + 1}`}</span>
                  <span className="font-medium">{formatDisplayCurrency(calcItemNet(item))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatDisplayCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="text-red-600">-{formatDisplayCurrency(totals.discount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span>{formatDisplayCurrency(totals.tax)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Shipping</span><span>{formatDisplayCurrency(totals.shipping)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span className="text-violet-600">{formatDisplayCurrency(totals.grandTotal)}</span></div>
            </div>
          </div>
        </div>
      );
      case 6: return (
        <InvoicePDFPreview
          form={form}
          lineItems={lineItems}
          totals={totals}
          orgSettings={orgSettings}
          customerName={form.customer_name}
          billingAddress={form.billing_address}
          shippingAddress={form.shipping_address}
        />
      );
      case 7: return (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center">
            <Receipt size={48} className="mx-auto text-violet-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Ready to Save</h3>
            <p className="text-sm text-slate-500 mt-1">Review complete. Choose an action below.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={handleSaveDraft} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Save Draft
              </button>
              <button onClick={handleSaveAndSend} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Save & Send
              </button>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
        {WIZARD_STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <button onClick={() => s.id <= step && setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s.id ? "bg-violet-600 text-white" :
                step > s.id ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"
              }`}
              disabled={s.id > step}
              aria-label={`Step ${s.id}: ${s.label}`}>
              <s.icon size={12} />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
          </div>
        ))}
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div>{renderStepContent()}</div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button onClick={handlePrev} disabled={step === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        {step < 7 && (
          <button onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
