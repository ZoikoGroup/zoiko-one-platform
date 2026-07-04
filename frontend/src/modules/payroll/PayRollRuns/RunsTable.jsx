import { ChevronRight } from "lucide-react";

const statusConfig = {
  Draft:      { color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400"   },
  Review:     { color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500"   },
  Approved:   { color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"    },
  Authorized: { color: "bg-violet-100 text-violet-700", dot: "bg-violet-500"  },
  Paid:       { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Closed:     { color: "bg-slate-200 text-slate-500",   dot: "bg-slate-400"   },
};

const headers = ["Run ID", "Pay Period", "Pay Date", "Employees", "Gross Pay", "Net Pay", "Status", ""];

export default function RunsTable({ runs, onSelect }) {
  if (runs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-12 text-center">
        <p className="text-sm text-slate-400">No payroll runs found. Create your first run to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {headers.map((h) => (
              <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {runs.map((run) => {
            const sc = statusConfig[run.status] || statusConfig.Draft;
            return (
              <tr key={run.id} onClick={() => onSelect(run)}
                className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-slate-500 font-semibold">{run.id}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{run.period}</td>
                <td className="px-5 py-4 text-slate-600">{run.payDate}</td>
                <td className="px-5 py-4 text-slate-700">{run.employees?.toLocaleString()}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{run.gross}</td>
                <td className="px-5 py-4 font-bold text-slate-800">{run.net}</td>
                <td className="px-5 py-4">
                  <span className={`flex items-center gap-1.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${sc.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />{run.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-400"><ChevronRight size={15} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
