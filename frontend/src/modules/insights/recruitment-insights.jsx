import { useState, useEffect } from "react";
import { getRecruitmentInsights } from "../../service/insightsService";
import { Users, UserPlus, Briefcase, Calendar, FileCheck2, Clock } from "lucide-react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

export default function RecruitmentInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecruitmentInsights().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const { summary, pipeline, monthlyTrend, byDepartment } = data;

  const stats = [
    { title: "Open Positions", value: summary.openPositions, change: 5, trend: "up", icon: Briefcase, subtitle: `${summary.newRequisitions || 0} new this month` },
    { title: "Total Applicants", value: summary.totalApplicants.toLocaleString(), change: 15, trend: "up", icon: Users, subtitle: "Inbound volume" },
    { title: "Interviews Scheduled", value: summary.interviewsScheduled, change: 8, trend: "up", icon: Calendar, subtitle: "This week" },
    { title: "Avg Time to Hire", value: `${summary.avgTimeToHire || 24} Days`, change: -2, trend: "down", icon: Clock, subtitle: "Velocity speed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recruitment Insights</h1>
        <p className="text-sm text-gray-500 mt-1">Acquisitions pipeline tracking, velocity metrics, and candidate metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Funnel Conversion Pipeline</h3>
          <ResponsiveContainer width="100%" height="260">
            <BarChart data={pipeline} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis type="category" dataKey="stage" stroke="#9ca3af" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Candidates" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Monthly Hiring Inbound Dynamics</h3>
          <ResponsiveContainer width="100%" height="260">
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Area type="monotone" dataKey="applicants" stroke={CHART_COLORS.info} fill={`${CHART_COLORS.info}15`} name="Applications" />
              <Area type="monotone" dataKey="hires" stroke={CHART_COLORS.success} fill={`${CHART_COLORS.success}15`} name="Hires" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">By Department</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-medium">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Open Positions</th>
                <th className="py-3 px-4">Applicants</th>
                <th className="py-3 px-4">Interviews</th>
                <th className="py-3 px-4">Avg Days to Hire</th>
              </tr>
            </thead>
            <tbody>
              {byDepartment.map((dept, i) => (
                <tr key={dept.name} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
                  <td className="py-3 px-4 font-medium text-gray-900">{dept.name}</td>
                  <td className="py-3 px-4">{dept.open}</td>
                  <td className="py-3 px-4">{dept.applicants}</td>
                  <td className="py-3 px-4">{dept.interviews}</td>
                  <td className="py-3 px-4">{dept.avgDaysToHire || 28} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}