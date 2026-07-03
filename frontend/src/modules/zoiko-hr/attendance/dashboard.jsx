import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { Users, UserCheck, UserX, AlertTriangle, Luggage, Home, Clock, TrendingUp, TrendingDown, Minus, Download, Calendar, Filter } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getAttendanceDashboard, exportAttendanceCsv, exportAttendanceExcel } from "../../../service/hrService";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/attendance" },
  { label: "Attendance Records", href: "/zoiko-hr/attendance/daily" },
  { label: "Leave Management", href: "/zoiko-hr/attendance/leaves" },
  { label: "Shift Management", href: "/zoiko-hr/attendance/shifts" },
  { label: "Holiday Calendar", href: "/zoiko-hr/attendance/holidays" },
  { label: "Attendance Analytics", href: "/zoiko-hr/attendance/analytics" },
];

function SubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-100">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} to={item.href} end={item.href === "/zoiko-hr/attendance"}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${isActive ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`
          }>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, change, trend }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-400";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
          <Icon size={20} className="text-orange-600" />
        </div>
      </div>
      {change != null && (
        <div className="flex items-center gap-1 mt-3">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className={`text-sm font-medium ${trendColor}`}>{change > 0 ? "+" : ""}{change}%</span>
          <span className="text-sm text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

function SimpleBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{value}</span>
    </div>
  );
}

export default function AttendanceDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("today");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAttendanceDashboard({ date_range: dateRange, department: departmentFilter, location: locationFilter })
      .then((d) => setDashboard(d))
      .catch((err) => setError(err?.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [dateRange, departmentFilter, locationFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <HRPage title="Attendance Dashboard" subtitle="Live attendance overview and statistics">
        <SubNav />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-500">Loading dashboard...</span>
        </div>
      </HRPage>
    );
  }

  if (error || !dashboard) {
    return (
      <HRPage title="Attendance Dashboard" subtitle="Live attendance overview and statistics">
        <SubNav />
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">Error: {error || "No data returned"}</div>
      </HRPage>
    );
  }

  const {
    present_today = 0, absent_today = 0, late_arrivals = 0, early_departures = 0,
    on_leave = 0, remote = 0, overtime = 0, attendance_percentage = 0, avg_working_hours = 0,
    total_employees = 0, attendance_trend = [], department_attendance = [], shift_distribution = [],
  } = dashboard;

  const statCards = [
    { title: "Present Today", value: present_today, icon: UserCheck, change: 5, trend: "up" },
    { title: "Absent Today", value: absent_today, icon: UserX, change: -2, trend: "down" },
    { title: "Late Arrivals", value: late_arrivals, icon: AlertTriangle, change: 1, trend: "up" },
    { title: "Early Departures", value: early_departures, icon: Clock, change: 0, trend: "flat" },
    { title: "On Leave", value: on_leave, icon: Luggage, change: 3, trend: "up" },
    { title: "Remote", value: remote, icon: Home, change: 2, trend: "up" },
    { title: "Overtime", value: overtime, icon: TrendingUp, change: 4, trend: "up" },
    { title: "Attendance %", value: `${attendance_percentage}%`, icon: Users, change: null, trend: null },
    { title: "Avg Working Hours", value: avg_working_hours, icon: Clock, change: null, trend: null },
  ];

  const maxTrendValue = Math.max(...attendance_trend.map((t) => t.present + t.absent), 1);
  const maxDeptAttendance = Math.max(...department_attendance.map((d) => d.count), 1);
  const maxShiftValue = Math.max(...shift_distribution.map((s) => s.count), 1);

  const barColors = {
    present: "bg-green-500", absent: "bg-red-500", late: "bg-orange-500", leave: "bg-blue-500", remote: "bg-purple-500",
  };

  const deptOptions = [...new Set(department_attendance.map((d) => d.department || d.name).filter(Boolean))];

  return (
    <HRPage title="Attendance Dashboard" subtitle="Live attendance overview and statistics">
      <SubNav />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
              <option value="">All Departments</option>
              {deptOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
              <option value="">All Locations</option>
              <option value="office">Office</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async () => { try { await exportAttendanceCsv(); } catch (err) { setError(err.message); } }}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors" title="Export CSV">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={async () => { try { await exportAttendanceExcel(); } catch (err) { setError(err.message); } }}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors" title="Export Excel">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((s) => <StatCard key={s.title} {...s} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trend</h2>
            {attendance_trend.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No trend data available</p>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {attendance_trend.map((d, i) => {
                  const total = d.present + d.absent;
                  const pct = (total / maxTrendValue) * 100;
                  return (
                    <div key={d.label || i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex gap-0.5 w-full h-full items-end">
                        <div className="flex-1 bg-green-400 rounded-t transition-all" style={{ height: `${(d.present / total) * Math.max(pct, 4)}%` }} />
                        <div className="flex-1 bg-red-400 rounded-t transition-all" style={{ height: `${(d.absent / total) * Math.max(pct, 4)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Absent</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Attendance</h2>
            {department_attendance.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No department data available</p>
            ) : (
              <div className="space-y-3">
                {department_attendance.map((d) => (
                  <div key={d.department || d.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-700 w-24 shrink-0 truncate">{d.department || d.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="bg-orange-500 rounded-full h-2 transition-all" style={{ width: `${(d.count / maxDeptAttendance) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shift Distribution</h2>
            {shift_distribution.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No shift data available</p>
            ) : (
              <div className="space-y-3">
                {shift_distribution.map((s) => (
                  <div key={s.shift || s.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-700 w-24 shrink-0 truncate">{s.shift || s.name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="bg-amber-500 rounded-full h-2 transition-all" style={{ width: `${(s.count / maxShiftValue) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{s.count}</span>
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
