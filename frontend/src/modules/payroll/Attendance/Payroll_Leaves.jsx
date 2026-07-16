import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, BookOpen, Save, Search, Users, ChevronLeft, ChevronRight, X, Trash2, Flag, Upload } from "lucide-react";
import { useToast } from "../ToastContext";
import { getEmployees, getLeaveRecords, saveLeaveRecords, saveAttendanceRecords, uploadCompanyCalendar, resetLeaveAllocations } from "../../../service/payrollService";
import LeavesTable from "../../../components/LeavesTable";
import StatCard from "../../../components/StatCard";
import Skeleton from "../../../components/Skeleton";

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
  { key: "paid",   label: "Paid",   emoji: "💰", badge: "bg-[#35B6F5]/10 text-[#35B6F5] border-[#35B6F5]/20", dot: "bg-[#35B6F5]" },
  { key: "unpaid", label: "Unpaid", emoji: "🆓", badge: "bg-[#9E9690]/10 text-[#9E9690] border-[#E5E0D9]", dot: "bg-[#9E9690]" },
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
        const balances = existing?.leaveBalances || {};
        const paidUsed = Number(balances.paid?.used) || 0;
        const unpaidUsed = Number(balances.unpaid?.used) || 0;
        return {
          employeeId: Number(e.id),
          name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
          department: e.department || "",
          used: paidUsed + unpaidUsed,
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
      // Save leave allocations (balances per type, persisted on backend)
      const payload = allocations.map((a) => ({
        employeeId: a.employeeId,
        leaveBalances: {
          paid: { used: entries.filter((e) => Number(e.employeeId) === Number(a.employeeId) && e.leaveType === "paid" && !e.isHoliday).length },
          unpaid: { used: entries.filter((e) => Number(e.employeeId) === Number(a.employeeId) && e.leaveType === "unpaid" && !e.isHoliday).length },
        },
      }));
      await saveLeaveRecords(payload);

      // Persist unpaid leaves as attendance records so they are date-scoped
      // and respect the attendance filter (month/week) on the attendance page.
      const unpaidEntries = entries.filter((e) => e.date && e.employeeId && !e.isHoliday && e.leaveType === "unpaid");
      if (unpaidEntries.length > 0) {
        const attendancePayload = unpaidEntries.map((e) => ({
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
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#19C58A] flex items-center justify-center shadow-[0_2px_8px_rgba(25,197,138,0.3)]">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">Leave Management</h1>
            <p className="text-[13px] font-medium text-[#9E9690]">Track Available &amp; Utilized Leaves across the year</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] rounded-[12px] px-4 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] transition-all duration-200 hover:border-[#19C58A] hover:text-[#19C58A]"
          >
            <Upload size={15} />Upload Calendar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#19C58A] rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={15} />{saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Employees"
          value={employees.length}
          icon={Users}
          loading={loading}
          color="indigo"
        />
        <StatCard
          title="Company Holidays"
          value={uploadedHolidays.length}
          icon={CalendarDays}
          loading={loading}
          color="emerald"
        />
        <StatCard
          title="Leaves Utilized"
          value={totalUtilized}
          icon={CalendarDays}
          loading={loading}
          color="amber"
        />
        <StatCard
          title="Leaves Available"
          value={totalAvailable}
          icon={BookOpen}
          loading={loading}
          color="blue"
        />
      </div>

      {/* ── Tab Bar + Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tab switcher */}
        <div className="bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 flex">
          <button
            onClick={() => setActiveTab("allocate")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
              activeTab === "allocate"
                ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#9E9690] hover:text-[#6B6560] dark:hover:text-[#A69B93]"
            }`}
          >
            <Users size={14} />Allocate Leaves
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
              activeTab === "calendar"
                ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#9E9690] hover:text-[#6B6560] dark:hover:text-[#A69B93]"
            }`}
          >
            <CalendarDays size={14} />Leave Calendar
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month / Year filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[12px] px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CalendarDays size={13} className="text-[#9E9690] flex-shrink-0" />
            <select
              value={filterMonth}
              onChange={(e) => { const m = Number(e.target.value); setFilterMonth(m); setCalMonth(m); }}
              className="text-[13px] border-none bg-transparent outline-none text-[#6B6560] dark:text-[#A69B93] font-medium cursor-pointer"
            >
              {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
            </select>
            <select
              value={filterYear}
              onChange={(e) => { const y = Number(e.target.value); setFilterYear(y); setCalYear(y); }}
              className="text-[13px] border-none bg-transparent outline-none text-[#6B6560] dark:text-[#A69B93] font-medium cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <button
            onClick={resetToDefaultAllocations}
            className="flex items-center gap-1.5 bg-[#FF6E86] rounded-[12px] px-3.5 py-2 text-[11px] font-bold text-white transition-all duration-200 hover:bg-[#E55A72] shadow-[0_2px_8px_rgba(255,110,134,0.3)]"
          >
            Reset Used
          </button>
        </div>
      </div>

      {/* ── Allocate Tab ── */}
      {activeTab === "allocate" && (
        <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Search bar */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E9690] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] pl-10 pr-10 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9690] hover:text-[#6B6560] dark:hover:text-[#A69B93] transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table content */}
          {loading ? (
            <div className="space-y-3">
              {/* Header skeleton */}
              <div className="grid grid-cols-5 gap-3">
                {["w-32", "w-24", "w-16", "w-16", "w-20"].map((w, i) => (
                  <Skeleton key={i} className={`h-4 ${w} rounded`} />
                ))}
              </div>
              {/* Row skeletons */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-3 py-2 border-t border-[#E5E0D9] dark:border-[#38312D]">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-lg" />
                  <Skeleton className="h-5 w-10 rounded-full mx-auto" />
                  <Skeleton className="h-5 w-10 rounded-full mx-auto" />
                  <Skeleton className="h-5 w-8 rounded-full mx-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-[18px] bg-[#F0EDE8] dark:bg-[#2A2520] flex items-center justify-center mb-4">
                <Users size={28} className="text-[#9E9690]" />
              </div>
              <p className="text-[#9E9690] font-medium mb-1">{search ? "No matching employees" : "No employees found"}</p>
              <p className="text-[13px] text-[#9E9690]">
                {search ? (
                  <>Try a different search term or <button onClick={() => setSearch("")} className="text-[#19C58A] underline font-semibold">clear the filter</button></>
                ) : "Add employees to get started"}
              </p>
            </div>
          ) : (
            <LeavesTable
              allocations={filtered}
              monthLeaveCounts={monthLeaveCounts}
              getAvailableLeaves={getAvailableLeaves}
              getUtilizedLeaves={getUtilizedLeaves}
            />
          )}
        </div>
      )}

      {/* ── Calendar Tab ── */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Calendar nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                className="rounded-[12px] p-2 hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] text-[#6B6560] dark:text-[#A69B93] transition-colors focus:outline-none focus:ring-2 focus:ring-[#19C58A]/20"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] tracking-tight">{MONTHS[calMonth]} {calYear}</h3>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="rounded-[12px] p-2 hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] text-[#6B6560] dark:text-[#A69B93] transition-colors focus:outline-none focus:ring-2 focus:ring-[#19C58A]/20"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-[#9E9690] py-1.5 uppercase tracking-widest">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: first }, (_, i) => <div key={`blank-${i}`} />)}
              {calDays.map((day) => {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday =
                  day === today.getDate() &&
                  calMonth === today.getMonth() &&
                  calYear === today.getFullYear();
                const dayEntries = getEntriesForDate(dateStr);
                const govtHoliday = dayEntries.find((e) => e.isHoliday && !e.isCompanyHoliday);
                const companyHoliday = dayEntries.find((e) => e.isHoliday && e.isCompanyHoliday);
                const userEntry = dayEntries.find((e) => !e.isHoliday);
                const lt = userEntry ? LEAVE_TYPE_MAP[userEntry.leaveType] : null;

                let bg = "hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] border border-[#E5E0D9] dark:border-[#38312D] text-[#6B6560] dark:text-[#A69B93]";
                if (govtHoliday) bg = "bg-[#9D7BF2]/10 text-[#9D7BF2] border border-[#9D7BF2]/20 hover:bg-[#9D7BF2]/20";
                else if (companyHoliday) bg = "bg-[#F8A60A]/10 text-[#F8A60A] border border-[#F8A60A]/20 hover:bg-[#F8A60A]/20";
                else if (lt) bg = lt.badge + " hover:opacity-90";

                const todayRing = isToday ? " ring-2 ring-[#19C58A] ring-offset-1" : "";

                return (
                  <button
                    key={day}
                    onClick={() => openAddForm(day)}
                    title={
                      govtHoliday
                        ? govtHoliday.holidayName
                        : companyHoliday
                        ? companyHoliday.holidayName
                        : userEntry
                        ? `${userEntry.employeeName} — ${lt?.label}`
                        : `Add leave for ${dateStr}`
                    }
                    aria-label={`Day ${day}${
                      govtHoliday ? `, ${govtHoliday.holidayName}` : ""
                    }${
                      companyHoliday ? `, ${companyHoliday.holidayName}` : ""
                    }${userEntry ? `, ${lt?.label} leave` : ""}`}
                    className={`aspect-square rounded-[10px] text-sm font-medium flex flex-col items-center justify-center transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-[#19C58A]/20 ${bg}${todayRing}`}
                  >
                    <span className={`text-xs md:text-sm font-semibold ${
                      (govtHoliday || companyHoliday) ? "line-through opacity-70" : ""
                    } ${isToday ? "font-extrabold" : ""}`}>
                      {day}
                    </span>
                    {govtHoliday && <Flag size={7} className="text-[#9D7BF2] mt-0.5" />}
                    {companyHoliday && <Flag size={7} className="text-[#F8A60A] mt-0.5" />}
                    {userEntry && lt && <span className="text-[8px] leading-none mt-0.5">{lt.emoji}</span>}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-[#E5E0D9] dark:border-[#38312D]">
              <span className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest">Legend:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#9D7BF2]" />
                <span className="text-[12px] text-[#9E9690]">Govt Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#F8A60A]" />
                <span className="text-[12px] text-[#9E9690]">Company Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#35B6F5]" />
                <span className="text-[12px] text-[#9E9690]">Paid Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#9E9690]" />
                <span className="text-[12px] text-[#9E9690]">Unpaid Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full ring-2 ring-[#19C58A]" />
                <span className="text-[12px] text-[#9E9690]">Today</span>
              </div>
              <p className="ml-auto text-[12px] text-[#9E9690]">Click any day to add/edit a leave entry</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Calendar Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1816]/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#221D1A] rounded-[18px] shadow-[0_24px_48px_rgba(0,0,0,0.15)] w-full max-w-lg p-6 mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-[#19C58A]/10 flex items-center justify-center">
                  <Upload size={16} className="text-[#19C58A]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Upload Company Calendar</h3>
              </div>
              <button
                onClick={() => { setShowUpload(false); setUploadFile(null); }}
                className="rounded-[10px] p-1.5 text-[#9E9690] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] hover:text-[#6B6560] dark:hover:text-[#A69B93] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {uploadedHolidays.length > 0 && (
                <div className="rounded-[12px] bg-[#F8A60A]/10 border border-[#F8A60A]/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#F8A60A] uppercase tracking-widest">
                      {uploadedHolidays.length} company holidays loaded
                    </span>
                    <button onClick={clearAllUploaded} className="text-[11px] text-[#FF6E86] font-bold transition-colors hover:text-[#E55A72]">
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {uploadedHolidays.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px] text-[#6B6560] dark:text-[#A69B93] bg-white dark:bg-[#221D1A] rounded-[10px] px-2.5 py-1.5 border border-[#E5E0D9] dark:border-[#38312D]">
                        <span className="font-mono text-[#9E9690] mr-2">{h.date}</span>
                        <span className="flex-1 truncate">{h.name || h.description}</span>
                        <button onClick={() => removeUploadedHoliday(i)} className="ml-2 text-[#FF6E86] hover:text-[#E55A72] transition-colors flex-shrink-0" aria-label="Remove">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest mb-1.5 block">Upload CSV File</label>
                <p className="text-[12px] text-[#9E9690] mb-3">
                  One holiday per line: <code className="bg-[#F0EDE8] dark:bg-[#2A2520] px-1.5 py-0.5 rounded text-[#6B6560] dark:text-[#A69B93] font-mono">YYYY-MM-DD,Holiday Name</code>
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="w-full text-[13px] text-[#9E9690] file:mr-4 file:py-2 file:px-4 file:rounded-[12px] file:border-0 file:text-[13px] file:font-semibold file:bg-[#19C58A]/10 file:text-[#19C58A] hover:file:bg-[#19C58A]/20 cursor-pointer file:transition-colors"
                />
              </div>
              {uploadFile && (
                <div className="rounded-[12px] bg-[#19C58A]/10 border border-[#19C58A]/20 p-3 text-[12px] text-[#19C58A] flex items-center gap-2">
                  <div className="w-6 h-6 rounded-[8px] bg-[#19C58A]/20 flex items-center justify-center flex-shrink-0">
                    <Upload size={12} className="text-[#19C58A]" />
                  </div>
                  <div>
                    <p className="font-semibold">{uploadFile.name}</p>
                    <p className="text-[#19C58A]/70">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleUploadProcess}
                  disabled={uploading || !uploadFile}
                  className="flex-1 bg-[#19C58A] rounded-[12px] px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading…" : "Upload & Add Holidays"}
                </button>
                <button
                  onClick={() => { setShowUpload(false); setUploadFile(null); }}
                  className="rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] px-4 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] transition-all duration-200 hover:border-[#19C58A] hover:text-[#19C58A]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Leave Entry Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1816]/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#221D1A] rounded-[18px] shadow-[0_24px_48px_rgba(0,0,0,0.15)] w-full max-w-md p-6 mx-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center ${
                  editEntryId ? "bg-[#F8A60A]/10" : "bg-[#19C58A]/10"
                }`}>
                  <CalendarDays size={16} className={editEntryId ? "text-[#F8A60A]" : "text-[#19C58A]"} />
                </div>
                <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">
                  {editEntryId ? "Edit Leave Entry" : "Add Leave Entry"}
                </h3>
              </div>
              <button
                onClick={closeForm}
                className="rounded-[10px] p-1.5 text-[#9E9690] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] hover:text-[#6B6560] dark:hover:text-[#A69B93] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date field */}
              <div>
                <label className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                />
              </div>

              {/* Employee selector */}
              <div>
                <label className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest mb-1.5 block">Employee</label>
                <select
                  value={formEmpId}
                  onChange={(e) => setFormEmpId(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200 cursor-pointer"
                >
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName || ""} {e.lastName || ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave type selector */}
              <div>
                <label className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest mb-1.5 block">Leave Type</label>
                <div className="flex gap-2">
                  {LEAVE_TYPES.map((lt) => (
                    <button
                      key={lt.key}
                      type="button"
                      onClick={() => setFormLeaveType(lt.key)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-[12px] border-2 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                        formLeaveType === lt.key
                          ? "border-[#19C58A] bg-[#19C58A]/10 text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                          : "border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] text-[#9E9690] hover:border-[#E5E0D9] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520]"
                      }`}
                    >
                      <span>{lt.emoji}</span> {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description field */}
              <div>
                <label className="text-[11px] font-bold text-[#9E9690] uppercase tracking-widest mb-1.5 block">Reason / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Vacation, Sick leave…"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEntry}
                  className="flex-1 bg-[#19C58A] rounded-[12px] px-4 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)] hover:-translate-y-[1px]"
                >
                  {editEntryId ? "Update Entry" : "Add Entry"}
                </button>
                {editEntryId && (
                  <button
                    onClick={() => deleteEntry(editEntryId)}
                    className="rounded-[12px] bg-[#FF6E86]/10 border border-[#FF6E86]/20 px-3.5 py-2.5 text-[13px] font-bold text-[#FF6E86] hover:bg-[#FF6E86]/20 transition-all duration-200"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={closeForm}
                  className="rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] px-4 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] transition-all duration-200 hover:border-[#19C58A] hover:text-[#19C58A]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}