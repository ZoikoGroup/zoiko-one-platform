 // CostTrendChart.jsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatCurrencyCompact(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatCurrencyFull(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {formatCurrencyFull(payload[0].value)}
      </p>
    </div>
  );
}

/**
 * CostTrendChart
 * Renders a responsive monthly payroll cost bar chart.
 *
 * @param {Object} props
 * @param {Array<{month: string, cost: number}>} props.trendData
 */
export default function CostTrendChart({ trendData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Payroll cost trend</h3>
        <span className="text-xs text-slate-400">Last {trendData?.length || 0} months</span>
      </div>

      {!trendData || trendData.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-slate-400">
          No trend data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrencyCompact}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F1F5F9" }} />
            <Bar dataKey="cost" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}