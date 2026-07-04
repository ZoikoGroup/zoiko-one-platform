import { ArrowLeft } from "lucide-react";

const lifecycleSteps = ["Draft", "Review", "Approved", "Authorized", "Paid", "Closed"];

export default function RunDetailPage({ run, onBack }) {
  if (!run) return null;
  const stepIdx = lifecycleSteps.indexOf(run.status);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-semibold">
        <ArrowLeft size={14} /> All Runs
      </button>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-6">
        <p className="text-xs text-slate-500 font-mono font-bold">{run.id}</p>
        <h2 className="text-xl font-extrabold text-slate-800">{run.period}</h2>
        <p className="text-sm text-slate-500">Pay Date: {run.payDate}</p>
      </div>

      <div className="flex items-center gap-0 bg-white rounded-3xl border border-slate-200 px-6 py-5 shadow-sm overflow-x-auto">
        {lifecycleSteps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 min-w-[70px]">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                i <= stepIdx ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300"
              }`}>{i <= stepIdx ? "✓" : i + 1}</div>
              <p className={`text-[9px] font-bold ${i <= stepIdx ? "text-emerald-600" : "text-slate-400"}`}>{step}</p>
            </div>
            {i < lifecycleSteps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 -mt-3 ${i < stepIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Gross Pay", run.gross],
          ["Deductions", run.deductions],
          ["Taxes", run.taxes],
          ["Employer Cont.", run.employerContribution],
          ["Net Pay", run.net],
        ].map(([label, val]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-extrabold text-slate-800">{val ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}