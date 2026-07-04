import { AlertCircle } from "lucide-react";

export default function TaxSlabTable({ documents = [] }) {
  const slabs = [];
  // Only show extracted tax slabs from documents
  documents.forEach((doc) => {
    if (doc.extracted?.taxSlabs?.length > 0) {
      slabs.push(...doc.extracted.taxSlabs);
    }
  });

  return (
    <div className="space-y-4">
      {slabs.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            No tax slabs extracted yet. Upload a compliance document to see tax slabs.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Income Tax Slabs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Extracted from uploaded compliance documents</p>
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
              {slabs.map((s, i) => (
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
      )}
    </div>
  );
}