import { useState, useEffect, useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Plus, Upload, Trash2, CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react";
import HRPage from "../../../components/HRPage";
import {
  getHolidays, createHoliday, updateHoliday, deleteHoliday, importHolidays,
} from "../../../service/hrService";

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

const TYPE_OPTIONS = ["Public", "Company", "Optional"];

const TYPE_COLORS = {
  Public: "bg-red-100 text-red-800",
  Company: "bg-blue-100 text-blue-800",
  Optional: "bg-purple-100 text-purple-800",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const initialForm = {
  name: "", date: "", type: "Public", is_recurring: false, description: "",
};

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [form, setForm] = useState({ ...initialForm });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getHolidays()
      .then((data) => setHolidays(Array.isArray(data) ? data : data?.items || []))
      .catch((err) => setError(err?.message || "Failed to load holidays"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditHoliday(null);
    setForm({ ...initialForm });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (h) => {
    setEditHoliday(h);
    setForm({
      name: h.name || "",
      date: h.date ? h.date.substring(0, 10) : "",
      type: h.type || "Public",
      is_recurring: h.is_recurring || false,
      description: h.description || "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = (d) => {
    const e = {};
    if (!d.name?.trim()) e.name = "Name is required";
    if (!d.date) e.date = "Date is required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        date: form.date,
        type: form.type,
        is_recurring: form.is_recurring,
        description: form.description?.trim() || null,
      };
      if (editHoliday) {
        await updateHoliday(editHoliday.id, payload);
      } else {
        await createHoliday(payload);
      }
      setShowModal(false);
      const data = await getHolidays();
      setHolidays(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setFormErrors({ submit: err.message || "Failed to save holiday" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await deleteHoliday(id);
      const data = await getHolidays();
      setHolidays(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err.message || "Failed to delete holiday");
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importData);
      await importHolidays(Array.isArray(parsed) ? { holidays: parsed } : parsed);
      setShowImport(false);
      setImportData("");
      const data = await getHolidays();
      setHolidays(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err.message || "Failed to import holidays");
    }
  };

  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const holidayMap = {};
    holidays.forEach((h) => {
      if (h.date) {
        const d = new Date(h.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          if (!holidayMap[day]) holidayMap[day] = [];
          holidayMap[day].push(h);
        }
      }
    });
    return { firstDay, daysInMonth, holidayMap };
  }, [holidays, currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  if (loading) {
    return (
      <HRPage title="Holiday Calendar" subtitle="Manage company holidays and observances">
        <SubNav />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-500">Loading holidays...</span>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Holiday Calendar" subtitle="Manage company holidays and observances">
      <SubNav />
      <div className="space-y-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">Manage company-wide holidays and observances</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setView("calendar")}
                className={`p-2 ${view === "calendar" ? "bg-orange-50 text-orange-600" : "text-gray-400 hover:bg-gray-50"}`} title="Calendar View">
                <CalendarDays className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")}
                className={`p-2 ${view === "list" ? "bg-orange-50 text-orange-600" : "text-gray-400 hover:bg-gray-50"}`} title="List View">
                <List className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Holiday
            </button>
          </div>
        </div>

        {view === "calendar" ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-orange-600 rounded hover:bg-orange-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">{MONTHS[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-orange-600 rounded hover:bg-orange-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {DAYS.map((d) => (
                <div key={d} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
              ))}
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white min-h-[80px] p-1" />
              ))}
              {Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayHolidays = calendarData.holidayMap[day] || [];
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                return (
                  <div key={day} className={`bg-white min-h-[80px] p-1.5 border-b border-gray-100 ${isToday ? "bg-orange-50" : ""}`}>
                    <span className={`text-sm font-medium ${isToday ? "text-orange-600" : "text-gray-700"}`}>{day}</span>
                    {dayHolidays.slice(0, 2).map((h, idx) => (
                      <div key={idx} className={`mt-0.5 text-[10px] px-1 py-0.5 rounded ${TYPE_COLORS[h.type] || "bg-gray-100 text-gray-800"} truncate`}>
                        {h.name}
                      </div>
                    ))}
                    {dayHolidays.length > 2 && (
                      <div className="text-[10px] text-gray-400 mt-0.5">+{dayHolidays.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recurring</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-orange-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(h.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[h.type] || "bg-gray-100 text-gray-800"}`}>
                          {h.type || "Public"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{h.is_recurring ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{h.description || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(h)}
                            className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors rounded hover:bg-orange-50" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(h.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No holidays defined</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">{editHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formErrors.submit && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{formErrors.submit}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`w-full border ${formErrors.name ? "border-red-300" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={`w-full border ${formErrors.date ? "border-red-300" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500`} />
                    {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                      {TYPE_OPTIONS.map((v) => (<option key={v} value={v}>{v}</option>))}
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Recurring annually</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg font-medium transition-colors">
                    {submitting ? "Saving..." : editHoliday ? "Update Holiday" : "Add Holiday"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Import Holidays</h2>
                <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">Paste JSON array of holidays to bulk import.</p>
                <textarea rows={8} value={importData} onChange={(e) => setImportData(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder='[{"name":"New Year","date":"2026-01-01","type":"Public"}]' />
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowImport(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleImport}
                    className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors">Import</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HRPage>
  );
}
