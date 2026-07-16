import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CalendarCheck, Clock, Users, FileText, List, CalendarDays, Save, DollarSign, Gift, Plus, X, Search, CalendarRange, UserRoundCheck, BadgePlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ToastContext";
import { getAttendanceBase, saveAttendanceRecords, getAttendanceRecords, getAttendanceHistory, clearAttendanceRecords, getLeaveRecords } from "../../../service/payrollService";
import { getHolidays } from "../../../service/hrService";

const LS_KEY = "zoiko_payroll_attendance";

let _localCacheRaw = null;
let _localCacheParsed = null;

function getLocalRecords() {
  try {
    const raw = localStorage.getItem(LS_KEY) || "{}";
    if (raw === _localCacheRaw && _localCacheParsed) return _localCacheParsed;
    _localCacheParsed = JSON.parse(raw);
    _localCacheRaw = raw;
    return _localCacheParsed;
  } catch {
    return {};
  }
}

function setLocalRecords(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

function mergeLocalIntoRecords(records, date) {
  const local = getLocalRecords();
  const dayRecords = local[date];
  if (!dayRecords) return records;
  return records.map((r) => {
    const saved = dayRecords.find((d) => d.employeeId === r.employeeId);
    if (!saved) return r;
    return { ...r, ...saved };
  });
}

function to24h(time, period) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  let h24 = h;
  if (period === "PM" && h < 12) h24 = h + 12;
  if (period === "AM" && h === 12) h24 = 0;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateHours(checkIn, checkOut, breakMinutes, inPeriod, outPeriod) {
  const ci = inPeriod ? to24h(checkIn, inPeriod) : checkIn;
  const co = outPeriod ? to24h(checkOut, outPeriod) : checkOut;
  if (!ci || !co) return "";
  const [inH, inM] = ci.split(":").map(Number);
  const [outH, outM] = co.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return "";
  const inTotal = inH * 60 + inM;
  const outTotal = outH * 60 + outM;
  let diff = outTotal - inTotal;
  if (diff < 0) diff += 1440;
  const mins = Math.max(0, diff - (Number(breakMinutes) || 0));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function calculateDecimalHours(checkIn, checkOut, breakMinutes, inPeriod, outPeriod) {
  const ci = inPeriod ? to24h(checkIn, inPeriod) : checkIn;
  const co = outPeriod ? to24h(checkOut, outPeriod) : checkOut;
  if (!ci || !co) return 0;
  const [inH, inM] = ci.split(":").map(Number);
  const [outH, outM] = co.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
  const inTotal = inH * 60 + inM;
  const outTotal = outH * 60 + outM;
  let diff = outTotal - inTotal;
  if (diff < 0) diff += 1440;
  const mins = Math.max(0, diff - (Number(breakMinutes) || 0));
  return Math.round((mins / 60) * 100) / 100;
}

function formatHours(hours) {
  if (!hours && hours !== 0) return "-";
  const h = Math.floor(Number(hours));
  const m = Math.round((Number(hours) - h) * 60);
  return `${h}h ${m}m`;
}

const tabs = [
  { id: "overview",      label: "Overview",      icon: CalendarCheck },
  { id: "bulk",          label: "Bulk Attendance", icon: BadgePlus },
  { id: "records",       label: "Records",        icon: List },
  { id: "compensation",  label: "Rewards & Bonus", icon: DollarSign },
  { id: "summary",       label: "Summary",        icon: FileText },
];

const STATUS_OPTIONS = ["present", "absent", "leave"];

function toLocalDateStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "4M", days: 120 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "ALL", days: 0 },
];

function getDateRange(days, startDate) {
  const start = startDate ? new Date(startDate + "T00:00:00") : new Date();
  const end = new Date(start);
  if (days > 0) end.setDate(end.getDate() + (days - 1));
  return {
    start: toLocalDateStr(start),
    end: toLocalDateStr(end),
  };
}

export default function AttendancePage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(toLocalDateStr(new Date()));
  const [timeRange, setTimeRange] = useState(30);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(toLocalDateStr(new Date()));

  const [bulkMode, setBulkMode] = useState("single");
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkClockIn, setBulkClockIn] = useState("");
  const [bulkClockOut, setBulkClockOut] = useState("");
  const [bulkClockInPeriod, setBulkClockInPeriod] = useState("AM");
  const [bulkClockOutPeriod, setBulkClockOutPeriod] = useState("PM");
  const [bulkBreak, setBulkBreak] = useState("");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeHolidays, setExcludeHolidays] = useState(true);
  const [standardHoursPerDay, setStandardHoursPerDay] = useState("8");
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [leaveAllocations, setLeaveAllocations] = useState([]);

  const loadLeaveAllocations = useCallback(async () => {
    try {
      const data = await getLeaveRecords();
      setLeaveAllocations(Array.isArray(data) ? data : []);
    } catch {
      setLeaveAllocations([]);
    }
  }, []);

  useEffect(() => { loadLeaveAllocations(); }, [loadLeaveAllocations]);

  // Extract unpaid & paid leaves used from leave allocations
  function getUnpaidLeavesUsed(leaveBalances) {
    if (!leaveBalances) return 0;
    const unpaid = leaveBalances["unpaid"];
    if (!unpaid) return 0;
    return Number(unpaid.used) || 0;
  }

  function getPaidLeavesUsed(leaveBalances) {
    if (!leaveBalances) return 0;
    const paid = leaveBalances["paid"];
    if (!paid) return 0;
    return Number(paid.used) || 0;
  }

  const unpaidLeavesMap = useMemo(() => {
    const map = {};
    leaveAllocations.forEach((rec) => {
      map[rec.employeeId] = getUnpaidLeavesUsed(rec.leaveBalances);
    });
    return map;
  }, [leaveAllocations]);

  const paidLeavesMap = useMemo(() => {
    const map = {};
    leaveAllocations.forEach((rec) => {
      map[rec.employeeId] = getPaidLeavesUsed(rec.leaveBalances);
    });
    return map;
  }, [leaveAllocations]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const local = getLocalRecords();
    const localToday = local[date] || [];
    let list = localToday.map((r) => ({
      ...r,
      breakMinutes: r.breakMinutes || 60,
      checkInPeriod: r.checkInPeriod || "AM",
      checkOutPeriod: r.checkOutPeriod || "PM",
    }));
    setRecords(list.length ? list : []);
    try {
      const data = await getAttendanceBase();
      let apiList = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        breakMinutes: r.breakMinutes || 60,
        checkInPeriod: r.checkInPeriod || "AM",
        checkOutPeriod: r.checkOutPeriod || "PM",
      }));
      apiList = mergeLocalIntoRecords(apiList, date);
      setRecords(apiList);
    } catch {
      if (!list.length) addToast?.("Loaded from local storage.", "info");
    } finally {
      setLoading(false);
    }
  }, [addToast, date]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  function todayStr() {
    return toLocalDateStr(new Date());
  }

  function isFutureDate(dateStr) {
    return !!dateStr && dateStr > todayStr();
  }

  const historyRequestIdRef = useRef(0);
  const allRecordsCacheRef = useRef(null); // { data, fetchedAt }
  const ALL_CACHE_TTL_MS = 60_000; // reuse the full dataset for up to 60s across filter switches

  const loadHistory = useCallback(async (days) => {
    const requestId = ++historyRequestIdRef.current;
    setHistoryLoading(true);
    const local = getLocalRecords();
    const range = days === 0 ? null : getDateRange(days, filterStartDate);

    const localSeen = new Map();
    Object.values(local).flat().forEach((rec) => {
      if (!rec?.date) return;
      // Only include records inside the selected date-range filter
      if (range && (rec.date < range.start || rec.date > range.end)) return;
      localSeen.set(`${rec.employeeId}-${rec.date}`, rec);
    });
    if (requestId === historyRequestIdRef.current) {
      setHistoryRecords([...localSeen.values()]);
    }

    // Reuse a recently-fetched full dataset instead of hitting the network again —
    // this is what makes switching between 1W/1M/4M/6M/1Y/ALL feel instant after the first load.
    const cache = allRecordsCacheRef.current;
    const cacheFresh = cache && Date.now() - cache.fetchedAt < ALL_CACHE_TTL_MS;
    if (cacheFresh) {
      const scoped = range
        ? cache.data.filter((rec) => rec?.date && rec.date >= range.start && rec.date <= range.end)
        : cache.data;
      if (requestId === historyRequestIdRef.current) {
        const seen = new Map();
        scoped.forEach((rec) => { seen.set(`${rec.employeeId || rec.employee}-${rec.date}`, rec); });
        setHistoryRecords([...seen.values()]);
        setHistoryLoading(false);
      }
      return;
    }

    try {
      let data;
      if (days === 0) {
        data = await getAttendanceRecords();
        data = Array.isArray(data) ? data : [];
      } else {
        const { start, end } = range;
        data = await getAttendanceHistory(start, end);
        data = Array.isArray(data) ? data : [];
        // Defensive client-side scoping in case the API doesn't bound results itself
        data = data.filter((rec) => rec?.date && rec.date >= start && rec.date <= end);
      }
      // Only "ALL" fetches represent the complete dataset, so only that response is cache-worthy
      if (days === 0) {
        allRecordsCacheRef.current = { data, fetchedAt: Date.now() };
      }
      if (data.length && requestId === historyRequestIdRef.current) {
        const seen = new Map();
        data.forEach((rec) => { seen.set(`${rec.employeeId || rec.employee}-${rec.date}`, rec); });
        setHistoryRecords([...seen.values()]);
      }
    } catch {
      // already showing local data
    } finally {
      if (requestId === historyRequestIdRef.current) setHistoryLoading(false);
    }
  }, [filterStartDate]);

  useEffect(() => {
    loadHistory(timeRange);
  }, [timeRange, loadHistory]);

  const loadHolidays = useCallback(async () => {
    setHolidaysLoading(true);
    try {
      const data = await getHolidays();
      setHolidays(Array.isArray(data) ? data : data?.items || []);
    } catch {
      setHolidays([]);
    } finally {
      setHolidaysLoading(false);
    }
  }, []);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const holidayDates = useMemo(() => {
    const set = new Set();
    holidays.forEach((h) => { if (h.date) set.add(h.date); });
    return set;
  }, [holidays]);

  function isWorkingDay(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    if (excludeWeekends && (day === 0 || day === 6)) return false;
    if (excludeHolidays && holidayDates.has(dateStr)) return false;
    return true;
  }

  // Track manually set overrides per employee
  const [workingDaysOverride, setWorkingDaysOverride] = useState({});
  const [absentOverride, setAbsentOverride] = useState({});

  function updateWorkingDay(employeeId, value) {
    setWorkingDaysOverride((prev) => ({
      ...prev,
      [employeeId]: Math.max(0, Number(value) || 0),
    }));
  }

  function updateAbsent(employeeId, value) {
    setAbsentOverride((prev) => ({
      ...prev,
      [employeeId]: Math.max(0, Number(value) || 0),
    }));
  }

  // Aggregate history records by employee — only days that have actually occurred count
  // toward completed attendance stats; future/scheduled entries are excluded here.
  const employeeAttendanceSummary = useMemo(() => {
    const map = {};
    (Array.isArray(historyRecords) ? historyRecords : [])
      .filter((rec) => !isFutureDate(rec.date))
      .forEach((rec) => {
      const key = rec.employeeId || rec.employee || rec.name || "unknown";
      if (!map[key]) {
        map[key] = {
          employeeId: rec.employeeId,
          name: rec.name || rec.employee || "Unknown",
          department: rec.department || "",
          present: 0,
          absent: 0,
          leave: 0,
          totalHours: 0,
          days: 0,
        };
      }
      if (rec.status === "present") map[key].present++;
      else if (rec.status === "absent") map[key].absent++;
      else if (rec.status === "leave") map[key].leave++;
      map[key].days++;
      map[key].totalHours += Number(rec.hours || rec.totalHours || 0);
    });

    // If no history records, fall back to today's records for per-employee view
    if (Object.keys(map).length === 0) {
      records.forEach((r) => {
        const key = r.employeeId || r.name || "unknown";
        if (!map[key]) {
          map[key] = {
            employeeId: r.employeeId,
            name: r.name,
            department: r.department || "",
            present: r.status === "present" ? 1 : 0,
            absent: r.status === "absent" ? 1 : 0,
            leave: r.status === "leave" ? 1 : 0,
            totalHours: Number(r.hours || 0),
            days: 1,
          };
        }
      });
    }

    const isAll = timeRange === 0;

    return Object.values(map).map((emp) => ({
      ...emp,
      absent: absentOverride[emp.employeeId] ?? (isAll
        ? emp.absent + (unpaidLeavesMap[emp.employeeId] ?? 0) + (paidLeavesMap[emp.employeeId] ?? 0)
        : emp.leave + (paidLeavesMap[emp.employeeId] ?? 0)),
      unpaidLeaves: unpaidLeavesMap[emp.employeeId] ?? 0,
      workingDays: workingDaysOverride[emp.employeeId] ?? Math.max(0, isAll
        ? emp.present - (unpaidLeavesMap[emp.employeeId] ?? 0)
        : emp.present - emp.leave),
    }));
  }, [historyRecords, records, timeRange, workingDaysOverride, absentOverride, unpaidLeavesMap, paidLeavesMap]);

  const filteredSummary = useMemo(() => {
    if (!employeeSearch.trim()) return employeeAttendanceSummary;
    const q = employeeSearch.toLowerCase();
    return employeeAttendanceSummary.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
    );
  }, [employeeAttendanceSummary, employeeSearch]);

  function updateRecord(idx, field, value) {
    setRecords((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function handleResetAll() {
    if (!window.confirm("Delete ALL attendance records (local & backend)? This cannot be undone.")) return;
    try { localStorage.removeItem(LS_KEY); } catch {}
    allRecordsCacheRef.current = null;
    setRecords([]);
    setHistoryRecords([]);
    clearAttendanceRecords()
      .then(() => { loadHistory(timeRange); })
      .catch(() => {
        addToast?.("Cleared locally. Backend data could not be deleted — it may reappear on refresh.", "warning");
      });
    addToast?.("All attendance data cleared.", "success");
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = records.map((r) => ({
        employeeId: r.employeeId,
        name: r.name,
        date: date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        checkInPeriod: r.checkInPeriod || "AM",
        checkOutPeriod: r.checkOutPeriod || "PM",
        breakMinutes: Number(r.breakMinutes) || 0,
        hours: String(calculateDecimalHours(r.checkIn, r.checkOut, r.breakMinutes, r.checkInPeriod, r.checkOutPeriod)),
        status: r.status,
        rewards: Number(r.rewards) || 0,
        bonus: Number(r.bonus) || 0,
        otherCompensation: Number(r.otherCompensation) || 0,
        notes: r.notes,
      }));
      const local = getLocalRecords();
      local[date] = payload;
      setLocalRecords(local);
      await saveAttendanceRecords(payload);
      allRecordsCacheRef.current = null;
      addToast?.("Attendance records saved.", "success");
      await loadHistory(timeRange);
    } catch {
      addToast?.("Failed to save records.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkStartDate || !bulkEndDate || !bulkClockIn || !bulkClockOut) {
      addToast?.("Please fill in start date, end date, clock in, and clock out.", "error");
      return;
    }
    if (bulkStartDate > bulkEndDate) {
      addToast?.("Start date must be before end date.", "error");
      return;
    }
    if (bulkMode === "single" && !bulkEmployeeId) {
      addToast?.("Please select an employee.", "error");
      return;
    }
    setBulkGenerating(true);
    try {
      const ci24 = to24h(bulkClockIn, bulkClockInPeriod);
      const co24 = to24h(bulkClockOut, bulkClockOutPeriod);
      const breakMins = Number(bulkBreak) || 0;
      const hrs = calculateDecimalHours(bulkClockIn, bulkClockOut, bulkBreak, bulkClockInPeriod, bulkClockOutPeriod);

      // Determine which employees to generate for
      let targetEmployees = [];
      if (bulkMode === "single") {
        const emp = records.find((r) => r.employeeId === Number(bulkEmployeeId));
        if (emp) targetEmployees.push(emp);
      } else {
        targetEmployees = records;
      }

      // Generate records for each working day
      const toSave = [];
      const start = new Date(bulkStartDate + "T00:00:00");
      const end = new Date(bulkEndDate + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d);
        if (!isWorkingDay(dateStr)) continue;
        targetEmployees.forEach((emp) => {
          toSave.push({
            employeeId: emp.employeeId,
            name: emp.name,
            date: dateStr,
            checkIn: ci24,
            checkOut: co24,
            checkInPeriod: bulkClockInPeriod,
            checkOutPeriod: bulkClockOutPeriod,
            breakMinutes: breakMins,
            hours: String(hrs),
            status: "present",
            rewards: 0,
            bonus: 0,
            otherCompensation: 0,
            notes: "",
          });
        });
      }

      if (toSave.length === 0) {
        addToast?.("No working days found in the selected range.", "info");
        setBulkGenerating(false);
        return;
      }

      // Clear the date range from localStorage first, then insert new records
      const local = getLocalRecords();
      const dateSet = new Set(toSave.map((r) => r.date));
      dateSet.forEach((d) => { delete local[d]; });
      toSave.forEach((rec) => {
        if (!local[rec.date]) local[rec.date] = [];
        local[rec.date].push(rec);
      });
      setLocalRecords(local);

      // Merge with existing backend records so we don't create duplicates
      try {
        const existingBackend = await getAttendanceHistory(bulkStartDate, bulkEndDate);
        const merged = new Map();
        (Array.isArray(existingBackend) ? existingBackend : []).forEach((rec) => {
          merged.set(`${rec.employeeId || rec.employee}-${rec.date}`, rec);
        });
        toSave.forEach((rec) => {
          merged.set(`${rec.employeeId}-${rec.date}`, rec);
        });
        await saveAttendanceRecords([...merged.values()]);
      } catch {
        addToast?.("Backend save failed, but data saved locally.", "warning");
      }
      addToast?.(`Created ${toSave.length} attendance record(s).`, "success");
      allRecordsCacheRef.current = null;
      setBulkPreview([]);
      await loadRecords();
      await loadHistory(timeRange);
    } catch {
      addToast?.("Failed to generate bulk attendance.", "error");
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleBulkPreview = () => {
    if (!bulkStartDate || !bulkEndDate || !bulkClockIn || !bulkClockOut) {
      addToast?.("Please fill in start date, end date, clock in, and clock out.", "error");
      return;
    }
    if (bulkStartDate > bulkEndDate) {
      addToast?.("Start date must be before end date.", "error");
      return;
    }
    const preview = [];
    const start = new Date(bulkStartDate + "T00:00:00");
    const end = new Date(bulkEndDate + "T00:00:00");
    const ci24 = to24h(bulkClockIn, bulkClockInPeriod);
    const co24 = to24h(bulkClockOut, bulkClockOutPeriod);
    const totalHours = calculateHours(bulkClockIn, bulkClockOut, bulkBreak, bulkClockInPeriod, bulkClockOutPeriod);
    const decimalHours = calculateDecimalHours(bulkClockIn, bulkClockOut, bulkBreak, bulkClockInPeriod, bulkClockOutPeriod);
    let skipped = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateStr(d);
      if (!isWorkingDay(dateStr)) { skipped++; continue; }
      preview.push({ date: dateStr, clockIn: ci24, clockOut: co24, break: bulkBreak || "0", hours: totalHours, decimalHours });
    }
    setBulkPreview(preview);
    if (skipped > 0) {
      addToast?.(`${skipped} non-working day(s) excluded (weekends/holidays).`, "info");
    }
  };

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const onLeave = records.filter((r) => r.status === "leave").length;
  const totalRewards = records.reduce((s, r) => s + (Number(r.rewards) || 0), 0);
  const totalBonus = records.reduce((s, r) => s + (Number(r.bonus) || 0), 0);
  const totalOther = records.reduce((s, r) => s + (Number(r.otherCompensation) || 0), 0);
  const totalWorkingDays = filteredSummary.reduce((s, e) => s + (e.workingDays || e.present), 0);

  return (
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#19C58A] flex items-center justify-center shadow-[0_2px_8px_rgba(25,197,138,0.3)]">
            <CalendarCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">Attendance & Compensation</h1>
            <p className="text-[13px] font-medium text-[#9E9690]">Track attendance, rewards, and bonuses for payroll</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
            />
            {isFutureDate(date) && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F8A60A] bg-[#F8A60A]/10 rounded-full px-3 py-1">
                Scheduled — upcoming day
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[12px] p-1">
            <button
              type="button"
              onClick={() => setDate(todayStr())}
              className="px-3 py-1.5 rounded-[10px] text-[13px] font-semibold text-[#9E9690] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] hover:text-[#1A1816] dark:hover:text-[#F0EDE8] transition-all"
            >Today</button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 1);
                setDate(toLocalDateStr(d));
              }}
              className="px-3 py-1.5 rounded-[10px] text-[13px] font-semibold text-[#9E9690] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] hover:text-[#1A1816] dark:hover:text-[#F0EDE8] transition-all"
            >+ Tomorrow</button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() + 7);
                setDate(toLocalDateStr(d));
              }}
              className="px-3 py-1.5 rounded-[10px] text-[13px] font-semibold text-[#9E9690] hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] hover:text-[#1A1816] dark:hover:text-[#F0EDE8] transition-all"
            >+ Next Week</button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#19C58A] rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)] hover:-translate-y-[1px] disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Records"}
          </button>
        </div>
      </div>
      <p className="text-[11px] font-medium text-[#9E9690] -mt-3">
        Tip: pick a future date above (or use the shortcuts) to pre-schedule attendance for upcoming days — it saves the same way, and won't count toward "Working Days" until that day actually arrives.
      </p>

      <div className="bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 w-fit flex flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
              activeTab === t.id ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#9E9690] hover:text-[#6B6560] dark:hover:text-[#A69B93]"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]">
              <div className="p-2.5 rounded-[12px] bg-[#9D7BF2]/10">
                <Users className="w-5 h-5 text-[#9D7BF2]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{records.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Total Employees</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]">
              <div className="p-2.5 rounded-[12px] bg-[#19C58A]/10">
                <CalendarCheck className="w-5 h-5 text-[#19C58A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{present}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Present</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]">
              <div className="p-2.5 rounded-[12px] bg-[#FF6E86]/10">
                <Clock className="w-5 h-5 text-[#FF6E86]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{absent}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Absent</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]">
              <div className="p-2.5 rounded-[12px] bg-[#35B6F5]/10">
                <CalendarDays className="w-5 h-5 text-[#35B6F5]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{onLeave}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">On Leave</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4">Today's Attendance</h3>
            {loading ? (
              <div className="text-center py-8 text-[#9E9690] text-[13px]">Loading employees...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck size={32} className="mx-auto mb-2 opacity-40" />
                No employees found. Add employees in the Employees section first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D9] dark:border-[#38312D]">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Employee</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Department</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Check In</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Check Out</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Break (min)</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
                    {records.map((r, i) => (
                      <tr key={r.employeeId || i} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#1A1816] dark:text-[#F0EDE8]">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[#19C58A]/10 flex items-center justify-center text-[11px] font-bold text-[#19C58A]">
                              {(r.name || "?").charAt(0).toUpperCase()}
                            </div>
                            {r.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6B6560] dark:text-[#A69B93]">{r.department || "-"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={r.status}
                            onChange={(e) => updateRecord(i, "status", e.target.value)}
                            className={`rounded-[10px] border px-2.5 py-1 text-[11px] font-bold focus:outline-none transition-all duration-200 ${
                              r.status === "present" ? "bg-[#19C58A]/10 border-[#19C58A]/20 text-[#19C58A]"
                              : r.status === "absent" ? "bg-[#FF6E86]/10 border-[#FF6E86]/20 text-[#FF6E86]"
                              : "bg-[#35B6F5]/10 border-[#35B6F5]/20 text-[#35B6F5]"
                            }`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={r.checkIn}
                              onChange={(e) => updateRecord(i, "checkIn", e.target.value)}
                              className="w-20 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                            />
                            <select
                              value={r.checkInPeriod}
                              onChange={(e) => updateRecord(i, "checkInPeriod", e.target.value)}
                              className="w-14 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-1 py-1 text-[12px] font-semibold text-[#6B6560] dark:text-[#A69B93] focus:outline-none focus:border-[#19C58A] transition-all duration-200"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              type="time"
                              value={r.checkOut}
                              onChange={(e) => updateRecord(i, "checkOut", e.target.value)}
                              className="w-20 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                            />
                            <select
                              value={r.checkOutPeriod}
                              onChange={(e) => updateRecord(i, "checkOutPeriod", e.target.value)}
                              className="w-14 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-1 py-1 text-[12px] font-semibold text-[#6B6560] dark:text-[#A69B93] focus:outline-none focus:border-[#19C58A] transition-all duration-200"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.breakMinutes}
                            onChange={(e) => updateRecord(i, "breakMinutes", e.target.value)}
                            className="w-16 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">
                            {calculateHours(r.checkIn, r.checkOut, r.breakMinutes, r.checkInPeriod, r.checkOutPeriod) || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4 flex items-center gap-2">
              <BadgePlus size={18} className="text-[#F8A60A]" />
              Bulk Attendance Generation
            </h3>
            <p className="text-[13px] text-[#9E9690] mb-6">
              Create attendance records for a date range with a single clock-in / clock-out / break template.
            </p>

            {/* Mode selection */}
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="bulkMode" value="single" checked={bulkMode === "single"}
                  onChange={() => setBulkMode("single")} className="accent-[#19C58A]" />
                <span className="text-[13px] font-medium text-[#1A1816] dark:text-[#F0EDE8]">Single Employee</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="bulkMode" value="all" checked={bulkMode === "all"}
                  onChange={() => setBulkMode("all")} className="accent-[#19C58A]" />
                <span className="text-[13px] font-medium text-[#1A1816] dark:text-[#F0EDE8]">All Employees</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {bulkMode === "single" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Employee</label>
                  <select value={bulkEmployeeId} onChange={(e) => setBulkEmployeeId(e.target.value)}
                    className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
                  >
                    <option value="">Select employee...</option>
                    {records.map((r) => (
                      <option key={r.employeeId} value={r.employeeId}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Start Date</label>
                <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">End Date</label>
                <input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Clock In</label>
                <div className="flex gap-1">
                  <input type="time" value={bulkClockIn} onChange={(e) => setBulkClockIn(e.target.value)}
                    className="flex-1 rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                  <select value={bulkClockInPeriod} onChange={(e) => setBulkClockInPeriod(e.target.value)}
                    className="w-16 rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-1 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] focus:outline-none focus:border-[#19C58A] transition-all duration-200"
                  ><option value="AM">AM</option><option value="PM">PM</option></select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Clock Out</label>
                <div className="flex gap-1">
                  <input type="time" value={bulkClockOut} onChange={(e) => setBulkClockOut(e.target.value)}
                    className="flex-1 rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                  <select value={bulkClockOutPeriod} onChange={(e) => setBulkClockOutPeriod(e.target.value)}
                    className="w-16 rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-1 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] focus:outline-none focus:border-[#19C58A] transition-all duration-200"
                  ><option value="AM">AM</option><option value="PM">PM</option></select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Break (minutes)</label>
                <input type="number" min="0" placeholder="e.g. 60" value={bulkBreak} onChange={(e) => setBulkBreak(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">Total Hours / Day</label>
                <div className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F0EDE8] dark:bg-[#2A2520] px-3.5 py-2.5 text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">
                  {calculateHours(bulkClockIn, bulkClockOut, bulkBreak, bulkClockInPeriod, bulkClockOutPeriod) || "—"}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-1.5">1 Day = ? Hours</label>
                <input type="number" min="1" step="0.5" placeholder="8" value={standardHoursPerDay} onChange={(e) => setStandardHoursPerDay(e.target.value)}
                  className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3.5 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-[#F8F7F4] dark:bg-[#1A1816] rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={excludeWeekends} onChange={(e) => setExcludeWeekends(e.target.checked)} className="accent-[#19C58A] rounded" />
                <span className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">Exclude Sat &amp; Sun</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={excludeHolidays} onChange={(e) => setExcludeHolidays(e.target.checked)} className="accent-[#19C58A] rounded" />
                <span className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">Exclude Holidays <span className="text-[11px] text-[#9E9690]">({holidays.length} loaded)</span></span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[#E5E0D9] dark:border-[#38312D]">
              <button onClick={handleBulkPreview}
                className="flex items-center gap-2 border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] rounded-[12px] px-5 py-2.5 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] transition-all duration-200 hover:border-[#19C58A] hover:text-[#19C58A]"
              ><CalendarRange size={15} />Preview</button>
              <button onClick={handleBulkGenerate} disabled={bulkGenerating}
                className="flex items-center gap-2 bg-[#19C58A] rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)] hover:-translate-y-[1px] disabled:opacity-50"
              ><BadgePlus size={15} />{bulkGenerating ? "Generating..." : "Generate & Save"}</button>
            </div>

            {/* Preview table */}
            {bulkPreview.length > 0 && (
              <div className="mt-6">
                <h4 className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8] mb-2">Preview — {bulkPreview.length} working day(s) to be created</h4>
                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-[#E5E0D9] dark:border-[#38312D] rounded-[12px]">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#F8F7F4] dark:bg-[#1A1816] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Day</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">In</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Out</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Break</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
                      {bulkPreview.map((p, i) => (
                        <tr key={i} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors">
                          <td className="px-3 py-2 text-[12px] text-[#6B6560] dark:text-[#A69B93]">{p.date}</td>
                          <td className="px-3 py-2 text-[12px] text-[#9E9690]">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(p.date+"T00:00:00").getDay()]}</td>
                          <td className="px-3 py-2 text-[12px] text-[#6B6560] dark:text-[#A69B93]">{p.clockIn}</td>
                          <td className="px-3 py-2 text-[12px] text-[#6B6560] dark:text-[#A69B93]">{p.clockOut}</td>
                          <td className="px-3 py-2 text-[12px] text-[#6B6560] dark:text-[#A69B93]">{p.break} min</td>
                          <td className="px-3 py-2 text-[12px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{p.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "records" && (
        <div className="space-y-4">
          {/* Time Range + Search Filter */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Attendance Records</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[12px] px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <CalendarDays size={14} className="text-[#9E9690]" />
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
                  className="text-xs border-none outline-none bg-transparent text-[#6B6560] dark:text-[#A69B93] font-medium w-28" />
              </div>
              {timeRange > 0 && (
                <span className="text-[11px] text-[#9E9690]">
                  → {getDateRange(timeRange, filterStartDate).end}
                </span>
              )}
              <div className="flex gap-1 bg-[#F0EDE8] dark:bg-[#38312D] rounded-[12px] p-1">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setTimeRange(r.days)}
                    className={`px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all ${
                      timeRange === r.days
                        ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                        : "text-[#9E9690] hover:text-[#6B6560] dark:hover:text-[#A69B93]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={handleResetAll}
                className="flex items-center gap-1.5 border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] rounded-[12px] px-3 py-1.5 text-[12px] font-semibold text-[#FF6E86] transition-all duration-200 hover:border-[#FF6E86]">
                <Trash2 size={14} />
                Reset Data
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Employee Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9690]" />
              <input
                type="text"
                placeholder="Search by employee name or department..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] pl-9 pr-3 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
              />
            </div>

            {historyLoading ? (
              <div className="text-center py-8 text-[#9E9690] text-[13px]">Loading records...</div>
            ) : employeeAttendanceSummary.length === 0 ? (
              <div className="text-center py-8">
                <List size={32} className="mx-auto mb-2 opacity-40" />
                No attendance records found for this period
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#F8F7F4] dark:bg-[#1A1816] rounded-[12px] p-3 text-center border border-[#E5E0D9] dark:border-[#38312D]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Employees</p>
                    <p className="text-[18px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{filteredSummary.length}</p>
                  </div>
                  <div className="bg-[#19C58A]/10 rounded-[12px] p-3 text-center border border-[#19C58A]/20">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#19C58A]">Working Days</p>
                    <p className="text-[18px] font-bold text-[#19C58A]">{totalWorkingDays}</p>
                  </div>
                  <div className="bg-[#FF6E86]/10 rounded-[12px] p-3 text-center border border-[#FF6E86]/20">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#FF6E86]">No. Absent</p>
                    <p className="text-[18px] font-bold text-[#FF6E86]">{filteredSummary.reduce((s, e) => s + e.absent, 0)}</p>
                  </div>
                  <div className="bg-[#9D7BF2]/10 rounded-[12px] p-3 text-center border border-[#9D7BF2]/20 cursor-pointer hover:shadow-[0_4px_14px_rgba(157,123,242,0.2)] transition-all" onClick={() => navigate("/payroll/leaves")}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#9D7BF2]">Unpaid Leaves</p>
                    <p className="text-[18px] font-bold text-[#9D7BF2]">{filteredSummary.reduce((s, e) => s + (Number(e.unpaidLeaves) || 0), 0)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E0D9] dark:border-[#38312D]">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Employee</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Department</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">No. Absent</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Unpaid Leaves</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Working Days</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
                      {filteredSummary.map((emp, i) => (
                        <tr key={emp.employeeId || i} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1A1816] dark:text-[#F0EDE8]">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-[#19C58A]/10 flex items-center justify-center text-[11px] font-bold text-[#19C58A]">
                                {(emp.name || "?").charAt(0).toUpperCase()}
                              </div>
                              {emp.name}
                            </div>
                        </td>
                          <td className="px-4 py-3 text-[#6B6560] dark:text-[#A69B93]">{emp.department || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={emp.absent}
                              onChange={(e) => updateAbsent(emp.employeeId, e.target.value)}
                              className="w-16 rounded-[10px] border border-[#FF6E86]/20 bg-[#FF6E86]/5 px-2 py-1 text-[12px] font-bold text-center text-[#FF6E86] focus:outline-none focus:border-[#FF6E86] focus:ring-2 focus:ring-[#FF6E86]/20 transition-all duration-200"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              title="Unpaid leaves taken — click to manage in Payroll Leaves"
                              className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-[#9D7BF2]/10 text-[#9D7BF2] text-[11px] font-bold cursor-pointer hover:bg-[#9D7BF2]/20 transition-all"
                              onClick={() => navigate("/payroll/leaves")}
                            >
                              {emp.unpaidLeaves}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={emp.workingDays}
                              onChange={(e) => updateWorkingDay(emp.employeeId, e.target.value)}
                              className="w-16 rounded-[10px] border border-[#F8A60A]/20 bg-[#F8A60A]/5 px-2 py-1 text-[12px] font-bold text-center text-[#F8A60A] focus:outline-none focus:border-[#F8A60A] focus:ring-2 focus:ring-[#F8A60A]/20 transition-all duration-200"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#6B6560] dark:text-[#A69B93]">{formatHours(emp.totalHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#9E9690] mt-2">No. Absent and Working Days are editable inline. Unpaid Leaves are from Payroll Leaves — click to manage. Save to persist.</p>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "compensation" && (
        <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Rewards, Bonus & Other Compensation</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-[#19C58A] font-semibold"><Gift size={14} /> Rewards: ${totalRewards}</span>
              <span className="flex items-center gap-1 text-[#35B6F5] font-semibold"><DollarSign size={14} /> Bonus: ${totalBonus}</span>
              <span className="flex items-center gap-1 text-[#9D7BF2] font-semibold"><Plus size={14} /> Other: ${totalOther}</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-[#9E9690] text-[13px]">Loading employees...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D9] dark:border-[#38312D]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Employee</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Department</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Rewards ($)</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Bonus ($)</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Other ($)</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
                  {records.map((r, i) => (
                    <tr key={r.employeeId || i} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1A1816] dark:text-[#F0EDE8]">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[#19C58A]/10 flex items-center justify-center text-[11px] font-bold text-[#19C58A]">
                              {(r.name || "?").charAt(0).toUpperCase()}
                            </div>
                            {r.name}
                          </div>
                        </td>
                      <td className="px-4 py-3 text-[#6B6560] dark:text-[#A69B93]">{r.department || "-"}</td>
                      <td className="px-4 py-3">
                        <select value={r.status} onChange={(e) => updateRecord(i, "status", e.target.value)}
                          className={`rounded-[10px] border px-2.5 py-1 text-[11px] font-bold focus:outline-none transition-all duration-200 ${
                            r.status === "present" ? "bg-[#19C58A]/10 border-[#19C58A]/20 text-[#19C58A]"
                            : r.status === "absent" ? "bg-[#FF6E86]/10 border-[#FF6E86]/20 text-[#FF6E86]"
                            : "bg-[#35B6F5]/10 border-[#35B6F5]/20 text-[#35B6F5]"
                          }`}
                        >
                          {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" placeholder="0" value={r.rewards}
                          onChange={(e) => updateRecord(i, "rewards", e.target.value)}
                          className="w-24 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" placeholder="0" value={r.bonus}
                          onChange={(e) => updateRecord(i, "bonus", e.target.value)}
                          className="w-24 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min="0" placeholder="0" value={r.otherCompensation}
                          onChange={(e) => updateRecord(i, "otherCompensation", e.target.value)}
                          className="w-24 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" placeholder="-" value={r.notes}
                          onChange={(e) => updateRecord(i, "notes", e.target.value)}
                          className="w-32 rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-2 py-1 text-[12px] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4">Attendance Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">Total Employees</span>
                <span className="text-[18px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{records.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] text-[#19C58A] font-medium">Present</span>
                <span className="text-[18px] font-bold text-[#19C58A]">{present}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] text-[#FF6E86] font-medium">Absent</span>
                <span className="text-[18px] font-bold text-[#FF6E86]">{absent}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] text-[#35B6F5] font-medium">On Leave</span>
                <span className="text-[18px] font-bold text-[#35B6F5]">{onLeave}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] text-[#F8A60A] font-medium">Total Working Days (selected period)</span>
                <span className="text-[18px] font-bold text-[#F8A60A]">{totalWorkingDays}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4">Compensation Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="flex items-center gap-2 text-sm text-[#6B6560] dark:text-[#A69B93]"><Gift size={14} className="text-[#19C58A]" /> Total Rewards</span>
                <span className="text-[18px] font-bold text-[#19C58A]">${totalRewards}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="flex items-center gap-2 text-sm text-[#6B6560] dark:text-[#A69B93]"><DollarSign size={14} className="text-[#35B6F5]" /> Total Bonus</span>
                <span className="text-[18px] font-bold text-[#35B6F5]">${totalBonus}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="flex items-center gap-2 text-sm text-[#6B6560] dark:text-[#A69B93]"><Plus size={14} className="text-[#9D7BF2]" /> Other Compensation</span>
                <span className="text-[18px] font-bold text-[#9D7BF2]">${totalOther}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#E5E0D9] dark:border-[#38312D]">
                <span className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Total Additional Pay</span>
                <span className="text-[18px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">${totalRewards + totalBonus + totalOther}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-[12px] bg-[#F8A60A]/10 border border-[#F8A60A]/20 p-4">
            <p className="text-[11px] font-bold text-[#F8A60A] mb-1 uppercase tracking-widest">Payroll Impact</p>
            <p className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">
              Attendance status, rewards, and bonuses are used to calculate accurate payroll.
              Absences and leaves affect gross pay. Rewards and bonuses are added as additional pay
              components. Save records before creating a payroll run to include this data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}