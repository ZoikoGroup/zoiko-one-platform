import { useState, useEffect } from "react";
import { ArrowLeft, Users, Clock, CalendarCheck, AlertTriangle, DollarSign, Gift, Plus } from "lucide-react";
import { getEmployeesWithAttendance, getRunById } from "../../../service/payrollService";

const lifecycleSteps = ["Draft", "Review", "Approved", "Authorized", "Paid", "Closed"];

export default function RunDetailPage({ run, onBack }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runData, setRunData] = useState(run);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        let target = run;
        if (!target.employeeIds && target.id) {
          const full = await getRunById(target.id);
          if (full) target = full;
        }
        if (!cancelled) setRunData(target);

        if (target?.employeeIds?.length) {
          const data = await getEmployeesWithAttendance();
          if (!cancelled) {
            const filtered = (Array.isArray(data) ? data : []).filter(
              (e) => target.employeeIds.includes(e.id)
            );
            setEmployees(filtered);
          }
        }
      } catch {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [run]);

  if (!runData) return null;
  const stepIdx = lifecycleSteps.indexOf(runData.status);

  const present = employees.filter((e) => e.attendanceStatus === "present").length;
  const absent = employees.filter((e) => e.attendanceStatus === "absent").length;
  const leave = employees.filter((e) => e.attendanceStatus === "leave").length;
  const totalRewards = employees.reduce((s, e) => s + (Number(e.rewards) || 0), 0);
  const totalBonus = employees.reduce((s, e) => s + (Number(e.bonus) || 0), 0);
  const totalOther = employees.reduce((s, e) => s + (Number(e.otherCompensation) || 0), 0);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-semibold">
        <ArrowLeft size={14} /> All Runs
      </button>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/15 p-6">
        <p className="text-xs text-slate-500 font-mono font-bold">{runData.id}</p>
        <h2 className="text-xl font-extrabold text-slate-800">{runData.period}</h2>
        <p className="text-sm text-slate-500">Pay Date: {runData.payDate}</p>
      </div>

      <div className="flex items-center gap-0 bg-white rounded-3xl border border-slate-200 px-6 py-5 shadow-sm overflow-x-auto">
        {lifecycleSteps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 min-w-[70px]">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                i <= stepIdx ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300"
              }`}>{i <= stepIdx ? "✓" : i + 1}</div>
              <p className={`text-[9px] font-bold ${i <= stepIdx ? "text-emerald-600" : "text-slate-400"}`}>{step}</p>
            </div>
            {i < lifecycleSteps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 -mt-3 ${i < stepIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["Gross Pay", runData.gross],
          ["Deductions", runData.deductions],
          ["Taxes", runData.taxes],
          ["Employer Cont.", runData.employerContribution],
          ["Net Pay", runData.net],
        ].map(([label, val]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-extrabold text-slate-800">{val ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Employee Attendance Breakdown */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-emerald-500" />
            Employees in this Run ({employees.length})
          </h3>
          {employees.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {present} Present</span>
              <span className="flex items-center gap-1 text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" /> {absent} Absent</span>
              <span className="flex items-center gap-1 text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-500" /> {leave} On Leave</span>
            </div>
          )}
        </div>

        {/* Compensation Summary */}
        {employees.length > 0 && (totalRewards > 0 || totalBonus > 0 || totalOther > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 flex items-center justify-center gap-1"><Gift size={12} /> Rewards</p>
              <p className="text-lg font-bold text-emerald-700">${totalRewards}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 flex items-center justify-center gap-1"><DollarSign size={12} /> Bonus</p>
              <p className="text-lg font-bold text-blue-700">${totalBonus}</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
              <p className="text-xs text-violet-600 flex items-center justify-center gap-1"><Plus size={12} /> Other</p>
              <p className="text-lg font-bold text-violet-700">${totalOther}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-sm text-slate-400">Loading employee data...</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            No employee data available for this run
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">CTC</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Attendance</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Rewards</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Bonus</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Other</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{emp.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{emp.department || "-"}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{emp.annualCtc || emp.ctc || "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        emp.attendanceStatus === "present" ? "bg-emerald-100 text-emerald-700"
                        : emp.attendanceStatus === "absent" ? "bg-red-100 text-red-700"
                        : emp.attendanceStatus === "leave" ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                      }`}>
                        {emp.attendanceStatus || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600">${Number(emp.rewards) || 0}</td>
                    <td className="px-4 py-2.5 font-semibold text-blue-600">${Number(emp.bonus) || 0}</td>
                    <td className="px-4 py-2.5 font-semibold text-violet-600">${Number(emp.otherCompensation) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(absent > 0 || leave > 0) && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Payroll Impact:</strong> {absent} absent and {leave} on-leave employees may affect gross pay,
              deductions, and net pay calculations. Review attendance records before finalizing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}