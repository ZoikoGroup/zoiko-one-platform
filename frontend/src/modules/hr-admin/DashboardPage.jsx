import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { SearchInput, StatCard, TopBarButton } from "../../components/DashboardWidgets";
import { getOrganizationDashboardStats, getOrganizationDetails } from "../../service/orgAdminService";
import { getLearningDashboard } from "../../service/hrService";
import { getPerformanceDashboard } from "../../service/hrService";
import { getRecruitmentDashboard } from "../../service/hrService";
import {
  LayoutDashboard, Users, Building2, BadgeCheck, CalendarCheck,
  Clock, Package, BookOpen, ClipboardCheck, UserPlus,
  UserCog, UsersRound, Activity
} from "lucide-react";

const statCards = [
  { key: "total_employees", label: "Total Employees", icon: Users, color: "text-blue-600 bg-blue-500/10 border-blue-500/25" },
  { key: "active_employees", label: "Active Employees", icon: UserCog, color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/25" },
  { key: "managers", label: "Managers", icon: UsersRound, color: "text-violet-600 bg-violet-500/10 border-violet-500/25" },
  { key: "hr_admins", label: "HR Admins", icon: LayoutDashboard, color: "text-purple-600 bg-purple-500/10 border-purple-500/25" },
  { key: "departments", label: "Departments", icon: Building2, color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/25" },
  { key: "designations", label: "Designations", icon: BadgeCheck, color: "text-teal-600 bg-teal-500/10 border-teal-500/25" },
  { key: "attendance_today", label: "Today's Attendance", icon: Clock, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25" },
  { key: "pending_leave_requests", label: "Pending Leave Requests", icon: CalendarCheck, color: "text-amber-600 bg-amber-500/10 border-amber-500/25" },
  { key: "pending_approvals", label: "Pending Approvals", icon: Activity, color: "text-orange-600 bg-orange-500/10 border-orange-500/25" },
  { key: "assets", label: "Assets", icon: Package, color: "text-slate-600 bg-slate-500/10 border-slate-500/25" },
  { key: "learning_courses", label: "Learning Courses", icon: BookOpen, color: "text-rose-600 bg-rose-500/10 border-rose-500/25" },
  { key: "performance_reviews", label: "Performance Reviews", icon: ClipboardCheck, color: "text-pink-600 bg-pink-500/10 border-pink-500/25" },
  { key: "recruitment_openings", label: "Recruitment Openings", icon: UserPlus, color: "text-lime-600 bg-lime-500/10 border-lime-500/25" },
];

export default function HrAdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [learningStats, setLearningStats] = useState(null);
  const [perfStats, setPerfStats] = useState(null);
  const [recruitmentStats, setRecruitmentStats] = useState(null);
  const [orgName, setOrgName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getOrganizationDashboardStats(),
      getLearningDashboard().catch(() => null),
      getPerformanceDashboard().catch(() => null),
      getRecruitmentDashboard().catch(() => null),
      getOrganizationDetails().catch(() => null),
    ])
      .then(([orgStats, learnStats, perfStats, recStats, orgDetails]) => {
        if (cancelled) return;
        setStats(orgStats);
        setLearningStats(learnStats);
        setPerfStats(perfStats);
        setRecruitmentStats(recStats);
        setOrgName(orgDetails?.name || null);
      })
      .catch(err => setError(err?.message || "Failed to load dashboard"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const fmt = (val) => {
    if (val === null || val === undefined) return "—";
    return Number(val).toLocaleString();
  };

  const resolved = (key) => {
    if (loading) return "—";
    if (stats && (key === "total_employees" || key === "active_employees" || key === "managers" || key === "hr_admins" || key === "departments" || key === "designations" || key === "pending_leave_requests" || key === "pending_approvals" || key === "assets" || key === "attendance_today")) {
      return fmt(stats[key]);
    }
    if (key === "learning_courses" && learningStats) return fmt(learningStats.total_courses);
    if (key === "performance_reviews" && perfStats) return fmt(perfStats.total_reviews);
    if (key === "recruitment_openings" && recruitmentStats) return fmt(recruitmentStats.total_open_positions);
    return "—";
  };

  return (
    <div className="min-h-screen bg-[#F5F4FB] p-4 font-sans">
      <PageHeader
        title="HR Admin Dashboard"
        description={`Welcome back, ${user?.name || "HR Admin"}.${orgName ? ` Organization: ${orgName}.` : ""} Here is your organization overview.`}
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput placeholder="Search HR metrics, teams, employees..." />
        <div className="flex flex-wrap gap-2">
          <TopBarButton icon={UserPlus} label="Add Employee" />
          <TopBarButton icon={ClipboardCheck} label="Review Cases" primary />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((s) => {
          const val = resolved(s.key);
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
              ? `Your organization has ${fmt(stats.total_employees)} total employees with ${fmt(stats.active_employees)} active across ${fmt(stats.departments)} departments and ${fmt(stats.designations)} designations.`
              : "No organization data available."}
        </p>
      </div>
    </div>
  );
}