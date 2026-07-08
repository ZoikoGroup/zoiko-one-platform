import { useState, useEffect, useCallback } from "react";
import { BarChart3, FileSpreadsheet, FileText, Download, TrendingUp, DollarSign, Users } from "lucide-react";
import { useToast } from "../ToastContext";
import { getPayrollReports } from "../../../service/payrollService";

const tabs = [
  { id: "payroll-reports",   label: "Payroll Reports",  icon: BarChart3 },
  { id: "tax-reports",       label: "Tax Reports",      icon: FileText },
  { id: "compliance-reports", label: "Compliance",      icon: FileSpreadsheet },
];

export default function ReportsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("payroll-reports");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayrollReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      addToast?.("Failed to load reports.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/15 p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Reports</h1>
            <p className="text-slate-500 text-sm">Generate and download payroll reports</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "payroll-reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-blue-50">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{reports.length}</p>
                <p className="text-xs text-slate-500">Total Reports</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-50">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">--</p>
                <p className="text-xs text-slate-500">This Period</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2.5 rounded-xl bg-amber-50">
                <Download className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">0</p>
                <p className="text-xs text-slate-500">Downloads</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No reports yet</p>
                <p className="text-xs text-slate-400 mt-1">Reports will appear here once payroll runs are completed</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Report Name</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Period</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Generated</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reports.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{r.name || "Payroll Report"}</td>
                      <td className="px-5 py-4 text-slate-600">{r.period || "-"}</td>
                      <td className="px-5 py-4 text-slate-600">{r.generatedAt || r.generated || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
                          {r.status || "available"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition">
                          <Download size={12} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "tax-reports" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Tax Reports</h3>
          <div className="space-y-4">
            {[
              { name: "Annual Tax Summary", desc: "Yearly tax deductions and liabilities" },
              { name: "TDS Report", desc: "Tax deducted at source for all employees" },
              { name: "Form 16 Summary", desc: "Employee-wise Form 16 data" },
              { name: "PF Statement", desc: "Provident fund contribution report" },
              { name: "ESI Report", desc: "Employee state insurance summary" },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{report.name}</p>
                  <p className="text-xs text-slate-400">{report.desc}</p>
                </div>
                <button className="flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition">
                  <Download size={12} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "compliance-reports" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Compliance Reports</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: "Compliance Checklist", icon: FileText, color: "text-violet-600" },
              { name: "Statutory Filings", icon: FileSpreadsheet, color: "text-blue-600" },
              { name: "Audit Trail", icon: FileText, color: "text-amber-600" },
              { name: "Regulatory Submissions", icon: FileSpreadsheet, color: "text-emerald-600" },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <report.icon size={18} className={report.color} />
                  <p className="text-sm font-semibold text-slate-700">{report.name}</p>
                </div>
                <button className="flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 transition">
                  <Download size={12} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
