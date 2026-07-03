import { useState, useEffect } from "react";
import { getAttendanceInsights } from "../../service/insightsService";
import { Users, Clock, AlertTriangle, CheckCircle, XCircle, Calendar } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ==========================================
// EMBEDDED DEPENDENCIES & HELPERS
// ==========================================
const CHART_COLORS = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4"
};

const formatPercent = (value) => {
  if (value === undefined || value === null) return "0%";
  return `${(value * 100).toFixed(1)}%`;
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

export default function AttendanceInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAttendanceInsights().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const { summary, monthlyTrend, byDepartment } = data;

  const stats = [
    { title: "Total Employees", value: summary.totalEmployees.toLocaleString(), change: 0, trend: "stable", icon: Users, subtitle: "Tracked" },
    { title: "Avg Attendance", value: formatPercent(summary.avgAttendance / 100), change: 0.3, trend: "up", icon: CheckCircle, subtitle: "This month" },
    { title: "Late Arrivals", value: summary.lateArrivals, change: -4, trend: "down", icon: Clock, subtitle: "vs Last Month" },
    { title: "Absent Rate", value: `${summary.absentRate}%`, change: 0.1, trend: "up", icon: XCircle, subtitle: "Average daily" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Time management analytics and punctuality trends</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[85, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke={CHART_COLORS.primary} strokeWidth={2} name="Attendance Rate %" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Attendance by Department</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="attendance" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Department Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-medium">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Attendance %</th>
                <th className="py-3 px-4">Late Arrivals</th>
                <th className="py-3 px-4">Absent</th>
              </tr>
            </thead>
            <tbody>
              {byDepartment.map((dept, i) => (
                <tr key={dept.name} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
                  <td className="py-3 px-4 font-medium text-gray-900">{dept.name}</td>
                  <td className="py-3 px-4">{dept.attendance}%</td>
                  <td className="py-3 px-4">{dept.lateArrivals}</td>
                  <td className="py-3 px-4">{dept.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}