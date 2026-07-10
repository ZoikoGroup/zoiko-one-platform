import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Save, RefreshCw, AlertCircle, CheckCircle, Settings2,
  Building2, Globe, FileText, Receipt, Wallet, Percent,
  Bell, Shield, RotateCcw, MapPin, CreditCard,
  BadgePercent, Activity, ChevronDown, X, Search, Info,
} from "lucide-react";
import { settingsApi } from "../../../service/billingService";
import {
  CURRENCY_MASTER, getCurrencySymbol, formatCurrency, getCurrencySelectOptions,
} from "../../../utils/currency";
import { getLanguageSelectOptions } from "../../../utils/language";
import { formatNumber, getEffectiveLocale } from "../../../utils/locale";

const TABS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "invoicing", label: "Invoicing", icon: FileText },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "tax", label: "Tax", icon: Receipt },
  { id: "dunning", label: "Dunning", icon: Percent },
  { id: "revenue", label: "Revenue", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "advanced", label: "Advanced", icon: Shield },
];

const COLORS = {
  general: "violet", invoicing: "blue", payments: "emerald",
  tax: "amber", dunning: "rose", revenue: "cyan",
  notifications: "indigo", advanced: "slate",
};

const CURRENCY_OPTIONS_WITH_INFO = getCurrencySelectOptions();

const defaultForm = {
  company_name: "", billing_email: "", billing_phone: "", website: "", logo_url: "",
  country: "", state: "", city: "", postal_code: "", address_line1: "", address_line2: "",
  support_email: "", short_name: "",
  business_registration_number: "", gst_number: "", vat_number: "", pan_number: "", tin_number: "",
  fiscal_year_start: "01-01", fiscal_year_end: "12-31",
  default_currency: "USD", home_currency: "USD", base_currency: "USD",
  supported_currencies: ["USD"],
  date_format: "DD-MM-YYYY", timezone: "UTC", language: "en",
  currency_precision: 2, currency_symbol_position: "before",

  invoice_prefix: "INV-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", invoice_sequence_reset: "annually",
  quote_prefix: "QTE-", quote_number_format: "PREFIX-{YYYY}-{SEQ}", quote_sequence_reset: "annually",
  credit_note_prefix: "CN-", credit_note_number_format: "PREFIX-{YYYY}-{SEQ}", credit_note_sequence_reset: "annually",
  refund_prefix: "RF-", refund_number_format: "PREFIX-{YYYY}-{SEQ}", refund_sequence_reset: "annually",
  auto_generate_invoice_number: true,
  invoice_footer: "", invoice_terms: "", invoice_notes: "",
  invoice_logo_url: "", invoice_watermark: "", invoice_template: "standard",
  invoice_pdf_template: "standard", draft_behaviour: "save_as_draft",
  invoice_terms_and_conditions: "",
  show_tax_breakdown: true, show_discount: true, show_shipping: false,
  default_due_days: 30, payment_reminder_days_before: 3,
  late_payment_fee_percentage: 0, late_payment_fee_flat: 0,

  default_payment_terms: "net_30",
  payment_term_options: ["net_30", "net_15", "net_7", "due_on_receipt"],
  supported_payment_methods: ["credit_card", "bank_transfer", "paypal"],
  auto_send_receipts: true,
  exchange_rate_provider: "manual", exchange_rate_auto_update: false,
  rounding_method: "half_up", rounding_precision: 2,

  gateway_stripe_enabled: false, gateway_razorpay_enabled: false,
  gateway_paypal_enabled: true, gateway_cash_enabled: true,
  gateway_bank_transfer_enabled: true, gateway_upi_enabled: false,
  gateway_offline_enabled: true,
  webhook_secret: "", auto_capture_enabled: true,
  grace_period_days: 0, credit_limit: 0,

  tax_calculation_method: "exclusive", default_tax_rate_id: null,
  tax_label: "VAT", tax_number: "", tax_profiles: [],
  is_tax_inclusive_default: false, show_tax_on_invoice: true,
  enable_auto_tax_calculation: false,
  gst_enabled: false, sales_tax_enabled: false, service_tax_enabled: false,
  withholding_tax_enabled: false, reverse_charge_enabled: false, compound_tax_enabled: false,
  tax_rounding_method: "per_line",

  auto_dunning: false, dunning_level_count: 4, dunning_wait_days: 3,
  dunning_action_types: ["email_reminder"],
  enable_escalation_to_collections: false, collections_wait_days: 30,
  dunning_email_template: "",
  reminder_sms_enabled: false, reminder_whatsapp_enabled: false,
  auto_suspend_enabled: false, grace_days: 0,

  enable_revenue_recognition: false,
  revenue_recognition_method: "immediate", revenue_recognition_deferral_days: 0,
  recognized_revenue_method: "accrual", recognition_frequency: "monthly",

  enable_multi_currency: false,

  notification_preferences: {}, email_templates: {}, sms_templates: {},
  notify_invoice_created: true, notify_invoice_sent: true,
  notify_invoice_paid: true, notify_invoice_overdue: true,
  notify_subscription_renewed: true, notify_subscription_cancelled: true,
  notify_payment_failed: true, notify_payment_success: true,
  notify_customer_created: false,

  enable_approval_workflow: false, enable_credit_notes: true,
  enable_discounts: true, enable_retainers: false,
  enable_schedule_invoicing: false, enable_partial_payments: true,
  enable_auto_apply_credits: true,
  enable_quotes: true, enable_contracts: true,
  enable_usage_billing: false, enable_refunds: true,
  enable_auto_taxes: false, enable_audit_logs: true,
  security_settings: {},
};

const registrationFieldConfig = (country) => {
  const c = country || "";
  const isPhase = SUPPORTED_PHASE1.includes(c);
  // Default: show all fields
  const defaults = {
    business_registration_number: { show: true, label: "Business Registration Number" },
    gst_number: { show: true, label: "GSTIN" },
    vat_number: { show: true, label: "VAT Number" },
    pan_number: { show: true, label: "PAN Number" },
    tin_number: { show: true, label: "Tax ID / Sales Tax ID" },
  };
  if (!isPhase) return defaults;
  if (c === "India") {
    return {
      business_registration_number: { show: true, label: "CIN / Business Reg. Number" },
      gst_number: { show: true, label: "GSTIN" },
      vat_number: { show: false, label: "VAT Number" },
      pan_number: { show: true, label: "PAN Number" },
      tin_number: { show: false, label: "TIN Number" },
    };
  }
  if (c === "United States") {
    return {
      business_registration_number: { show: true, label: "EIN" },
      gst_number: { show: false, label: "GSTIN" },
      vat_number: { show: false, label: "VAT Number" },
      pan_number: { show: false, label: "PAN Number" },
      tin_number: { show: true, label: "Sales Tax ID" },
    };
  }
  if (c === "United Kingdom") {
    return {
      business_registration_number: { show: true, label: "Company Number" },
      gst_number: { show: false, label: "GSTIN" },
      vat_number: { show: true, label: "VAT Number" },
      pan_number: { show: false, label: "PAN Number" },
      tin_number: { show: false, label: "TIN Number" },
    };
  }
  if (c === "Australia") {
    return {
      business_registration_number: { show: true, label: "ABN" },
      gst_number: { show: true, label: "GST" },
      vat_number: { show: false, label: "VAT Number" },
      pan_number: { show: false, label: "PAN Number" },
      tin_number: { show: false, label: "TIN Number" },
    };
  }
  if (c === "UAE") {
    return {
      business_registration_number: { show: true, label: "Trade License" },
      gst_number: { show: false, label: "GSTIN" },
      vat_number: { show: true, label: "VAT Number" },
      pan_number: { show: false, label: "PAN Number" },
      tin_number: { show: false, label: "TIN Number" },
    };
  }
  return defaults;
};


const COUNTRY_DEFAULTS = {
  "India": {
    default_currency: "INR",
    timezone: "Asia/Kolkata",
    language: "en",
    invoice_prefix: "INV-IN-",
    invoice_number_format: "PREFIX-{YYYY}-{SEQ}",
    default_payment_terms: "net_30",
    fiscal_year_start: "04-01",
    fiscal_year_end: "03-31",
    tax_label: "GST",
    tax_calculation_method: "exclusive",
    is_tax_inclusive_default: false,
  },
  "United States": {
    default_currency: "USD",
    timezone: "America/New_York",
    language: "en",
    invoice_prefix: "INV-US-",
    invoice_number_format: "PREFIX-{YYYY}-{SEQ}",
    default_payment_terms: "net_30",
    fiscal_year_start: "01-01",
    fiscal_year_end: "12-31",
    tax_label: "Sales Tax",
    tax_calculation_method: "exclusive",
    is_tax_inclusive_default: false,
  },
  "United Kingdom": {
    default_currency: "GBP",
    timezone: "Europe/London",
    language: "en",
    invoice_prefix: "INV-UK-",
    invoice_number_format: "PREFIX-{YYYY}-{SEQ}",
    default_payment_terms: "net_30",
    fiscal_year_start: "04-01",
    fiscal_year_end: "03-31",
    tax_label: "VAT",
    tax_calculation_method: "exclusive",
    is_tax_inclusive_default: false,
  },
  "UAE": {
    default_currency: "AED",
    timezone: "Asia/Dubai",
    language: "en",
    invoice_prefix: "INV-AE-",
    invoice_number_format: "PREFIX-{YYYY}-{SEQ}",
    default_payment_terms: "net_30",
    fiscal_year_start: "01-01",
    fiscal_year_end: "12-31",
    tax_label: "VAT",
    tax_calculation_method: "exclusive",
    is_tax_inclusive_default: false,
  },
  "Singapore": {
    default_currency: "SGD",
    timezone: "Asia/Singapore",
    language: "en",
    invoice_prefix: "INV-SG-",
    invoice_number_format: "PREFIX-{YYYY}-{SEQ}",
    default_payment_terms: "net_30",
    fiscal_year_start: "01-01",
    fiscal_year_end: "12-31",
    tax_label: "GST",
    tax_calculation_method: "exclusive",
    is_tax_inclusive_default: false,
  },
};

const SUPPORTED_PHASE1 = ["India","United States","United Kingdom","Australia","UAE"];

const TAX_DEFAULTS = {
  "India": {
    tax_type: "GST",
    tax_label: "GST",
    tax_registration_label: "GSTIN",
    gst_support: ["CGST","SGST","IGST"],
    default_tax_rate: 18,
    gst_enabled: true,
  },
  "United States": {
    tax_type: "Sales Tax",
    tax_registration_label: "EIN",
    state_based: true,
    sales_tax_enabled: true,
  },
  "United Kingdom": {
    tax_type: "VAT",
    tax_registration_label: "VAT Number",
    default_tax_rate: 20,
    sales_tax_enabled: true,
  },
  "UAE": {
    tax_type: "VAT",
    tax_registration_label: "TRN",
    default_tax_rate: 5,
    sales_tax_enabled: true,
  },
  "Singapore": {
    tax_type: "GST",
    tax_registration_label: "GST Registration Number",
    default_tax_rate: 9,
    gst_enabled: true,
  },
  "Australia": {
    tax_type: "GST",
    tax_registration_label: "ABN",
    default_tax_rate: 10,
    gst_enabled: true,
  },
};

const INVOICE_DEFAULTS = {
  "India": { invoice_prefix: "INV-IN-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
  "United States": { invoice_prefix: "INV-US-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
  "United Kingdom": { invoice_prefix: "INV-UK-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
  "UAE": { invoice_prefix: "INV-AE-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
  "Singapore": { invoice_prefix: "INV-SG-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
  "Australia": { invoice_prefix: "INV-AU-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", default_due_days: 30 },
};

const PAYMENT_DEFAULTS = {
  "India": { default_payment_terms: "net_30" },
  "United States": { default_payment_terms: "net_30" },
  "United Kingdom": { default_payment_terms: "net_30" },
  "UAE": { default_payment_terms: "net_30" },
  "Singapore": { default_payment_terms: "net_30" },
  "Australia": { default_payment_terms: "net_30" },
};
// Enhance payment defaults with gateway suggestions for supported countries
Object.assign(PAYMENT_DEFAULTS, {
  "India": { gateway_razorpay_enabled: true, gateway_upi_enabled: true, gateway_stripe_enabled: false, gateway_paypal_enabled: false, default_payment_terms: "net_30" },
  "United States": { gateway_stripe_enabled: true, gateway_paypal_enabled: true, gateway_bank_transfer_enabled: true, default_payment_terms: "net_30" },
  "United Kingdom": { gateway_stripe_enabled: true, gateway_paypal_enabled: true, default_payment_terms: "net_30" },
  "Australia": { gateway_stripe_enabled: true, gateway_paypal_enabled: true, default_payment_terms: "net_30" },
  "UAE": { gateway_bank_transfer_enabled: true, gateway_paypal_enabled: true, default_payment_terms: "net_30" },
});

const getCountryDefaults = (country) => {
  const base = COUNTRY_DEFAULTS[country] || {};
  const tax = TAX_DEFAULTS[country] || {};
  const invoice = INVOICE_DEFAULTS[country] || {};
  const payment = PAYMENT_DEFAULTS[country] || {};
  return { ...base, ...invoice, ...payment, ...tax };
};

const isManualOverride = (field, value, previousCountry) => {
  if (value === undefined || value === null || value === "") return false;
  const baseDefault = defaultForm[field];
  const previousCountryDefault = getCountryDefaults(previousCountry)[field];
  return value !== baseDefault && value !== previousCountryDefault;
};

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex items-center justify-between py-3 px-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only peer" />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
      </div>
    </label>
  );
}

function Field({ label, description, children, className = "", error, tooltip }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {tooltip && (
          <span className="group relative inline-flex">
            <span className="text-gray-400 cursor-help text-xs border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center">?</span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">{tooltip}</span>
          </span>
        )}
      </div>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  if (status === 'auto') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700">🟢 Auto-configured</span>;
  if (status === 'custom') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">🔵 Customized</span>;
  if (status === 'review') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-50 text-yellow-700">⚠️ Needs review</span>;
  return null;
}

function Card({ title, description, children, icon: Icon, color = "violet" }) {
  const colorClasses = {
    violet: "from-violet-500 to-purple-500", blue: "from-blue-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500", amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500", slate: "from-slate-500 to-gray-500",
    cyan: "from-cyan-500 to-blue-500", indigo: "from-indigo-500 to-purple-500",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-r ${colorClasses[color] || colorClasses.violet} text-white flex items-center justify-center`}>
          {Icon && <Icon size={20} />}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, className = "" }) {
  return (
    <select value={value} onChange={onChange}
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white ${className}`}>
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );
}

function Input({ value, onChange, type = "text", placeholder, min, max, step, className = "" }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      min={min} max={max} step={step}
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 ${className}`} />
  );
}

function Textarea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500" />
  );
}

function SearchableSelect({ value, onChange, options, placeholder = "Search...", className = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => {
      const lbl = (opt.label || "").toLowerCase();
      const val = (opt.value || "").toLowerCase();
      const srch = (opt.searchLabel || opt.label || "").toLowerCase();
      return lbl.includes(q) || val.includes(q) || srch.includes(q);
    });
  }, [options, search]);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : value;
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      const first = filtered[0];
      if (first) onChange(first.value);
    }
    if (e.key === "Enter" && open && filtered.length > 0) {
      onChange(filtered[0].value);
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500">
        <span className="truncate text-left">{selectedLabel || placeholder}</span>
        {open ? <X size={14} className="shrink-0 ml-1 text-gray-400" onClick={(e) => { e.stopPropagation(); setOpen(false); setSearch(""); }} /> : <ChevronDown size={14} className="shrink-0 ml-1 text-gray-400" />}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={placeholder} autoFocus
              className="w-full text-sm outline-none border-none bg-transparent py-1" />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">No results</div>
            ) : (
              filtered.map((opt) => (
                <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors flex items-center gap-2 ${value === opt.value ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700"}`}>
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState("general");
  const [fieldStatus, setFieldStatus] = useState({}); // 'auto' | 'custom'
  const [suggestedDefaults, setSuggestedDefaults] = useState(null); // {country, suggestions}

  const [form, setForm] = useState({ ...defaultForm });
  const [original, setOriginal] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const savedTimerRef = useRef(null);
  const confirmResetTimerRef = useRef(null);

  const hasChanges = original ? JSON.stringify(form) !== JSON.stringify(original) : false;

  useEffect(() => {
    if (hasChanges && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
    }
  }, [form, hasChanges]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
    };
  }, []);

  const getColor = () => COLORS[activeTab] || "violet";

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getConfig();
      if (data) {
        const merged = { ...defaultForm };
        Object.keys(defaultForm).forEach((key) => {
          if (data[key] !== undefined && data[key] !== null) {
            merged[key] = data[key];
          }
        });
        setForm(merged);
        setOriginal(JSON.parse(JSON.stringify(merged)));
        // initialize field status based on country defaults
        const initialStatus = {};
        const country = merged.country;
        const defaults = getCountryDefaults(country);
        Object.keys(defaults).forEach((k) => {
          if (merged[k] !== undefined && merged[k] !== null && merged[k] === defaults[k]) initialStatus[k] = 'auto';
        });
        setFieldStatus(initialStatus);
      }
    } catch (err) {
      setError("Failed to load billing configuration. The backend may not be available.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const update = (field, value) => {
    // Special handling for website: suggest emails and short name
    if (field === 'website') {
      let domain = "";
      try {
        const u = value.startsWith('http') ? new URL(value) : new URL('https://' + value);
        domain = u.hostname.replace(/^www\./, '');
      } catch (e) {
        domain = value.replace(/^www\./, '');
      }
      setForm((prev) => {
        const next = { ...prev, website: value };
        // suggest billing/support emails and short name only if not customized
        if (!fieldStatus.billing_email || fieldStatus.billing_email !== 'custom') {
          next.billing_email = `billing@${domain}`;
        }
        if (!fieldStatus.support_email || fieldStatus.support_email !== 'custom') {
          next.support_email = `support@${domain}`;
        }
        if (!fieldStatus.short_name || fieldStatus.short_name !== 'custom') {
          const short = domain.split('.')[0];
          next.short_name = (short || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        }
        return next;
      });
      // mark website as customized and suggested fields as auto if they were overwritten
      setFieldStatus((prev) => ({
        ...prev,
        website: 'custom',
        billing_email: prev.billing_email === 'custom' ? 'custom' : 'auto',
        support_email: prev.support_email === 'custom' ? 'custom' : 'auto',
        short_name: prev.short_name === 'custom' ? 'custom' : 'auto',
      }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    // mark as customized when user edits
    setFieldStatus((prev) => ({ ...prev, [field]: 'custom' }));
  };

  const applyCountryDefaults = (country, previousCountry, currentForm) => {
    const defaults = getCountryDefaults(country);
    if (!defaults || Object.keys(defaults).length === 0) return currentForm;

    const updatedForm = { ...currentForm };
    Object.entries(defaults).forEach(([field, defaultValue]) => {
      if (!isManualOverride(field, currentForm[field], previousCountry)) {
        updatedForm[field] = defaultValue;
        setFieldStatus((prev) => ({ ...prev, [field]: 'auto' }));
      }
    });
    return updatedForm;
  };

  const handleCountryChange = (country) => {
    // Prepare suggestion but do not apply immediately.
    const defaults = getCountryDefaults(country);
    const suggestions = {};
    Object.entries(defaults).forEach(([field, val]) => {
      if (form[field] === undefined || form[field] === null || form[field] !== val) {
        suggestions[field] = val;
      }
    });
    if (Object.keys(suggestions).length === 0) {
      // nothing to suggest; just set country
      setForm((prev) => ({ ...prev, country }));
      setFieldErrors((prev) => ({ ...prev, country: undefined }));
      setSuggestedDefaults(null);
      return;
    }
    setSuggestedDefaults({ country, suggestions, previousCountry: form.country });
    // mark suggested fields as 'review'
    setFieldStatus((prev) => {
      const next = { ...prev };
      Object.keys(suggestions).forEach((k) => { next[k] = 'review'; });
      return next;
    });
    // set country value in form but do not change other fields yet
    setForm((prev) => ({ ...prev, country }));
    setFieldErrors((prev) => ({ ...prev, country: undefined }));
  };

  const applySuggestedDefaults = () => {
    if (!suggestedDefaults) return;
    const { suggestions } = suggestedDefaults;
    setForm((prev) => {
      const next = { ...prev };
      Object.entries(suggestions).forEach(([field, val]) => {
        // only apply if still auto-configured (not customized by user)
        if (!fieldStatus[field] || fieldStatus[field] === 'auto') {
          next[field] = val;
          setFieldStatus((fs) => ({ ...fs, [field]: 'auto' }));
        }
      });
      return next;
    });
    setSuggestedDefaults(null);
  };

  const keepCurrentSettings = () => {
    setSuggestedDefaults(null);
  };

  const resetToCountryDefaults = () => {
    const country = form.country;
    if (!country) return;
    const defaults = getCountryDefaults(country);
    if (!defaults) return;
    const intelligentFields = Object.keys(defaults);
    setForm((prev) => {
      const next = { ...prev };
      intelligentFields.forEach((f) => { next[f] = defaults[f]; });
      return next;
    });
    // mark them as auto-configured
    setFieldStatus((prev) => {
      const next = { ...prev };
      intelligentFields.forEach((f) => { next[f] = 'auto'; });
      return next;
    });
  };

  const updateToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});
    try {
      const data = { ...form };
      await settingsApi.updateConfig(data);
      setSaved(true);
      setOriginal(JSON.parse(JSON.stringify(form)));
      setShowUnsavedWarning(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => { setSaved(false); savedTimerRef.current = null; }, 3000);
    } catch (err) {
      const msg = err.message || "Failed to save configuration. Please try again.";
      setError(msg);
      if (msg.includes(":")) {
        const parts = msg.split(",");
        const errs = {};
        parts.forEach((p) => {
          const [key, val] = p.split(":");
          if (key && val) errs[key.trim()] = val.trim();
        });
        if (Object.keys(errs).length > 0) setFieldErrors(errs);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await settingsApi.validateConfig();
      setValidationResult(result);
    } catch (err) {
      setValidationResult({ valid: false, errors: ["Failed to validate configuration"] });
    } finally {
      setValidating(false);
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
      confirmResetTimerRef.current = setTimeout(() => { setConfirmReset(false); confirmResetTimerRef.current = null; }, 4000);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await settingsApi.resetConfig();
      if (result?.configuration) {
        const merged = { ...defaultForm };
        Object.keys(defaultForm).forEach((key) => {
          if (result.configuration[key] !== undefined && result.configuration[key] !== null) {
            merged[key] = result.configuration[key];
          }
        });
        setForm(merged);
        setOriginal(JSON.parse(JSON.stringify(merged)));
      }
      setSaved(true);
      setShowUnsavedWarning(false);
      setConfirmReset(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => { setSaved(false); savedTimerRef.current = null; }, 3000);
    } catch (err) {
      setError("Failed to reset configuration.");
      setConfirmReset(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing Configuration</h1>
            <p className="text-sm text-gray-500 mt-1">Enterprise billing module settings</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map((j) => (
                  <div key={j}>
                    <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
                    <div className="h-9 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise billing module settings</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              <CheckCircle size={16} />
              Saved
            </div>
          )}
          {showUnsavedWarning && hasChanges && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-medium">
              <AlertCircle size={16} />
              Unsaved changes
            </div>
          )}
          <button onClick={handleValidate} disabled={validating}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            <Settings2 size={15} />
            Validate
          </button>
          <button onClick={handleReset}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
              confirmReset
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}>
            <RotateCcw size={15} />
            {confirmReset ? "Confirm Reset" : "Reset"}
          </button>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {validationResult && (
        <div className={`p-4 border rounded-lg text-sm ${validationResult.valid ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          <div className="flex items-center gap-2 font-medium mb-1">
            {validationResult.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {validationResult.valid ? "Configuration is valid" : "Configuration has errors"}
          </div>
          {validationResult.errors?.length > 0 && (
            <ul className="list-disc list-inside mt-1 text-xs">
              {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {validationResult.field_count && (
            <p className="text-xs mt-1 opacity-75">{validationResult.field_count} fields configured</p>
          )}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const color = COLORS[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? `border-${color}-500 text-${color}-600`
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "general" && (
        <div className="space-y-6">
          <Card title="Organization Information" icon={Building2} color="violet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Company Name" tooltip="Legal name of your business">
                <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
              </Field>
              <Field label="Billing Email" tooltip="Email address for billing correspondence" error={fieldErrors.billing_email}>
                <Input type="email" value={form.billing_email} onChange={(e) => update("billing_email", e.target.value)} />
              </Field>
              <Field label="Support Email" tooltip="Support contact email">
                <Input type="email" value={form.support_email} onChange={(e) => update("support_email", e.target.value)} />
              </Field>
              <Field label="Short Name" tooltip="Short display name used in compact UI elements">
                <Input value={form.short_name} onChange={(e) => update("short_name", e.target.value)} />
              </Field>
              <Field label="Billing Phone" tooltip="Contact phone number for billing" error={fieldErrors.billing_phone}>
                <Input value={form.billing_phone} onChange={(e) => update("billing_phone", e.target.value)} />
              </Field>
              <Field label="Website" tooltip="Your business website URL" error={fieldErrors.website}>
                <Input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </Field>
              <Field label="Logo URL" tooltip="URL to your company logo image">
                <Input type="url" value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} />
              </Field>
              <Field label="Business Registration Number" tooltip="Official business registration or company number">
                {(() => {
                  const cfg = registrationFieldConfig(form.country);
                  return (
                    <>
                      {cfg.business_registration_number.show && (
                        <Field label={cfg.business_registration_number.label} tooltip="Official business registration or company number">
                          <Input value={form.business_registration_number} onChange={(e) => update("business_registration_number", e.target.value)} />
                        </Field>
                      )}
                      {cfg.gst_number.show && (
                        <Field label={cfg.gst_number.label} tooltip="Goods and Services Tax registration number" error={fieldErrors.gst_number}>
                          <Input value={form.gst_number} onChange={(e) => update("gst_number", e.target.value)} />
                        </Field>
                      )}
                      {cfg.vat_number.show && (
                        <Field label={cfg.vat_number.label} tooltip="Value Added Tax registration number" error={fieldErrors.vat_number}>
                          <Input value={form.vat_number} onChange={(e) => update("vat_number", e.target.value)} />
                        </Field>
                      )}
                      {cfg.pan_number.show && (
                        <Field label={cfg.pan_number.label} tooltip="Permanent Account Number (tax identifier)">
                          <Input value={form.pan_number} onChange={(e) => update("pan_number", e.target.value)} />
                        </Field>
                      )}
                      {cfg.tin_number.show && (
                        <Field label={cfg.tin_number.label} tooltip="Tax Identification Number">
                          <Input value={form.tin_number} onChange={(e) => update("tin_number", e.target.value)} />
                        </Field>
                      )}
                    </>
                  );
                })()}
              </Field>
            </div>
          </Card>

          <Card title="Address" icon={MapPin} color="violet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Address Line 1">
                <Input value={form.address_line1} onChange={(e) => update("address_line1", e.target.value)} />
              </Field>
              <Field label="Address Line 2">
                <Input value={form.address_line2} onChange={(e) => update("address_line2", e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
              </Field>
              <Field label="State / Province">
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
              </Field>
              <Field label="Postal Code">
                <Input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} />
              </Field>
              <Field label="Country">
                <Select value={form.country} onChange={(e) => handleCountryChange(e.target.value)}
                  options={["", "United States","United Kingdom","Canada","Australia","India","UAE","Saudi Arabia","Qatar","Kuwait","Japan","China","Singapore","Malaysia","Thailand","South Africa","Nigeria","Pakistan","Bangladesh","Sri Lanka","Nepal","Bahrain","Oman","Germany","France","Italy","Spain","Netherlands","Brazil","Mexico","Sweden","Norway","Denmark","Switzerland","New Zealand","Hong Kong","South Korea"]} />
                    {form.country && !SUPPORTED_PHASE1.includes(form.country) && (
                      <p className="mt-2 text-sm text-sky-700 bg-sky-50 border border-sky-100 rounded px-3 py-2 flex items-start gap-2">
                        <Info size={14} className="shrink-0 text-sky-700 mt-0.5" />
                        <span>
                          Smart Organization Intelligence is currently available for: India, United States, United Kingdom, UAE and Singapore. Please configure regional settings manually for this country. Support for additional countries will be added in future releases.
                        </span>
                      </p>
                    )}
                    {/* Suggestion banner when country changed */}
                    {suggestedDefaults && suggestedDefaults.country === form.country && (
                      <div className="mt-3 p-3 border rounded-lg bg-yellow-50 border-yellow-100 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">🧠 Smart Organization Intelligence</div>
                            <div className="text-slate-700 mt-1">Recommended defaults are available for {suggestedDefaults.country}.</div>
                            <div className="mt-3 flex gap-2">
                              <button onClick={applySuggestedDefaults} className="px-3 py-1.5 bg-violet-600 text-white rounded-md text-sm">Apply Suggested Defaults</button>
                              <button onClick={keepCurrentSettings} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">Keep Current Settings</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
              </Field>
            </div>
          </Card>

          <Card title="Regional Settings" icon={Globe} color="violet">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Default Currency" tooltip="Primary currency for billing">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect value={form.default_currency}
                      onChange={(v) => update("default_currency", v)}
                      options={CURRENCY_OPTIONS_WITH_INFO}
                      placeholder="Search currency..." />
                  </div>
                  <div className="shrink-0">
                    {fieldStatus.default_currency === 'auto' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700">🟢 Auto-configured</span>
                    ) : fieldStatus.default_currency === 'custom' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">🔵 Customized</span>
                    ) : null}
                  </div>
                </div>
              </Field>
              <Field label="Home Currency" tooltip="Your reporting/home currency">
                <SearchableSelect value={form.home_currency}
                  onChange={(v) => update("home_currency", v)}
                  options={CURRENCY_OPTIONS_WITH_INFO}
                  placeholder="Search currency..." />
              </Field>
              <Field label="Base Currency" tooltip="Base currency for exchange rate calculations">
                <SearchableSelect value={form.base_currency}
                  onChange={(v) => update("base_currency", v)}
                  options={CURRENCY_OPTIONS_WITH_INFO}
                  placeholder="Search currency..." />
              </Field>
              <Field label="Currency Precision" tooltip="Number of decimal places for currency">
                <Input type="number" value={form.currency_precision} min={0} max={10}
                  onChange={(e) => update("currency_precision", parseInt(e.target.value) || 2)} />
              </Field>
              <Field label="Currency Symbol Position" tooltip="Where to place the currency symbol">
                <Select value={form.currency_symbol_position} onChange={(e) => update("currency_symbol_position", e.target.value)}
                  options={[
                    {value:"before", label:`Before amount (${formatCurrency(100, form.default_currency, "before")})`},
                    {value:"after", label:`After amount (${formatCurrency(100, form.default_currency, "after")})`},
                  ]} />
              </Field>
              <Field label="Date Format">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={form.date_format} onChange={(e) => update("date_format", e.target.value)}
                      options={["DD-MM-YYYY","MM-DD-YYYY","YYYY-MM-DD","DD-MM-YY","MM-DD-YY"]} />
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={fieldStatus.date_format} />
                  </div>
                </div>
              </Field>
              <Field label="Fiscal Year Start" tooltip="Month and day when fiscal year starts (MM-DD)" error={fieldErrors.fiscal_year_start}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input value={form.fiscal_year_start} onChange={(e) => update("fiscal_year_start", e.target.value)} placeholder="MM-DD" />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.fiscal_year_start} /></div>
                </div>
              </Field>
              <Field label="Fiscal Year End" tooltip="Month and day when fiscal year ends (MM-DD)" error={fieldErrors.fiscal_year_end}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input value={form.fiscal_year_end} onChange={(e) => update("fiscal_year_end", e.target.value)} placeholder="MM-DD" />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.fiscal_year_end} /></div>
                </div>
              </Field>
              <Field label="Timezone">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={form.timezone} onChange={(e) => update("timezone", e.target.value)}
                      options={["UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Europe/London","Europe/Berlin","Europe/Paris","Asia/Tokyo","Asia/Shanghai","Asia/Dubai","Asia/Kolkata","Australia/Sydney","Africa/Johannesburg"]} />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.timezone} /></div>
                </div>
              </Field>
              <Field label="Language">
                <Select value={form.language} onChange={(e) => update("language", e.target.value)}
                  options={getLanguageSelectOptions()} />
              </Field>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3">Currency Preview</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{CURRENCY_MASTER[form.default_currency]?.flag}</span>
                  <div>
                    <p className="text-base font-bold text-violet-900">
                      {CURRENCY_MASTER[form.default_currency]?.name || form.default_currency}
                    </p>
                    <p className="text-xs text-violet-500">
                      {form.default_currency} &middot; {getCurrencySymbol(form.default_currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold text-violet-900">
                    {formatCurrency(123456.78, form.default_currency, form.currency_symbol_position)}
                  </span>
                  <span className="text-xs text-violet-400">
                    {form.currency_symbol_position === "after" ? "Symbol after amount" : "Symbol before amount"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded text-xs text-violet-600">
                    Before: {formatCurrency(100, form.default_currency, "before")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/60 rounded text-xs text-violet-600">
                    After: {formatCurrency(100, form.default_currency, "after")}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-slate-500" />
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Locale Information</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Language</span>
                    <span className="font-medium text-slate-800">{getLanguageSelectOptions().find(o => o.value === form.language)?.label || form.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Locale</span>
                    <span className="font-medium text-slate-800">{getEffectiveLocale(form.language, form.default_currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Currency</span>
                    <span className="font-medium text-slate-800">{form.default_currency} ({getCurrencySymbol(form.default_currency)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timezone</span>
                    <span className="font-medium text-slate-800">{form.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date Format</span>
                    <span className="font-medium text-slate-800">{form.date_format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Number Format</span>
                    <span className="font-medium text-slate-800">
                      {formatNumber(1234567.89, getEffectiveLocale(form.language, form.default_currency), form.currency_precision)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={resetToCountryDefaults} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm">Reset to Country Defaults</button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "invoicing" && (
        <div className="space-y-6">
          <Card title="Numbering" icon={FileText} color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Invoice Prefix" tooltip="Prefix for invoice numbers" error={fieldErrors.invoice_prefix}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input value={form.invoice_prefix} onChange={(e) => update("invoice_prefix", e.target.value)} />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.invoice_prefix} /></div>
                </div>
              </Field>
              <Field label="Invoice Number Format">
                <Select value={form.invoice_number_format} onChange={(e) => update("invoice_number_format", e.target.value)}
                  options={["PREFIX-{SEQ}","PREFIX-{YYYY}-{SEQ}","PREFIX-{YYYYMM}-{SEQ}","PREFIX-{YYYY}-{MM}-{SEQ}","PREFIX-{MM}-{YYYY}-{SEQ}"]} />
              </Field>
              <Field label="Sequence Reset">
                <Select value={form.invoice_sequence_reset} onChange={(e) => update("invoice_sequence_reset", e.target.value)}
                  options={["never","monthly","quarterly","annually"]} />
              </Field>
              <Field label="Quote Prefix" error={fieldErrors.quote_prefix}>
                <Input value={form.quote_prefix} onChange={(e) => update("quote_prefix", e.target.value)} />
              </Field>
              <Field label="Quote Number Format">
                <Select value={form.quote_number_format} onChange={(e) => update("quote_number_format", e.target.value)}
                  options={["PREFIX-{SEQ}","PREFIX-{YYYY}-{SEQ}","PREFIX-{YYYYMM}-{SEQ}","PREFIX-{YYYY}-{MM}-{SEQ}"]} />
              </Field>
              <Field label="Quote Sequence Reset">
                <Select value={form.quote_sequence_reset} onChange={(e) => update("quote_sequence_reset", e.target.value)}
                  options={["never","monthly","quarterly","annually"]} />
              </Field>
              <Field label="Credit Note Prefix">
                <Input value={form.credit_note_prefix} onChange={(e) => update("credit_note_prefix", e.target.value)} />
              </Field>
              <Field label="Credit Note Format">
                <Select value={form.credit_note_number_format} onChange={(e) => update("credit_note_number_format", e.target.value)}
                  options={["PREFIX-{SEQ}","PREFIX-{YYYY}-{SEQ}","PREFIX-{YYYYMM}-{SEQ}"]} />
              </Field>
              <Field label="Credit Note Sequence Reset">
                <Select value={form.credit_note_sequence_reset} onChange={(e) => update("credit_note_sequence_reset", e.target.value)}
                  options={["never","monthly","quarterly","annually"]} />
              </Field>
              <Field label="Refund Prefix">
                <Input value={form.refund_prefix} onChange={(e) => update("refund_prefix", e.target.value)} />
              </Field>
              <Field label="Refund Format">
                <Select value={form.refund_number_format} onChange={(e) => update("refund_number_format", e.target.value)}
                  options={["PREFIX-{SEQ}","PREFIX-{YYYY}-{SEQ}","PREFIX-{YYYYMM}-{SEQ}"]} />
              </Field>
              <Field label="Refund Sequence Reset">
                <Select value={form.refund_sequence_reset} onChange={(e) => update("refund_sequence_reset", e.target.value)}
                  options={["never","monthly","quarterly","annually"]} />
              </Field>
            </div>
          </Card>

          <Card title="Invoice Defaults" icon={Settings2} color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Default Due Days" tooltip="Default payment due period in days">
                <Input type="number" value={form.default_due_days} min={0} max={365}
                  onChange={(e) => update("default_due_days", parseInt(e.target.value) || 30)} />
              </Field>
              <Field label="Reminder Days Before" tooltip="Days before due date to send reminder">
                <Input type="number" value={form.payment_reminder_days_before} min={0} max={90}
                  onChange={(e) => update("payment_reminder_days_before", parseInt(e.target.value) || 3)} />
              </Field>
              <Field label="Late Fee (%)" tooltip="Percentage-based late payment fee">
                <Input type="number" value={form.late_payment_fee_percentage} min={0} max={100} step={0.01}
                  onChange={(e) => update("late_payment_fee_percentage", parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Late Fee (Flat)" tooltip="Fixed late payment fee amount">
                <Input type="number" value={form.late_payment_fee_flat} min={0} step={0.01}
                  onChange={(e) => update("late_payment_fee_flat", parseFloat(e.target.value) || 0)} />
              </Field>
              <Field label="Invoice Template" tooltip="Visual template for invoices">
                <Select value={form.invoice_template} onChange={(e) => update("invoice_template", e.target.value)}
                  options={["standard","modern","professional","minimal","bold"]} />
              </Field>
              <Field label="PDF Template" tooltip="PDF export template">
                <Select value={form.invoice_pdf_template} onChange={(e) => update("invoice_pdf_template", e.target.value)}
                  options={["standard","modern","professional","minimal"]} />
              </Field>
              <Field label="Draft Behaviour" tooltip="How new invoices are handled">
                <Select value={form.draft_behaviour} onChange={(e) => update("draft_behaviour", e.target.value)}
                  options={[{value:"save_as_draft",label:"Save as Draft"},{value:"auto_finalize",label:"Auto-finalize"},{value:"send_for_approval",label:"Send for Approval"}]} />
              </Field>
              <Field label="Invoice Logo URL" tooltip="Logo to display on invoices">
                <Input type="url" value={form.invoice_logo_url} onChange={(e) => update("invoice_logo_url", e.target.value)} />
              </Field>
              <Field label="Invoice Watermark" tooltip="Watermark text or image URL">
                <Input value={form.invoice_watermark} onChange={(e) => update("invoice_watermark", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="Auto-generate invoice numbers" checked={form.auto_generate_invoice_number}
                onChange={() => updateToggle("auto_generate_invoice_number")} />
              <Toggle label="Show tax breakdown" description="Display detailed tax lines on invoices"
                checked={form.show_tax_breakdown} onChange={() => updateToggle("show_tax_breakdown")} />
              <Toggle label="Show discount" description="Display discount amounts on invoices"
                checked={form.show_discount} onChange={() => updateToggle("show_discount")} />
              <Toggle label="Show shipping" description="Display shipping charges on invoices"
                checked={form.show_shipping} onChange={() => updateToggle("show_shipping")} />
            </div>
          </Card>

          <Card title="Invoice Text & Terms" icon={FileText} color="blue">
            <div className="grid grid-cols-1 gap-5">
              <Field label="Invoice Footer" tooltip="Text displayed at the bottom of invoices">
                <Textarea value={form.invoice_footer} onChange={(e) => update("invoice_footer", e.target.value)} rows={2} />
              </Field>
              <Field label="Invoice Terms" tooltip="Payment terms and conditions">
                <Textarea value={form.invoice_terms} onChange={(e) => update("invoice_terms", e.target.value)} rows={3} />
              </Field>
              <Field label="Invoice Notes" tooltip="General notes on invoices">
                <Textarea value={form.invoice_notes} onChange={(e) => update("invoice_notes", e.target.value)} rows={3} />
              </Field>
              <Field label="Terms & Conditions" tooltip="Full terms and conditions text">
                <Textarea value={form.invoice_terms_and_conditions} onChange={(e) => update("invoice_terms_and_conditions", e.target.value)} rows={4} />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="space-y-6">
          <Card title="Payment Terms" icon={Wallet} color="emerald">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Default Payment Terms">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={form.default_payment_terms} onChange={(e) => update("default_payment_terms", e.target.value)}
                      options={["due_on_receipt","net_7","net_10","net_15","net_30","net_45","net_60","net_90"]} />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.default_payment_terms} /></div>
                </div>
              </Field>
              <Field label="Rounding Method">
                <Select value={form.rounding_method} onChange={(e) => update("rounding_method", e.target.value)}
                  options={["none","up","down","half_up","half_down","half_even"]} />
              </Field>
              <Field label="Rounding Precision">
                <Input type="number" value={form.rounding_precision} min={0} max={10}
                  onChange={(e) => update("rounding_precision", parseInt(e.target.value) || 2)} />
              </Field>
              <Field label="Exchange Rate Provider">
                <Select value={form.exchange_rate_provider} onChange={(e) => update("exchange_rate_provider", e.target.value)}
                  options={["manual","ecb","fixer","open_exchange","xe","currency_layer"]} />
              </Field>
              <Field label="Grace Period (Days)" tooltip="Days after due date before late fees apply">
                <Input type="number" value={form.grace_period_days} min={0} max={365}
                  onChange={(e) => update("grace_period_days", parseInt(e.target.value) || 0)} />
              </Field>
              <Field label="Credit Limit" tooltip="Default credit limit for customers">
                <Input type="number" value={form.credit_limit} min={0} step={0.01}
                  onChange={(e) => update("credit_limit", parseFloat(e.target.value) || 0)} />
              </Field>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="Auto-send receipts" description="Automatically send payment receipts to customers"
                checked={form.auto_send_receipts} onChange={() => updateToggle("auto_send_receipts")} />
              <Toggle label="Auto-update exchange rates" description="Fetch latest exchange rates from provider"
                checked={form.exchange_rate_auto_update} onChange={() => updateToggle("exchange_rate_auto_update")} />
              <Toggle label="Auto-capture payments" description="Automatically capture authorized payments"
                checked={form.auto_capture_enabled} onChange={() => updateToggle("auto_capture_enabled")} />
            </div>
          </Card>

          <Card title="Payment Gateways" icon={CreditCard} color="emerald">
            <p className="text-xs text-gray-500 mb-4">Enable or disable payment gateways for your organization</p>
            <div className="space-y-1">
              <Toggle label="Stripe" description="Accept credit/debit card payments via Stripe"
                checked={form.gateway_stripe_enabled} onChange={() => updateToggle("gateway_stripe_enabled")} />
              <Toggle label="Razorpay" description="Accept payments via Razorpay (India)"
                checked={form.gateway_razorpay_enabled} onChange={() => updateToggle("gateway_razorpay_enabled")} />
              <Toggle label="PayPal" description="Accept payments via PayPal"
                checked={form.gateway_paypal_enabled} onChange={() => updateToggle("gateway_paypal_enabled")} />
              <Toggle label="Cash" description="Accept cash payments"
                checked={form.gateway_cash_enabled} onChange={() => updateToggle("gateway_cash_enabled")} />
              <Toggle label="Bank Transfer" description="Accept bank transfer payments"
                checked={form.gateway_bank_transfer_enabled} onChange={() => updateToggle("gateway_bank_transfer_enabled")} />
              <Toggle label="UPI" description="Accept UPI payments (India)"
                checked={form.gateway_upi_enabled} onChange={() => updateToggle("gateway_upi_enabled")} />
              <Toggle label="Offline" description="Accept offline payment methods"
                checked={form.gateway_offline_enabled} onChange={() => updateToggle("gateway_offline_enabled")} />
            </div>
            <div className="mt-5">
              <Field label="Webhook Secret" tooltip="Secret key for payment gateway webhooks">
                <Input value={form.webhook_secret} onChange={(e) => update("webhook_secret", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "tax" && (
        <div className="space-y-6">
          <Card title="Tax Configuration" icon={Receipt} color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Tax Calculation Method">
                <Select value={form.tax_calculation_method} onChange={(e) => update("tax_calculation_method", e.target.value)}
                  options={[{value:"exclusive",label:"Exclusive (added to subtotal)"},{value:"inclusive",label:"Inclusive (included in price)"}]} />
              </Field>
              <Field label="Tax Label" tooltip="Display label for tax (e.g. VAT, GST, Sales Tax)">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input value={form.tax_label} onChange={(e) => update("tax_label", e.target.value)} />
                  </div>
                  <div className="shrink-0"><StatusBadge status={fieldStatus.tax_label} /></div>
                </div>
              </Field>
              <Field label="Tax Registration Number">
                <Input value={form.tax_number} onChange={(e) => update("tax_number", e.target.value)} />
              </Field>
              <Field label="Tax Rounding Method">
                <Select value={form.tax_rounding_method} onChange={(e) => update("tax_rounding_method", e.target.value)}
                  options={[{value:"per_line",label:"Per Line"},{value:"per_invoice",label:"Per Invoice"},{value:"per_line_item",label:"Per Line Item"}]} />
              </Field>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="Tax inclusive by default" description="New items default to tax-inclusive pricing"
                checked={form.is_tax_inclusive_default} onChange={() => updateToggle("is_tax_inclusive_default")} />
              <Toggle label="Show tax on invoice" description="Display tax amounts on invoices"
                checked={form.show_tax_on_invoice} onChange={() => updateToggle("show_tax_on_invoice")} />
              <Toggle label="Auto-calculate tax" description="Automatically calculate tax based on tax rates"
                checked={form.enable_auto_tax_calculation} onChange={() => updateToggle("enable_auto_tax_calculation")} />
            </div>
          </Card>

          <Card title="Tax Types" icon={BadgePercent} color="amber">
            <p className="text-xs text-gray-500 mb-4">Configure which tax types are enabled for your organization</p>
            <div className="space-y-1">
              {(() => {
                const c = form.country;
                const mapping = {
                  India: ['gst_enabled'],
                  Australia: ['gst_enabled'],
                  Singapore: ['gst_enabled'],
                  'United States': ['sales_tax_enabled'],
                  'United Kingdom': ['sales_tax_enabled'],
                  UAE: ['sales_tax_enabled'],
                };
                const keys = mapping[c] || null;
                if (keys) {
                  return keys.map((k) => {
                    if (k === 'gst_enabled') return (
                      <Toggle key={k} label="GST" description="Goods and Services Tax" checked={form.gst_enabled} onChange={() => updateToggle('gst_enabled')} />
                    );
                    if (k === 'sales_tax_enabled') return (
                      <Toggle key={k} label={c === 'United Kingdom' || c === 'UAE' ? 'VAT' : 'Sales Tax'} description={c === 'United Kingdom' || c === 'UAE' ? 'Value Added Tax' : 'Sales tax (state-based)'} checked={form.sales_tax_enabled} onChange={() => updateToggle('sales_tax_enabled')} />
                    );
                    return null;
                  });
                }
                // fallback: show all toggles for unsupported countries
                return (
                  <>
                    <Toggle label="GST" description="Goods and Services Tax (India, Australia, Canada, etc.)"
                      checked={form.gst_enabled} onChange={() => updateToggle("gst_enabled")} />
                    <Toggle label="Sales Tax" description="Sales tax (US states, Canada provinces)"
                      checked={form.sales_tax_enabled} onChange={() => updateToggle("sales_tax_enabled")} />
                    <Toggle label="Service Tax" description="Service tax on specified services"
                      checked={form.service_tax_enabled} onChange={() => updateToggle("service_tax_enabled")} />
                    <Toggle label="Withholding Tax" description="Withholding tax (WHT) on payments"
                      checked={form.withholding_tax_enabled} onChange={() => updateToggle("withholding_tax_enabled")} />
                    <Toggle label="Reverse Charge" description="Reverse charge mechanism for VAT/GST"
                      checked={form.reverse_charge_enabled} onChange={() => updateToggle("reverse_charge_enabled")} />
                    <Toggle label="Compound Tax" description="Tax on tax (compound taxation)"
                      checked={form.compound_tax_enabled} onChange={() => updateToggle("compound_tax_enabled")} />
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "dunning" && (
        <div className="space-y-6">
          <Card title="Dunning Configuration" icon={Percent} color="rose">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Dunning Level Count" tooltip="Number of dunning escalation levels">
                <Input type="number" value={form.dunning_level_count} min={1} max={10}
                  onChange={(e) => update("dunning_level_count", parseInt(e.target.value) || 4)} />
              </Field>
              <Field label="Wait Days Between Levels" tooltip="Days to wait between each dunning level">
                <Input type="number" value={form.dunning_wait_days} min={0} max={90}
                  onChange={(e) => update("dunning_wait_days", parseInt(e.target.value) || 3)} />
              </Field>
              <Field label="Collections Wait Days" tooltip="Days before escalating to collections">
                <Input type="number" value={form.collections_wait_days} min={0} max={365}
                  onChange={(e) => update("collections_wait_days", parseInt(e.target.value) || 30)} />
              </Field>
              <Field label="Grace Days" tooltip="Days after due date before dunning starts">
                <Input type="number" value={form.grace_days} min={0} max={365}
                  onChange={(e) => update("grace_days", parseInt(e.target.value) || 0)} />
              </Field>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="Enable auto-dunning" description="Automatically process dunning for overdue invoices"
                checked={form.auto_dunning} onChange={() => updateToggle("auto_dunning")} />
              <Toggle label="Escalate to collections" description="Auto-escalate unresolved cases to collections"
                checked={form.enable_escalation_to_collections} onChange={() => updateToggle("enable_escalation_to_collections")} />
              <Toggle label="SMS Reminders" description="Send dunning reminders via SMS"
                checked={form.reminder_sms_enabled} onChange={() => updateToggle("reminder_sms_enabled")} />
              <Toggle label="WhatsApp Reminders" description="Send dunning reminders via WhatsApp"
                checked={form.reminder_whatsapp_enabled} onChange={() => updateToggle("reminder_whatsapp_enabled")} />
              <Toggle label="Auto-suspend on overdue" description="Automatically suspend services for overdue accounts"
                checked={form.auto_suspend_enabled} onChange={() => updateToggle("auto_suspend_enabled")} />
            </div>
          </Card>

          <Card title="Penalties & Interest" icon={AlertCircle} color="rose">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Penalty Type">
                <Select value={(form.penalty_settings && form.penalty_settings.type) || "percentage"}
                  onChange={(e) => update("penalty_settings", { ...(form.penalty_settings || {}), type: e.target.value })}
                  options={[{value:"percentage",label:"Percentage"},{value:"flat",label:"Flat Amount"},{value:"none",label:"No Penalty"}]} />
              </Field>
              <Field label="Penalty Value">
                <Input type="number" value={(form.penalty_settings && form.penalty_settings.value) || 0} min={0} step={0.01}
                  onChange={(e) => update("penalty_settings", { ...(form.penalty_settings || {}), value: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Interest Annual Rate (%)" tooltip="Annual interest rate for overdue amounts">
                <Input type="number" value={(form.interest_settings && form.interest_settings.annual_rate) || 0} min={0} max={100} step={0.01}
                  onChange={(e) => update("interest_settings", { ...(form.interest_settings || {}), annual_rate: parseFloat(e.target.value) || 0 })} />
              </Field>
              <Field label="Interest Compounding">
                <Select value={(form.interest_settings && form.interest_settings.compounding) || "simple"}
                  onChange={(e) => update("interest_settings", { ...(form.interest_settings || {}), compounding: e.target.value })}
                  options={[{value:"simple",label:"Simple"},{value:"compound",label:"Compound"}]} />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "revenue" && (
        <div className="space-y-6">
          <Card title="Revenue Recognition" icon={Activity} color="cyan">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Recognition Method">
                <Select value={form.revenue_recognition_method} onChange={(e) => update("revenue_recognition_method", e.target.value)}
                  options={[{value:"immediate",label:"Immediate"},{value:"daily_prorated",label:"Daily Prorated"},{value:"monthly_prorated",label:"Monthly Prorated"},{value:"milestone",label:"Milestone"},{value:"manual",label:"Manual"}]} />
              </Field>
              <Field label="Deferral Days">
                <Input type="number" value={form.revenue_recognition_deferral_days} min={0} max={3650}
                  onChange={(e) => update("revenue_recognition_deferral_days", parseInt(e.target.value) || 0)} />
              </Field>
              <Field label="Revenue Method" tooltip="Cash, Accrual, or Deferred revenue method">
                <Select value={form.recognized_revenue_method} onChange={(e) => update("recognized_revenue_method", e.target.value)}
                  options={[{value:"cash",label:"Cash"},{value:"accrual",label:"Accrual"},{value:"deferred",label:"Deferred"}]} />
              </Field>
              <Field label="Recognition Frequency">
                <Select value={form.recognition_frequency} onChange={(e) => update("recognition_frequency", e.target.value)}
                  options={[{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"monthly",label:"Monthly"},{value:"quarterly",label:"Quarterly"},{value:"annually",label:"Annually"}]} />
              </Field>
            </div>
            <div className="mt-4 space-y-1">
              <Toggle label="Enable revenue recognition" description="Track deferred and recognized revenue"
                checked={form.enable_revenue_recognition} onChange={() => updateToggle("enable_revenue_recognition")} />
              <Toggle label="Enable multi-currency" description="Support multiple currencies in billing"
                checked={form.enable_multi_currency} onChange={() => updateToggle("enable_multi_currency")} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Card title="Notification Events" icon={Bell} color="indigo">
            <p className="text-xs text-gray-500 mb-4">Configure which events trigger notifications</p>
            <div className="space-y-1">
              <Toggle label="Invoice Created" checked={form.notify_invoice_created} onChange={() => updateToggle("notify_invoice_created")} />
              <Toggle label="Invoice Sent" checked={form.notify_invoice_sent} onChange={() => updateToggle("notify_invoice_sent")} />
              <Toggle label="Invoice Paid" checked={form.notify_invoice_paid} onChange={() => updateToggle("notify_invoice_paid")} />
              <Toggle label="Invoice Overdue" checked={form.notify_invoice_overdue} onChange={() => updateToggle("notify_invoice_overdue")} />
              <Toggle label="Subscription Renewed" checked={form.notify_subscription_renewed} onChange={() => updateToggle("notify_subscription_renewed")} />
              <Toggle label="Subscription Cancelled" checked={form.notify_subscription_cancelled} onChange={() => updateToggle("notify_subscription_cancelled")} />
              <Toggle label="Payment Failed" checked={form.notify_payment_failed} onChange={() => updateToggle("notify_payment_failed")} />
              <Toggle label="Payment Success" checked={form.notify_payment_success} onChange={() => updateToggle("notify_payment_success")} />
              <Toggle label="Customer Created" checked={form.notify_customer_created} onChange={() => updateToggle("notify_customer_created")} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-6">
          <Card title="Feature Flags" icon={Shield} color="slate">
            <p className="text-xs text-gray-500 mb-4">Enable or disable billing module features</p>
            <div className="space-y-1">
              <Toggle label="Approval workflow" description="Require approval for invoices and quotes"
                checked={form.enable_approval_workflow} onChange={() => updateToggle("enable_approval_workflow")} />
              <Toggle label="Credit notes" description="Allow creating and applying credit notes"
                checked={form.enable_credit_notes} onChange={() => updateToggle("enable_credit_notes")} />
              <Toggle label="Discounts" description="Allow discounts on invoices and quotes"
                checked={form.enable_discounts} onChange={() => updateToggle("enable_discounts")} />
              <Toggle label="Retainers" description="Enable retainer-based billing"
                checked={form.enable_retainers} onChange={() => updateToggle("enable_retainers")} />
              <Toggle label="Schedule invoicing" description="Schedule invoices for future dates"
                checked={form.enable_schedule_invoicing} onChange={() => updateToggle("enable_schedule_invoicing")} />
              <Toggle label="Partial payments" description="Allow partial payments on invoices"
                checked={form.enable_partial_payments} onChange={() => updateToggle("enable_partial_payments")} />
              <Toggle label="Auto-apply credits" description="Automatically apply available credits to invoices"
                checked={form.enable_auto_apply_credits} onChange={() => updateToggle("enable_auto_apply_credits")} />
              <Toggle label="Quotes" description="Enable quotation management"
                checked={form.enable_quotes} onChange={() => updateToggle("enable_quotes")} />
              <Toggle label="Contracts" description="Enable contract management"
                checked={form.enable_contracts} onChange={() => updateToggle("enable_contracts")} />
              <Toggle label="Usage-based billing" description="Enable usage-based billing"
                checked={form.enable_usage_billing} onChange={() => updateToggle("enable_usage_billing")} />
              <Toggle label="Refunds" description="Enable refund processing"
                checked={form.enable_refunds} onChange={() => updateToggle("enable_refunds")} />
              <Toggle label="Auto-tax calculation" description="Enable automatic tax calculation"
                checked={form.enable_auto_taxes} onChange={() => updateToggle("enable_auto_taxes")} />
              <Toggle label="Audit logs" description="Enable audit trail for all billing changes"
                checked={form.enable_audit_logs} onChange={() => updateToggle("enable_audit_logs")} />
            </div>
          </Card>
        </div>
      )}

      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-violet-800 mb-2">Enterprise Billing Configuration</h3>
        <p className="text-sm text-violet-700">
          Changes take effect immediately for all new billing transactions.
          Existing invoices, quotes, and subscriptions retain their original settings.
          Audit logs capture all configuration changes for compliance.
        </p>
      </div>
    </div>
  );
}
