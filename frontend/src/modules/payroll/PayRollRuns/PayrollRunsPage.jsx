import { useState, useEffect, useCallback } from "react";
import { PlayCircle, Plus, X, List, FileText, ArrowLeft, Search, Users, Clock, CalendarCheck, AlertTriangle } from "lucide-react";
import { useToast } from "../ToastContext";
import RunsTable from "./RunsTable";
import RunDetailPage from "./RunDetailPage";
import { fetchRuns, createRun, getEmployeesWithAttendance, getAttendanceSummaryForEmployees } from "../../../service/payrollService";

const tabs = [
  { id: "runs",   label: "Payroll Runs", icon: List },
  { id: "detail", label: "Run Detail",   icon: FileText },
];

export default function PayrollRunsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("runs");
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ period: "", payDate: "" });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadRuns = useCallback(async () => {
    const data = await fetchRuns();
    setRuns(data);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadEmployeesForRun = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const data = await getEmployeesWithAttendance();
      setEmployees(Array.isArray(data) ? data : []);
      const summary = await getAttendanceSummaryForEmployees();
      setAttendanceSummary(summary);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  const toggleEmployee = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map((e) => e.id));
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.department?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const selectedEmployeeData = employees.filter((e) => selectedEmployees.includes(e.id));
  const selectedPresent = selectedEmployeeData.filter((e) => e.attendanceStatus === "present").length;
  const selectedAbsent = selectedEmployeeData.filter((e) => e.attendanceStatus === "absent").length;
  const selectedLeave = selectedEmployeeData.filter((e) => e.attendanceStatus === "leave").length;
  const selectedRewards = selectedEmployeeData.reduce((s, e) => s + (Number(e.rewards) || 0), 0);
  const selectedBonus = selectedEmployeeData.reduce((s, e) => s + (Number(e.bonus) || 0), 0);
  const selectedOther = selectedEmployeeData.reduce((s, e) => s + (Number(e.otherCompensation) || 0), 0);

  const handleCreateRun = async () => {
    if (!form.period || !form.payDate) {
      addToast?.("Please fill in the pay period and pay date.", "error");
      return;
    }
    if (selectedEmployees.length === 0) {
      addToast?.("Please select at least one employee.", "error");
      return;
    }
    setCreating(true);
    try {
      const employeePayload = selectedEmployeeData.map((e) => ({
        id: e.id,
        name: e.name,
        attendanceStatus: e.attendanceStatus,
        rewards: Number(e.rewards) || 0,
        bonus: Number(e.bonus) || 0,
        otherCompensation: Number(e.otherCompensation) || 0,
        ctc: e.ctc,
        department: e.department,
      }));
      await createRun({ ...form, employees: employeePayload, employeeIds: selectedEmployees });
      addToast?.("Payroll run created.", "success");
      setShowCreateModal(false);
      setForm({ period: "", payDate: "" });
      setSelectedEmployees([]);
      await loadRuns();
    } catch {
      addToast?.("Failed to create payroll run. Please try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setSelectedEmployees([]);
    setEmployeeSearch("");
    loadEmployeesForRun();
    setShowCreateModal(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-7 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <PlayCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Runs</h1>
            <p className="text-slate-500 text-sm">{runs.length} total runs</p>
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Payroll Runs tab */}
      {activeTab === "runs" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <Plus size={15} /> Create Run
            </button>
          </div>

          <RunsTable
            runs={runs}
            onSelect={(run) => { setSelectedRun(run); setActiveTab("detail"); }}
          />

          {showCreateModal && (
            <>
              <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={() => setShowCreateModal(false)} />
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-800">Create Payroll Run</h3>
                    <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Pay Period</label>
                      <input
                        type="text"
                        placeholder="e.g. Jul 1–15, 2026"
                        value={form.period}
                        onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">Pay Date</label>
                      <input
                        type="date"
                        value={form.payDate}
                        onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Employee Selection */}
                  <div>
                    <label className="text-xs text-slate-500 mb-2 block font-medium">
                      Select Employees ({selectedEmployees.length} selected)
                    </label>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name or department..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-400 focus:bg-white"
                      />
                    </div>

                    {loadingEmployees ? (
                      <div className="text-center py-4 text-sm text-slate-400">Loading employees...</div>
                    ) : employees.length === 0 ? (
                      <div className="text-center py-4 text-sm text-slate-400">No employees found. Add employees first.</div>
                    ) : (
                      <>
                        {/* Attendance Summary for selected */}
                        {selectedEmployees.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="bg-emerald-50 rounded-xl p-2 text-center">
                                <p className="text-xs font-bold text-emerald-700">{selectedPresent}</p>
                                <p className="text-[10px] text-emerald-600">Present</p>
                              </div>
                              <div className="bg-red-50 rounded-xl p-2 text-center">
                                <p className="text-xs font-bold text-red-700">{selectedAbsent}</p>
                                <p className="text-[10px] text-red-600">Absent</p>
                              </div>
                              <div className="bg-blue-50 rounded-xl p-2 text-center">
                                <p className="text-xs font-bold text-blue-700">{selectedLeave}</p>
                                <p className="text-[10px] text-blue-600">On Leave</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-2 text-center">
                                <p className="text-xs font-bold text-slate-700">{selectedEmployeeData.length}</p>
                                <p className="text-[10px] text-slate-600">Total</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-emerald-50/50 rounded-xl p-1.5 text-center border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-700">${selectedRewards}</p>
                                <p className="text-[9px] text-emerald-600">Rewards</p>
                              </div>
                              <div className="bg-blue-50/50 rounded-xl p-1.5 text-center border border-blue-100">
                                <p className="text-xs font-bold text-blue-700">${selectedBonus}</p>
                                <p className="text-[9px] text-blue-600">Bonus</p>
                              </div>
                              <div className="bg-violet-50/50 rounded-xl p-1.5 text-center border border-violet-100">
                                <p className="text-xs font-bold text-violet-700">${selectedOther}</p>
                                <p className="text-[9px] text-violet-600">Other</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 sticky top-0">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                              onChange={toggleAllEmployees}
                              className="rounded border-slate-300"
                            />
                            <span className="text-xs font-semibold text-slate-500">Select All</span>
                          </div>
                          {filteredEmployees.map((emp) => {
                            const compTotal = (Number(emp.rewards) || 0) + (Number(emp.bonus) || 0) + (Number(emp.otherCompensation) || 0);
                            return (
                            <label
                              key={emp.id}
                              className={`flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                                selectedEmployees.includes(emp.id) ? "bg-emerald-50/50" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={() => toggleEmployee(emp.id)}
                                className="rounded border-slate-300"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{emp.name}</p>
                                <p className="text-xs text-slate-400">{emp.department || emp.designation || ""}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {compTotal > 0 && (
                                  <span className="text-[10px] font-semibold text-amber-600">+${compTotal}</span>
                                )}
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  emp.attendanceStatus === "present" ? "bg-emerald-100 text-emerald-700"
                                  : emp.attendanceStatus === "absent" ? "bg-red-100 text-red-700"
                                  : emp.attendanceStatus === "leave" ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                                }`}>
                                  {emp.attendanceStatus || "unknown"}
                                </span>
                              </div>
                            </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateRun}
                      disabled={creating || selectedEmployees.length === 0}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {creating ? "Creating…" : `Create Run (${selectedEmployees.length} employees)`}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Run Detail tab */}
      {activeTab === "detail" && (
        <>
          {selectedRun ? (
            <RunDetailPage
              run={selectedRun}
              onBack={() => setActiveTab("runs")}
            />
          ) : (
            <div className="text-center py-16 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a run from Payroll Runs tab to view details</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}