import { useState, useEffect } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle, Hash, Folder, DollarSign, BarChart3, Eye, Tag } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { settingsApi, productApi } from "../../../service/billingService";





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

export default function ProductSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    product_numbering_prefix: "PROD-",
    product_numbering_format: "{PREFIX}{NUMBER}",
    default_category_id: "",
    default_tax_rate: "",
    usage_billing_unit: "unit",
    usage_billing_rounding: "nearest",
    auto_archive_days: "",
    product_visibility: "visible",
    require_sku: "no",
  });

  const [original, setOriginal] = useState({});
  const hasChanges = Object.keys(form).some((key) => form[key] !== original[key]);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);
      const [settingsRes, catRes] = await Promise.allSettled([
        settingsApi.get(),
        productApi.listCategories({ per_page: 100 }),
      ]);
      let settings = {};
      if (settingsRes.status === "fulfilled") settings = settingsRes.value || {};
      if (catRes.status === "fulfilled") {
        const catData = catRes.value;
        setCategories(Array.isArray(catData) ? catData : catData?.items || catData?.categories || catData?.data || []);
      }

      const values = {
        product_numbering_prefix: settings.product_numbering_prefix || "PROD-",
        product_numbering_format: settings.product_numbering_format || "{PREFIX}{NUMBER}",
        default_category_id: settings.default_category_id || "",
        default_tax_rate: settings.default_tax_rate || "",
        usage_billing_unit: settings.usage_billing_unit || "unit",
        usage_billing_rounding: settings.usage_billing_rounding || "nearest",
        auto_archive_days: settings.auto_archive_days || "",
        product_visibility: settings.product_visibility || "visible",
        require_sku: settings.require_sku || "no",
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
      <HRPage title="Product Settings" subtitle="Product configuration and preferences">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Product Settings" subtitle="Product configuration and preferences">

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
        <SettingsField label="Product Numbering Prefix" icon={Hash} description="Prefix used when auto-generating product codes">
          <input type="text" value={form.product_numbering_prefix} onChange={(e) => updateField("product_numbering_prefix", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Product Numbering Format" icon={Hash} description="Product code format. Use {PREFIX} and {NUMBER} as placeholders">
          <input type="text" value={form.product_numbering_format} onChange={(e) => updateField("product_numbering_format", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
          <p className="mt-1 text-xs text-gray-400">Preview: {form.product_numbering_format.replace("{PREFIX}", form.product_numbering_prefix).replace("{NUMBER}", "0001")}</p>
        </SettingsField>

        <SettingsField label="Default Category" icon={Folder} description="Default category assigned to new products">
          <select value={form.default_category_id} onChange={(e) => updateField("default_category_id", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </SettingsField>

        <SettingsField label="Default Tax Rate" icon={Tag} description="Default tax rate applied to new products">
          <input type="text" value={form.default_tax_rate} onChange={(e) => updateField("default_tax_rate", e.target.value)}
            placeholder="e.g. 0.08 for 8%"
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Usage Billing Default Unit" icon={BarChart3} description="Default metering unit for usage-based products">
          <select value={form.usage_billing_unit} onChange={(e) => updateField("usage_billing_unit", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="unit">Per Unit</option>
            <option value="hour">Per Hour</option>
            <option value="day">Per Day</option>
            <option value="mb">Per MB</option>
            <option value="gb">Per GB</option>
            <option value="api_call">Per API Call</option>
            <option value="user">Per User</option>
            <option value="license">Per License</option>
          </select>
        </SettingsField>

        <SettingsField label="Usage Billing Rounding" icon={BarChart3} description="How partial usage units are rounded for billing">
          <select value={form.usage_billing_rounding} onChange={(e) => updateField("usage_billing_rounding", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="nearest">Nearest Unit</option>
            <option value="up">Round Up</option>
            <option value="down">Round Down</option>
          </select>
        </SettingsField>

        <SettingsField label="Auto-Archive After (Days)" icon={DollarSign} description="Automatically archive inactive products after N days (leave empty to disable)">
          <input type="number" min="1" value={form.auto_archive_days} onChange={(e) => updateField("auto_archive_days", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" />
        </SettingsField>

        <SettingsField label="Product Visibility" icon={Eye} description="Default visibility for new products in catalogs and listings">
          <select value={form.product_visibility} onChange={(e) => updateField("product_visibility", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </SettingsField>

        <SettingsField label="Require SKU" icon={Tag} description="Require SKU when creating new products">
          <select value={form.require_sku} onChange={(e) => updateField("require_sku", e.target.value)}
            className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
            <option value="yes">Required</option>
            <option value="no">Optional</option>
          </select>
        </SettingsField>
      </div>
    </HRPage>
  );
}
