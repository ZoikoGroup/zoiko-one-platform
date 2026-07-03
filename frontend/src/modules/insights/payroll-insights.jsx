import { useState, useEffect } from "react";
import { getPayrollAnalytics } from "../../service/insightsService";
import { DollarSign, Users, Clock, TrendingUp, Building2, Wallet } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ==========================================
// EMBEDDED DEPENDENCIES & HELPERS
// ==========================================
const CHART_COLORS = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  secondary: "#6b7280",
  gray: "#9ca3af"
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const StatsCard = ({ title, value, icon: Icon, trend, change, subtitle }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      <div className="flex items-center gap-1.5 mt-1">
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
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

export default function PayrollInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");

  useEffect(() => {
    getPayrollAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const { summary, departmentPayroll, monthlyTrend } = data;

  const stats = [
    { title: "Gross Payroll", value: formatCurrency(summary.grossPayroll), change: summary.yoyChange, trend: "up", icon: DollarSign, subtitle: "Annualized" },
    { title: "Net Disbursements", value: formatCurrency(summary.netPayroll), change: 5.8, trend: "up", icon: Wallet, subtitle: "Take Home Pay" },
    { title: "Average Salary", value: formatCurrency(summary.avgSalary), change: 2.1, trend: "up", icon: Users, subtitle: "Per Employee" },
    { title: "Overtime Expense", value: formatCurrency(summary.overtimeCost || 0), change: -12, trend: "down", icon: Clock, subtitle: "This Month" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Compensations review, structural costs, and allocation analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
          <ResponsiveContainer width="100%" height="280">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="amount" stroke={CHART_COLORS.primary} strokeWidth={2} name="Payroll Run" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Payroll Distribution</h3>
          <ResponsiveContainer width="100%" height="280">
            <PieChart>
              <Pie data={departmentPayroll} cx="50%" cy="50%" outerRadius={100} label={({ name, gross }) => `${name}: ${formatCurrency(gross)}`} dataKey="gross">
                {departmentPayroll.map((e, i) => (
                  <Cell key={e.name} fill={[CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.info, CHART_COLORS.secondary, CHART_COLORS.gray, "#f97316", "#ec4899", "#14b8a6", "#84cc16", "#a855f7"][i % 12]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Department Payroll Detail</h3>
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Departments</option>
            {departmentPayroll.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-medium">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Gross Compensation</th>
                <th className="py-3 px-4">Benefits & Taxes</th>
                <th className="py-3 px-4">Headcount Contributions</th>
              </tr>
            </thead>
            <tbody>
              {departmentPayroll
                .filter((d) => !selectedDept || d.name === selectedDept)
                .map((d) => (
                  <tr key={d.name} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
                    <td className="py-3 px-4 font-medium text-gray-900">{d.name}</td>
                    <td className="py-3 px-4">{formatCurrency(d.gross)}</td>
                    <td className="py-3 px-4">{formatCurrency(d.benefits)}</td>
                    <td className="py-3 px-4">{d.employees || 0} employees</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}