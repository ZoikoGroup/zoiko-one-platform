import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle, Globe, Shield, Ban, Plus, X, Trash2 } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { taxApi } from "../../../service/billingService";
import { extractArray } from "../../../utils/billing-helpers";

const TAX_RULE_OPTIONS = [
  { value: "standard", label: "Standard Rate" },
  { value: "reduced", label: "Reduced Rate" },
  { value: "zero", label: "Zero Rate" },
  { value: "exempt", label: "Exempt" },
];

const JURISDICTION_TYPES = [
  { value: "country", label: "Country" },
  { value: "state", label: "State / Province" },
  { value: "county", label: "County" },
  { value: "city", label: "City" },
  { value: "region", label: "Region" },
];

export default function TaxConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [taxRates, setTaxRates] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [exemptions, setExemptions] = useState([]);

  const [newExemption, setNewExemption] = useState({ name: "", description: "", tax_rate_id: "", jurisdiction: "" });
  const [newJurisdiction, setNewJurisdiction] = useState({ name: "", type: "country", tax_rule: "standard" });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [ratesRes] = await Promise.allSettled([
        taxApi.list({ per_page: 100, taxable_type: "both" }),
      ]);
      if (ratesRes.status === "fulfilled") {
        const items = extractArray(ratesRes.value);
        setTaxRates(items);
        const juris = [...new Set(items.map((r) => r.jurisdiction).filter(Boolean))].map((j) => ({ name: j, type: "country", tax_rule: "standard" }));
        setJurisdictions(juris);
      }
    } catch (err) {
      setError(err.message || "Failed to load tax configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addExemption = () => {
    if (!newExemption.name) return;
    setExemptions((prev) => [...prev, { ...newExemption, id: Date.now() }]);
    setNewExemption({ name: "", description: "", tax_rate_id: "", jurisdiction: "" });
    setSaved(false);
  };

  const removeExemption = (id) => {
    setExemptions((prev) => prev.filter((e) => e.id !== id));
    setSaved(false);
  };

  const addJurisdiction = () => {
    if (!newJurisdiction.name) return;
    setJurisdictions((prev) => [...prev, { ...newJurisdiction, id: Date.now() }]);
    setNewJurisdiction({ name: "", type: "country", tax_rule: "standard" });
    setSaved(false);
  };

  const removeJurisdiction = (id) => {
    setJurisdictions((prev) => prev.filter((j) => j.id !== id));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await taxApi.update({ jurisdictions, exemptions });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save configuration");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <HRPage title="Tax Configuration" subtitle="Configure tax settings">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Tax Configuration" subtitle="Configure tax settings">

      <div className="flex items-center justify-between mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jurisdictions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{jurisdictions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rules</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{jurisdictions.filter((j) => j.tax_rule !== "standard").length + (taxRates.length > 0 ? 1 : 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Exemptions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{exemptions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Saved
            </span>
          )}
          <button onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-linear-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Tax Jurisdictions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage tax jurisdictions and their default rules</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input type="text" placeholder="Jurisdiction name" value={newJurisdiction.name}
              onChange={(e) => setNewJurisdiction((p) => ({ ...p, name: e.target.value }))}
              className="flex-1 min-w-[200px] px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <select value={newJurisdiction.type} onChange={(e) => setNewJurisdiction((p) => ({ ...p, type: e.target.value }))}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {JURISDICTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={newJurisdiction.tax_rule} onChange={(e) => setNewJurisdiction((p) => ({ ...p, tax_rule: e.target.value }))}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {TAX_RULE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={addJurisdiction} disabled={!newJurisdiction.name}
              className="flex items-center gap-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              <Plus size={16} /> Add
            </button>
          </div>

          {jurisdictions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No jurisdictions configured. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {jurisdictions.map((j, i) => (
                <div key={j.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-violet-500" />
                    <span className="text-sm font-medium text-slate-800">{j.name}</span>
                    <span className="text-xs text-slate-400 capitalize">({j.type})</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      j.tax_rule === "standard" ? "bg-blue-100 text-blue-700" :
                      j.tax_rule === "reduced" ? "bg-amber-100 text-amber-700" :
                      j.tax_rule === "zero" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{j.tax_rule}</span>
                  </div>
                  <button onClick={() => removeJurisdiction(j.id)} className="p-1 text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center">
              <Ban size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Tax Exemptions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage tax exemption rules for specific products or customers</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input type="text" placeholder="Exemption name" value={newExemption.name}
              onChange={(e) => setNewExemption((p) => ({ ...p, name: e.target.value }))}
              className="flex-1 min-w-[200px] px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <input type="text" placeholder="Jurisdiction" value={newExemption.jurisdiction}
              onChange={(e) => setNewExemption((p) => ({ ...p, jurisdiction: e.target.value }))}
              className="w-36 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <select value={newExemption.tax_rate_id} onChange={(e) => setNewExemption((p) => ({ ...p, tax_rate_id: e.target.value }))}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All tax rates</option>
              {taxRates.map((r) => <option key={r.id} value={r.id}>{r.name} ({(parseFloat(r.rate || 0) * 100).toFixed(1)}%)</option>)}
            </select>
            <button onClick={addExemption} disabled={!newExemption.name}
              className="flex items-center gap-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              <Plus size={16} /> Add
            </button>
          </div>

          {exemptions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No exemptions configured. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {exemptions.map((ex, i) => (
                <div key={ex.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield size={16} className="text-emerald-500" />
                    <span className="text-sm font-medium text-slate-800">{ex.name}</span>
                    {ex.description && <span className="text-xs text-slate-400">— {ex.description}</span>}
                    {ex.jurisdiction && <span className="text-xs text-slate-500">{ex.jurisdiction}</span>}
                  </div>
                  <button onClick={() => removeExemption(ex.id)} className="p-1 text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </HRPage>
  );
}
