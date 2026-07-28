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
import { Loader2, CalendarCheck } from "lucide-react";
import { getDashboardBreakdowns, getDashboardSummary } from "../../../service/payrollService";

const DEPT_COLORS = ["#19C58A", "#35B6F5", "#F8A60A", "#9D7BF2", "#FF6E86", "#06B6D4", "#F97316", "#8B5CF6"];
const BAR_COLORS = ["#19C58A", "#35B6F5", "#F8A60A", "#9D7BF2", "#FF6E86"];
const DEDUCTION_COLORS = ["#35B6F5", "#9D7BF2", "#F8A60A", "#FF6E86", "#19C58A", "#06B6D4"];
const DEDUCTION_MAX_PCT = 30;

function fmt(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `\u20b9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20b9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20b9${(v / 1000).toFixed(0)}K`;
  return `\u20b9${v.toLocaleString("en-IN")}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[14px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9E9690]">{label || payload[0]?.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: p.color || p.fill }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: {p.dataKey === "value" && payload[0]?.payload?.value != null && payload[0]?.payload?.amount != null
            ? `${p.value}% (${fmt(payload[0].payload.amount)})`
            : fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function BreakdownsChart({ filter, refreshTick }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [breakdowns, summaryData] = await Promise.all([
          getDashboardBreakdowns(filter),
          getDashboardSummary(filter),
        ]);
        if (!cancelled) {
          setData(breakdowns);
          setSummary(summaryData);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter?.year, filter?.month, refreshTick]);

  if (loading) {
    return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[18px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse">
            <div className="h-4 w-28 rounded-md bg-[#F0EDE8] dark:bg-[#38312D] mb-5" />
            <div className="h-44 rounded-xl bg-[#F0EDE8] dark:bg-[#38312D]/50" />
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
  if (!hasData && !summary?.totalAttendanceDeduction) {
    return (
      <div className="rounded-[18px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-[13px] text-[#9E9690] text-center py-12 font-medium">No payslip data available for breakdowns. Complete a payroll run to see charts.</p>
      </div>
    );
  }

  const panels = [];
  if (deptData.length > 0) panels.push("dept");
  if (payTypeData.length > 0) panels.push("paytype");
  panels.push("deductions");

  const gridCols = panels.length >= 3 ? "md:grid-cols-3" : panels.length === 2 ? "md:grid-cols-2" : "";

  return (
      <div className={`grid grid-cols-1 gap-6 ${gridCols}`}>
      {/* Department Donut */}
      {deptData.length > 0 && (
        <div className="rounded-[18px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="mb-5 text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">By Department</h3>
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2.5">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  <span className="text-[12px] font-medium text-[#6B6560] dark:text-[#A69B93]">{d.name}</span>
                </div>
                <span className="text-[12px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay Type Breakdown */}
      {payTypeData.length > 0 && (
        <div className="rounded-[18px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="mb-5 text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Pay Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#9E9690", fontWeight: 500 }}
                axisLine={{ stroke: "#E5E0D9" }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9E9690", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `\u20b9${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]} barSize={40}>
                {payTypeData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Deduction Summary */}
      <div className="rounded-[18px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="mb-5 text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Deduction Summary</h3>
        {summary?.totalAttendanceDeduction != null && Number(summary.totalAttendanceDeduction) > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-[12px] bg-[#FF6E86]/5 border border-[#FF6E86]/15 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6E86]/10">
              <CalendarCheck size={14} className="text-[#FF6E86]" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Attendance Deduction</p>
              <p className="text-[14px] font-extrabold text-[#FF6E86]">{fmt(Number(summary.totalAttendanceDeduction))}</p>
            </div>
          </div>
        )}
        {deductions.length > 0 ? (
          <div className="space-y-5">
            {deductions.map((d, i) => (
              <div key={d.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#6B6560] dark:text-[#A69B93]">{d.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#9E9690]">{d.pct}%</span>
                    <span className="text-[12px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{fmt(d.total)}</span>
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0EDE8] dark:bg-[#38312D]">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(d.pct / deductionMax) * 100}%`,
                      background: DEDUCTION_COLORS[i % DEDUCTION_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#9E9690] text-center py-4 font-medium">No deduction data for this period.</p>
        )}
      </div>
    </div>
  );
}
