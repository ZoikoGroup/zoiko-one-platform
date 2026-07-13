import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Loader2 } from "lucide-react";
import { getDashboardTrend } from "../../../service/payrollService";

function fmt(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `\u20b9 ${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20b9 ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20b9 ${(v / 1000).toFixed(0)}K`;
  return `\u20b9 ${v.toLocaleString("en-IN")}`;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {right}
    </div>
  );
}

function PillToggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-md px-3 py-1 text-[11px] font-semibold transition ${
            value === opt.id
              ? "bg-teal-600 text-white"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default function CostTrendChart() {
  const [series, setSeries] = useState("both");
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardTrend();
        if (!cancelled) setTrendData(Array.isArray(res) ? res : []);
      } catch {
        if (!cancelled) setTrendData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showGross = series === "gross" || series === "both";
  const showNet = series === "net" || series === "both";

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <SectionHeader
        title="Payroll Cost Trend"
        right={
          <PillToggle
            options={[
              { id: "gross", label: "Gross" },
              { id: "net", label: "Net" },
              { id: "both", label: "Both" },
            ]}
            value={series}
            onChange={setSeries}
          />
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-teal-500" />
        </div>
      ) : trendData.length === 0 ? (
        <EmptyState message="No payroll trend data yet. Complete a payroll run to see trends." />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `\u20b9${(v / 1000).toFixed(0)}k`}
              width={55}
            />
            <Tooltip content={<ChartTooltip />} />
            {showGross && (
              <Line
                type="monotone"
                dataKey="gross"
                name="Gross"
                stroke="#0D9488"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#0D9488", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            )}
            {showNet && (
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="#5EEAD4"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#5EEAD4", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
