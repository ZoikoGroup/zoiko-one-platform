import { useState, useEffect, useRef } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle, Hash, DollarSign, Percent, Mail, Phone, FileText, ToggleLeft, Calendar, Globe, Image } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { settingsApi, taxApi } from "../../../service/billingService";
import { getCurrencySelectOptions } from "../../../utils/currency";

function SettingsField({ label, icon: Icon, children, description }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-800">{label}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const CURRENCY_OPTIONS = getCurrencySelectOptions();

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);
  const [taxRates, setTaxRates] = useState([]);

  const [form, setForm] = useState({
    default_currency: "USD",
    fiscal_year_start: "january",
    default_payment_terms: "net_30",
    default_invoice_prefix: "INV-",
    default_quote_prefix: "QTE-",
    auto_generate_invoice_number: true,
    invoice_number_format: "{PREFIX}{NUMBER}",
    default_tax_rate_id: "",
    auto_apply_credits: true,
    auto_send_invoices: false,
    auto_send_receipts: false,
    auto_dunning: false,
    dunning_level_count: "3",
    payment_reminder_days_before: "7",
    late_payment_fee_percentage: "",
    late_payment_fee_flat: "",
    enable_revenue_recognition: false,
    enable_multi_currency: false,
    billing_email: "",
    billing_phone: "",
    terms_and_conditions: "",
    logo_url: "",
  });

  const [original, setOriginal] = useState({});
  const hasChanges = Object.keys(form).some((key) => form[key] !== original[key]);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);
      const [settingsRes, taxRes] = await Promise.allSettled([
        settingsApi.get(),
        taxApi.list({ per_page: 100 }),
      ]);
      let settings = {};
      if (settingsRes.status === "fulfilled") settings = settingsRes.value || {};
      if (taxRes.status === "fulfilled") {
        const data = taxRes.value;
        setTaxRates(Array.isArray(data) ? data : data?.items || data?.data || []);
      }

      const values = {
        default_currency: settings.default_currency || "USD",
        fiscal_year_start: settings.fiscal_year_start || "january",
        default_payment_terms: settings.default_payment_terms || "net_30",
        default_invoice_prefix: settings.default_invoice_prefix || "INV-",
        default_quote_prefix: settings.default_quote_prefix || "QTE-",
        auto_generate_invoice_number: settings.auto_generate_invoice_number ?? true,
        invoice_number_format: settings.invoice_number_format || "{PREFIX}{NUMBER}",
        default_tax_rate_id: settings.default_tax_rate_id || "",
        auto_apply_credits: settings.auto_apply_credits ?? true,
        auto_send_invoices: settings.auto_send_invoices ?? false,
        auto_send_receipts: settings.auto_send_receipts ?? false,
        auto_dunning: settings.auto_dunning ?? false,
        dunning_level_count: settings.dunning_level_count || "3",
        payment_reminder_days_before: settings.payment_reminder_days_before || "7",
        late_payment_fee_percentage: settings.late_payment_fee_percentage || "",
        late_payment_fee_flat: settings.late_payment_fee_flat || "",
        enable_revenue_recognition: settings.enable_revenue_recognition ?? false,
        enable_multi_currency: settings.enable_multi_currency ?? false,
        billing_email: settings.billing_email || "",
        billing_phone: settings.billing_phone || "",
        terms_and_conditions: settings.terms_and_conditions || "",
        logo_url: settings.logo_url || "",
      };
      setForm(values);
      setOriginal({ ...values });
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);
      await settingsApi.update(form);
      setOriginal({ ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  if (loading) {
    return (
      <HRPage title="Invoice Settings" subtitle="Configure invoice module preferences">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </HRPage>
    );
  }

  const numberingPreview = form.invoice_number_format
    .replace("{PREFIX}", form.default_invoice_prefix)
    .replace("{NUMBER}", "0001");

  return (
    <HRPage title="Invoice Settings" subtitle="Configure invoice module preferences">
      <div className="flex items-center justify-between mb-6">
        <div />
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          <button onClick={fetchSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={handleSave} disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-6">
        <SettingsField label="Default Currency" icon={Globe} description="Default currency for invoices and transactions">
          <select value={form.default_currency} onChange={(e) => updateField("default_currency", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </SettingsField>

        <SettingsField label="Invoice Numbering Prefix" icon={Hash} description="Prefix used when auto-generating invoice numbers">
          <input type="text" value={form.default_invoice_prefix} onChange={(e) => updateField("default_invoice_prefix", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Invoice Numbering Format" icon={Hash} description="Invoice number format. Use {PREFIX} and {NUMBER} as placeholders">
          <input type="text" value={form.invoice_number_format} onChange={(e) => updateField("invoice_number_format", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          <p className="mt-1 text-xs text-gray-400">Preview: {numberingPreview}</p>
        </SettingsField>

        <SettingsField label="Auto-Generate Invoice Numbers" icon={ToggleLeft} description="Automatically generate invoice numbers using the configured prefix/format">
          <select value={String(form.auto_generate_invoice_number)} onChange={(e) => updateField("auto_generate_invoice_number", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Default Payment Terms" icon={DollarSign} description="Default payment terms assigned to new invoices">
          <select value={form.default_payment_terms} onChange={(e) => updateField("default_payment_terms", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="due_on_receipt">Due on Receipt</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_45">Net 45</option>
            <option value="net_60">Net 60</option>
            <option value="net_90">Net 90</option>
            <option value="custom">Custom</option>
          </select>
        </SettingsField>

        <SettingsField label="Default Tax Rate" icon={Percent} description="Default tax rate applied to invoices">
          <select value={form.default_tax_rate_id} onChange={(e) => updateField("default_tax_rate_id", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="">None</option>
            {taxRates.filter((r) => r.status === "active").map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({(parseFloat(r.rate || 0) * 100).toFixed(2)}%)</option>
            ))}
          </select>
        </SettingsField>

        <SettingsField label="Auto-Apply Credits" icon={ToggleLeft} description="Automatically apply available credit notes to new invoices">
          <select value={String(form.auto_apply_credits)} onChange={(e) => updateField("auto_apply_credits", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Auto-Send Invoices" icon={ToggleLeft} description="Automatically send invoices to customers when finalized">
          <select value={String(form.auto_send_invoices)} onChange={(e) => updateField("auto_send_invoices", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Auto-Send Receipts" icon={ToggleLeft} description="Automatically send payment receipts to customers">
          <select value={String(form.auto_send_receipts)} onChange={(e) => updateField("auto_send_receipts", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Payment Reminder Days Before Due" icon={Calendar} description="Number of days before due date to send payment reminders">
          <input type="number" min="1" value={form.payment_reminder_days_before} onChange={(e) => updateField("payment_reminder_days_before", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Late Payment Fee (%)" icon={Percent} description="Percentage fee applied to overdue invoices">
          <input type="number" min="0" max="100" step="0.1" value={form.late_payment_fee_percentage} onChange={(e) => updateField("late_payment_fee_percentage", e.target.value)}
            placeholder="e.g. 1.5"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Late Payment Flat Fee" icon={DollarSign} description="Flat fee applied to overdue invoices">
          <input type="number" min="0" step="0.01" value={form.late_payment_fee_flat} onChange={(e) => updateField("late_payment_fee_flat", e.target.value)}
            placeholder="e.g. 25.00"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Auto Dunning" icon={ToggleLeft} description="Automatically escalate dunning process for overdue invoices">
          <select value={String(form.auto_dunning)} onChange={(e) => updateField("auto_dunning", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Dunning Level Count" icon={Hash} description="Number of dunning levels before escalation">
          <input type="number" min="1" max="10" value={form.dunning_level_count} onChange={(e) => updateField("dunning_level_count", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Enable Revenue Recognition" icon={ToggleLeft} description="Enable ASC 606 revenue recognition schedules">
          <select value={String(form.enable_revenue_recognition)} onChange={(e) => updateField("enable_revenue_recognition", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Enable Multi-Currency" icon={Globe} description="Allow invoices and transactions in multiple currencies">
          <select value={String(form.enable_multi_currency)} onChange={(e) => updateField("enable_multi_currency", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Fiscal Year Start" icon={Calendar} description="Start month of your fiscal year for revenue recognition">
          <select value={form.fiscal_year_start} onChange={(e) => updateField("fiscal_year_start", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            {["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].map((m) => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </SettingsField>

        <SettingsField label="Billing Email" icon={Mail} description="Email address displayed on invoices for billing inquiries">
          <input type="email" value={form.billing_email} onChange={(e) => updateField("billing_email", e.target.value)}
            placeholder="billing@example.com"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Billing Phone" icon={Phone} description="Phone number displayed on invoices for billing inquiries">
          <input type="text" value={form.billing_phone} onChange={(e) => updateField("billing_phone", e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Terms & Conditions" icon={FileText} description="Default terms and conditions printed on invoices">
          <textarea value={form.terms_and_conditions} onChange={(e) => updateField("terms_and_conditions", e.target.value)}
            rows={3} placeholder="Payment is due within 30 days..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Logo URL" icon={Image} description="URL to company logo displayed on invoices">
          <input type="url" value={form.logo_url} onChange={(e) => updateField("logo_url", e.target.value)}
            placeholder="https://example.com/logo.png"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          {form.logo_url && <p className="mt-1 text-xs text-gray-400 truncate max-w-xs">{form.logo_url}</p>}
        </SettingsField>
      </div>
    </HRPage>
  );
}
