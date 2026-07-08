import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { SearchInput, StatCard, TopBarButton } from "../../components/DashboardWidgets";
import { getOrganizationDashboardStats } from "../../service/orgAdminService";
import {
  LayoutDashboard, Users, CreditCard, Activity, TrendingUp,
  UserCog, UsersRound, Building2, BadgeInfo, CalendarCheck,
  Briefcase, Wrench, GraduationCap, Clock
} from "lucide-react";

const statCards = [
  { key: "active_employees", label: "Active Employees", icon: Users, color: "text-blue-600 bg-blue-500/10 border-blue-500/25" },
  { key: "managers", label: "Managers", icon: UserCog, color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/25" },
  { key: "hr_admins", label: "HR Admins", icon: UsersRound, color: "text-violet-600 bg-violet-500/10 border-violet-500/25" },
  { key: "departments", label: "Departments", icon: Building2, color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/25" },
  { key: "designations", label: "Designations", icon: BadgeInfo, color: "text-teal-600 bg-teal-500/10 border-teal-500/25" },
  { key: "pending_leave_requests", label: "Pending Leaves", icon: CalendarCheck, color: "text-amber-600 bg-amber-500/10 border-amber-500/25" },
  { key: "pending_approvals", label: "Pending Approvals", icon: Activity, color: "text-purple-600 bg-purple-500/10 border-purple-500/25" },
  { key: "monthly_payroll", label: "Monthly Payroll", icon: CreditCard, color: "text-[#FF7A00] bg-[#FF7A00]/10 border-[#FF7A00]/25" },
  { key: "assets", label: "Assets", icon: Wrench, color: "text-slate-600 bg-slate-500/10 border-slate-500/25" },
  { key: "attendance_today", label: "Attendance Today", icon: Clock, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25" },
];

export default function OrgAdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOrganizationDashboardStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val, key) => {
    if (val === null || val === undefined) return "—";
    if (key === "monthly_payroll") return `$${Number(val).toLocaleString()}`;
    return Number(val).toLocaleString();
  };

  const orgStatus = stats
    ? `${stats.active_employees} / ${stats.total_employees} active`
    : "";

  return (
    <div className="min-h-screen bg-[#F5F4FB] p-4 font-sans">
      <PageHeader
        title="Organization Dashboard"
        description={`Welcome back, ${user?.name || "Organization Admin"}.`}
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput placeholder="Search organization metrics..." />
        <TopBarButton icon={Building2} label="Organization Actions" />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const val = loading ? "—" : stats ? fmt(stats[s.key], s.key) : "—";
          return (
            <StatCard
              key={s.key}
              label={s.label}
              value={val}
              icon={s.icon}
              iconBg={s.iconBg}
            />
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Organization Summary</h3>
        <p className="text-sm text-slate-500">
          {loading
            ? "Loading..."
            : stats
              ? `Your organization has ${stats.total_employees} total employees with ${stats.active_employees} actively working across ${stats.departments} departments.`
              : "Manage your organization from this dashboard."}
        </p>
      </div>
    </div>
  );
}
