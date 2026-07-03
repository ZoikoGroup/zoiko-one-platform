import React, { useState, useEffect } from "react";
import { getExecutiveDashboard } from "../../service/insightsService";
import { DollarSign, Users, Briefcase, TrendingUp, ShieldCheck, Activity, PieChart, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RPieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chart Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-500 text-lg font-medium mb-2">⚠️ Chart Error</div>
          <div className="text-red-400 text-sm">Unable to render chart data</div>
        </div>
      );
    }

    return this.props.children;
  }
}

const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const CHART_COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#ef4444",
  info: "#06b6d4",
  gray: "#6b7280",
  muted: "#94a3b8",
};

function formatCurrency(amount) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(value) {
  if (value == null) return "-";
  return `${value.toFixed(1)}%`;
}

function StatsCard({ title, value, change, trend, icon: Icon, subtitle }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-400";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0"><Icon className="w-5 h-5 text-indigo-600" /></div>}
      </div>
      {change != null && (
        <div className="flex items-center gap-1 mt-3">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className={`text-sm font-medium ${trendColor}`}>
            {change > 0 ? "+" : ""}{change}%
          </span>
          <span className="text-sm text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

export default function InsightsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getExecutiveDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const { kpis, revenueTrend, costTrend, workforceGrowth, performanceOverview, departmentRevenue } = data;

  const kpiCards = [
    { title: "Total Revenue", value: formatCurrency(kpis.totalRevenue), change: kpis.growthRate, trend: "up", icon: DollarSign, subtitle: "Last 12 months" },
    { title: "Employees", value: kpis.employeeCount.toLocaleString(), change: 4.2, trend: "up", icon: Users, subtitle: "Active headcount" },
    { title: "Active Projects", value: kpis.activeProjects, change: 8.3, trend: "up", icon: Briefcase, subtitle: "In progress" },
    { title: "Profit Margin", value: formatPercent(kpis.profitMargin), change: 1.2, trend: "up", icon: TrendingUp, subtitle: "YTD" },
    { title: "Compliance Score", value: `${kpis.complianceScore}%`, change: 3.5, trend: "up", icon: ShieldCheck, subtitle: "+5 pts vs last year" },
    { title: "Payroll Cost", value: formatCurrency(kpis.totalPayrollCost), change: 2.8, trend: "up", icon: Activity, subtitle: "38.3% of revenue" },
    { title: "Vendor Spend", value: formatCurrency(kpis.vendorSpend), change: 1.5, trend: "up", icon: PieChart, subtitle: "Year to date" },
    { title: "Growth Rate", value: formatPercent(kpis.growthRate), change: 0.3, trend: "up", icon: TrendingDown, subtitle: "YoY" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time business performance overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Last updated: Today 07:45 AM
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <StatsCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Cost Trend</h3>
          <ChartErrorBoundary>
            {revenueTrend && revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={extractArray(revenueTrend)}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/><stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/></linearGradient>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.2}/><stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.danger} fill="url(#costGrad)" strokeWidth={2} name="Cost" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-400 text-lg mb-2">📊 No revenue trend data available</div>
                <div className="text-gray-300 text-sm">Revenue trend data will appear here when available</div>
              </div>
            )}
          </ChartErrorBoundary>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue by Department</h3>
          <ChartErrorBoundary>
            {departmentRevenue && departmentRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={extractArray(departmentRevenue)} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                    {extractArray(departmentRevenue).map((e, i) => (
                      <Cell key={e.name} fill={[CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.gray][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-400 text-lg mb-2">📊 No department revenue data available</div>
                <div className="text-gray-300 text-sm">Department revenue data will appear here when available</div>
              </div>
            )}
          </ChartErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <ChartErrorBoundary>
            {costTrend && costTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={extractArray(costTrend)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${(v / 1e3).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="payroll" fill={CHART_COLORS.primary} name="Payroll" stackId="a" />
                  <Bar dataKey="operations" fill={CHART_COLORS.warning} name="Operations" stackId="a" />
                  <Bar dataKey="infrastructure" fill={CHART_COLORS.info} name="Infrastructure" stackId="a" />
                  <Bar dataKey="marketing" fill={CHART_COLORS.success} name="Marketing" stackId="a" />
                  <Bar dataKey="other" fill={CHART_COLORS.gray} name="Other" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-400 text-lg mb-2">📊 No cost breakdown data available</div>
                <div className="text-gray-300 text-sm">Cost breakdown data will appear here when available</div>
              </div>
            )}
          </ChartErrorBoundary>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Workforce Growth</h3>
          <ChartErrorBoundary>
            {workforceGrowth && workforceGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={extractArray(workforceGrowth)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="headcount" stroke={CHART_COLORS.primary} strokeWidth={2} name="Headcount" dot={false} />
                  <Line type="monotone" dataKey="hires" stroke={CHART_COLORS.success} strokeWidth={2} name="Hires" dot={false} />
                  <Line type="monotone" dataKey="departures" stroke={CHART_COLORS.danger} strokeWidth={2} name="Departures" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-gray-400 text-lg mb-2">📊 No workforce growth data available</div>
                <div className="text-gray-300 text-sm">Workforce growth data will appear here when available</div>
              </div>
            )}
          </ChartErrorBoundary>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Performance vs Target</h3>
        <ChartErrorBoundary>
          {performanceOverview && performanceOverview.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={extractArray(performanceOverview)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 12 }} stroke="#9ca3af" width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill={CHART_COLORS.primary} name="Actual" barSize={16} />
                <Bar dataKey="target" fill={CHART_COLORS.warning} name="Target" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-gray-400 text-lg mb-2">📊 No performance data available</div>
              <div className="text-gray-300 text-sm">Performance data will appear here when available</div>
            </div>
          )}
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
