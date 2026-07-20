import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart3, FileSpreadsheet, FileText, Download, TrendingUp, IndianRupee, Loader2 } from "lucide-react";
import { useToast } from "../ToastContext";
import { getPayrollReports, downloadReport, downloadRunPayslips, getEmployees, getPayslips, getCompanyProfile } from "../../../service/payrollService";
import { generateAnnualTaxSummary, generateTDSReport, generatePFStatement, generateESIReport } from "./pdfGenerators";

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
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadCount, setDownloadCount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [companyProfile, setCompanyProfile] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);

  const latestReport = useMemo(() => {
    if (!reports.length) return null;
    return [...reports].sort((a, b) => {
      const dateA = new Date(a.generatedAt || a.generated || 0);
      const dateB = new Date(b.generatedAt || b.generated || 0);
      return dateB - dateA;
    })[0];
  }, [reports]);

  const handleDownloadReport = useCallback(async (report) => {
    if (!report?.id) return;
    setDownloadingId(report.id);
    try {
      await downloadReport(report.id);
      setDownloadCount((c) => c + 1);
      addToast?.("Report downloaded successfully.", "success");
    } catch {
      addToast?.("Failed to download report.", "error");
    } finally {
      setDownloadingId(null);
    }
  }, [addToast]);

  const handleDownloadLatestRun = useCallback(async () => {
    if (!latestReport) {
      addToast?.("No payroll runs available to download.", "info");
      return;
    }
    setDownloadingId(latestReport.id);
    try {
      await downloadRunPayslips(latestReport.id);
      setDownloadCount((c) => c + 1);
      addToast?.("Report downloaded successfully.", "success");
    } catch {
      addToast?.("Failed to download report.", "error");
    } finally {
      setDownloadingId(null);
    }
  }, [addToast, latestReport]);

  const handleDownloadNotAvailable = useCallback(() => {
    addToast?.("This report type is not yet available for the current cycle.", "info");
  }, [addToast]);

  const handleGenerateReport = useCallback(async (type) => {
    if (!payslips.length) {
      addToast?.("No payslip data available to generate reports.", "info");
      return;
    }
    setGeneratingReport(type);
    try {
      const generators = {
        "annual-tax": () => generateAnnualTaxSummary(employees, payslips, currencyCode, companyProfile),
        "tds": () => generateTDSReport(employees, payslips, currencyCode, companyProfile),
        "pf": () => generatePFStatement(employees, payslips, currencyCode, companyProfile),
        "esi": () => generateESIReport(employees, payslips, currencyCode, companyProfile),
      };
      const fn = generators[type];
      if (fn) {
        fn();
        setDownloadCount((c) => c + 1);
        addToast?.("Report generated and downloading.", "success");
      }
    } catch {
      addToast?.("Failed to generate report.", "error");
    } finally {
      setGeneratingReport(null);
    }
  }, [employees, payslips, currencyCode, companyProfile, addToast]);

  const thisPeriodLabel = useMemo(() => {
    if (!latestReport) return "--";
    return latestReport.period || "--";
  }, [latestReport]);

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

  useEffect(() => {
    getEmployees().then((data) => setEmployees(Array.isArray(data) ? data : [])).catch(() => {});
    getPayslips().then((data) => setPayslips(Array.isArray(data) ? data : [])).catch(() => {});
    getCompanyProfile().then((p) => {
      if (p?.currency) setCurrencyCode(p.currency);
      if (p) setCompanyProfile(p);
    }).catch(() => {});
  }, []);

  return (
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[12px] bg-[#19C58A] flex items-center justify-center shadow-[0_2px_8px_rgba(25,197,138,0.3)]">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">Payroll Reports</h1>
          <p className="text-[13px] font-medium text-[#9E9690]">Generate and download payroll reports</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[13px] font-semibold transition-all duration-200 ${
              activeTab === t.id ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#9E9690] hover:text-[#1A1816] dark:hover:text-[#F0EDE8]"
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
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200">
              <div className="p-2.5 rounded-[12px] bg-[#19C58A]/10">
                <IndianRupee className="w-5 h-5 text-[#19C58A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{reports.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Total Reports</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200">
              <div className="p-2.5 rounded-[12px] bg-[#35B6F5]/10">
                <TrendingUp className="w-5 h-5 text-[#35B6F5]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{thisPeriodLabel}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">This Period</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200">
              <div className="p-2.5 rounded-[12px] bg-[#F8A60A]/10">
                <Download className="w-5 h-5 text-[#F8A60A]" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{downloadCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Downloads</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {loading ? (
              <div className="text-center py-12 space-y-3">
                <div className="flex justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#19C58A] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-[#19C58A] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-[#19C58A] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-[13px] text-[#9E9690]">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16">
                <BarChart3 size={40} className="mx-auto mb-3 text-[#9E9690]" />
                <p className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">No reports yet</p>
                <p className="text-[13px] text-[#9E9690] mt-1">Reports will appear here once payroll runs are completed</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E0D9] dark:border-[#38312D]">
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Report Name</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Period</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Generated</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690]">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
                  {reports.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{r.name || "Payroll Report"}</td>
                      <td className="px-5 py-4 text-[13px] text-[#6B6560] dark:text-[#A69B93]">{r.period || "-"}</td>
                      <td className="px-5 py-4 text-[13px] text-[#6B6560] dark:text-[#A69B93]">{r.generatedAt || r.generated || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#35B6F5]/10 text-[#35B6F5] px-3 py-1 text-[11px] font-bold">
                          {r.status || "available"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDownloadReport(r)}
                          disabled={downloadingId === r.id}
                          className="flex items-center gap-1.5 rounded-[12px] bg-[#19C58A] text-white px-3.5 py-2 text-[13px] font-bold hover:bg-[#15B07A] transition-all duration-200 shadow-[0_2px_8px_rgba(25,197,138,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download size={12} /> {downloadingId === r.id ? "Downloading..." : "Download"}
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
        <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4">Tax Reports</h3>
          <div className="space-y-3">
            {[
              { id: "annual-tax", name: "Annual Tax Summary", desc: "Yearly income tax projection vs actual TDS for each employee" },
              { id: "tds", name: "TDS Report", desc: "Tax deducted at source — Form 24Q (Annexure II)" },
              { id: "pf", name: "PF Statement", desc: "Provident fund contribution report (ECR format)" },
              { id: "esi", name: "ESI Report", desc: "Employee State Insurance monthly contribution statement" },
            ].map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-4 py-3.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200">
                <div>
                  <p className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{report.name}</p>
                  <p className="text-[13px] text-[#9E9690]">{report.desc}</p>
                </div>
                <button
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={generatingReport === report.id}
                  className="flex items-center gap-1.5 rounded-[12px] bg-[#19C58A] text-white px-3.5 py-2 text-[13px] font-bold hover:bg-[#15B07A] transition-all duration-200 shadow-[0_2px_8px_rgba(25,197,138,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport === report.id ? (
                    <><Loader2 size={12} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Download size={12} /> Generate PDF</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "compliance-reports" && (
        <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-4">Compliance Reports</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: "Compliance Checklist", icon: FileText, color: "text-[#19C58A]", bg: "bg-[#19C58A]/10" },
              { name: "Statutory Filings", icon: FileSpreadsheet, color: "text-[#35B6F5]", bg: "bg-[#35B6F5]/10" },
              { name: "Audit Trail", icon: FileText, color: "text-[#F8A60A]", bg: "bg-[#F8A60A]/10" },
              { name: "Regulatory Submissions", icon: FileSpreadsheet, color: "text-[#9D7BF2]", bg: "bg-[#9D7BF2]/10" },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-4 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-[10px] ${report.bg}`}>
                    <report.icon size={16} className={report.color} />
                  </div>
                  <p className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{report.name}</p>
                </div>
                {latestReport ? (
                  <button
                    onClick={() => handleDownloadReport(latestReport)}
                    disabled={downloadingId === latestReport.id}
                    className="flex items-center gap-1.5 rounded-[12px] bg-[#19C58A] text-white px-3.5 py-2 text-[13px] font-bold hover:bg-[#15B07A] transition-all duration-200 shadow-[0_2px_8px_rgba(25,197,138,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={12} /> {downloadingId === latestReport.id ? "Downloading..." : "Download"}
                  </button>
                ) : (
                  <span className="text-[12px] font-semibold text-[#9E9690]">Not yet available</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
