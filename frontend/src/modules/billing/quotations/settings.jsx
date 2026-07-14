import { useState, useEffect, useRef } from "react";
import {
  Save, RefreshCw, AlertCircle, CheckCircle, Hash, ToggleLeft, Calendar,
  Percent, DollarSign, FileText, Image, Clock, Repeat, Users,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { settingsApi } from "../../../service/billingService";
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

export default function QuotationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    quote_prefix: "QOT-",
    quote_number_format: "{PREFIX}{NUMBER}",
    auto_generate_quote_number: true,
    default_validity_days: "30",
    enable_auto_approval: false,
    approval_threshold: "",
    enable_discount_approval: false,
    discount_approval_threshold: "",
    default_currency: "USD",
    default_terms_and_conditions: "",
    quote_logo_url: "",
    require_customer_approval: true,
    enable_version_history: true,
    quote_expiry_reminder_days: "7",
  });

  const [original, setOriginal] = useState({});
  const hasChanges = Object.keys(form).some((key) => form[key] !== original[key]);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);
      const settingsRes = await settingsApi.get();
      const settings = settingsRes || {};

      const values = {
        quote_prefix: settings.quote_prefix || "QOT-",
        quote_number_format: settings.quote_number_format || "{PREFIX}{NUMBER}",
        auto_generate_quote_number: settings.auto_generate_quote_number ?? true,
        default_validity_days: settings.default_validity_days || "30",
        enable_auto_approval: settings.enable_auto_approval ?? false,
        approval_threshold: settings.approval_threshold || "",
        enable_discount_approval: settings.enable_discount_approval ?? false,
        discount_approval_threshold: settings.discount_approval_threshold || "",
        default_currency: settings.default_currency || "USD",
        default_terms_and_conditions: settings.default_terms_and_conditions || "",
        quote_logo_url: settings.quote_logo_url || "",
        require_customer_approval: settings.require_customer_approval ?? true,
        enable_version_history: settings.enable_version_history ?? true,
        quote_expiry_reminder_days: settings.quote_expiry_reminder_days || "7",
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
      <HRPage title="Quotation Settings" subtitle="Configure quotation module preferences">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </HRPage>
    );
  }

  const numberingPreview = form.quote_number_format
    .replace("{PREFIX}", form.quote_prefix)
    .replace("{NUMBER}", "0001");

  return (
    <HRPage title="Quotation Settings" subtitle="Configure quotation module preferences">
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
        <SettingsField label="Quotation Numbering Prefix" icon={Hash} description="Prefix used when auto-generating quotation numbers">
          <input type="text" value={form.quote_prefix} onChange={(e) => updateField("quote_prefix", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Quotation Numbering Format" icon={Hash} description="Number format. Use {PREFIX} and {NUMBER} as placeholders">
          <input type="text" value={form.quote_number_format} onChange={(e) => updateField("quote_number_format", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          <p className="mt-1 text-xs text-gray-400">Preview: {numberingPreview}</p>
        </SettingsField>

        <SettingsField label="Auto-Generate Quote Numbers" icon={ToggleLeft} description="Automatically generate quotation numbers using the configured prefix/format">
          <select value={String(form.auto_generate_quote_number)} onChange={(e) => updateField("auto_generate_quote_number", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Default Validity Period (Days)" icon={Calendar} description="Default number of days a quotation remains valid">
          <input type="number" min="1" value={form.default_validity_days} onChange={(e) => updateField("default_validity_days", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Default Currency" icon={DollarSign} description="Default currency for new quotations">
          <select value={form.default_currency} onChange={(e) => updateField("default_currency", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            {getCurrencySelectOptions().map((c) => (
              <option key={c.value} value={c.value}>{c.value} - {c.label}</option>
            ))}
          </select>
        </SettingsField>

        <SettingsField label="Enable Auto-Approval" icon={ToggleLeft} description="Automatically approve quotations below a certain threshold">
          <select value={String(form.enable_auto_approval)} onChange={(e) => updateField("enable_auto_approval", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        {form.enable_auto_approval && (
          <SettingsField label="Auto-Approval Threshold" icon={DollarSign} description="Maximum quotation amount for auto-approval">
            <input type="number" min="0" step="0.01" value={form.approval_threshold} onChange={(e) => updateField("approval_threshold", e.target.value)}
              placeholder="1000.00"
              className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          </SettingsField>
        )}

        <SettingsField label="Enable Discount Approval" icon={Percent} description="Require approval for quotations with discounts above threshold">
          <select value={String(form.enable_discount_approval)} onChange={(e) => updateField("enable_discount_approval", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        {form.enable_discount_approval && (
          <SettingsField label="Discount Approval Threshold (%)" icon={Percent} description="Maximum discount percentage that can be applied without approval">
            <input type="number" min="0" max="100" step="0.1" value={form.discount_approval_threshold} onChange={(e) => updateField("discount_approval_threshold", e.target.value)}
              placeholder="10"
              className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          </SettingsField>
        )}

        <SettingsField label="Require Customer Approval" icon={Users} description="Require explicit customer approval for quotation acceptance">
          <select value={String(form.require_customer_approval)} onChange={(e) => updateField("require_customer_approval", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Required</option>
            <option value="false">Not Required</option>
          </select>
        </SettingsField>

        <SettingsField label="Enable Version History" icon={Clock} description="Track and maintain version history for quotation changes">
          <select value={String(form.enable_version_history)} onChange={(e) => updateField("enable_version_history", e.target.value === "true")}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </SettingsField>

        <SettingsField label="Expiry Reminder (Days Before)" icon={Clock} description="Send reminder before a quotation expires">
          <input type="number" min="1" value={form.quote_expiry_reminder_days} onChange={(e) => updateField("quote_expiry_reminder_days", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Default Terms & Conditions" icon={FileText} description="Default terms and conditions for new quotations">
          <textarea value={form.default_terms_and_conditions} onChange={(e) => updateField("default_terms_and_conditions", e.target.value)}
            rows={3} placeholder="Standard quotation terms..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Quotation Logo URL" icon={Image} description="URL to company logo displayed on quotations">
          <input type="url" value={form.quote_logo_url} onChange={(e) => updateField("quote_logo_url", e.target.value)}
            placeholder="https://example.com/logo.png"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          {form.quote_logo_url && <p className="mt-1 text-xs text-gray-400 truncate max-w-xs">{form.quote_logo_url}</p>}
        </SettingsField>
      </div>
    </HRPage>
  );
}
