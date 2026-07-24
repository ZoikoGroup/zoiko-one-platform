import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User, Package, FileText, Calculator, Eye, Download, Send,
  ChevronRight, ChevronLeft, Plus, Trash2, Copy, AlertCircle,
  CheckCircle, MapPin, Calendar, DollarSign, Loader2, X,
  Receipt, Printer, CreditCard, Globe, Hash, Search
} from "lucide-react";
import { invoiceApi, customerApi, productApi, settingsApi, taxApi, pricingApi } from "../../../service/billingService";
import { formatDisplayCurrency as fmtCurrency } from "../../../utils/billing-helpers";
import { getCurrencySelectOptions, getSupportedCurrencyCodes, normalizeCountryCode } from "../../../utils/currency";
import { CalculationEngine, calcItemNet, calcItemTotal, calcItemDiscount } from "../utils/calculation-engine";
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

const COUNTRY_OPTIONS = [
  { value: "", label: "Select Country / Tax Jurisdiction" },
  { value: "IN", label: "India (IN)" },
  { value: "US", label: "United States (US)" },
  { value: "GB", label: "United Kingdom (GB)" },
  { value: "AE", label: "United Arab Emirates (AE)" },
  { value: "AU", label: "Australia (AU)" },
  { value: "SG", label: "Singapore (SG)" },
  { value: "CA", label: "Canada (CA)" },
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "NL", label: "Netherlands (NL)" },
  { value: "JP", label: "Japan (JP)" },
  { value: "HK", label: "Hong Kong (HK)" },
  { value: "NZ", label: "New Zealand (NZ)" },
  { value: "CH", label: "Switzerland (CH)" },
  { value: "SE", label: "Sweden (SE)" },
  { value: "NO", label: "Norway (NO)" },
  { value: "DK", label: "Denmark (DK)" },
  { value: "PL", label: "Poland (PL)" },
  { value: "CZ", label: "Czech Republic (CZ)" },
  { value: "HU", label: "Hungary (HU)" },
  { value: "RO", label: "Romania (RO)" },
  { value: "BG", label: "Bulgaria (BG)" },
  { value: "HR", label: "Croatia (HR)" },
  { value: "IE", label: "Ireland (IE)" },
  { value: "BE", label: "Belgium (BE)" },
  { value: "AT", label: "Austria (AT)" },
  { value: "PT", label: "Portugal (PT)" },
  { value: "FI", label: "Finland (FI)" },
  { value: "GR", label: "Greece (GR)" },
  { value: "IT", label: "Italy (IT)" },
  { value: "ES", label: "Spain (ES)" },
  { value: "MX", label: "Mexico (MX)" },
  { value: "BR", label: "Brazil (BR)" },
  { value: "ZA", label: "South Africa (ZA)" },
  { value: "MY", label: "Malaysia (MY)" },
  { value: "TH", label: "Thailand (TH)" },
  { value: "ID", label: "Indonesia (ID)" },
  { value: "PH", label: "Philippines (PH)" },
  { value: "VN", label: "Vietnam (VN)" },
  { value: "KR", label: "South Korea (KR)" },
  { value: "TW", label: "Taiwan (TW)" },
];

const detectCountryFromGSTIN = (gstin) => {
  if (!gstin) return null;
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(cleaned)) {
    return "IN";
  }
  return null;
};

const detectCountryFromVAT = (vat) => {
  if (!vat) return null;
  const cleaned = vat.trim().toUpperCase();
  if (/^GB[0-9]{9}$/.test(cleaned)) return "GB";
  if (/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(cleaned)) return cleaned.substring(0, 2);
  return null;
};

export default function CreateInvoiceWizard({ onClose, onCreated }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCustomerId = searchParams.get("customer_id");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [orgSettings, setOrgSettings] = useState(null);
  const [taxRates, setTaxRates] = useState([]);

  const [form, setForm] = useState({
    customer_id: "", customer_name: "", customer_status: "active",
    billing_address: "", shipping_address: "",
    invoice_number: "", issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    currency: "", notes: "", payment_terms: "net_30",
    discount_percentage: 0, po_number: "", sales_person: "",
    country_code: "",
  });
  const [selectedTaxRate, setSelectedTaxRate] = useState({ id: null, name: "", rate: 0 });
  const [taxRateSelectionMode, setTaxRateSelectionMode] = useState("AUTO"); // "AUTO" | "MANUAL"
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

  const formatDisplayCurrency = (v, fallback) => fmtCurrency(v, fallback, form.currency || orgSettings?.base_currency || orgSettings?.default_currency || "");

  const getJurisdictionWarning = () => {
    if (!selectedTaxRate.id || !form.country_code) return null;
    const rateObj = taxRates.find((r) => r.id === selectedTaxRate.id);
    if (!rateObj || !rateObj.country_code) return null;

    const rateCountry = normalizeCountryCode(rateObj.country_code) || rateObj.country_code.toUpperCase();
    const invoiceCountry = normalizeCountryCode(form.country_code) || form.country_code.toUpperCase();

    if (rateCountry !== invoiceCountry) {
      return {
        text: `Tax rate country (${rateObj.country_code}) doesn't match invoice tax jurisdiction (${form.country_code}).`,
        tooltip: `The selected tax rate is configured for ${rateObj.country_code}, but the invoice's tax jurisdiction is set to ${form.country_code}. Please ensure you are applying the correct country's taxes.`
      };
    }
    return null;
  };


  const customerSearchRef = useRef(null);
  const productSearchRef = useRef(null);

  const hasExchangeRates = orgSettings && (
    orgSettings.exchange_rate_provider === "open_er_api" ||
    orgSettings.exchange_rates != null ||
    orgSettings.exchange_rate_usd != null ||
    orgSettings.exchange_rate_inr != null ||
    orgSettings.exchange_rate_gbp != null ||
    orgSettings.exchange_rate_eur != null ||
    orgSettings.exchange_rate_aed != null
  );

  useEffect(() => {
    Promise.allSettled([
      settingsApi.getConfig(),
    ]).then(([settingsRes]) => {
      const settings = settingsRes.status === "fulfilled" ? settingsRes.value || {} : {};
      setOrgSettings(settings);
      const orgCurrency = settings.base_currency || settings.default_currency || "";
      setForm((p) => ({
        ...p,
        payment_terms: p.payment_terms || settings.default_payment_terms || "net_30",
        due_date: p.due_date || calcDueDate(settings.default_payment_terms || "net_30", p.issue_date),
        currency: p.currency || orgCurrency,
      }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.currency) return;

    // Fetch all active tax rates to populate the dropdown options, then apply smart pre-selection.
    // If country_code is set, filter by it on the backend for efficiency.
    taxApi.list({ is_active: true, per_page: 100, country_code: form.country_code || undefined }).then((res) => {
      const rates = Array.isArray(res) ? res : res?.items || res?.data || [];
      setTaxRates(rates);

      // Only auto-select if not manually selected
      if (taxRateSelectionMode !== "MANUAL") {
        // Find the best match:
        // 1. Matches both currency and country code, and is default
        let matchedRate = rates.find((r) => r.currency_code === form.currency && r.country_code === form.country_code && r.is_default);

        // 2. Matches both currency and country code
        if (!matchedRate) {
          matchedRate = rates.find((r) => r.currency_code === form.currency && r.country_code === form.country_code);
        }

        // 3. Matches country code and is default
        if (!matchedRate && form.country_code) {
          matchedRate = rates.find((r) => r.country_code === form.country_code && r.is_default);
        }

        // 4. Matches country code
        if (!matchedRate && form.country_code) {
          matchedRate = rates.find((r) => r.country_code === form.country_code);
        }

        // 5. Matches currency and is default
        if (!matchedRate) {
          matchedRate = rates.find((r) => r.currency_code === form.currency && r.is_default);
        }

        // 6. Matches currency
        if (!matchedRate) {
          matchedRate = rates.find((r) => r.currency_code === form.currency);
        }

        // 7. Any default rate
        if (!matchedRate) {
          matchedRate = rates.find((r) => r.is_default);
        }

        // 8. Otherwise, first rate in list
        if (!matchedRate && rates.length > 0) {
          matchedRate = rates[0];
        }

        if (matchedRate) {
          const rate = Number(matchedRate.rate || 0);
          const normalizedRate = rate > 0 && rate <= 1 ? rate * 100 : rate;
          setSelectedTaxRate({ id: matchedRate.id, name: matchedRate.name, rate: normalizedRate });
          setLineItems((prev) => prev.map((item) => ({ ...item, tax_percentage: normalizedRate })));
        } else {
          setSelectedTaxRate({ id: null, name: "", rate: 0 });
          setLineItems((prev) => prev.map((item) => ({ ...item, tax_percentage: 0 })));
        }
      }
    }).catch(() => {});
  }, [form.currency, form.country_code]);

  // Reset tax selection mode to AUTO when country_code changes, so auto-selection can work again
  useEffect(() => {
    setTaxRateSelectionMode("AUTO");
  }, [form.country_code]);

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
    if (!urlCustomerId || form.customer_id) return;
    (async () => {
      try {
        const customer = await customerApi.get(urlCustomerId);
        await handleCustomerSelect(customer);
      } catch { /* customer not found or no access */ }
    })();
  }, [urlCustomerId, form.customer_id]);

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
      const ccy = full.currency || orgSettings?.base_currency || orgSettings?.default_currency || "";
      const terms = full.payment_terms || orgSettings?.default_payment_terms || "net_30";
      const billingAddress = full.billing_address || full.address || "";
      const shippingAddress = full.shipping_address || full.delivery_address || billingAddress;

      let suggestedCountry = "";
      if (full.billing_country) {
        suggestedCountry = normalizeCountryCode(full.billing_country);
      } else if (full.gst_number) {
        suggestedCountry = detectCountryFromGSTIN(full.gst_number);
      } else if (full.vat_number) {
        suggestedCountry = detectCountryFromVAT(full.vat_number);
      }

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
        country_code: suggestedCountry || p.country_code || "",
      }));
      setCustomerSearchTerm(full.display_name || full.company_name || `#${full.id}`);
      setShowCustomerDropdown(false);
    } catch (custErr) {
      console.warn("Failed to load full customer data:", custErr);
      setExchangeRateError("Customer data could not be loaded. Please verify customer details before submitting.");
    }
  };

  const [exchangeRateError, setExchangeRateError] = useState(null);

  const handleProductSelect = async (p) => {
    setExchangeRateError(null);
    try {
      const full = p.description ? p : await productApi.get(p.id);
      let price = Number(full.default_price || full.unit_price || full.price || 0);
      try {
        const plans = await pricingApi.listByProduct(full.id);
        const items = Array.isArray(plans) ? plans : plans?.items || [];
        const flat = items.find((pl) => pl.plan_type === "flat");
        if (flat?.price > 0) price = Number(flat.price);
      } catch (pricingErr) {
        console.warn("Pricing lookup failed, using catalog price:", pricingErr);
      }

      const productCurrency = full.currency || orgSettings?.default_currency || "";
      const invoiceCurrency = form.currency || orgSettings?.default_currency || "";
      let exchangeRate = 1;
      let rateSource = "self";

      if (productCurrency !== invoiceCurrency) {
        try {
          const rateData = await settingsApi.getExchangeRatePair(productCurrency, invoiceCurrency);
          if (rateData && Number(rateData.rate) > 0) {
            exchangeRate = Number(rateData.rate);
            rateSource = rateData.source || "live_api";
          } else {
            throw new Error("API returned no rate");
          }
        } catch (apiErr) {
          console.warn("Live rate failed, trying fallback:", apiErr);
          if (orgSettings) {
            const rateMap = {
              USD: orgSettings.exchange_rate_usd,
              INR: orgSettings.exchange_rate_inr,
              GBP: orgSettings.exchange_rate_gbp,
              EUR: orgSettings.exchange_rate_eur,
              AED: orgSettings.exchange_rate_aed,
            };
            const productRate = rateMap[productCurrency];
            const invoiceRate = rateMap[invoiceCurrency];
            const homeCurrency = orgSettings.base_currency || orgSettings.default_currency || "";

            if (productRate != null && invoiceRate != null) {
              if (productCurrency === homeCurrency) {
                exchangeRate = Number(invoiceRate);
              } else if (invoiceCurrency === homeCurrency) {
                exchangeRate = 1 / Number(productRate);
              } else {
                exchangeRate = Number(invoiceRate) / Number(productRate);
              }
              exchangeRate = Math.round(exchangeRate * 1000000) / 1000000;
              rateSource = "cached";
            }
          }
        }

        if (exchangeRate <= 0 || exchangeRate === 1) {
          const errMsg = `Cannot fetch exchange rate for ${productCurrency} → ${invoiceCurrency}. Please refresh exchange rates in Billing Settings first, or select a product in ${invoiceCurrency}.`;
          setExchangeRateError(errMsg);
          return;
        }
      }

      const normalizedTaxRate = selectedTaxRate?.rate > 0 && selectedTaxRate?.rate <= 1 ? selectedTaxRate.rate * 100 : (selectedTaxRate?.rate || 0);
      const calcs = CalculationEngine.calculateLineItem(1, price, 0, 0, normalizedTaxRate, exchangeRate);

      setLineItems((prev) => [...prev, {
        product_id: full.id,
        description: full.description || full.name,
        quantity: 1,
        unit_price: calcs.convertedUnitPrice,
        discount_percentage: 0,
        tax_percentage: normalizedTaxRate,
        original_currency: productCurrency,
        original_amount: price,
        invoice_currency: invoiceCurrency,
        exchange_rate: exchangeRate,
        exchange_rate_source: rateSource,
        converted_amount: calcs.convertedUnitPrice,
        tax_amount: calcs.convertedTaxAmount,
        total: calcs.convertedLineTotal
      }]);
      setProductSearchTerm("");
      setProductSearchResults([]);
      setShowProductDropdown(false);
    } catch (err) {
      console.error("Failed to add product:", err);
      setExchangeRateError("Failed to add product. Please try again.");
    }
  };

  const addLineItem = () => {
    const normalizedTaxRate = selectedTaxRate?.rate > 0 && selectedTaxRate?.rate <= 1 ? selectedTaxRate.rate * 100 : (selectedTaxRate?.rate || 0);
    const invoiceCurrency = form.currency || orgSettings?.default_currency || "";
    setLineItems((p) => [...p, {
      product_id: null, description: "", quantity: 1, unit_price: 0,
      discount_percentage: 0, tax_percentage: normalizedTaxRate,
      original_currency: invoiceCurrency,
      original_amount: 0,
      invoice_currency: invoiceCurrency,
      exchange_rate: 1,
      converted_amount: 0,
      tax_amount: 0,
      total: 0
    }]);
  };

  const removeLineItem = (index) => setLineItems((p) => p.filter((_, i) => i !== index));

  const duplicateLineItem = (index) => setLineItems((p) => {
    const item = p[index];
    const copy = { ...item, description: `${item.description} (copy)` };
    return [...p.slice(0, index + 1), copy, ...p.slice(index + 1)];
  });

  const updateLineItem = (index, field, value) => setLineItems((p) => {
    const next = [...p];
    const item = { ...next[index], [field]: value };

    if (["quantity", "unit_price", "discount_percentage", "tax_percentage"].includes(field)) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const discPct = Number(item.discount_percentage) || 0;
      const taxPct = Number(item.tax_percentage) || 0;

      const subtotal = qty * price;
      const discountAmt = (subtotal * discPct) / 100;
      const taxable = subtotal - discountAmt;
      const taxAmt = (taxable * taxPct) / 100;

      item.tax_amount = taxAmt;
      item.total = taxable + taxAmt;
    }

    next[index] = item;
    return next;
  });

  const totals = useMemo(() => {
    return CalculationEngine.calculateInvoiceTotals(lineItems, form.discount_percentage, shippingAmount, roundOff);
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
    invoice_number: form.invoice_number || null,
    issue_date: form.issue_date,
    due_date: form.due_date,
    currency: form.currency || orgSettings?.default_currency || "",
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
        discount_amount: Number(item.discount_amount || 0),
        tax_percentage: Number(item.tax_percentage) || 0,
        tax_amount: Number(item.tax_amount || 0),
        total: Number(item.total || 0),
        original_currency: item.original_currency || form.currency,
        original_amount: Number(item.original_amount) || Number(item.unit_price),
        invoice_currency: item.invoice_currency || form.currency,
        exchange_rate: Number(item.exchange_rate) || 1,
        converted_amount: Number(item.converted_amount) || Number(item.unit_price),
      }));

  const handleSaveDraft = async () => {
    if (navigating) return;
    try {
      setSaving(true); setError(null);
      const created = await invoiceApi.create(buildPayload());
      const invoiceId = created.id;
      const items = buildItemsPayload();
      if (items.length > 0) await invoiceApi.bulkSetItems(invoiceId, items);
      setNavigating(true);
      onCreated?.(created);
      onClose?.();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setNavigating(false);
      setError(err?.detail || err?.message || "Failed to save draft");
    } finally { setSaving(false); }
  };

  const handleSaveAndSend = async () => {
    if (navigating) return;
    try {
      setSaving(true); setError(null);
      const created = await invoiceApi.create(buildPayload());
      const invoiceId = created.id;
      const items = buildItemsPayload();
      if (items.length > 0) await invoiceApi.bulkSetItems(invoiceId, items);
      await invoiceApi.finalize(invoiceId);
      setNavigating(true);
      onCreated?.(created);
      onClose?.();
      navigate(`/billing/invoices/${invoiceId}`);
    } catch (err) {
      setNavigating(false);
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
                className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              {customerSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
      {showCustomerDropdown && customerSearchTerm && (
               <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                 {customerSearchResults.length === 0 ? (
                   <p className="px-3 py-2 text-sm text-slate-400">{customerSearching ? "Searching..." : "No customers found"}</p>
                 ) : (
                   <div>
                     {customerSearchResults.map((c) => (
                       <button key={c.id} type="button" onClick={() => handleCustomerSelect(c)}
                         className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700">
                         <div className="font-medium">{c.display_name || c.company_name || `#${c.id}`}</div>
                         <div className="text-xs text-slate-400 mt-1">
                           {c.company_name && c.company_name !== (c.display_name || `#${c.id}`) && <span className="mr-2">{c.company_name}</span>}
                           {c.email && <span>{c.email}</span>}
                           {c.phone && <span className="ml-2">{c.phone}</span>}
                         </div>
                       </button>
                     ))}
                   </div>
                 )}
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
                  rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Address</label>
                <textarea value={form.shipping_address} onChange={(e) => setForm((p) => ({ ...p, shipping_address: e.target.value }))}
                  rows={2} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tax Jurisdiction (Country)</label>
                <select value={form.country_code} onChange={(e) => setForm((p) => ({ ...p, country_code: e.target.value }))}
                  aria-label="Tax jurisdiction country"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  {COUNTRY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {form.country_code && (
                  <p className="text-xs text-emerald-600 mt-1">Tax rates for {COUNTRY_OPTIONS.find(c => c.value === form.country_code)?.label || form.country_code} will be prioritized</p>
                )}
                {!form.country_code && (
                  <p className="text-xs text-slate-400 mt-1">Select a country to filter tax rates by jurisdiction. Currency alone does not determine tax jurisdiction.</p>
                )}
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
                  className={`block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${orgSettings?.auto_generate_invoice_number && !form.invoice_number ? "bg-slate-50 cursor-not-allowed" : ""}`} />
              </div>
              {orgSettings?.auto_generate_invoice_number && !form.invoice_number && (
                <p className="text-xs text-slate-400 mt-1">Will be auto-generated on save</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={form.currency} onChange={(e) => {
                    const newCurrency = e.target.value;
                    const oldCurrency = form.currency;
                    if (newCurrency !== oldCurrency && lineItems.length > 0) {
                      setLineItems((prev) => prev.map((item) => {
                        const origCurrency = item.original_currency || oldCurrency;
                        const origAmount = Number(item.original_amount) || Number(item.unit_price) / (Number(item.exchange_rate) || 1);
                        const newUnitPrice = origAmount * (Number(item.exchange_rate) || 1);
                        return {
                          ...item,
                          unit_price: newUnitPrice,
                          original_currency: origCurrency,
                          original_amount: origAmount,
                          invoice_currency: newCurrency,
                          converted_amount: newUnitPrice,
                        };
                      }));
                      // Fetch new rates asynchronously for each unique product currency
                      const uniqueProductCurrencies = [...new Set(lineItems.map(i => i.original_currency).filter(c => c && c !== newCurrency))];
                      uniqueProductCurrencies.forEach(async (prodCurr) => {
                        try {
                          const rateData = await settingsApi.getExchangeRatePair(prodCurr, newCurrency);
                          if (rateData && Number(rateData.rate) > 0) {
                            const newRate = Number(rateData.rate);
                            setLineItems((prev) => prev.map((item) => {
                              if ((item.original_currency || oldCurrency) === prodCurr) {
                                const origAmt = Number(item.original_amount) || 0;
                                const convertedPrice = Math.round((origAmt * newRate) * 100) / 100;
                                return {
                                  ...item,
                                  unit_price: convertedPrice,
                                  invoice_currency: newCurrency,
                                  exchange_rate: newRate,
                                  exchange_rate_source: rateData.source || "live_api",
                                  converted_amount: convertedPrice,
                                };
                              }
                              return item;
                            }));
                          }
                        } catch {
                          console.warn(`Could not fetch rate for ${prodCurr} → ${newCurrency}`);
                        }
                      });
                    }
                    setForm((p) => ({ ...p, currency: newCurrency }));
                  }}
                  aria-label="Currency"
                  className="block w-full rounded-lg border border-gray-300 pl-9 pr-8 py-2.5 text-sm appearance-none bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                </select>
              </div>
            </div>
            {orgSettings && !hasExchangeRates && form.currency !== (orgSettings.base_currency || orgSettings.default_currency || "") && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>Exchange rates are not configured in Billing Settings. Currency conversion is disabled. Configure rates in Settings &gt; General &gt; Exchange Rates.</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.issue_date}
                  onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value, due_date: calcDueDate(p.payment_terms, e.target.value) }))}
                  aria-label="Invoice date"
                  className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                  aria-label="Due date"
                  className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label>
              <select value={form.payment_terms} onChange={(e) => setForm((p) => ({ ...p, payment_terms: e.target.value, due_date: calcDueDate(e.target.value, p.issue_date) }))}
                aria-label="Payment terms"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {PAYMENT_TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PO Number</label>
              <input type="text" value={form.po_number} onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                placeholder="Optional" aria-label="PO number"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Additional notes or terms..." aria-label="Notes"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          {exchangeRateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{exchangeRateError}</span>
              <button onClick={() => setExchangeRateError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="relative" ref={productSearchRef}>
            <label className="block text-xs font-medium text-slate-600 mb-1">Search Products</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Type product name to add..." value={productSearchTerm}
                onChange={(e) => { setProductSearchTerm(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                aria-label="Search products"
                className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
              {productSearching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
            {showProductDropdown && productSearchTerm && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {productSearchResults.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">{productSearching ? "Searching..." : "No products found"}</p>
                ) : productSearchResults.map((p) => (
                  <button key={p.id} type="button" onClick={() => handleProductSelect(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-slate-700">
                    <div className="font-medium">{p.name || p.description || `#${p.id}`}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span className="font-semibold text-slate-600">
                        {fmtCurrency(p.original_price || p.default_price || p.unit_price || 0, "\u2014", p.currency || orgSettings?.default_currency || "")}
                      </span>
                      {p.currency && p.currency !== form.currency && (
                        <span className="text-amber-600 bg-amber-50 px-1 rounded">→ {form.currency}</span>
                      )}
                      {p.tax_percentage > 0 && <span>Tax: {p.tax_percentage}%</span>}
                      {p.tax_inclusive && <span className="text-violet-600 bg-violet-50 px-1 rounded">Incl. Tax</span>}
                    </div>
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
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                    <input type="number" min="0" step="1" value={item.quantity}
                      onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                      aria-label={`Quantity for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price</label>
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={(e) => updateLineItem(idx, "unit_price", e.target.value)}
                      aria-label={`Unit price for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                    <input type="number" min="0" max="100" step="0.01" value={item.discount_percentage}
                      onChange={(e) => updateLineItem(idx, "discount_percentage", e.target.value)}
                      aria-label={`Discount for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                    <input type="number" min="0" max="100" step="0.01" value={item.tax_percentage}
                      onChange={(e) => updateLineItem(idx, "tax_percentage", e.target.value)}
                      aria-label={`Tax for item ${idx + 1}`}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-700">Amount: {formatDisplayCurrency(calcItemNet(item))}</span>
                  {Number(item.tax_percentage) > 0 && (
                    <span className="block text-xs text-violet-600 mt-0.5">incl. {item.tax_percentage}% tax ({formatDisplayCurrency((calcItemTotal(item) - calcItemDiscount(item)) * item.tax_percentage / 100)})</span>
                  )}
                  {item.original_currency && item.invoice_currency && item.original_currency !== item.invoice_currency && item.exchange_rate && (
                    <span className="block text-xs text-amber-600 mt-1 p-1.5 bg-amber-50 rounded">
                      {item.original_currency} {fmtCurrency(item.original_amount, "\u2014", item.original_currency)} × {Number(item.exchange_rate).toFixed(4)} = {formatDisplayCurrency(item.unit_price)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addLineItem}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Add Line Item
            </button>
          </div>
        </div>
      );
      case 4: {
        const warning = getJurisdictionWarning();
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tax Rate {form.currency && <span className="text-violet-600">({form.currency})</span>}
                </label>
                {taxRates.length === 0 && (
                  <p className="text-xs text-amber-600 mb-1">
                    No {form.currency || ""} tax rates found. Create one in Billing &gt; Tax Settings.
                  </p>
                )}
                <select value={selectedTaxRate.id || ""}
                  onChange={(e) => {
                    const tr = taxRates.find((r) => r.id === Number(e.target.value));
                    const rate = tr ? (Number(tr.rate) <= 1 && Number(tr.rate) > 0 ? Number(tr.rate) * 100 : Number(tr.rate)) : 0;
                    setTaxRateSelectionMode("MANUAL");
                    setSelectedTaxRate(tr ? { id: tr.id, name: tr.name, rate } : { id: null, name: "", rate: 0 });
                    setLineItems((prev) => prev.map((item) => ({ ...item, tax_percentage: rate })));
                  }}
                  aria-label="Tax rate"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  <option value="">No tax</option>
                  {taxRates.map((tr) => {
                    const displayRate = Number(tr.rate) <= 1 && Number(tr.rate) > 0 ? Number(tr.rate) * 100 : Number(tr.rate);
                    const label = tr.tax_type_label ? ` [${tr.tax_type_label}]` : "";
                    return <option key={tr.id} value={tr.id}>{tr.name}{label} ({displayRate}%)</option>;
                  })}
                </select>
                {selectedTaxRate.id && selectedTaxRate.name && (
                  <p className="text-xs text-slate-500 mt-1">
                    Selected: {selectedTaxRate.name} at {selectedTaxRate.rate}%
                  </p>
                )}
                {warning && (
                  <div className="mt-2 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs" title={warning.tooltip}>
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{warning.text}</span>
                  </div>
                )}
              </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
              <input type="number" min="0" max="100" step="0.01" value={form.discount_percentage}
                onChange={(e) => setForm((p) => ({ ...p, discount_percentage: Number(e.target.value) }))}
                aria-label="Global discount"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shipping Amount</label>
              <input type="number" min="0" step="0.01" value={shippingAmount}
                onChange={(e) => setShippingAmount(Number(e.target.value))}
                aria-label="Shipping amount"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Round Off</label>
              <input type="number" step="0.01" value={roundOff}
                onChange={(e) => setRoundOff(Number(e.target.value))}
                aria-label="Round off"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">{formatDisplayCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="font-medium text-red-600">-{formatDisplayCurrency(totals.discount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span className="font-medium">{formatDisplayCurrency(totals.tax)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Shipping</span><span className="font-medium">{formatDisplayCurrency(totals.shipping)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Round Off</span><span className="font-medium">{formatDisplayCurrency(totals.roundOff)}</span></div>
            <div className="border-t border-gray-300 pt-2 flex justify-between"><span className="font-bold text-slate-800">Grand Total</span><span className="font-bold text-lg text-violet-600">{formatDisplayCurrency(totals.grandTotal)}</span></div>
          </div>
        </div>
      );
      }
      case 5: return (
        <div className="space-y-6">
          {orgSettings && !hasExchangeRates && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>Exchange rates are not configured. Currency conversion is disabled. Configure rates in Billing Settings &gt; General &gt; Exchange Rates.</span>
            </div>
          )}
          {orgSettings && !orgSettings.default_tax_rate_id && !selectedTaxRate.id && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>No default tax rate configured. Set one in Billing Settings &gt; Tax.</span>
            </div>
          )}
          {taxRates.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>No {form.currency || ""} tax rates available. Create one in Billing &gt; Tax Settings.</span>
            </div>
          )}
          {selectedTaxRate.id && selectedTaxRate.name && (
            <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700 flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0" />
              <span>Tax: <strong>{selectedTaxRate.name}</strong> at <strong>{selectedTaxRate.rate}%</strong> for <strong>{form.currency}</strong></span>
            </div>
          )}
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
              {lineItems.map((item, idx) => {
                const hasConversion = item.original_currency && item.invoice_currency &&
                                     item.original_currency !== item.invoice_currency &&
                                     item.exchange_rate;
                const itemTax = (calcItemTotal(item) - calcItemDiscount(item)) * (item.tax_percentage || 0) / 100;
                return (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-700">{item.description || `Item ${idx + 1}`}</span>
                      {Number(item.tax_percentage) > 0 && (
                        <span className="text-xs text-violet-600 ml-2">({item.tax_percentage}% tax)</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatDisplayCurrency(calcItemNet(item))}</span>
                      {Number(itemTax) > 0 && (
                        <span className="block text-xs text-slate-500">tax: {formatDisplayCurrency(itemTax)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {lineItems.some(item => item.original_currency && item.invoice_currency &&
                                     item.original_currency !== item.invoice_currency &&
                                     item.exchange_rate) && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Currency Conversion</p>
                <div className="space-y-1 text-xs">
                  {lineItems.map((item, idx) => {
                    if (item.original_currency && item.invoice_currency &&
                        item.original_currency !== item.invoice_currency &&
                        item.exchange_rate) {
                      return (
                        <div key={idx} className="p-2 bg-amber-50 rounded text-amber-800">
                          <span className="font-medium">{item.description || `Item ${idx + 1}`}</span>:
                          {item.original_currency} {formatDisplayCurrency(item.original_amount)} × {item.exchange_rate} =
                          {item.invoice_currency} {formatDisplayCurrency(item.converted_amount || item.unit_price)}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            <div className="border-t border-gray-300 mt-3 pt-3 space-y-1">
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
              <button onClick={handleSaveDraft} disabled={saving || navigating}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Save Draft
              </button>
              <button onClick={handleSaveAndSend} disabled={saving || navigating}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Invoice</h1>
          <p className="text-sm text-slate-500 mt-0.5">Step {step} of {WIZARD_STEPS.length}</p>
        </div>
      </div>

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
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        {step < 7 && (
          <button onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
