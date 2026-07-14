import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetchTaxSlabs } from "../../../service/payrollService";

export default function TaxSlabTable({ documents = [], country }) {
  const [activeSlabs, setActiveSlabs] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    fetchTaxSlabs(country)
      .then((rows) => {
        if (cancelled) return;
        setActiveSlabs(Array.isArray(rows) ? rows : []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => { cancelled = true; };
  }, [country]);

  const extractedSlabs = [];
  documents.forEach((doc) => {
    if (doc.extracted?.taxSlabs?.length > 0) {
      extractedSlabs.push(...doc.extracted.taxSlabs);
    }
  });

  return (
    <div className="space-y-6">
      {/* Active slabs — what TDS is actually calculated against today */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-sm">Active Income Tax Slabs</h3>
          {loadState === "ready" && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-600">
              <CheckCircle2 size={12} /> Live from payroll engine
            </span>
          )}
        </div>

        {loadState === "loading" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading active tax slabs…
          </div>
        )}

        {loadState === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Couldn't load the org's active tax slabs. This is the table TDS is actually calculated against —
              try refreshing before relying on the extracted-document values below.
            </p>
          </div>
        )}

        {loadState === "ready" && activeSlabs.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              No active tax slabs are configured for this jurisdiction yet.
            </p>
          </div>
        )}

        {loadState === "ready" && activeSlabs.length > 0 && (
          <SlabsTable rows={activeSlabs} caption="Currently applied when calculating TDS in this jurisdiction." />
        )}
      </div>

      {/* Extracted from uploaded documents — reference only, not applied */}
      <div>
        <h3 className="font-bold text-slate-800 text-sm mb-2">Extracted From Documents</h3>
        {extractedSlabs.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              No tax slabs extracted yet. Upload a compliance document to see slabs here.
            </p>
          </div>
        ) : (
          <SlabsTable
            rows={extractedSlabs}
            caption="Reference only — nothing here is applied to payroll until you promote a row on the Documents tab."
          />
        )}
      </div>
    </div>
  );
}

function SlabsTable({ rows, caption }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100">
        <p className="text-xs text-slate-400">{caption}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Min</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Max</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Calculation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((s, i) => (
            <tr key={s.id ?? i} className="hover:bg-slate-50">
              <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.min}</td>
              <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.max}</td>
              <td className="px-5 py-3.5">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
                  {s.rate}
                </span>
              </td>
              <td className="px-5 py-3.5 text-xs text-slate-600">{s.tax}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}