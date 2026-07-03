// ─────────────────────────────────────────────────────────────────────────────
// PayrollRuns.jsx
// Zoiko Payroll — Run Management.
// Covers the full payroll run lifecycle: list view, run creation wizard,
// run detail with employee grid, exception center, approval workflow,
// and ZoikoPay-integrated payment release.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  PlayCircle, Plus, ChevronRight, CheckCircle2, Clock, AlertCircle,
  AlertTriangle, RefreshCw, CreditCard, Shield, X, User,
} from "lucide-react";
import { usePayroll } from "./PayrollContext";

// ── Shared constants ───────────────────────────────────────────────────────────

const lifecycleSteps = ["Draft","Review","Approved","Authorized","Paid","Closed"];

const statusConfig = {
  Draft:      { color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400"   },
  Review:     { color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500"   },
  Approved:   { color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"    },
  Authorized: { color: "bg-violet-100 text-violet-700", dot: "bg-violet-500"  },
  Paid:       { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Closed:     { color: "bg-slate-200 text-slate-500",   dot: "bg-slate-400"   },
};

const paymentStatusConfig = {
  Pending:    { color: "bg-amber-100 text-amber-700",   icon: Clock        },
  Processing: { color: "bg-blue-100 text-blue-700",     icon: RefreshCw    },
  Paid:       { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  Failed:     { color: "bg-red-100 text-red-700",       icon: AlertCircle  },
  Reversed:   { color: "bg-slate-100 text-slate-500",   icon: RefreshCw    },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-VIEW: Exception Center
// ─────────────────────────────────────────────────────────────────────────────
function ExceptionCenter({ onProceed }) {
  const { exceptions, resolveException, runs, setRuns, addToast } = usePayroll();
  const hardBlocks  = exceptions.filter((e) => e.type === "hard");
  const warnings    = exceptions.filter((e) => e.type === "warning");

  const handleProceed = () => {
    if (runs[0]) setRuns((prev) => prev.map((r, i) => i === 0 ? { ...r, status: "Review" } : r));
    addToast("Exceptions cleared — run moved to Review. Proceed to Approvals.", "success");
    if (onProceed) onProceed();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border border-red-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <AlertTriangle size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Exception Center</h2>
            <p className="text-slate-500 text-sm">{hardBlocks.length} hard blocks · {warnings.length} warnings</p>
          </div>
        </div>
        {hardBlocks.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-100 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">
            <AlertCircle size={15} /> Payroll is blocked. Resolve all hard exceptions before proceeding to Approvals.
          </div>
        )}
      </div>

      {/* Hard Blocks */}
      <Section label="Hard Blocks — Payroll Stopped" count={hardBlocks.length} dotColor="bg-red-500">
        {hardBlocks.length === 0
          ? <ClearBanner label="All hard blocks resolved!" />
          : hardBlocks.map((block) => (
            <ExceptionCard key={block.id} item={block} onAction={() => resolveException(block.id)} actionLabel="Fix & Recalculate" hard />
          ))}
      </Section>

      {/* Warnings */}
      <Section label="Warnings — Review Required" count={warnings.length} dotColor="bg-amber-500">
        {warnings.length === 0
          ? <ClearBanner label="All warnings reviewed!" />
          : warnings.map((warn) => (
            <ExceptionCard key={warn.id} item={warn} onAction={() => resolveException(warn.id)} actionLabel="Acknowledge" />
          ))}
      </Section>

      {/* Proceed panel */}
      {hardBlocks.length === 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-800">All Exceptions Resolved</p>
          <p className="text-sm text-slate-500 mt-1">Payroll is ready for the Approvals stage.</p>
          <button onClick={handleProceed}
            className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg transition-all">
            Proceed to Approvals →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-VIEW: Approval Workflow
// ─────────────────────────────────────────────────────────────────────────────
function ApprovalWorkflow() {
  const { approvalStages, approveStage, exceptions, runs, addToast } = usePayroll();
  const activeRun = runs[0] || { id: "PR-0042", period: "Jun 1–15, 2026", payDate: "2026-06-15",
    employees: 1248, gross: "₹84,23,000", net: "₹63,18,000", status: "Review" };
  const allDone = approvalStages.every((s) => s.status === "done");

  const handleApprove = (idx) => {
    const hardBlocks = exceptions.filter((e) => e.type === "hard");
    if (hardBlocks.length > 0) {
      addToast("Approvals are blocked — unresolved hard exceptions exist. Fix them first.", "error");
      return;
    }
    approveStage(idx);
  };

  const summaryRows = [
    { label: "Run ID",                 val: activeRun.id        },
    { label: "Pay Period",             val: activeRun.period    },
    { label: "Pay Date",               val: activeRun.payDate   },
    { label: "Employees Evaluated",    val: activeRun.employees },
    { label: "Gross Payroll Cost",     val: activeRun.gross     },
    { label: "Total Deductions",       val: "₹12,40,000"        },
    { label: "Total Tax Liability",    val: "₹8,65,000"         },
    { label: "Employer Contributions", val: "₹9,10,000"         },
    { label: "Net Payout Amount",      val: activeRun.net       },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <CheckCircle2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Approvals — {activeRun.id}</h2>
            <p className="text-slate-500 text-sm">Dual-control governed approval workflow (Zoiko Workflow)</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-2 text-xs text-blue-700 font-semibold w-fit">
          <Shield size={12} /> The same user cannot complete all approval stages. Dual control is mandatory.
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Payroll Summary (read-only) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Payroll Summary (Read-only)</h3>
          <div className="space-y-2">
            {summaryRows.map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                <span className="text-slate-400 font-medium">{item.label}</span>
                <span className="font-semibold text-slate-800">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Chain */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-5">Approval Chain</h3>
          <div className="space-y-4">
            {approvalStages.map((stage, i) => (
              <div key={stage.role} className={`rounded-2xl border p-4 transition-all duration-200 ${
                stage.status === "done"    ? "bg-emerald-50 border-emerald-200"
                : stage.status === "pending" ? "bg-blue-50 border-blue-200 animate-pulse"
                : "bg-slate-50 border-slate-200 opacity-60"
              }`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      stage.status === "done" ? "bg-emerald-500" : stage.status === "pending" ? "bg-blue-500" : "bg-slate-300"
                    }`}>
                      {stage.status === "done" ? <CheckCircle2 size={16} className="text-white" />
                        : stage.status === "pending" ? <Clock size={16} className="text-white" />
                        : <User size={16} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{stage.role}</p>
                      <p className="text-sm font-bold text-slate-800">{stage.person}</p>
                      {stage.time && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{stage.time}</p>}
                    </div>
                  </div>
                  {stage.status === "pending" && (
                    <button onClick={() => handleApprove(i)}
                      className="rounded-xl bg-blue-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-blue-700 transition shadow">
                      {stage.action}
                    </button>
                  )}
                  {stage.status === "done"   && <span className="text-xs text-emerald-600 font-bold">✓ Done</span>}
                  {stage.status === "locked" && <span className="text-xs text-slate-400 font-semibold">Locked</span>}
                </div>
              </div>
            ))}
          </div>
          {allDone && (
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white text-center shadow-lg">
              <CheckCircle2 size={24} className="mx-auto mb-2" />
              <p className="font-bold">Payroll Fully Approved</p>
              <p className="text-xs opacity-90 mt-1">Go to Payments to release funds via ZoikoPay.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-VIEW: Payment Release (ZoikoPay integration point)
// ─────────────────────────────────────────────────────────────────────────────
function PaymentRelease() {
  const { paymentBatches, releasePayments, runs, addToast } = usePayroll();
  const activeRun   = runs[0] || { id: "PR-0042", status: "Review", gross: "₹84,23,000", net: "₹63,18,000" };
  const activeBatch = paymentBatches[0] || { id: "PB-0042", run: "PR-0042", employees: 1248, amount: "₹63,18,000", status: "Pending" };
  const isAuthorized = ["Authorized","Paid","Closed"].includes(activeRun.status);

  const handleRelease = () => {
    if (!isAuthorized) {
      addToast(`Release blocked — ${activeRun.id} must be 'Authorized' before payment. Complete the approval chain first.`, "error");
      return;
    }
    if (activeBatch.status !== "Pending") {
      addToast(`Batch is already '${activeBatch.status}'.`, "info");
      return;
    }
    releasePayments(activeBatch.id);
  };

  const fundingChecks = [
    { label: "Available Corporate Funds", val: "₹1,24,50,000", ok: true,         sub: "HDFC Bank ****4821" },
    { label: "Required Payout Funds",     val: activeRun.net,  ok: true,         sub: `${activeRun.id} Net Pay` },
    { label: "Authorization Status",      val: isAuthorized ? "Authorized" : "Blocked", ok: isAuthorized,
      sub: isAuthorized ? "Ready to release via ZoikoPay" : "Awaiting full approval chain" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent border border-cyan-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg">
            <CreditCard size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800">Payments</h2>
            <p className="text-slate-500 text-sm">ZoikoPay-integrated payment batches · Settlement & disbursement</p>
          </div>
        </div>
      </div>

      {/* Funding verification */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Funding Verification — {activeRun.id}</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {fundingChecks.map((item) => (
            <div key={item.label} className={`rounded-2xl border p-4 ${item.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{item.val}</p>
              <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
              {item.ok ? <CheckCircle2 size={15} className="text-emerald-500 mt-2" /> : <AlertCircle size={15} className="text-red-500 mt-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Payment batches table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Payment Batches</h3>
          {activeBatch.status === "Pending" && (
            <button onClick={handleRelease}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold text-white shadow transition-all ${
                isAuthorized ? "bg-gradient-to-r from-cyan-500 to-teal-500 hover:shadow-md hover:scale-[1.02]"
                : "bg-slate-300 cursor-not-allowed opacity-60"
              }`}>
              Release via ZoikoPay
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Batch ID","Payroll Run","Employees","Total Amount","Created","Status"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paymentBatches.map((batch) => {
              const sc   = paymentStatusConfig[batch.status] || paymentStatusConfig.Pending;
              const Icon = sc.icon;
              return (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">{batch.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{batch.run}</td>
                  <td className="px-5 py-4 text-slate-700">{batch.employees.toLocaleString()}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">{batch.amount}</td>
                  <td className="px-5 py-4 text-slate-500">{batch.created}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.color}`}>
                      <Icon size={11} className={batch.status === "Processing" ? "animate-spin" : ""} />
                      {batch.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function Section({ label, count, dotColor, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
        <h3 className="text-base font-bold text-slate-800">{label}</h3>
        <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${dotColor === "bg-red-500" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ClearBanner({ label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700">
      <CheckCircle2 size={15} /> {label}
    </div>
  );
}

function ExceptionCard({ item, onAction, actionLabel, hard }) {
  return (
    <div className={`flex items-start gap-4 rounded-2xl border p-5 ${hard ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${hard ? "bg-red-100" : "bg-amber-100"}`}>
        {hard ? <AlertCircle size={16} className="text-red-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-mono text-xs font-bold ${hard ? "text-red-400" : "text-amber-400"}`}>{item.id}</span>
          <span className="font-bold text-slate-800 text-sm">{item.employee}</span>
        </div>
        <p className={`text-sm font-semibold ${hard ? "text-red-700" : "text-amber-700"}`}>{item.issue}</p>
        <p className={`text-xs mt-0.5 ${hard ? "text-red-500" : "text-amber-500"}`}>{item.impact}</p>
      </div>
      <button onClick={onAction}
        className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
          hard ? "bg-red-600 text-white hover:bg-red-700" : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
        }`}>
        <RefreshCw size={12} /> {actionLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: PayrollRuns — list, create wizard, run detail, and sub-tabs
// ─────────────────────────────────────────────────────────────────────────────
export default function PayrollRuns() {
  const { runs, employees, exceptions, createRunDraft, addToast } = usePayroll();

  // Main view state: "list" | "create" | "detail"
  const [view,        setView]        = useState("list");
  const [selectedRun, setSelectedRun] = useState(null);

  // Sub-tab within run detail
  const [detailTab, setDetailTab] = useState("grid"); // "grid" | "exceptions" | "approvals" | "payments"

  // Create wizard state
  const [createStep, setCreateStep]   = useState(0);
  const [schedule,   setSchedule]     = useState("semi-monthly");
  const [periodStart,setPeriodStart]  = useState("2026-06-16");
  const [periodEnd,  setPeriodEnd]    = useState("2026-06-30");
  const [payDate,    setPayDate]      = useState("2026-06-30");
  const [timeSynced, setTimeSynced]   = useState(false);
  const [syncing,    setSyncing]      = useState(false);

  const createSteps = ["Select Schedule","Select Period","Import Time Data","Validate Employees","Create Draft"];

  const handleSyncTime = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setTimeSynced(true); addToast("Attendance records synced from ZoikoTime!", "success"); }, 1500);
  };

  const handleCreateDraft = () => {
    const periodText = `${new Date(periodStart).toLocaleDateString("en-US",{month:"short",day:"numeric"})}–${new Date(periodEnd).toLocaleDateString("en-US",{day:"numeric",year:"numeric"})}`;
    createRunDraft(schedule, periodText, payDate);
    setView("list"); setCreateStep(0); setTimeSynced(false);
  };

  // ── List view ────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <div className="p-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <PlayCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Runs</h1>
            <p className="text-slate-500 text-sm">{runs.length} total runs · Click any run to view detail</p>
          </div>
        </div>
        <button onClick={() => { setView("create"); setCreateStep(0); }}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg hover:scale-[1.02] transition-all">
          <Plus size={15} /> Create Run
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Run ID","Pay Period","Pay Date","Employees","Gross Pay","Net Pay","Status",""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {runs.map((run) => {
              const sc = statusConfig[run.status] || statusConfig.Draft;
              return (
                <tr key={run.id} onClick={() => { setSelectedRun(run); setDetailTab("grid"); setView("detail"); }}
                  className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-slate-500 font-semibold">{run.id}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">{run.period}</td>
                  <td className="px-5 py-4 text-slate-600">{run.payDate}</td>
                  <td className="px-5 py-4 text-slate-700">{run.employees.toLocaleString()}</td>
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
    </div>
  );

  // ── Create wizard view ───────────────────────────────────────────────────────
  if (view === "create") return (
    <div className="p-6 space-y-6">
      <button onClick={() => setView("list")} className="text-sm text-slate-500 hover:text-slate-700 font-medium">← Back to Runs</button>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-7">
        <h1 className="text-2xl font-extrabold text-slate-800">Create Payroll Run</h1>
        <p className="text-slate-500 text-sm mt-1">5-step wizard to generate a new governed payroll draft</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 overflow-x-auto py-2">
        {createSteps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 min-w-[110px]">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <button onClick={() => i <= createStep && setCreateStep(i)}
                className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  i < createStep ? "bg-emerald-500 border-emerald-500 text-white"
                  : i === createStep ? "bg-white border-emerald-400 text-emerald-600 shadow-md"
                  : "bg-white border-slate-200 text-slate-300"
                }`}>
                {i < createStep ? "✓" : i + 1}
              </button>
              <p className={`text-[10px] font-medium text-center leading-tight max-w-[90px] ${i <= createStep ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>{step}</p>
            </div>
            {i < createSteps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 ${i < createStep ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step panels */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[200px]">
        {createStep === 0 && (
          <div className="space-y-3">
            <p className="font-semibold text-slate-700 mb-3">Select Pay Schedule</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["Weekly","Biweekly","Semi-monthly","Monthly"].map((s) => (
                <button key={s} onClick={() => setSchedule(s.toLowerCase())}
                  className={`rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all ${
                    schedule === s.toLowerCase() ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {createStep === 1 && (
          <div>
            <p className="font-semibold text-slate-700 mb-4">Select Pay Period</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[["Period Start",periodStart,setPeriodStart],["Period End",periodEnd,setPeriodEnd],["Pay Date",payDate,setPayDate]].map(([label,val,setter]) => (
                <div key={label}>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">{label}</label>
                  <input type="date" value={val} onChange={(e) => setter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        )}
        {createStep === 2 && (
          <div className="space-y-4">
            <p className="font-semibold text-slate-700">Import Time & Attendance from ZoikoTime</p>
            <div className={`rounded-2xl border p-5 flex items-center justify-between ${timeSynced ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{timeSynced ? "ZoikoTime Sync Complete" : "ZoikoTime Integration"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{timeSynced ? `${employees.length} employees · Attendance records imported` : "Pull approved hours, overtime, and attendance records"}</p>
              </div>
              {timeSynced ? <CheckCircle2 size={20} className="text-emerald-500" />
                : <button onClick={handleSyncTime} disabled={syncing}
                    className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-700 transition">
                    {syncing ? "Syncing…" : "Sync Now"}
                  </button>}
            </div>
          </div>
        )}
        {createStep === 3 && (
          <div>
            <p className="font-semibold text-slate-700 mb-4">Employee Validation — {employees.length} employees</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                <p className="text-2xl font-extrabold text-emerald-700">{employees.filter(e=>e.ready).length}</p>
                <p className="text-xs text-emerald-600 mt-1">Ready</p>
              </div>
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
                <p className="text-2xl font-extrabold text-red-700">{employees.filter(e=>!e.ready).length}</p>
                <p className="text-xs text-red-600 mt-1">Blocked</p>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-700">{exceptions.filter(e=>e.type==="hard").length}</p>
                <p className="text-xs text-amber-600 mt-1">Hard Exceptions</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Review exceptions on the Exceptions tab before approving the run.</p>
          </div>
        )}
        {createStep === 4 && (
          <div className="space-y-4">
            <p className="font-semibold text-slate-700">Confirm & Create Draft</p>
            <div className="space-y-2 text-sm">
              {[["Schedule",schedule],["Period",`${periodStart} → ${periodEnd}`],["Pay Date",payDate],["Employees",employees.length]].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-semibold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={handleCreateDraft}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow hover:shadow-lg transition-all">
              Create Payroll Draft
            </button>
          </div>
        )}
      </div>

      {/* Wizard nav */}
      <div className="flex justify-between">
        <button onClick={() => setCreateStep((s) => Math.max(0, s - 1))} disabled={createStep === 0}
          className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          ← Previous
        </button>
        {createStep < createSteps.length - 1 && (
          <button onClick={() => setCreateStep((s) => Math.min(createSteps.length - 1, s + 1))}
            className="rounded-2xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition">
            Next →
          </button>
        )}
      </div>
    </div>
  );

  // ── Run detail view ──────────────────────────────────────────────────────────
  const run      = selectedRun;
  const stepIdx  = lifecycleSteps.indexOf(run.status);
  const detailTabs = [
    { key: "grid",       label: "Employee Grid"    },
    { key: "exceptions", label: "Exceptions"       },
    { key: "approvals",  label: "Approvals"        },
    { key: "payments",   label: "Payments"         },
  ];

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => setView("list")} className="text-sm text-slate-500 hover:text-slate-700 font-semibold">← All Runs</button>

      {/* Run header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-500 font-mono font-bold">{run.id}</p>
          <h2 className="text-xl font-extrabold text-slate-800">{run.period}</h2>
          <p className="text-sm text-slate-500">Pay Date: {run.payDate}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-xs font-extrabold ${statusConfig[run.status]?.color}`}>{run.status}</span>
      </div>

      {/* Lifecycle bar */}
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[["Gross Pay",run.gross],["Deductions","₹12,40,000"],["Taxes","₹8,65,000"],["Employer Cont.","₹9,10,000"],["Net Pay",run.net]].map(([label,val]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-extrabold text-slate-800">{val}</p>
          </div>
        ))}
      </div>

      {/* Sub-tab strip */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap">
        {detailTabs.map((t) => (
          <button key={t.key} onClick={() => setDetailTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${detailTab === t.key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {detailTab === "grid" && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Employee Payroll Grid</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Employee","Gross Salary","TDS (10%)","PF + ESI + PT","Net Pay","Variance"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {employees.map((emp) => {
                const gross = emp.salary;
                const tds   = Math.round(gross * 0.1);
                const pf    = Math.round(gross * 0.4 * 0.12);
                const esi   = Math.round(gross * 0.0075);
                const ded   = pf + esi + 200;
                const net   = gross - (tds + ded);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      <div>{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.id}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">₹{gross.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-700">₹{tds.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-700">₹{ded.toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">₹{net.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold ${emp.status === "On Leave" ? "text-red-500" : "text-emerald-600"}`}>
                        {emp.status === "On Leave" ? "-1.5%" : "+0.8%"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailTab === "exceptions" && <ExceptionCenter onProceed={() => setDetailTab("approvals")} />}
      {detailTab === "approvals"  && <ApprovalWorkflow />}
      {detailTab === "payments"   && <PaymentRelease />}
    </div>
  );
}