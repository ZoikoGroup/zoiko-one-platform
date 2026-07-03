import { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getLeaveCalendar, getLeaveRequests, getHolidays, createHoliday } from "../../../service/hrService";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/leave" },
  { label: "Requests", href: "/zoiko-hr/leave/requests" },
  { label: "Calendar", href: "/zoiko-hr/leave/calendar" },
  { label: "Reports", href: "/zoiko-hr/leave/reports" },
];

const typeColors = {
  annual: "bg-blue-500", sick: "bg-pink-500", casual: "bg-orange-500", earned: "bg-teal-500",
  maternity: "bg-purple-500", paternity: "bg-indigo-500", unpaid: "bg-gray-500", study: "bg-cyan-500", emergency: "bg-red-500",
};

const typeLabels = {
  annual: "Annual", sick: "Sick", casual: "Casual", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", unpaid: "Unpaid", study: "Study", emergency: "Emergency",
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function SubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-100">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} to={item.href} end={item.href === "/zoiko-hr/leave"}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              isActive ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`
          }>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function LeaveCalendar() {
  const today = new Date();
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [typeFilter, setTypeFilter] = useState("");
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", description: "" });
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayError, setHolidayError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const [data, hols] = await Promise.all([
          getLeaveCalendar({ year: currentYear, month: currentMonth + 1 }),
          getHolidays({ year: currentYear }),
        ]);
        if (mounted) {
          setRecords(Array.isArray(data) ? data : []);
          const holData = Array.isArray(hols) ? hols : (hols?.data || hols?.items || []);
          setHolidays(Array.isArray(holData) ? holData : []);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [currentYear, currentMonth]);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.name.trim() || !holidayForm.date) {
      setHolidayError("Name and date are required");
      return;
    }
    setHolidaySubmitting(true);
    setHolidayError(null);
    try {
      await createHoliday({
        name: holidayForm.name.trim(),
        date: holidayForm.date,
        description: holidayForm.description.trim() || null,
      });
      setShowHolidayModal(false);
      setHolidayForm({ name: "", date: "", description: "" });
      setSuccessMsg("Holiday added successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
      const [data, hols] = await Promise.all([
        getLeaveCalendar({ year: currentYear, month: currentMonth + 1 }),
        getHolidays({ year: currentYear }),
      ]);
      setRecords(Array.isArray(data) ? data : []);
      const holData = Array.isArray(hols) ? hols : (hols?.data || hols?.items || []);
      setHolidays(Array.isArray(holData) ? holData : []);
    } catch (err) {
      setHolidayError(err?.message || "Failed to add holiday");
    } finally {
      setHolidaySubmitting(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const filtered = useMemo(() => {
    let result = records;
    if (typeFilter) result = result.filter((r) => r.leave_type === typeFilter);
    return result;
  }, [records, typeFilter]);

  const monthHolidays = useMemo(() => {
    return holidays.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [holidays, currentMonth, currentYear]);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayLeaves = filtered.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);
      const dayHolidays = monthHolidays.filter(h => h.date === dateStr);
      days.push({ date: d, dateStr, leaves: dayLeaves, holidays: dayHolidays });
    }
    return days;
  }, [filtered, monthHolidays, currentYear, currentMonth, daysInMonth, firstDayOfWeek]);

  if (loading) {
    return (
      <HRPage title="Leave Calendar" subtitle="Team leave calendar view">
        <SubNav />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-500">Loading calendar...</span>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Leave Calendar" subtitle="Team leave calendar view">
      <SubNav />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">Team leave calendar view</p>
          </div>
          <button
            onClick={() => { setShowHolidayModal(true); setHolidayError(null); }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>

        {successMsg && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">{successMsg}</div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
            <option value="">All Leave Types</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {holidays.filter(h => {
            const d = new Date(h.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          }).length > 0 && (
            <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-lg">
              {holidays.filter(h => {
                const d = new Date(h.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
              }).length} holiday(s) this month
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{monthNames[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="bg-white min-h-[100px] p-1" />;
              const isToday = day.date === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              return (
                <div key={day.date} className={`bg-white min-h-[100px] p-1 ${isToday ? "ring-2 ring-teal-500 ring-inset" : ""}`}>
                  <div className="text-xs font-medium text-gray-500 mb-1">{day.date}</div>
                  <div className="space-y-0.5">
                    {day.holidays.map((h) => (
                      <div key={h.id || h.name}
                        title={`Holiday: ${h.name}`}
                        className="text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate bg-rose-500">
                        🎉 {h.name}
                      </div>
                    ))}
                    {day.leaves.slice(0, 3).map((l) => (
                      <div key={l.id}
                        title={`${l.employee_name || l.employee} - ${l.leave_type}`}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate ${typeColors[l.leave_type] || "bg-gray-400"}`}>
                        {(l.employee_name || l.employee || "").split(" ")[0]}
                      </div>
                    ))}
                    {day.leaves.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-medium px-1">+{day.leaves.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="text-xs font-medium text-gray-500 mr-1">Legend:</span>
            {Object.entries(typeLabels).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1 text-xs text-gray-600">
                <span className={`w-2.5 h-2.5 rounded ${typeColors[type]}`} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Add Holiday</h2>
              <button onClick={() => { setShowHolidayModal(false); setHolidayError(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              {holidayError && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{holidayError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
                <input type="text" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Independence Day" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea rows={2} value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowHolidayModal(false); setHolidayError(null); }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={holidaySubmitting} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg font-medium transition-colors">
                  {holidaySubmitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Adding...</> : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HRPage>
  );
}
