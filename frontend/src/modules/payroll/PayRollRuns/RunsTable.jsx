import { MoreVertical, Download } from "lucide-react";

function fmtCurrencyLocal(n, fmtCurrency) {
  if (fmtCurrency) return fmtCurrency(n);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function getInitials(name) {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const DEPT_COLORS = {
  Engineering: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Marketing:   { bg: "bg-sky-50",     text: "text-sky-700" },
  Sales:       { bg: "bg-amber-50",   text: "text-amber-700" },
  Finance:     { bg: "bg-violet-50",  text: "text-violet-700" },
  HR:          { bg: "bg-cyan-50",    text: "text-cyan-700" },
  Operations:  { bg: "bg-orange-50",  text: "text-orange-700" },
};

function Avatar({ name }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 flex-shrink-0">
      {getInitials(name)}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm text-slate-400">No payroll runs found. Create your first run to get started.</p>
    </div>
  );
}

export default function RunsTable({
  runs = [],
  employees = [],
  selectedEmployees = [],
  toggleEmployee,
  toggleAllEmployees,
  onSelect,
  onDelete,
  onDownload,
  isWizardMode = false,
  fmtCurrency,
}) {
  if (!isWizardMode && runs.length === 0) return <EmptyState />;
  if (isWizardMode && employees.length === 0) return <EmptyState />;

  const allSelected =
    isWizardMode &&
    employees.length > 0 &&
    selectedEmployees.length === employees.length;

  if (isWizardMode) {
    const contribCols = employees[0]?.contribComponents || [];

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2.5 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAllEmployees} className="rounded border-slate-300 h-3.5 w-3.5 text-teal-600 focus:ring-teal-400" />
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Gross Pay</th>
              {contribCols.map((c) => (
                <th key={c.id} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</th>
              ))}
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Tax</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Extra / Benefits</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Net Pay</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => {
              const dept = DEPT_COLORS[emp.department] || { bg: "bg-slate-50", text: "text-slate-600" };
              const isSelected = selectedEmployees.includes(emp.id);
              const extraBenefits = emp.monthlyExtra ?? ((Number(emp.rewards) || 0) + (Number(emp.bonus) || 0) + (Number(emp.otherCompensation) || 0));
              return (
                <tr key={emp.id} className={`transition-colors ${isSelected ? "bg-teal-50/50" : "hover:bg-slate-50"}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleEmployee(emp.id)} className="rounded border-slate-300 h-3.5 w-3.5 text-teal-600 focus:ring-teal-400" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.name} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs whitespace-nowrap">{emp.name}</span>
                        {emp.attendanceStatus && emp.attendanceStatus !== "unknown" && (
                          <span className={`text-[9px] font-bold ${
                            emp.attendanceStatus === "present" ? "text-emerald-500" :
                            emp.attendanceStatus === "absent" ? "text-red-500" :
                            emp.attendanceStatus === "leave" ? "text-amber-500" :
                            "text-slate-400"
                          }`}>
                            {emp.attendanceStatus === "present" ? "● Present" :
                             emp.attendanceStatus === "absent" ? "● Absent" :
                             emp.attendanceStatus === "leave" ? "● On Leave" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${dept.bg} ${dept.text}`}>
                      {emp.department || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-teal-600 whitespace-nowrap">
                    {fmtCurrencyLocal(emp.monthlyGross, fmtCurrency)}
                  </td>
                  {(emp.contribComponents || []).map((comp) => (
                    <td key={comp.id} className="px-3 py-2.5 text-right text-xs font-semibold text-amber-600 whitespace-nowrap">
                      {fmtCurrencyLocal(comp.value, fmtCurrency)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <span className="text-xs font-semibold text-red-500">{fmtCurrencyLocal(emp.monthlyTax, fmtCurrency)}</span>
                    {emp.taxSlabRate && emp.taxSlabRate !== "—" && emp.taxSlabRate !== "Nil" && (
                      <span className="ml-1 text-[9px] font-bold text-slate-400 bg-slate-100 rounded px-1 py-px">{emp.taxSlabRate}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-teal-500 whitespace-nowrap">
                    {fmtCurrencyLocal(extraBenefits, fmtCurrency)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-sky-600 whitespace-nowrap">
                    {fmtCurrencyLocal(emp.monthlyNet, fmtCurrency)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      Ready
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {["Run ID", "Pay Period", "Pay Date", "Employees", "Gross", "Net", "Status", ""].map((col) => (
              <th key={col} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {runs.map((run) => (
            <tr key={run.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onSelect?.(run)}>
              <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500">{run.id}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-800">{run.period}</td>
              <td className="px-5 py-4 text-xs text-slate-600">{run.payDate}</td>
              <td className="px-5 py-4 text-xs text-slate-700">{run.employees?.toLocaleString()}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-800">{run.gross}</td>
              <td className="px-5 py-4 text-xs font-bold text-teal-600">{run.net}</td>
              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {run.status}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onDownload?.(run.id); }} title="Download payslips" className="rounded-lg p-1.5 text-teal-500 hover:text-teal-700 hover:bg-teal-50 transition-colors">
                    <Download size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete?.(run.id); }} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-400">No payroll runs found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
