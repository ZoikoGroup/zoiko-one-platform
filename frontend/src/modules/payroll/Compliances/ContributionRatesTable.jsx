import { AlertCircle } from "lucide-react";

export default function ContributionRatesTable({ documents = [] }) {
  const rows = [];
  // Only show extracted contribution rates from documents
  documents.forEach((doc) => {
    if (doc.extracted?.contributionRates?.length > 0) {
      rows.push(...doc.extracted.contributionRates);
    }
  });

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            No contribution rates extracted yet. Upload a compliance document to see rates.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Statutory Contribution Rates</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracted from uploaded compliance documents
            </p>
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
              {rows.map((r) => (
                <tr key={r.id ?? r.label} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{r.label}</td>
                  <td className="px-5 py-3.5 text-slate-600">{r.employee}</td>
                  <td className="px-5 py-3.5 text-slate-600">{r.employer}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}