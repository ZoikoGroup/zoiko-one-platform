import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Loader2,
} from "lucide-react";
import RunsTable from "./RunsTable";
import ApproveRunButton from "./ApproveRunButton";

function Step1Configure({ config, setConfig, onNext }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-800">Configure Payroll Run</h2>
        <p className="text-xs text-slate-500 mt-0.5">Set the pay period and verify parameters</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "PAY PERIOD START", value: config.periodStart, key: "periodStart", icon: Calendar, type: "date" },
          { label: "PAY PERIOD END", value: config.periodEnd, key: "periodEnd", icon: Calendar, type: "date" },
          { label: "PAY DATE", value: config.payDate, key: "payDate", icon: Calendar, type: "date" },
          { label: "PAY SCHEDULE", value: config.schedule, key: "schedule", icon: Clock, type: "select", options: ["Monthly", "Bi-Weekly", "Weekly", "Semi-Monthly"] },
        ].map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">{field.label}</label>
              <div className="relative">
                <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {field.type === "select" ? (
                  <div className="relative">
                    <select value={field.value} onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:outline-none                 focus:ring-2 focus:ring-teal-400 appearance-none cursor-pointer">
                      {field.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                ) : (
                  <input type="date" value={field.value} onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none                 focus:ring-2 focus:ring-teal-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-3">
          <Info size={15} className="text-amber-500" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Pre-run Validation</p>
            <p className="text-[11px] text-amber-600">Calculations will use the server-side tax engine (preview = persisted).</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-0.5 text-[10px] font-bold text-teal-700">✓ Ready</span>
      </div>
      <div className="flex justify-end">
        <button onClick={onNext} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-700 hover:scale-[1.02] shadow-lg shadow-teal-600/25">
          Calculate Payroll <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Step2Review({ employees, selectedEmployees, previewData, totals, loading, onNext, onBack, onRecalculate, onLoadPreview, fmtCurrency }) {
  const enrichedEmployees = useMemo(() => {
    if (previewData?.employees) {
      return previewData.employees
        .filter((e) => selectedEmployees.includes(e.employeeId))
        .map((e) => ({
          id: e.employeeId,
          name: e.employeeName,
          department: e.department,
          attendanceStatus: e.attendanceStatus,
          monthlyGross: e.monthlyGross,
          monthlyTax: e.monthlyTax,
          monthlyContributions: e.monthlyContributions,
          monthlyNet: e.monthlyNet,
          taxSlabRate: e.taxSlabRate,
          contribComponents: [
            { id: "pf", label: "PF", value: e.monthlyPf },
            { id: "esi", label: "ESI", value: e.monthlyEsi },
            { id: "pt", label: "PT", value: e.monthlyPt },
          ].filter((c) => c.value > 0),
          monthlyExtra: 0,
        }));
    }
    return employees
      .filter((e) => selectedEmployees.includes(e.id))
      .map((emp) => ({
        ...emp,
        monthlyGross: Number(emp.ctc) / 12,
        monthlyTax: 0,
        monthlyContributions: 0,
        monthlyNet: Number(emp.ctc) / 12,
        taxSlabRate: "—",
        contribComponents: [],
        monthlyExtra: 0,
      }));
  }, [employees, selectedEmployees, previewData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Review Calculations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Server-side preview — what you approve is exactly what gets persisted</p>
        </div>
        {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Loading...</div>}
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Employees", value: totals.count, accent: "text-slate-800" },
          { label: "Total Gross", value: fmtCurrency(totals.totalGross), accent: "text-teal-600" },
          { label: "Total Taxes", value: fmtCurrency(totals.totalTax), accent: "text-red-500" },
          { label: "Total Contributions", value: fmtCurrency(totals.totalContributions), accent: "text-amber-600" },
          { label: "Total Net Pay", value: fmtCurrency(totals.totalNet), accent: "text-sky-600" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{m.label}</p>
            <p className={`mt-1 text-base font-extrabold ${m.accent} min-w-0 whitespace-nowrap overflow-hidden text-ellipsis`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <RunsTable employees={enrichedEmployees} selectedEmployees={selectedEmployees} toggleEmployee={() => {}} toggleAllEmployees={() => {}} isWizardMode={true} fmtCurrency={fmtCurrency} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onRecalculate} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
            <RefreshCw size={14} /> {loading ? "Refreshing…" : "Recalculate"}
          </button>
          <button onClick={onNext} disabled={loading || totals.count === 0} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-700 hover:scale-[1.02] shadow-lg shadow-teal-600/25 disabled:opacity-50">
            Approve & Continue <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Step3Approve({ config, totals, onBack, fmtCurrency, runId }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-800">Final Approval</h2>
        <p className="text-xs text-slate-500 mt-0.5">Authorize the payroll run for processing</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm">
        {[
          { label: "Pay Period", value: config.periodStart && config.periodEnd ? `${config.periodStart} – ${config.periodEnd}` : "—" },
          { label: "Pay Date", value: config.payDate || "—" },
          { label: "Total Employees", value: String(totals.count) },
          { label: "Total Gross Pay", value: fmtCurrency(totals.totalGross), accent: "text-teal-600" },
          { label: "Total Taxes", value: fmtCurrency(totals.totalTax), accent: "text-red-500" },
          { label: "Total Contributions", value: fmtCurrency(totals.totalContributions), accent: "text-amber-600" },
          { label: "Total Net Pay", value: fmtCurrency(totals.totalNet), accent: "text-sky-600" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-500">{row.label}</span>
            <span className={`text-sm font-bold ${row.accent || "text-slate-800"}`}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-bold text-amber-700">Irreversible Action</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Once submitted, this payroll run cannot be cancelled. Funds will be transferred to employee bank accounts on the scheduled pay date.</p>
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer group">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
        <span className="text-sm font-medium text-slate-700">I confirm all payroll calculations are accurate and authorize this disbursement</span>
      </label>
      <div className="flex items-center justify-between pt-1">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
          <ArrowLeft size={14} /> Back
        </button>
        <ApproveRunButton runId={runId} disabled={!confirmed || !runId} className={!confirmed ? "pointer-events-none" : ""} />
      </div>
    </div>
  );
}

export default function RunDetailPage({ step, config, setConfig, employees, selectedEmployees, previewData, totals, loading, onNext, onBack, onRecalculate, onLoadPreview, fmtCurrency, runId }) {
  useEffect(() => {
    if (step === 2 && selectedEmployees.length > 0 && !previewData) {
      onLoadPreview(selectedEmployees);
    }
  }, [step, selectedEmployees, previewData, onLoadPreview]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {step === 1 && <Step1Configure config={config} setConfig={setConfig} onNext={onNext} />}
      {step === 2 && <Step2Review employees={employees} selectedEmployees={selectedEmployees} previewData={previewData} totals={totals} loading={loading} onNext={onNext} onBack={onBack} onRecalculate={onRecalculate} onLoadPreview={onLoadPreview} fmtCurrency={fmtCurrency} />}
      {step === 3 && <Step3Approve config={config} totals={totals} onBack={onBack} fmtCurrency={fmtCurrency} runId={runId} />}
      {step === 4 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 mb-3">
            <CheckCircle2 size={28} className="text-teal-600" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">Payroll Run Complete</h2>
          <p className="text-xs text-slate-500 mt-1">{totals.count} employees have been processed. Funds will be transferred on the scheduled pay date.</p>
        </div>
      )}
    </div>
  );
}
