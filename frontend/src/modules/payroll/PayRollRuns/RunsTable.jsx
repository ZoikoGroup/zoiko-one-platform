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
  Engineering: { bg: "bg-[#19C58A]/10", text: "text-[#19C58A]" },
  Marketing:   { bg: "bg-[#35B6F5]/10", text: "text-[#35B6F5]" },
  Sales:       { bg: "bg-[#F8A60A]/10", text: "text-[#F8A60A]" },
  Finance:     { bg: "bg-[#9D7BF2]/10", text: "text-[#9D7BF2]" },
  HR:          { bg: "bg-[#35B6F5]/10", text: "text-[#35B6F5]" },
  Operations:  { bg: "bg-[#F8A60A]/10", text: "text-[#F8A60A]" },
};

function Avatar({ name }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8F7F4] dark:bg-[#2A2520] text-[10px] font-bold text-[#6B6560] dark:text-[#A69B93] flex-shrink-0">
      {getInitials(name)}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-1">No payroll runs found</p>
      <p className="text-[13px] text-[#9E9690]">Create your first run to get started.</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Draft:       "bg-[#35B6F5]/10 text-[#35B6F5]",
    Processing:  "bg-[#F8A60A]/10 text-[#F8A60A]",
    Review:      "bg-[#F8A60A]/10 text-[#F8A60A]",
    Approved:    "bg-[#19C58A]/10 text-[#19C58A]",
    Paid:        "bg-[#19C58A]/10 text-[#19C58A]",
    Rejected:    "bg-[#FF6E86]/10 text-[#FF6E86]",
    Failed:      "bg-[#FF6E86]/10 text-[#FF6E86]",
  };
  const cls = map[status] || "bg-[#35B6F5]/10 text-[#35B6F5]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
      {status}
    </span>
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
            <tr className="bg-[#F8F7F4] dark:bg-[#2A2520] border-b border-[#E5E0D9] dark:border-[#38312D]">
              <th className="px-3 py-2.5 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAllEmployees} className="rounded border-[#E5E0D9] dark:border-[#38312D] h-3.5 w-3.5 text-[#19C58A] focus:ring-[#19C58A]" />
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Employee</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Department</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Payable Days</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Gross Pay</th>
              {contribCols.map((c) => (
                <th key={c.id} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">{c.label}</th>
              ))}
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Tax</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Extra / Benefits</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Net Pay</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]/50">
            {employees.map((emp) => {
              const dept = DEPT_COLORS[emp.department] || { bg: "bg-[#F8F7F4] dark:bg-[#2A2520]", text: "text-[#6B6560] dark:text-[#A69B93]" };
              const isSelected = selectedEmployees.includes(emp.id);
              const extraBenefits = emp.monthlyExtra ?? ((Number(emp.rewards) || 0) + (Number(emp.bonus) || 0) + (Number(emp.otherCompensation) || 0));
              return (
                <tr key={emp.id} className={`transition-colors ${isSelected ? "bg-[#19C58A]/5 dark:bg-[#19C58A]/10" : "hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520]"}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleEmployee(emp.id)} className="rounded border-[#E5E0D9] dark:border-[#38312D] h-3.5 w-3.5 text-[#19C58A] focus:ring-[#19C58A]" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.name} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1A1816] dark:text-[#F0EDE8] text-xs whitespace-nowrap">{emp.name}</span>
                        {emp.attendanceStatus && emp.attendanceStatus !== "unknown" && (
                          <span className={`text-[9px] font-bold ${
                            emp.attendanceStatus === "present" ? "text-[#19C58A]" :
                            emp.attendanceStatus === "absent" ? "text-[#FF6E86]" :
                            emp.attendanceStatus === "leave" ? "text-[#F8A60A]" :
                            "text-[#9E9690]"
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
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {emp.payableDays != null && emp.totalWorkingDays != null ? (
                      <span className={`text-xs font-semibold ${emp.prorated ? "text-amber-500" : "text-[#9E9690]"}`}>
                        {emp.payableDays}/{emp.totalWorkingDays}{emp.prorated ? " ⚠" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9E9690]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-[#1A1816] dark:text-[#F0EDE8] whitespace-nowrap">
                    {fmtCurrencyLocal(emp.monthlyGross, fmtCurrency)}
                  </td>
                  {(emp.contribComponents || []).map((comp) => (
                    <td key={comp.id} className="px-3 py-2.5 text-right text-xs font-semibold text-[#9D7BF2] whitespace-nowrap">
                      {fmtCurrencyLocal(comp.value, fmtCurrency)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <span className="text-xs font-semibold text-[#FF6E86]">{fmtCurrencyLocal(emp.monthlyTax, fmtCurrency)}</span>
                    {emp.taxSlabRate && emp.taxSlabRate !== "—" && emp.taxSlabRate !== "Nil" && (
                      <span className={`ml-1 text-[9px] font-bold rounded px-1 py-px ${
                        emp.taxSlabRate.includes("87A rebate")
                          ? "text-[#19C58A] bg-[#19C58A]/10"
                          : "text-[#9E9690] bg-[#F8F7F4] dark:bg-[#2A2520]"
                      }`}>{emp.taxSlabRate}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-[#9D7BF2] whitespace-nowrap">
                    {fmtCurrencyLocal(extraBenefits, fmtCurrency)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-[#35B6F5] whitespace-nowrap">
                    {fmtCurrencyLocal(emp.monthlyNet, fmtCurrency)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-[#19C58A]/10 text-[#19C58A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#19C58A]" />
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
          <tr className="bg-[#F8F7F4] dark:bg-[#2A2520] border-b border-[#E5E0D9] dark:border-[#38312D]">
            {["Run ID", "Pay Period", "Pay Date", "Employees", "Gross", "Net", "Status", ""].map((col) => (
              <th key={col} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F8F7F4] dark:divide-[#38312D]/50">
          {runs.map((run) => (
            <tr key={run.id} className="cursor-pointer transition-colors hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520]" onClick={() => onSelect?.(run)}>
              <td className="px-5 py-4 font-mono text-xs font-semibold text-[#9E9690]">{run.id}</td>
              <td className="px-5 py-4 text-xs font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{run.period}</td>
              <td className="px-5 py-4 text-xs text-[#9E9690]">{run.payDate}</td>
              <td className="px-5 py-4 text-xs text-[#6B6560] dark:text-[#A69B93]">{run.employees?.toLocaleString()}</td>
              <td className="px-5 py-4 text-xs font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{run.gross}</td>
              <td className="px-5 py-4 text-xs font-bold text-[#19C58A]">{run.net}</td>
              <td className="px-5 py-4">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onDownload?.(run.id); }} title="Download payslips" className="rounded-[10px] p-1.5 text-[#9E9690] hover:text-[#19C58A] hover:bg-[#19C58A]/10 transition-colors">
                    <Download size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete?.(run.id); }} className="rounded-[10px] p-1.5 text-[#9E9690] hover:text-[#FF6E86] hover:bg-[#FF6E86]/10 transition-colors">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-16 text-center text-[13px] text-[#9E9690]">No payroll runs found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}