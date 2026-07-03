import { useState, useEffect } from "react";
import { getFinancialAnalytics, getComplianceAnalytics, getInventoryAnalytics, getProjectAnalytics, getForecastingData } from "../../service/insightsService";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, FileText, Building2, ShieldCheck, AlertTriangle, CheckCircle, Clock, Scale, Package, Truck, Store, Briefcase, BarChart3, Target } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ==========================================
// EMBEDDED DEPENDENCIES & HELPERS
// ==========================================
const CHART_COLORS = {
  primary: "#4f46e5",   // Indigo
  success: "#10b981",   // Emerald
  warning: "#f59e0b",   // Amber
  danger: "#ef4444",    // Red
  info: "#06b6d4",      // Cyan
  secondary: "#6b7280"  // Gray
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value) => {
  if (value === undefined || value === null) return "0%";
  return `${(value * 100).toFixed(1)}%`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const StatsCard = ({ title, value, icon: Icon, trend, change, subtitle }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      <div className="flex items-center gap-1.5 mt-1">
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium ${trend === 'up' || trend === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' || trend === 'healthy' ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
    </div>
    {Icon && (
      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
        <Icon size={20} />
      </div>
    )}
  </div>
);

const DataTable = ({ columns = [], data = [] }) => (
  <div className="overflow-x-auto w-full border border-gray-100 rounded-lg">
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
          {columns.map((col, idx) => (
            <th key={idx} className="p-3">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data && data.length > 0 ? (
          data.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="p-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="p-8 text-center text-gray-400">No data available.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  const badgeStyles = {
    critical: "bg-red-100 text-red-800 border-red-200 font-semibold",
    high: "bg-red-50 text-red-700 border-red-100",
    medium: "bg-orange-50 text-orange-700 border-orange-100",
    low: "bg-green-50 text-green-700 border-green-100",
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    completed: "bg-blue-50 text-blue-700 border-blue-100",
    healthy: "bg-green-50 text-green-700 border-green-100",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  const style = badgeStyles[normalized] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${style}`}>
      {normalized.replace("_", " ")}
    </span>
  );
};

const tabs = [
  { id: "financial", label: "Financial" },
  { id: "compliance", label: "Compliance" },
  { id: "inventory", label: "Inventory" },
  { id: "projects", label: "Projects" },
  { id: "forecasting", label: "Forecasting" },
];

export default function Analytics({ defaultTab = "financial" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [financial, setFinancial] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [projects, setProjects] = useState(null);
  const [forecasting, setForecasting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchTabMapping = {
      financial: () => getFinancialAnalytics().then(setFinancial),
      compliance: () => getComplianceAnalytics().then(setCompliance),
      inventory: () => getInventoryAnalytics().then(setInventory),
      projects: () => getProjectAnalytics().then(setProjects),
      forecasting: () => getForecastingData().then(setForecasting),
    };

    if (fetchTabMapping[activeTab]) {
      fetchTabMapping[activeTab]().catch(() => {}).finally(() => setLoading(false));
    }
  }, [activeTab]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-functional intelligence and analytical reviews</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "financial" && financial && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Gross Margin" value={formatPercent(financial.metrics.grossMargin)} icon={DollarSign} change={1.2} trend="up" subtitle="vs last Q" />
            <StatsCard title="OpEx Efficiency" value={formatPercent(financial.metrics.opexEfficiency)} icon={PiggyBank} change={2.4} trend="up" subtitle="Reduction" />
            <StatsCard title="Burn Rate" value={formatCurrency(financial.metrics.burnRate)} icon={TrendingDown} subtitle="Monthly" />
            <StatsCard title="Runway" value={`${financial.metrics.runwayMonths} Mos`} icon={Clock} trend="up" subtitle="Healthy" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue Breakdown by Entity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financial.entityRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="entity" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "compliance" && compliance && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard title="Control Effectiveness" value={formatPercent(compliance.summary.effectiveness)} icon={ShieldCheck} trend="up" />
            <StatsCard title="Open Findings" value={compliance.summary.openFindings} icon={AlertTriangle} trend={compliance.summary.openFindings > 5 ? "down" : "healthy"} />
            <StatsCard title="Audit Readiness" value={formatPercent(compliance.summary.auditReadiness)} icon={Scale} trend="up" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Framework Coverage Status</h3>
            <DataTable
              columns={[
                { key: "framework", label: "Framework", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
                { key: "totalControls", label: "Total Controls" },
                { key: "implemented", label: "Implemented" },
                { key: "complianceRate", label: "Compliance Rate", render: (v) => formatPercent(v / 100) },
              ]}
              data={compliance.frameworks}
            />
          </div>
        </div>
      )}

      {activeTab === "inventory" && inventory && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Turnover Rate" value={`${inventory.metrics.turnoverRate}x`} icon={Package} subtitle="Annualized" />
            <StatsCard title="Stockout Risk Items" value={inventory.metrics.stockoutRisks} icon={AlertTriangle} trend="down" />
            <StatsCard title="Supplier Reliability" value={formatPercent(inventory.metrics.supplierReliability / 100)} icon={Truck} trend="up" />
            <StatsCard title="Holding Value" value={formatCurrency(inventory.metrics.holdingValue)} icon={Store} />
          </div>
        </div>
      )}

      {activeTab === "projects" && projects && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard title="On-Time Delivery" value={formatPercent(projects.summary.onTimeDelivery / 100)} icon={CheckCircle} trend="up" />
            <StatsCard title="Budget Variance" value={formatPercent(projects.summary.budgetVariance / 100)} icon={DollarSign} trend="up" subtitle="Under Budget" />
            <StatsCard title="Resource Utilization" value={formatPercent(projects.summary.resourceUtilization / 100)} icon={Briefcase} />
          </div>
        </div>
      )}

      {activeTab === "forecasting" && forecasting && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <StatsCard title="Forecast Accuracy" value={formatPercent(forecasting.metrics.accuracy / 100)} icon={Target} />
            <StatsCard title="Projected Revenue (Next Q)" value={formatCurrency(forecasting.metrics.projectedNextQuarter)} icon={BarChart3} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Predictive Models Evaluation</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecasting.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.primary} strokeWidth={2} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.warning} strokeWidth={2} name="Forecast" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}