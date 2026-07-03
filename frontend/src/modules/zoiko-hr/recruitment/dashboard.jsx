import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Briefcase, Calendar, FileCheck2, TrendingUp, Target, CheckCircle, Clock, RefreshCw, AlertCircle, UserPlus, BarChart3, FileText, SlidersHorizontal } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getRecruitmentDashboard, getCandidates, getRequisitions, getOffers } from "../../../service/hrService";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/recruitment" },
  { label: "Job Requisitions", href: "/zoiko-hr/recruitment/job-requisitions" },
  { label: "Candidates", href: "/zoiko-hr/recruitment/candidates" },
  { label: "Interviews", href: "/zoiko-hr/recruitment/interviews" },
  { label: "Offer Management", href: "/zoiko-hr/recruitment/offers" },
];

function SubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-100">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} to={item.href} end={item.href === "/zoiko-hr/recruitment"}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${isActive ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`
          }>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}


function StatsCard({ title, value, icon: Icon, subtitle, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {Icon && <div className={`p-2 ${color} rounded-lg`}><Icon className="w-5 h-5 text-white" /></div>}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function PipelineStage({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-900">{count}</span>
        <div className="w-24 bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return dateStr; }
}

export default function RecruitmentDashboard() {
  const [dash, setDash] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getRecruitmentDashboard().catch(() => null),
      getCandidates().catch(() => ({ items: [] })),
      getRequisitions().catch(() => ({ items: [] })),
      getOffers().catch(() => ({ items: [] })),
    ]).then(([d, cands, reqs, offs]) => {
      setDash(d);
      setCandidates(Array.isArray(cands) ? cands : cands?.items || cands?.data || []);
      setRequisitions(Array.isArray(reqs) ? reqs : reqs?.items || reqs?.data || []);
      setOffers(Array.isArray(offs) ? offs : offs?.items || offs?.data || []);
    }).catch((err) => {
      console.error("Dashboard load error:", err);
      setError("Failed to load dashboard data. Please try again later.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <HRPage title="Recruitment Dashboard" subtitle="Hiring pipeline and recruitment metrics"><SubNav /><div className="p-6 text-center text-gray-400">Loading dashboard...</div></HRPage>;

  if (error) return <HRPage title="Recruitment Dashboard" subtitle="Hiring pipeline and recruitment metrics"><SubNav /><div className="p-6 text-center"><div className="inline-flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg"><AlertCircle className="w-5 h-5" />{error}</div><div className="mt-4"><button onClick={load} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">Try Again</button></div></div></HRPage>;

  const d = dash || {};
  const pipeline = d.pipeline || {};
  const stages = [
    { label: "Applied", key: "applied", color: "bg-blue-500" },
    { label: "Screening", key: "screening", color: "bg-indigo-500" },
    { label: "Interview", key: "interview", color: "bg-purple-500" },
    { label: "Offer", key: "offer", color: "bg-orange-500" },
    { label: "Hired", key: "hired", color: "bg-green-500" },
    { label: "Rejected", key: "rejected", color: "bg-red-500" },
  ];
  const totalInPipeline = stages.reduce((sum, s) => sum + (pipeline[s.key] || 0), 0) || 1;
  const activity = d.recent_activity || [];

  return (
    <HRPage title="Recruitment Dashboard" subtitle="Hiring pipeline and recruitment metrics">
      <SubNav />
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Total Candidates" value={d.total_candidates ?? candidates.length} icon={Users} subtitle="In the pipeline" color="bg-orange-500" />
          <StatsCard title="Open Positions" value={d.open_positions ?? requisitions.filter((r) => r.status === "open").length} icon={Briefcase} subtitle="Active requisitions" color="bg-blue-500" />
          <StatsCard title="Active Interviews" value={d.active_interviews ?? 0} icon={Calendar} subtitle="Scheduled this week" color="bg-purple-500" />
          <StatsCard title="Offers Extended" value={d.offers_extended ?? offers.filter((o) => o.status === "approved").length} icon={FileCheck2} subtitle="Approved offers" color="bg-green-500" />
          <StatsCard title="Pending Offers" value={d.pending_offers ?? offers.filter((o) => o.status === "pending" || o.status === "draft").length} icon={Clock} subtitle="Awaiting response" color="bg-yellow-500" />
          <StatsCard title="Hired This Month" value={d.hired_this_month ?? 0} icon={UserPlus} subtitle="New hires" color="bg-teal-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidate Pipeline</h2>
            {totalInPipeline <= 1 && !stages.some((s) => (pipeline[s.key] || 0) > 0) ? (
              <div className="text-center py-8 text-gray-400">No candidates in pipeline yet</div>
            ) : (
              <div className="space-y-1">
                {stages.map((s) => (
                  <PipelineStage key={s.key} label={s.label} count={pipeline[s.key] || 0} total={totalInPipeline} color={s.color} />
                ))}
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-gray-900">{totalInPipeline}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No recent hiring activity</div>
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 10).map((act, i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                    <div className={`p-1.5 rounded-full ${act.type === "hired" ? "bg-green-100" : act.type === "offer" ? "bg-orange-100" : act.type === "interview" ? "bg-purple-100" : "bg-blue-100"}`}>
                      {act.type === "hired" ? <CheckCircle className="w-4 h-4 text-green-600" /> : act.type === "offer" ? <FileCheck2 className="w-4 h-4 text-orange-600" /> : act.type === "interview" ? <Calendar className="w-4 h-4 text-purple-600" /> : <UserPlus className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{act.description || act.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(act.date || act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HRPage>
  );
}
