import { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, Download, ChevronRight, CheckCircle2, AlertCircle, Clock, Sliders, Receipt } from "lucide-react";
import { useToast } from "../ToastContext";
import PayslipFilters from "./PayslipFilters";
import PayslipStub from "./PayslipStub";
import PayslipDownloadButton from "./PayslipDownloadButton";
import { getPayslips, getEmployees, downloadPayslip } from "../../../service/payrollService";

const statusConfig = {
  Paid:     { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  Pending:  { color: "bg-amber-100 text-amber-700",     icon: Clock        },
  Failed:   { color: "bg-red-100 text-red-700",         icon: AlertCircle  },
};

const tabs = [
  { id: "payslips",       label: "Payslips",       icon: FileText },
  { id: "payslip-detail", label: "Payslip Detail", icon: Receipt },
  { id: "filters",        label: "Filters",        icon: Sliders },
];

export default function PayslipsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("payslips");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("All Periods");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPayslips({
        search: search || undefined,
        period: periodFilter !== "All Periods" ? periodFilter : undefined,
        employeeId: employeeFilter || undefined,
      });
      setPayslips(data);
    } catch {
      setError("Failed to load payslips. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, periodFilter, employeeFilter]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  useEffect(() => {
    getEmployees().then(setEmployees).catch(() => {});
  }, []);

  const periods = useMemo(
    () => ["All Periods", ...Array.from(new Set(payslips.map((p) => p.period))).filter(Boolean)],
    [payslips]
  );

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(payslips.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => ({
    total: payslips.length,
    paid: payslips.filter((p) => p.status === "Paid").length,
    pending: payslips.filter((p) => p.status === "Pending").length,
  }), [payslips]);

  const handleBulkDownload = async () => {
    const toDownload = payslips.filter((p) => selected.has(p.id));
    for (const p of toDownload) {
      try {
        await downloadPayslip(p);
      } catch {
        addToast?.(`Failed to download payslip ${p.id}.`, "error");
      }
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payslips</h1>
            <p className="text-slate-500 text-sm">{stats.total} payslips · {stats.paid} distributed</p>
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
              activeTab === t.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Payslips tab */}
      {activeTab === "payslips" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-violet-50">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Payslips</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.paid}</p>
                <p className="text-xs text-slate-500">Distributed</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-amber-50">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <PayslipFilters
            search={search} onSearchChange={setSearch}
            periodFilter={periodFilter} onPeriodChange={setPeriodFilter}
            employeeFilter={employeeFilter} onEmployeeChange={setEmployeeFilter}
            employees={employees}
            periods={periods}
          />

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-2xl text-sm">
              <span className="font-semibold text-violet-700">{selected.size} selected</span>
              <button
                onClick={handleBulkDownload}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-violet-700 transition"
              >
                <Download size={12} /> Download Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-auto">
                Clear Selection
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading payslips…</div>
            ) : error ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={loadPayslips} className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                  Retry
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3.5 w-10">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 rounded border-slate-300 text-violet-600" />
                    </th>
                    {["Payslip ID","Employee","Department","Pay Period","Pay Date","Net Pay","Status",""].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payslips.map((p) => {
                    const sc = statusConfig[p.status] || statusConfig.Paid;
                    const Icon = sc.icon;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => handleSelect(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600"
                          />
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500 font-semibold">{p.id}</td>
                        <td className="px-5 py-4">
                          <button onClick={() => setSelectedPayslip(p)} className="font-semibold text-slate-800 hover:text-violet-600 text-left">
                            {p.employee}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{p.department}</td>
                        <td className="px-5 py-4 text-slate-600">{p.period}</td>
                        <td className="px-5 py-4 text-slate-600">{p.payDate}</td>
                        <td className="px-5 py-4 font-bold text-slate-800">₹{Number(p.netPay || 0).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`flex items-center gap-1.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc.color}`}>
                            <Icon size={11} /> {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <PayslipDownloadButton payslip={p} />
                            <button onClick={() => { setSelectedPayslip(p); setActiveTab("payslip-detail"); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && !error && payslips.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No payslips match your filters.</div>
            )}
          </div>

          {/* Stub modal (backward compat) */}
          {selectedPayslip && activeTab !== "payslip-detail" && (
            <PayslipStub payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
          )}
        </>
      )}

      {/* Payslip Detail tab */}
      {activeTab === "payslip-detail" && (
        <>
          {selectedPayslip ? (
            <PayslipStub payslip={selectedPayslip} onClose={() => setActiveTab("payslips")} />
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Receipt size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a payslip from the Payslips tab to view details</p>
            </div>
          )}
        </>
      )}

      {/* Filters tab */}
      {activeTab === "filters" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Payslip Filters</h3>
          <PayslipFilters
            search={search} onSearchChange={setSearch}
            periodFilter={periodFilter} onPeriodChange={setPeriodFilter}
            employeeFilter={employeeFilter} onEmployeeChange={setEmployeeFilter}
            employees={employees}
            periods={periods}
          />
        </div>
      )}
    </div>
  );
}