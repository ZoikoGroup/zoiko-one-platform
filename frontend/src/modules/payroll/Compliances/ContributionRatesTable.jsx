import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetchContributionRates } from "../../../service/payrollService";

export default function ContributionRatesTable({ documents = [], country }) {
  const [activeRates, setActiveRates] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    fetchContributionRates(country)
      .then((rows) => {
        if (cancelled) return;
        setActiveRates(Array.isArray(rows) ? rows : []);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => { cancelled = true; };
  }, [country]);

  const extractedRows = [];
  documents.forEach((doc) => {
    if (doc.extracted?.contributionRates?.length > 0) {
      extractedRows.push(...doc.extracted.contributionRates);
    }
  });

  return (
    <div className="space-y-6">
      {/* Active rates — what payroll runs actually use today */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-sm">Active Contribution Rates</h3>
          {loadState === "ready" && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 size={12} /> Live from payroll engine
            </span>
          )}
        </div>

        {loadState === "loading" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading active rates…
          </div>
        )}

        {loadState === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Couldn't load the org's active contribution rates. This is the data payroll runs are actually
              calculated against — try refreshing before relying on the extracted-document values below.
            </p>
          </div>
        )}

        {loadState === "ready" && activeRates.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              No active contribution rates are configured for this jurisdiction yet.
            </p>
          </div>
        )}

        {loadState === "ready" && activeRates.length > 0 && (
          <RatesTable rows={activeRates} caption="Currently applied to every payslip in this jurisdiction." />
        )}
      </div>

      {/* Extracted from uploaded documents — reference only, not applied */}
      <div>
        <h3 className="font-bold text-slate-800 text-sm mb-2">Extracted From Documents</h3>
        {extractedRows.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              No contribution rates extracted yet. Upload a compliance document to see rates here.
            </p>
          </div>
        ) : (
          <RatesTable
            rows={extractedRows}
            caption="Reference only — nothing here is applied to payroll until you promote a row on the Documents tab."
          />
        )}
      </div>
    </div>
  );
}

function RatesTable({ rows, caption }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100">
        <p className="text-xs text-slate-400">{caption}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Component</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee Share</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employer Share</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r, i) => (
            <tr key={r.id ?? r.label ?? i} className="hover:bg-slate-50">
              <td className="px-5 py-3.5 font-semibold text-slate-800">{r.label}</td>
              <td className="px-5 py-3.5 text-slate-600">{r.employee}</td>
              <td className="px-5 py-3.5 text-slate-600">{r.employer}</td>
              <td className="px-5 py-3.5 font-semibold text-slate-800">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}