import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import { getDashboardBreakdowns } from "../../../service/payrollService";

const TEAL_PALETTE = ["#0D9488", "#14B8A6", "#5EEAD4", "#99F6E4", "#CCFBF1", "#2DD4BF", "#0F766E", "#A7F3D0"];
const DEDUCTION_MAX_PCT = 30;

function fmt(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `\u20b9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20b9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20b9${(v / 1000).toFixed(0)}K`;
  return `\u20b9${v.toLocaleString("en-IN")}`;
}

function SectionHeader({ title }) {
  return <h3 className="mb-4 text-sm font-bold text-slate-900">{title}</h3>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label || payload[0]?.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="text-xs font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {p.dataKey === "value" && payload[0]?.payload?.value != null && payload[0]?.payload?.amount != null
            ? `${p.value}% (${fmt(payload[0].payload.amount)})`
            : fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function BreakdownsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardBreakdowns();
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 w-28 rounded bg-slate-100 mb-4" />
            <div className="h-40 rounded bg-slate-50" />
          </div>
        ))}
      </div>
    );
  }

  const deptData = data?.byDepartment || [];
  const payTypeData = data?.payTypes || [];
  const deductions = data?.deductions || [];
  const deductionMax = Math.max(...deductions.map((d) => d.pct || 0), DEDUCTION_MAX_PCT);

  const hasData = deptData.length > 0 || payTypeData.length > 0 || deductions.length > 0;
  if (!hasData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-400 text-center py-10">No payslip data available for breakdowns. Complete a payroll run to see charts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {/* Department Donut */}
      {deptData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader title="By Department" />
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={TEAL_PALETTE[i % TEAL_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TEAL_PALETTE[i % TEAL_PALETTE.length] }} />
                  <span className="text-xs text-slate-600">{d.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-900">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay Type Breakdown */}
      {payTypeData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Pay Type Breakdown" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={payTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `\u20b9${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]} barSize={36}>
                {payTypeData.map((_, i) => (
                  <Cell key={i} fill={TEAL_PALETTE[i % TEAL_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Deductions Summary */}
      {deductions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Deductions Summary" />
          <div className="space-y-4">
            {deductions.map((d, i) => (
              <div key={d.name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-slate-600">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">{d.pct}%</span>
                    <span className="text-xs font-semibold text-slate-900">{fmt(d.total)}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(d.pct / deductionMax) * 100}%`,
                      background: TEAL_PALETTE[i % TEAL_PALETTE.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
