import { useState, useMemo, useEffect, useCallback } from "react";
import { FileText, Download, ChevronRight, CheckCircle2, AlertCircle, Clock, Receipt } from "lucide-react";
import { useToast } from "../ToastContext";
import PayslipFilters from "./PayslipFilters";
import PayslipStub from "./PayslipStub";
import PayslipDownloadButton from "./PayslipDownloadButton";
import { getPayslips, getEmployees, downloadPayslip, getCompanyProfile } from "../../../service/payrollService";
import { formatCurrency } from "../../../utils/currency";

const statusConfig = {
  Paid:     { color: "bg-[#19C58A]/10 text-[#19C58A]", icon: CheckCircle2 },
  Pending:  { color: "bg-[#F8A60A]/10 text-[#F8A60A]", icon: Clock       },
  Failed:   { color: "bg-[#FF6E86]/10 text-[#FF6E86]", icon: AlertCircle },
};

const tabs = [
  { id: "payslips",       label: "Payslips",       icon: FileText },
  { id: "payslip-detail", label: "Payslip Detail", icon: Receipt },
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
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [companyProfile, setCompanyProfile] = useState(null);

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

  useEffect(() => {
    getCompanyProfile().then((p) => {
      if (p?.currency) setCurrencyCode(p.currency);
      if (p) setCompanyProfile(p);
    }).catch(() => {});
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
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-5">
      <div className="rounded-[18px] bg-[#19C58A]/5 border border-[#19C58A]/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#19C58A] flex items-center justify-center shadow-[0_2px_8px_rgba(25,197,138,0.3)]">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">Payslips</h1>
            <p className="text-[13px] font-medium text-[#9E9690]">{stats.total} payslips · {stats.paid} distributed</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === "payslip-detail" && !selectedPayslip && payslips.length > 0) {
                setSelectedPayslip(payslips[0]);
              }
              setActiveTab(t.id);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
              activeTab === t.id ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#9E9690] hover:text-[#6B6560]"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "payslips" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="p-2.5 rounded-[12px] bg-[#19C58A]/10">
                <FileText className="w-5 h-5 text-[#19C58A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{stats.total}</p>
                <p className="text-[13px] text-[#9E9690]">Total Payslips</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="p-2.5 rounded-[12px] bg-[#19C58A]/10">
                <CheckCircle2 className="w-5 h-5 text-[#19C58A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{stats.paid}</p>
                <p className="text-[13px] text-[#9E9690]">Distributed</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="p-2.5 rounded-[12px] bg-[#F8A60A]/10">
                <Clock className="w-5 h-5 text-[#F8A60A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{stats.pending}</p>
                <p className="text-[13px] text-[#9E9690]">Pending</p>
              </div>
            </div>
          </div>

          <PayslipFilters
            search={search} onSearchChange={setSearch}
            periodFilter={periodFilter} onPeriodChange={setPeriodFilter}
            employeeFilter={employeeFilter} onEmployeeChange={setEmployeeFilter}
            employees={employees}
            periods={periods}
          />

          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#19C58A]/5 border border-[#19C58A]/20 rounded-[18px] text-[13px]">
              <span className="font-semibold text-[#19C58A]">{selected.size} selected</span>
              <button
                onClick={handleBulkDownload}
                className="flex items-center gap-1.5 rounded-[12px] bg-[#19C58A] text-white px-4 py-1.5 text-[12px] font-bold transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)] hover:shadow-[0_4px_14px_rgba(25,197,138,0.4)]"
              >
                <Download size={12} /> Download Selected
              </button>
              <button onClick={() => setSelected(new Set())} className="text-[12px] text-[#9E9690] hover:text-[#FF6E86] font-medium ml-auto">
                Clear Selection
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-4 h-4 rounded bg-[#F0EDE8] dark:bg-[#38312D]" />
                    <div className="w-16 h-3 rounded bg-[#F0EDE8] dark:bg-[#38312D]" />
                    <div className="w-32 h-3 rounded bg-[#F0EDE8] dark:bg-[#38312D]" />
                    <div className="w-24 h-3 rounded bg-[#F0EDE8] dark:bg-[#38312D]" />
                    <div className="w-20 h-3 rounded bg-[#F0EDE8] dark:bg-[#38312D]" />
                    <div className="flex-1" />
                    <div className="w-16 h-5 rounded-full bg-[#F0EDE8] dark:bg-[#38312D]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-[13px] text-[#FF6E86]">{error}</p>
                <button onClick={loadPayslips} className="text-[13px] font-bold text-[#19C58A] hover:text-[#15B07A] transition-all duration-200">
                  Retry
                </button>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E0D9] dark:border-[#38312D]">
                    <th className="px-4 py-3.5 w-10">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 rounded border-[#E5E0D9] dark:border-[#38312D] text-[#19C58A]" />
                    </th>
                    {["Payslip ID","Employee","Department","Pay Period","Pay Date","Net Pay","Status",""].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D9]/50 dark:divide-[#38312D]/50">
                  {payslips.map((p) => {
                    const sc = statusConfig[p.status] || statusConfig.Paid;
                    const Icon = sc.icon;
                    return (
                      <tr key={p.id} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors duration-150">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => handleSelect(p.id)}
                            className="w-4 h-4 rounded border-[#E5E0D9] dark:border-[#38312D] text-[#19C58A]"
                          />
                        </td>
                        <td className="px-5 py-4 font-mono text-[12px] text-[#9E9690] font-semibold">{p.id}</td>
                        <td className="px-5 py-4">
                          <button onClick={() => setSelectedPayslip(p)} className="font-semibold text-[#1A1816] dark:text-[#F0EDE8] hover:text-[#19C58A] text-left transition-colors duration-200">
                            {p.employee}
                          </button>
                        </td>
                        <td className="px-5 py-4 text-[#6B6560] dark:text-[#A69B93]">{p.department}</td>
                        <td className="px-5 py-4 text-[#6B6560] dark:text-[#A69B93]">{p.period}</td>
                        <td className="px-5 py-4 text-[#6B6560] dark:text-[#A69B93]">{p.payDate}</td>
                        <td className="px-5 py-4 font-bold text-[#1A1816] dark:text-[#F0EDE8]">{formatCurrency(p.netPay || 0, currencyCode)}</td>
                        <td className="px-5 py-4">
                          <span className={`flex items-center gap-1.5 w-fit rounded-full px-3 py-1 text-[11px] font-bold ${sc.color}`}>
                            <Icon size={11} /> {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <PayslipDownloadButton payslip={p} />
                            <button onClick={() => { setSelectedPayslip(p); setActiveTab("payslip-detail"); }} className="p-1.5 rounded-[10px] text-[#9E9690] hover:text-[#1A1816] dark:hover:text-[#F0EDE8] hover:bg-[#F0EDE8] dark:hover:bg-[#38312D] transition-all duration-150">
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
              <div className="text-center py-16">
                <FileText size={40} className="mx-auto mb-3 text-[#9E9690]/40" />
                <p className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">No payslips match your filters</p>
                <p className="text-[13px] text-[#9E9690] mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {selectedPayslip && activeTab !== "payslip-detail" && (
            <PayslipStub payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} currencyCode={currencyCode} company={companyProfile} />
          )}
        </>
      )}

      {activeTab === "payslip-detail" && (
        <>
          {selectedPayslip ? (
            <PayslipStub payslip={selectedPayslip} onClose={() => { setSelectedPayslip(null); setActiveTab("payslips"); }} currencyCode={currencyCode} company={companyProfile} />
          ) : (
            <div className="text-center py-16">
              <Receipt size={40} className="mx-auto mb-3 text-[#9E9690]/40" />
              <p className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Select a payslip from the Payslips tab to view details</p>
            </div>
          )}
        </>
      )}


    </div>
  );
}