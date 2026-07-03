// ─────────────────────────────────────────────────────────────────────────────
// Employees.jsx
// Zoiko Payroll — Employee Registry.
// Source of worker records for this payroll run. Employee records originate
// in Zoiko HR; this view is the payroll-specific projection: salary, PAN,
// bank, readiness status, and deduction configuration.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  Users, Search, Filter, ChevronDown, X,
  CheckCircle2, AlertCircle, User, Briefcase,
  CreditCard, FileText, DollarSign, TrendingUp,
} from "lucide-react";
import { usePayroll } from "./PayrollContext";

const drawerTabs = [
  { label: "Personal",   icon: User      },
  { label: "Payroll",    icon: DollarSign },
  { label: "Tax",        icon: FileText   },
  { label: "Bank",       icon: CreditCard },
  { label: "Deductions", icon: Briefcase  },
  { label: "YTD",        icon: TrendingUp },
];

export default function Employees() {
  const { employees, addEmployee, updateEmployee, addToast } = usePayroll();
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState(null);
  const [drawerTab,    setDrawerTab]    = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editForm,     setEditForm]     = useState(null);

  const emptyNewEmp = {
    name: "", dept: "Engineering", type: "Full-time", salary: "",
    status: "Active", pan: "", bankName: "", bankAcc: "", bankIfsc: "", bankType: "Savings",
  };
  const [newEmpForm, setNewEmpForm] = useState(emptyNewEmp);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDrawer = (emp) => { setSelected(emp); setEditForm({ ...emp }); setDrawerTab(0); };
  const handleEditChange = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveProfile = () => {
    if (!editForm) return;
    updateEmployee(selected.id, editForm);
    setSelected(null);
    setEditForm(null);
  };

  const handleAddSubmit = () => {
    if (!newEmpForm.name || !newEmpForm.salary) {
      addToast("Enter employee name and salary before saving.", "error");
      return;
    }
    addEmployee({ ...newEmpForm, salary: parseFloat(newEmpForm.salary) || 0 });
    setAddModalOpen(false);
    setNewEmpForm(emptyNewEmp);
  };

  return (
    <div className="p-6 space-y-5 relative">

      {/* ── Header ── */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Employee Registry</h1>
            <p className="text-slate-500 text-sm">
              {employees.length} employees · {employees.filter((e) => e.ready).length} payroll-ready
              · Records sourced from Zoiko HR
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-violet-400 transition"
          />
        </div>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:border-slate-300 transition">
          <Filter size={14} /> Filter <ChevronDown size={13} />
        </button>
        <button
          onClick={() => setAddModalOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          + Add Employee
        </button>
      </div>

      {/* ── Employee Table ── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {["Employee ID","Name","Department","Type","Salary","Status","Payroll Ready"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((emp) => (
              <tr key={emp.id} onClick={() => handleOpenDrawer(emp)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{emp.id}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{emp.name}</td>
                <td className="px-5 py-4 text-slate-600">{emp.dept}</td>
                <td className="px-5 py-4 text-slate-600">{emp.type}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">₹{Number(emp.salary).toLocaleString()}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    emp.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{emp.status}</span>
                </td>
                <td className="px-5 py-4">
                  {emp.ready
                    ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Ready</span>
                    : <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><AlertCircle size={13} /> Blocked</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Profile Drawer ── */}
      {selected && editForm && (
        <>
          <div className="fixed inset-0 z-30 bg-slate-900/10" onClick={() => setSelected(null)} />
          <aside className="fixed right-0 top-0 bottom-0 z-40 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-800">{selected.name}</p>
                <p className="text-xs text-slate-400 font-mono">{selected.id} · {selected.dept}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.ready
                  ? <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Payroll Ready</span>
                  : <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Blocked</span>}
                <button onClick={() => setSelected(null)} className="rounded-xl p-1.5 hover:bg-slate-100">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Tab strip */}
            <div className="flex gap-1 px-4 py-3 border-b border-slate-100 overflow-x-auto">
              {drawerTabs.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setDrawerTab(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    drawerTab === i ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Personal */}
              {drawerTab === 0 && (
                <div className="space-y-4">
                  {[
                    { label: "Full Name",  field: "name",   type: "text", el: "input" },
                  ].map((f) => (
                    <div key={f.field}>
                      <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                      <input type="text" value={editForm[f.field]} onChange={(e) => handleEditChange(f.field, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Department</label>
                    <select value={editForm.dept} onChange={(e) => handleEditChange("dept", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                      {["Engineering","Marketing","Finance","HR","Sales","Design"].map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Employment Status</label>
                    <select value={editForm.status} onChange={(e) => handleEditChange("status", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                      {["Active","On Leave","Suspended"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Payroll */}
              {drawerTab === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Monthly Salary (₹)</label>
                    <input type="number" value={editForm.salary}
                      onChange={(e) => handleEditChange("salary", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                  </div>
                  <div className="text-xs text-slate-500 space-y-2 pt-2">
                    <p className="font-semibold text-slate-700">Salary Component Split (auto-calculated):</p>
                    {[
                      { label: "Basic Pay (40%)",           val: editForm.salary * 0.4  },
                      { label: "HRA (20%)",                 val: editForm.salary * 0.2  },
                      { label: "Special Allowance (40%)",   val: editForm.salary * 0.4  },
                    ].map((c) => (
                      <div key={c.label} className="flex justify-between border-b py-1">
                        <span>{c.label}</span>
                        <span className="font-mono">₹{Number(c.val).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax */}
              {drawerTab === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">PAN Tax ID</label>
                    <input type="text" value={editForm.pan || ""}
                      onChange={(e) => handleEditChange("pan", e.target.value)}
                      placeholder="Resolves EXC-001 when added"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                  </div>
                  {!editForm.pan && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                      Missing PAN will block TDS calculation and create a Hard Exception on the run.
                    </div>
                  )}
                </div>
              )}

              {/* Bank */}
              {drawerTab === 3 && (
                <div className="space-y-4">
                  {[
                    { label: "Bank Name",       field: "bankName" },
                    { label: "Account Number",  field: "bankAcc"  },
                    { label: "IFSC Code",       field: "bankIfsc" },
                  ].map((f) => (
                    <div key={f.field}>
                      <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                      <input type="text" value={editForm[f.field] || ""}
                        onChange={(e) => handleEditChange(f.field, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                  ))}
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-700">
                    Bank detail changes auto-sync with ZoikoPay and recheck for payment exceptions.
                  </div>
                </div>
              )}

              {/* Deductions */}
              {drawerTab === 4 && (
                <div className="space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700 mb-2">Statutory Contributions (Monthly):</p>
                  {[
                    { label: "PF Employee (12% of Basic)",      val: Math.round(editForm.salary * 0.4 * 0.12) },
                    { label: "ESI Employee (0.75% of Gross)",   val: Math.round(editForm.salary * 0.0075)     },
                    { label: "Professional Tax (fixed)",        val: 200                                        },
                  ].map((c) => (
                    <div key={c.label} className="flex justify-between border-b py-1.5">
                      <span>{c.label}</span>
                      <span className="font-mono">₹{c.val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* YTD */}
              {drawerTab === 5 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Year-to-Date Summary (6 months)</p>
                  {[
                    { label: "YTD Gross Payout",    val: editForm.salary * 6                              },
                    { label: "YTD TDS Deducted",    val: editForm.salary * 6 * 0.1                        },
                    { label: "YTD PF Contributed",  val: Math.round(editForm.salary * 6 * 0.4 * 0.12)     },
                    { label: "YTD Net Payout",      val: Math.round(editForm.salary * 6 * 0.8)             },
                  ].map((f) => (
                    <div key={f.label} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                      <span className="text-slate-400">{f.label}</span>
                      <span className="font-bold text-slate-800">₹{Number(f.val).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 flex gap-2 bg-slate-50">
              <button onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Discard
              </button>
              <button onClick={handleSaveProfile}
                className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white shadow hover:bg-violet-700">
                Save Profile
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Add Employee Modal ── */}
      {addModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAddModalOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <p className="text-lg font-extrabold">Add New Employee</p>
                  <p className="text-xs opacity-75">Enter payroll-critical details to enrol</p>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="rounded-xl p-1.5 bg-white/10 hover:bg-white/20">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name *",        field: "name",    type: "text"   },
                    { label: "Monthly Salary (₹) *", field: "salary", type: "number" },
                    { label: "PAN Tax ID",         field: "pan",     type: "text"   },
                    { label: "Bank Name",          field: "bankName",type: "text"   },
                    { label: "Account Number",     field: "bankAcc", type: "text"   },
                    { label: "IFSC Code",          field: "bankIfsc",type: "text"   },
                  ].map((f) => (
                    <div key={f.field}>
                      <label className="text-xs text-slate-500 mb-1 block font-medium">{f.label}</label>
                      <input type={f.type} value={newEmpForm[f.field]}
                        onChange={(e) => setNewEmpForm((prev) => ({ ...prev, [f.field]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white" />
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block font-medium">Department</label>
                    <select value={newEmpForm.dept} onChange={(e) => setNewEmpForm((p) => ({ ...p, dept: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                      {["Engineering","Marketing","Finance","HR","Sales","Design"].map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block font-medium">Employment Type</label>
                    <select value={newEmpForm.type} onChange={(e) => setNewEmpForm((p) => ({ ...p, type: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                      {["Full-time","Part-time","Contract"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAddModalOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={handleAddSubmit}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg transition-all">
                    Add Employee
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}