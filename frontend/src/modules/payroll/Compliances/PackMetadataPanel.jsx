import { useState, useEffect } from "react";
import { Layers, Loader2 } from "lucide-react";
import {
  fetchJurisdictionPack,
  upsertJurisdictionPack,
} from "../../../service/payrollService";

const STATUS_OPTIONS = ["Draft", "In Review", "QA", "Approved", "Active", "Deprecated", "Retired"];

export default function PackMetadataPanel({ country, state, addToast }) {
  const [meta, setMeta] = useState({
    packId: "",
    version: "1.0",
    status: "Draft",
    effectiveFrom: "",
    effectiveTo: "",
    complianceOwner: "",
    engineeringOwner: "",
    sourceReferences: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const update = (field, value) => setMeta((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJurisdictionPack(country, state).then((pack) => {
      if (cancelled) return;
      if (pack) {
        setMeta({
          packId: pack.packId || "",
          version: pack.version || "1.0",
          status: pack.status || "Draft",
          effectiveFrom: pack.effectiveFrom || "",
          effectiveTo: pack.effectiveTo || "",
          complianceOwner: pack.complianceOwner || "",
          engineeringOwner: pack.engineeringOwner || "",
          sourceReferences: pack.sourceReferences || "",
        });
        setLoaded(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [country, state]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertJurisdictionPack({
        packId: meta.packId,
        jurisdictionCountry: country,
        jurisdictionState: state || null,
        version: meta.version,
        status: meta.status,
        effectiveFrom: meta.effectiveFrom || null,
        effectiveTo: meta.effectiveTo || null,
        complianceOwner: meta.complianceOwner,
        engineeringOwner: meta.engineeringOwner,
        sourceReferences: meta.sourceReferences,
      });
      addToast?.("Pack metadata saved successfully.", "success");
    } catch {
      addToast?.("Failed to save pack metadata.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={18} className="text-violet-500" />
        <h3 className="text-base font-bold text-slate-800">Pack Identity & Metadata</h3>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TextField label="Pack ID" placeholder="e.g. IN-PAYROLL-2026-V1" value={meta.packId} onChange={(v) => update("packId", v)} />
        <TextField label="Version" placeholder="e.g. 1.0" value={meta.version} onChange={(v) => update("version", v)} />

        <div>
          <label className="text-xs text-slate-500 mb-1 block font-medium">Pack Status</label>
          <select
            value={meta.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <TextField label="Effective From" type="date" value={meta.effectiveFrom} onChange={(v) => update("effectiveFrom", v)} />
        <TextField label="Effective To" type="date" value={meta.effectiveTo} onChange={(v) => update("effectiveTo", v)} />
        <TextField label="Compliance Owner" placeholder="Named person or team" value={meta.complianceOwner} onChange={(v) => update("complianceOwner", v)} />
        <TextField label="Engineering Owner" placeholder="Named person or team" value={meta.engineeringOwner} onChange={(v) => update("engineeringOwner", v)} />
        <div className="md:col-span-2 lg:col-span-3">
          <TextField
            label="Source References"
            placeholder="Official legal, tax, or government source(s) this pack is built from"
            value={meta.sourceReferences}
            onChange={(v) => update("sourceReferences", v)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-xs text-slate-400">
          {loading
            ? "Loading pack metadata…"
            : !loaded
              ? "No existing pack metadata — filling defaults."
              : "Loaded from server."}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save Pack Metadata"}
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block font-medium">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white"
      />
    </div>
  );
}