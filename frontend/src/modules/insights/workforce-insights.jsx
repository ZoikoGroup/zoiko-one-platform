import { useState, useEffect } from "react";
import { getWorkforceAnalytics, getWorkforceTableData } from "../../service/insightsService";
import { Users, UserPlus, UserMinus, Clock, BarChart3, MapPin, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

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

function FilterBar({ search, onSearchChange, filters = [], onFilterChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => onFilterChange(f.key, e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">{f.placeholder}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No data available</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`hover:bg-indigo-50/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkforceInsights() {
  const [data, setData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ department: "", location: "" });

  useEffect(() => {
    Promise.all([getWorkforceAnalytics(), getWorkforceTableData()])
      .then(([d, t]) => { setData(d); setTableData(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const { summary, departmentDistribution, monthlyTrend, hiringTrend, leaveTrend, locations } = data;

  const statsCards = [
    { title: "Total Headcount", value: summary.totalHeadcount.toLocaleString(), change: 4.2, trend: "up", icon: Users, subtitle: `${summary.activeEmployees} active` },
    { title: "New Hires (YTD)", value: summary.newHiresThisYear, change: 8.5, trend: "up", icon: UserPlus, subtitle: `${summary.openPositions} open positions` },
    { title: "Departures (YTD)", value: summary.departuresThisYear, change: -3.2, trend: "down", icon: UserMinus, subtitle: `${summary.annualAttrition}% attrition` },
    { title: "Avg Utilization", value: formatPercent(78.4), change: 2.1, trend: "up", icon: Clock, subtitle: `${summary.avgTenure} yrs avg tenure` },
    { title: "Avg Salary", value: formatCurrency(summary.avgSalary), change: 3.5, trend: "up", icon: BarChart3, subtitle: "Across all departments" },
    { title: "Locations", value: summary.locationCount, change: 0, trend: "stable", icon: MapPin, subtitle: `Remote + ${summary.locationCount} offices` },
  ];

  const tableColumns = [
    { key: "department", label: "Department", render: (v) => <span className="font-medium">{v}</span> },
    { key: "headcount", label: "Headcount" },
    { key: "avgSalary", label: "Avg Salary", render: (v) => formatCurrency(v) },
    { key: "attrition", label: "Attrition %", render: (v) => <span className={parseFloat(v) > 12 ? "text-red-600" : "text-gray-700"}>{v}%</span> },
    { key: "utilization", label: "Utilization", render: (v) => `${v}%` },
    { key: "satisfaction", label: "Satisfaction" },
    { key: "openPositions", label: "Open Positions" },
    { key: "avgTenure", label: "Avg Tenure (yrs)", render: (v) => `${v}` },
  ];

  let filteredTable = [...(tableData || [])];
  if (search) filteredTable = filteredTable.filter(r => r.department.toLowerCase().includes(search.toLowerCase()));
  if (filters.department) filteredTable = filteredTable.filter(r => r.department === filters.department);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workforce Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Comprehensive workforce metrics and trends</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((s) => <StatsCard key={s.title} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Headcount by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={100} />
              <Tooltip />
              <Bar dataKey="headcount" fill={CHART_COLORS.primary} barSize={16} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Hiring Pipeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hiringTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill={CHART_COLORS.info} name="Applications" stackId="a" />
              <Bar dataKey="interviews" fill={CHART_COLORS.warning} name="Interviews" stackId="a" />
              <Bar dataKey="offers" fill={CHART_COLORS.success} name="Offers" stackId="a" />
              <Bar dataKey="hires" fill={CHART_COLORS.primary} name="Hires" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Leave Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={leaveTrend}>
              <defs>
                <linearGradient id="sick" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.2}/><stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0}/></linearGradient>
                <linearGradient id="vac" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/><stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sick" stroke={CHART_COLORS.danger} fill="url(#sick)" name="Sick Leave" />
              <Area type="monotone" dataKey="vacation" stroke={CHART_COLORS.primary} fill="url(#vac)" name="Vacation" />
              <Area type="monotone" dataKey="personal" stroke={CHART_COLORS.warning} fill="url(#vac)" name="Personal" />
              <Area type="monotone" dataKey="other" stroke={CHART_COLORS.gray} fill="url(#vac)" name="Other" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Workforce Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="headcount" stroke={CHART_COLORS.primary} strokeWidth={2} name="Headcount" dot={false} />
              <Line type="monotone" dataKey="overtime" stroke={CHART_COLORS.warning} strokeWidth={2} name="Overtime Hours" dot={false} />
              <Line type="monotone" dataKey="absenteeism" stroke={CHART_COLORS.danger} strokeWidth={2} name="Absenteeism %" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Location Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={locations} cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name}: ${count}`} dataKey="count">
                {locations.map((e, i) => (
                  <Cell key={e.name} fill={[CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.secondary, CHART_COLORS.gray, "#f97316"][i % 8]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Department Budget vs Openings</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={departmentDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="budget" fill={CHART_COLORS.primary} name="Budget" barSize={12} />
              <Bar yAxisId="right" dataKey="openPositions" fill={CHART_COLORS.warning} name="Open Positions" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Department Overview</h3>
        </div>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          filters={[
            { key: "department", placeholder: "All Departments", value: filters.department, options: departmentDistribution.map(d => ({ value: d.name, label: d.name })) },
          ]}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        />
        <DataTable columns={tableColumns} data={filteredTable} />
      </div>
    </div>
  );
}
