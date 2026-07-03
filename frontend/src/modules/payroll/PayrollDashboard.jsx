import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Zap,
} from "lucide-react";
import { usePayroll } from "./PayrollContext";

const recentActivities = [
  { action: "Payroll run PR-0042 created", time: "2h ago", color: "bg-blue-500" },
  { action: "3 exceptions flagged in Jun run", time: "4h ago", color: "bg-red-500" },
  { action: "Finance approved May payroll", time: "1d ago", color: "bg-emerald-500" },
  { action: "Bank details updated for EMP-0218", time: "2d ago", color: "bg-amber-500" },
  { action: "Payment batch PB-0019 completed", time: "3d ago", color: "bg-violet-500" },
];

const complianceAlerts = [
  { label: "TDS Q1 filing due in 18 days", severity: "warning" },
  { label: "PF contribution gap for 4 employees", severity: "error" },
  { label: "ESIC registration pending for new joiners", severity: "warning" },
];

const lifecycleSteps = ["Draft", "Review", "Approved", "Authorized", "Paid", "Closed"];

export default function PayrollDashboard() {
  const { employees, runs, exceptions, approvalStages } = usePayroll();

  const activeRun = runs[0] || {
    id: "PR-0042",
    period: "Jun 1–15, 2026",
    payDate: "2026-06-15",
    employees: employees.length,
    gross: "₹84,23,000",
    net: "₹63,18,000",
    status: "Review"
  };

  const activeExceptionsCount = exceptions.length;
  const hardExceptionsCount = exceptions.filter((e) => e.type === "hard").length;
  const pendingApprovalsCount = approvalStages.filter((s) => s.status === "pending").length;

  const statCards = [
    {
      label: "Current Pay Period",
      value: activeRun.period,
      sub: "Semi-monthly",
      icon: Calendar,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Total Employees",
      value: employees.length.toString(),
      sub: "+0 this period",
      icon: Users,
      color: "from-violet-500 to-indigo-500",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Upcoming Pay Date",
      value: activeRun.payDate,
      sub: "Next settlement",
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Payroll Cost",
      value: activeRun.gross,
      sub: "Active Run Estimated Gross",
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Pending Approvals",
      value: pendingApprovalsCount.toString(),
      sub: "Action required",
      icon: CheckCircle2,
      color: "from-pink-500 to-rose-500",
      bg: "bg-pink-50",
      border: "border-pink-100",
    },
    {
      label: "Open Exceptions",
      value: activeExceptionsCount.toString(),
      sub: `${hardExceptionsCount} hard blocks`,
      icon: AlertTriangle,
      color: "from-red-500 to-orange-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
  ];

  // Dynamic run step matching
  const currentStatus = activeRun.status;
  const stepIndex = lifecycleSteps.indexOf(currentStatus);
  const payrollRunStatus = lifecycleSteps.map((step, index) => {
    return {
      step,
      done: index < stepIndex,
      current: index === stepIndex,
    };
  });

  const readinessScore = Math.max(20, 100 - activeExceptionsCount * 10);

  return (
    <div className="p-6 space-y-6 bg-transparent text-slate-800">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-850">Zoiko Payroll</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Payroll Operating Center — June 2026
            </p>
          </div>
        </div>
        <p className="text-slate-600 max-w-2xl mt-3">
          Manage governed payroll workflows, approvals, compliance, and payments from one
          unified platform.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} ${card.border} border rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-200`}
          >
            <div
              className={`h-12 w-12 flex-shrink-0 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}
            >
              <card.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-xl font-extrabold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Payroll Run Status */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">
              Payroll Run Status — PR-0042
            </h2>
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
              In Review
            </span>
          </div>
          <div className="flex items-center gap-0">
            {payrollRunStatus.map((step, i) => (
              <div key={step.step} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      step.done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : step.current
                        ? "bg-white border-amber-400 text-amber-600 shadow-md"
                        : "bg-white border-slate-200 text-slate-300"
                    }`}
                  >
                    {step.done ? "✓" : i + 1}
                  </div>
                  <p
                    className={`text-[10px] font-semibold text-center ${
                      step.done
                        ? "text-emerald-600"
                        : step.current
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {step.step}
                  </p>
                </div>
                {i < payrollRunStatus.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 ${
                      step.done ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Payroll Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Gross Pay", value: "₹84.2L" },
              { label: "Deductions", value: "₹12.4L" },
              { label: "Taxes", value: "₹8.6L" },
              { label: "Employer Cont.", value: "₹9.1L" },
              { label: "Net Pay", value: "₹63.2L" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-50 rounded-2xl border border-slate-100 p-3 text-center"
              >
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Readiness Score */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={18} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800">Readiness Score</h2>
          </div>
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray={`${readinessScore} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-800">{readinessScore}%</span>
                <span className="text-[10px] text-slate-400">Ready</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: "Employee data complete", ok: employees.every((e) => e.ready || e.status === "On Leave") },
              { label: "Tax IDs verified", ok: !exceptions.some((exc) => exc.id === "EXC-001") },
              { label: "Bank details validated", ok: !exceptions.some((exc) => exc.id === "EXC-002") },
              { label: "Exceptions resolved", ok: exceptions.filter((exc) => exc.type === "hard").length === 0 },
              { label: "Funding confirmed", ok: activeRun.status === "Authorized" || activeRun.status === "Paid" || activeRun.status === "Closed" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.ok ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                  }`}
                >
                  {item.ok ? "✓" : "✗"}
                </div>
                <span className={item.ok ? "text-slate-600" : "text-slate-400"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-blue-500" />
            <h2 className="text-lg font-bold text-slate-800">Recent Activities</h2>
          </div>
          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.action}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
              >
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${act.color}`} />
                <p className="text-sm text-slate-700 flex-1">{act.action}</p>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Compliance Alerts</h2>
          </div>
          <div className="space-y-3">
            {complianceAlerts.map((alert) => (
              <div
                key={alert.label}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${
                  alert.severity === "error"
                    ? "bg-red-50 border-red-100 text-red-700"
                    : "bg-amber-50 border-amber-100 text-amber-700"
                }`}
              >
                <AlertTriangle
                  size={14}
                  className={`flex-shrink-0 mt-0.5 ${
                    alert.severity === "error" ? "text-red-500" : "text-amber-500"
                  }`}
                />
                {alert.label}
              </div>
            ))}

            {/* Variance Alerts */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Variance Alerts</p>
              {[
                { emp: "Riya Sharma", change: "+18%", dir: "up" },
                { emp: "Karan Mehta", change: "-22%", dir: "down" },
              ].map((v) => (
                <div
                  key={v.emp}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                >
                  {v.dir === "up" ? (
                    <ArrowUpRight size={14} className="text-emerald-500" />
                  ) : (
                    <ArrowDownRight size={14} className="text-red-500" />
                  )}
                  <span className="text-slate-700 flex-1">{v.emp}</span>
                  <span
                    className={`font-semibold ${
                      v.dir === "up" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {v.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
