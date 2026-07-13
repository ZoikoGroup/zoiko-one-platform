import { useState, useEffect } from "react";
import { DollarSign, Users, Landmark, Building2, TrendingUp, Minus, Loader2 } from "lucide-react";
import { getDashboardSummary } from "../../../service/payrollService";

function fmtCurrency(n) {
  if (n == null) return "\u20b9 0";
  const v = Number(n);
  if (v >= 10000000) return `\u20b9 ${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20b9 ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20b9 ${(v / 1000).toFixed(0)}K`;
  return `\u20b9 ${v.toLocaleString("en-IN")}`;
}

export default function StatCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardSummary();
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm animate-pulse">
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-700" />
            <div className="mt-3 h-7 w-28 rounded bg-slate-100 dark:bg-slate-700" />
            <div className="mt-2 h-3 w-24 rounded bg-slate-50 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const changePct = data?.totalPayrollCostChangePct;
  const isUp = changePct != null && changePct > 0;
  const isStable = changePct == null || changePct === 0;

  const cards = [
    {
      key: "total",
      icon: DollarSign,
      label: "TOTAL PAYROLL (NET)",
      value: fmtCurrency(data?.totalNet ?? data?.totalPayrollCost),
      indicator: changePct != null ? `${isUp ? "+" : ""}${changePct}% vs last month` : "No prior data",
      indicatorColor: isStable ? "text-slate-500 dark:text-slate-400" : "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      key: "employees",
      icon: Users,
      label: "EMPLOYEES",
      value: String(data?.activeCount ?? 0),
      indicator: `${data?.headcount ?? 0} total \u00b7 ${data?.onLeaveCount ?? 0} on leave`,
      indicatorColor: "text-slate-500 dark:text-slate-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      key: "tax",
      icon: Landmark,
      label: "TAXES (THIS MONTH)",
      value: fmtCurrency(data?.totalTaxes),
      indicator: `${data?.pendingApprovals ?? 0} runs pending approval`,
      indicatorColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "gross",
      icon: Building2,
      label: "GROSS PAY (THIS MONTH)",
      value: fmtCurrency(data?.totalGross),
      indicator: "Before deductions",
      indicatorColor: "text-slate-500 dark:text-slate-400",
      iconBg: "bg-teal-50 dark:bg-teal-900/20",
      iconColor: "text-teal-500 dark:text-teal-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isStableCard = card.indicator.startsWith("No prior") || card.indicator.startsWith("Before");
        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {card.label}
              </p>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon size={18} className={card.iconColor} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
            <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${card.indicatorColor}`}>
              {isStableCard ? <Minus size={12} /> : <TrendingUp size={12} />}
              {card.indicator.replace(/^[+\u2191\u2014]\s*/, "")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
