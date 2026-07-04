import { Search } from "lucide-react";

export default function PayslipFilters({
  search,
  onSearchChange,
  periodFilter,
  onPeriodChange,
  employeeFilter,
  onEmployeeChange,
  employees,
  periods = ["All Periods"],
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by employee name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-violet-400 transition"
        />
      </div>
      <select
        value={periodFilter}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-violet-400"
      >
        {periods.map((p) => <option key={p}>{p}</option>)}
      </select>
      <select
        value={employeeFilter}
        onChange={(e) => onEmployeeChange(e.target.value)}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-violet-400"
      >
        <option value="">All Employees</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.name}</option>
        ))}
      </select>
    </div>
  );
}