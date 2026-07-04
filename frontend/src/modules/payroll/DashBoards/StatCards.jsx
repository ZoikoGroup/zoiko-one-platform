// StatCards.jsx
import { Wallet, Users, AlertTriangle } from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({ icon: Icon, label, value, sublabel, accent = "default" }) {
  const accentStyles = {
    default: "bg-slate-100 text-slate-600",
    warning: "bg-amber-100 text-amber-600",
    success: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

/**
 * StatCards
 * Displays three top-level payroll metrics.
 *
 * @param {Object} summaryData
 * @param {number} summaryData.totalPayrollCost
 * @param {number} [summaryData.totalPayrollCostChangePct]
 * @param {number} summaryData.headcount
 * @param {number} [summaryData.activeCount]
 * @param {number} [summaryData.onLeaveCount]
 * @param {number} summaryData.pendingApprovals
 */
export default function StatCards({ summaryData }) {
  if (!summaryData) return null;

  const {
    totalPayrollCost,
    totalPayrollCostChangePct,
    headcount,
    activeCount,
    onLeaveCount,
    pendingApprovals,
  } = summaryData;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={Wallet}
        label="Total payroll cost"
        value={formatCurrency(totalPayrollCost)}
        sublabel={
          typeof totalPayrollCostChangePct === "number"
            ? `${totalPayrollCostChangePct > 0 ? "+" : ""}${totalPayrollCostChangePct}% vs last month`
            : undefined
        }
        accent="default"
      />
      <StatCard
        icon={Users}
        label="Headcount"
        value={headcount}
        sublabel={
          activeCount != null && onLeaveCount != null
            ? `${activeCount} active, ${onLeaveCount} on leave`
            : undefined
        }
        accent="success"
      />
      <StatCard
        icon={AlertTriangle}
        label="Pending approvals"
        value={pendingApprovals}
        sublabel={pendingApprovals > 0 ? "Requires review" : "All caught up"}
        accent="warning"
      />
    </div>
  );
}