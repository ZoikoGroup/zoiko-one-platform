import { useState, useEffect, useCallback, useRef } from "react";
import { Save, AlertCircle, RefreshCw } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { settingsApi } from "../../../service/billingService";
import { getCurrencySelectOptions } from "../../../utils/currency";
import { Spinner, ErrorState } from "../../../components/billing-shared";

const CURRENCY_OPTIONS = getCurrencySelectOptions();

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

const STRATEGY_OPTIONS = [
  { value: "flat", label: "Flat" },
  { value: "volume", label: "Volume" },
  { value: "graduated", label: "Graduated" },
];

const ROUNDING_OPTIONS = [
  { value: "none", label: "No Rounding" },
  { value: "nearest_0.01", label: "Nearest $0.01" },
  { value: "nearest_0.10", label: "Nearest $0.10" },
  { value: "nearest_1.00", label: "Nearest $1.00" },
  { value: "ceil_1.00", label: "Ceil to $1.00" },
];

const SETTINGS_PREFIX = "pricing_";

const DEFAULT_SETTINGS = {
  default_currency: "USD",
  default_billing_frequency: "monthly",
  default_trial_days: "0",
  price_precision: "2",
  tax_inclusive: "no",
  default_pricing_strategy: "flat",
  rounding_rule: "none",
};

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [initial, setInitial] = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const savedTimerRef = useRef(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await settingsApi.get();
      const raw = data?.settings || data || {};
      const prefixed = {};
      Object.entries(DEFAULT_SETTINGS).forEach(([key, def]) => {
        const val = raw[`${SETTINGS_PREFIX}${key}`] ?? raw[key] ?? def;
        prefixed[key] = String(val);
      });
      setSettings(prefixed);
      setInitial(prefixed);
    } catch (err) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const hasChanges = Object.keys(DEFAULT_SETTINGS).some((key) => settings[key] !== initial[key]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      const payload = {};
      Object.entries(settings).forEach(([key, val]) => {
        payload[`${SETTINGS_PREFIX}${key}`] = val;
      });
      await settingsApi.update(payload);
      setInitial({ ...settings });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const Field = ({ label, id, children }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );

  if (loading) {
    return (
      <HRPage title="Pricing Settings" subtitle="Configure pricing defaults and behavior">
        <Spinner />
      </HRPage>
    );
  }

  if (error && !settings.default_currency) {
    return (
      <HRPage title="Pricing Settings" subtitle="Configure pricing defaults and behavior">
        <ErrorState message={error} onRetry={fetchSettings} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Pricing Settings" subtitle="Configure pricing defaults and behavior">

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Pricing Configuration</h2>
            <button onClick={handleSave} disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50">
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {!hasChanges && !success && (
            <p className="text-xs text-slate-400 mt-2">No changes to save.</p>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <AlertCircle size={16} /> Settings saved successfully.
            </div>
          )}

          <div className="space-y-6 max-w-lg">
            <Field label="Default Currency" id="default_currency">
              <select id="default_currency" value={settings.default_currency} onChange={(e) => handleChange("default_currency", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {CURRENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Default Billing Frequency" id="default_billing_frequency">
              <select id="default_billing_frequency" value={settings.default_billing_frequency} onChange={(e) => handleChange("default_billing_frequency", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Default Trial Days" id="default_trial_days">
              <input id="default_trial_days" type="number" min="0" value={settings.default_trial_days} onChange={(e) => handleChange("default_trial_days", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </Field>

            <Field label="Price Precision (decimal places)" id="price_precision">
              <input id="price_precision" type="number" min="0" max="6" value={settings.price_precision} onChange={(e) => handleChange("price_precision", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </Field>

            <Field label="Tax Inclusive Pricing" id="tax_inclusive">
              <select id="tax_inclusive" value={settings.tax_inclusive} onChange={(e) => handleChange("tax_inclusive", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="yes">Yes (prices include tax)</option>
                <option value="no">No (tax added at checkout)</option>
              </select>
            </Field>

            <Field label="Default Pricing Strategy" id="default_pricing_strategy">
              <select id="default_pricing_strategy" value={settings.default_pricing_strategy} onChange={(e) => handleChange("default_pricing_strategy", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {STRATEGY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="Rounding Rule" id="rounding_rule">
              <select id="rounding_rule" value={settings.rounding_rule} onChange={(e) => handleChange("rounding_rule", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                {ROUNDING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </div>
    </HRPage>
  );
}
