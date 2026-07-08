import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, BookOpen, Save, Search, Users, ChevronLeft, ChevronRight, X, Trash2, Flag, Upload } from "lucide-react";
import { useToast } from "../ToastContext";
import { getEmployees, getLeaveRecords, saveLeaveRecords, saveAttendanceRecords, uploadCompanyCalendar, resetLeaveAllocations } from "../../../service/payrollService";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// India Govt Holidays (fixed-date + commonly observed) — spans the full year, 1 Jan – 31 Dec
const INDIA_HOLIDAYS = [
  { mmdd: "01-26", name: "Republic Day", desc: "Republic Day of India" },
  { mmdd: "04-14", name: "Ambedkar Jayanti", desc: "Birth anniversary of Dr. B. R. Ambedkar" },
  { mmdd: "05-01", name: "Labour Day", desc: "International Workers' Day" },
  { mmdd: "08-15", name: "Independence Day", desc: "Independence Day of India" },
  { mmdd: "10-02", name: "Gandhi Jayanti", desc: "Birth anniversary of Mahatma Gandhi" },
  { mmdd: "12-25", name: "Christmas", desc: "Christmas Day" },
];

// ── Leave types ──
const LEAVE_TYPES = [
  { key: "paid",   label: "Paid",   emoji: "💰", badge: "bg-sky-100 text-sky-800 border-sky-300", dot: "bg-sky-400" },
  { key: "unpaid", label: "Unpaid", emoji: "🆓", badge: "bg-slate-100 text-slate-800 border-slate-300", dot: "bg-slate-400" },
];
const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map((lt) => [lt.key, lt]));

function getMonthDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  return { first, total };
}

let entryIdCounter = 1000;
function nextId() { return ++entryIdCounter; }

const ENTRIES_LS_KEY = "zoiko_payroll_leave_entries";

export default function PayrollLeavesPage() {
  const { addToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("allocate");

  // Calendar
  const [today] = useState(new Date());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState(() => {
    try {
      const raw = localStorage.getItem(ENTRIES_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Restore id counter to avoid collisions
        const maxId = parsed.reduce((m, e) => Math.max(m, e.id || 0), 0);
        if (maxId >= entryIdCounter) entryIdCounter = maxId + 1;
        return parsed;
      }
    } catch {}
    return [];
  });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedHolidays, setUploadedHolidays] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("payrollUploadedHolidays") || "[]");
    } catch { return []; }
  });

  // Add-entry form
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formEmpId, setFormEmpId] = useState("");
  const [formLeaveType, setFormLeaveType] = useState("paid");
  const [formDesc, setFormDesc] = useState("");
  const [editEntryId, setEditEntryId] = useState(null);

  // Allocations
  const [allocations, setAllocations] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Month filter & bulk allocate
  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());

  // Build India holiday entries for the current year
  const yearHolidays = useMemo(() => {
    return INDIA_HOLIDAYS.map((h) => ({
      id: `holiday-${h.mmdd}`,
      date: `${calYear}-${h.mmdd}`,
      type: "holiday",
      employeeId: null,
      employeeName: null,
      description: h.desc,
      isHoliday: true,
      holidayName: h.name,
    }));
  }, [calYear]);

  const companyHolidayEntries = useMemo(() => {
    return uploadedHolidays.map((h, i) => ({
      id: `company-holiday-${i}`,
      date: h.date,
      type: "holiday",
      employeeId: null,
      employeeName: null,
      description: h.description || h.name || "Company Holiday",
      isHoliday: true,
      holidayName: h.name || h.description || "Company Holiday",
      isCompanyHoliday: true,
    }));
  }, [uploadedHolidays]);

  const allEntries = useMemo(() => {
    const allDates = new Set([...yearHolidays.map((h) => h.date), ...companyHolidayEntries.map((h) => h.date)]);
    const userEntries = entries.filter((e) => !allDates.has(e.date));
    return [...yearHolidays, ...companyHolidayEntries, ...userEntries];
  }, [yearHolidays, companyHolidayEntries, entries]);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const [empData, leaveData] = await Promise.all([
        getEmployees(),
        getLeaveRecords(),
      ]);
      const list = Array.isArray(empData) ? empData : [];
      const leaveMap = {};
      (Array.isArray(leaveData) ? leaveData : []).forEach((l) => {
        leaveMap[l.employeeId] = l;
      });
      setEmployees(list);
      setAllocations(list.map((e) => {
        const existing = leaveMap[e.id];
        return {
          employeeId: Number(e.id),
          name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          department: e.department || "",
          used: Number(existing?.used) || 0,
        };
      }));
    } catch {
      addToast?.("Failed to load employees.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  useEffect(() => {
    localStorage.setItem("payrollUploadedHolidays", JSON.stringify(uploadedHolidays));
  }, [uploadedHolidays]);

  // Persist leave entries to localStorage so they survive navigation / page refresh
  useEffect(() => {
    localStorage.setItem(ENTRIES_LS_KEY, JSON.stringify(entries));
  }, [entries]);

  // Resets every employee's used count back to 0 on both backend and frontend
  async function resetToDefaultAllocations() {
    if (!window.confirm("Reset all leave allocations and clear leave attendance records?")) return;
    try {
      await resetLeaveAllocations();
      setAllocations((prev) => prev.map((a) => ({ ...a, used: 0 })));
      setEntries([]);
      addToast?.("Leave allocations reset and attendance records cleared.", "success");
    } catch (err) {
      addToast?.(err.message || "Failed to reset leave allocations.", "error");
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save leave allocations (used counts)
      const payload = allocations.map((a) => ({
        employeeId: a.employeeId,
        used: entries.filter((e) => Number(e.employeeId) === Number(a.employeeId) && !e.isHoliday).length || Number(a.used) || 0,
      }));
      await saveLeaveRecords(payload);

      // Persist each leave entry as an attendance record so it shows up in
      // attendance working days and is not lost on refresh.
      const leaveEntries = entries.filter((e) => e.date && e.employeeId && !e.isHoliday);
      if (leaveEntries.length > 0) {
        const attendancePayload = leaveEntries.map((e) => ({
          employeeId: e.employeeId,
          name: e.employeeName,
          date: e.date,
          status: "leave",
          checkIn: "",
          checkOut: "",
          hours: "8",
          breakMinutes: 0,
          rewards: 0,
          bonus: 0,
          otherCompensation: 0,
          notes: e.description || "Leave",
        }));
        await saveAttendanceRecords(attendancePayload);
      }

      addToast?.("Leave balances & attendance records saved.", "success");
    } catch {
      addToast?.("Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Calendar helpers ──
  const { first, total } = getMonthDays(calYear, calMonth);
  const prevMonth = () => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); } else setCalMonth(calMonth + 1); };

  function openAddForm(day) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = allEntries.find((e) => e.date === dateStr && !e.isHoliday);
    if (existing) {
      setEditEntryId(existing.id);
      setFormDate(existing.date);
      setFormEmpId(String(existing.employeeId || ""));
      setFormLeaveType(existing.leaveType);
      setFormDesc(existing.description || "");
    } else {
      setEditEntryId(null);
      setFormDate(dateStr);
      setFormEmpId("");
      setFormLeaveType(LEAVE_TYPES[0].key);
      setFormDesc("");
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditEntryId(null);
    setFormDate("");
    setFormEmpId("");
    setFormLeaveType(LEAVE_TYPES[0].key);
    setFormDesc("");
  }

  function saveEntry() {
    if (!formDate || !formEmpId) { addToast?.("Select an employee.", "error"); return; }
    const emp = employees.find((e) => String(e.id) === formEmpId);
    if (editEntryId) {
      const old = entries.find((e) => e.id === editEntryId);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editEntryId
            ? { ...e, date: formDate, leaveType: formLeaveType, employeeId: Number(formEmpId), employeeName: emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "", description: formDesc }
            : e
        )
      );
      if (old) {
        if (old.leaveType !== formLeaveType || old.employeeId !== Number(formEmpId)) {
          adjustAllocation(old.employeeId, -1);
          adjustAllocation(Number(formEmpId), +1);
        }
      }
      addToast?.("Entry updated.", "success");
    } else {
      setEntries((prev) => [
        ...prev,
        { id: nextId(), date: formDate, leaveType: formLeaveType, employeeId: Number(formEmpId), employeeName: emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "", description: formDesc, isHoliday: false },
      ]);
      adjustAllocation(Number(formEmpId), +1);
      addToast?.("Leave applied — Available/Utilized Leaves updated.", "success");
    }
    closeForm();
  }

  function deleteEntry(id) {
    const target = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (target) adjustAllocation(target.employeeId, -1);
    if (editEntryId === id) closeForm();
    addToast?.("Entry removed — balance restored.", "success");
  }

  function getEntriesForDate(dateStr) {
    return allEntries.filter((e) => e.date === dateStr);
  }

  // Month Leaves — user entries + company holidays for the selected month
  const monthLeaveCounts = useMemo(() => {
    const prefix = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}`;
    const counts = {};
    const countedCompanyDates = new Set();
    allEntries.forEach((e) => {
      if (e.isHoliday && e.isCompanyHoliday && e.date.startsWith(prefix)) {
        if (!countedCompanyDates.has(e.date)) {
          countedCompanyDates.add(e.date);
          allocations.forEach((a) => {
            counts[a.employeeId] = (counts[a.employeeId] || 0) + 1;
          });
        }
      } else if (!e.isHoliday && e.employeeId && e.date.startsWith(prefix)) {
        counts[e.employeeId] = (counts[e.employeeId] || 0) + 1;
      }
    });
    return counts;
  }, [allEntries, filterMonth, filterYear, allocations]);

  function adjustAllocation(employeeId, delta) {
    setAllocations((prev) => {
      const idx = prev.findIndex((a) => Number(a.employeeId) === Number(employeeId));
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], used: Math.max(0, (Number(next[idx].used) || 0) + delta) };
      return next;
    });
  }

  function getUtilizedLeaves(a) {
    const fromEntries = entries.filter((e) => Number(e.employeeId) === Number(a.employeeId) && !e.isHoliday).length;
    return fromEntries > 0 ? fromEntries : Number(a.used) || 0;
  }

  function getAvailableLeaves(a) {
    return Math.max(0, uploadedHolidays.length - getUtilizedLeaves(a));
  }

  const filtered = allocations.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.department?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAvailable = allocations.reduce((s, a) => s + getAvailableLeaves(a), 0);
  const totalUtilized = allocations.reduce((s, a) => s + getUtilizedLeaves(a), 0);

  // ── Calendar Upload Handlers ──
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
  }

  function parseCSV(text) {
    const lines = text.split("\n").filter(Boolean);
    const holidays = [];
    lines.forEach((line) => {
      const parts = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (parts.length < 1 || !parts[0]) return;
      const dateStr = parts[0];
      const name = parts[1] || "Company Holiday";
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        holidays.push({ date: dateStr, name, description: name });
      }
    });
    return holidays;
  }

  function handleUploadProcess() {
    if (!uploadFile) { addToast?.("Please select a file to upload.", "error"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          addToast?.("No valid holiday dates found. Expected format: YYYY-MM-DD,Name", "error");
          setUploading(false);
          return;
        }
        setUploadedHolidays(parsed.sort((a, b) => a.date.localeCompare(b.date)));
        addToast?.(`Added ${parsed.length} company holidays.`, "success");
        setShowUpload(false);
        setUploadFile(null);
      } catch {
        addToast?.("Failed to parse file. Please use CSV format.", "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(uploadFile);
  }

  function removeUploadedHoliday(index) {
    setUploadedHolidays((prev) => prev.filter((_, i) => i !== index));
    addToast?.("Holiday removed.", "success");
  }

  function clearAllUploaded() {
    if (window.confirm("Remove all uploaded company holidays?")) {
      setUploadedHolidays([]);
      addToast?.("All uploaded holidays cleared.", "success");
    }
  }

  const calDays = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/15 p-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Leaves</h1>
            <p className="text-slate-500 text-sm">Track Available & Utilized Leaves across the year</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-2xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-all"
          ><Upload size={15} />Upload Calendar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
          ><Save size={15} />{saving ? "Saving..." : "Save All"}</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-teal-50"><Users className="w-5 h-5 text-teal-600" /></div>
          <div><p className="text-2xl font-bold text-slate-800">{employees.length}</p><p className="text-xs text-slate-500">Employees</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-50"><CalendarDays className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold text-emerald-600">{uploadedHolidays.length}</p><p className="text-xs text-slate-500">Company Holidays</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-amber-50"><CalendarDays className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold text-amber-600">{totalUtilized}</p><p className="text-xs text-slate-500">Total Utilized Leaves</p></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2.5 rounded-xl bg-blue-50"><BookOpen className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-blue-600">{totalAvailable}</p><p className="text-xs text-slate-500">Total Available</p></div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          <button onClick={() => setActiveTab("allocate")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "allocate" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          ><Users size={15} className="inline mr-1.5" />Allocate Leaves</button>
          <button onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "calendar" ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          ><CalendarDays size={15} className="inline mr-1.5" />Leave Calendar</button>
        </div>

        {/* Month filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
          <CalendarDays size={14} className="text-slate-400" />
          <select value={filterMonth} onChange={(e) => { const m = Number(e.target.value); setFilterMonth(m); setCalMonth(m); }}
            className="text-sm border-none bg-transparent outline-none text-slate-700 font-medium"
          >
            {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => { const y = Number(e.target.value); setFilterYear(y); setCalYear(y); }}
            className="text-sm border-none bg-transparent outline-none text-slate-700 font-medium"
          >
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Bulk reset all employees' used counts to zero */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Reset Used:</span>
          <button onClick={resetToDefaultAllocations}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:shadow-md transition-all"
          >Reset Used</button>
        </div>
      </div>

      {/* ── Allocate Tab ── */}
      {activeTab === "allocate" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:bg-white" />
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading employees...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm"><Users size={32} className="mx-auto mb-2 opacity-40" />{search ? "No matches" : "No employees found"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Available Leaves</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Utilized Leaves</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">This Month</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((a, i) => {
                    const monthCount = monthLeaveCounts[a.employeeId] || 0;
                    const avail = getAvailableLeaves(a);
                    const utilized = getUtilizedLeaves(a);
                    return (
                      <tr key={a.employeeId || i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                        <td className="px-4 py-3 text-slate-600">{a.department || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span title="Company holidays from uploaded calendar" className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{avail}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span title="Total days used across all leave types" className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{utilized}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{monthCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{avail + utilized}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar Tab ── */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="rounded-xl p-2 hover:bg-slate-100 text-slate-600"><ChevronLeft size={18} /></button>
              <h3 className="text-base font-bold text-slate-800">{MONTHS[calMonth]} {calYear}</h3>
              <button onClick={nextMonth} className="rounded-xl p-2 hover:bg-slate-100 text-slate-600"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>)}
              {Array.from({ length: first }, (_, i) => <div key={`blank-${i}`} />)}
              {calDays.map((day) => {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEntries = getEntriesForDate(dateStr);
                const govtHoliday = dayEntries.find((e) => e.isHoliday && !e.isCompanyHoliday);
                const companyHoliday = dayEntries.find((e) => e.isHoliday && e.isCompanyHoliday);
                const userEntry = dayEntries.find((e) => !e.isHoliday);
                const lt = userEntry ? LEAVE_TYPE_MAP[userEntry.leaveType] : null;
                let bg = "hover:bg-slate-100 text-slate-700";
                if (govtHoliday) bg = "bg-purple-100 text-purple-800 border border-purple-300";
                else if (companyHoliday) bg = "bg-orange-100 text-orange-800 border border-orange-300";
                else if (lt) bg = lt.badge;
                return (
                  <button key={day} onClick={() => openAddForm(day)}
                    className={`aspect-square rounded-xl text-sm font-medium flex flex-col items-center justify-center transition-all ${bg}`}
                  >
                    <span className={(govtHoliday || companyHoliday) ? "line-through" : ""}>{day}</span>
                    {govtHoliday && <Flag size={8} className="text-purple-600" />}
                    {companyHoliday && <Flag size={8} className="text-orange-600" />}
                    {userEntry && lt && <span className="text-[8px] leading-tight">{lt.emoji}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Calendar Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Upload size={18} className="text-teal-600" />
                Upload Company Calendar
              </h3>
              <button onClick={() => { setShowUpload(false); setUploadFile(null); }} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {uploadedHolidays.length > 0 && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-orange-700">{uploadedHolidays.length} company holidays loaded</span>
                    <button onClick={clearAllUploaded} className="text-xs text-red-600 hover:text-red-800 font-medium">Clear all</button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadedHolidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                        <span>{h.date} — {h.name || h.description}</span>
                        <button onClick={() => removeUploadedHoliday(i)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Upload CSV File</label>
                <p className="text-xs text-slate-400 mb-2">
                  CSV format: <code className="bg-slate-100 px-1 rounded">2025-01-26,Republic Day</code> (date, name per line)
                </p>
                <input type="file" accept=".csv,.txt" onChange={handleFileSelect}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer" />
              </div>
              {uploadFile && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleUploadProcess} disabled={uploading || !uploadFile}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg transition-all disabled:opacity-50"
                >{uploading ? "Uploading..." : "Upload & Add Holidays"}</button>
                <button onClick={() => { setShowUpload(false); setUploadFile(null); }}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-all"
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Entry Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">{editEntryId ? "Edit Leave Entry" : "Add Leave Entry"}</h3>
              <button onClick={closeForm} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Employee</label>
                <select value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:bg-white"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName || ""} {e.lastName || ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Type</label>
                <select value={formLeaveType} onChange={(e) => setFormLeaveType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:bg-white"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt.key} value={lt.key}>{lt.emoji} {lt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Description / Reason</label>
                <input type="text" placeholder="e.g. Vacation, Sick leave..." value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:bg-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveEntry}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg transition-all"
                >{editEntryId ? "Update" : "Add Entry"}</button>
                {editEntryId && (
                  <button onClick={() => deleteEntry(editEntryId)}
                    className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all"
                  ><Trash2 size={15} className="inline mr-1" />Delete</button>
                )}
                <button onClick={closeForm}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-all"
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}