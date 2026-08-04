import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, Download, AlertCircle } from "lucide-react";
import { approveRun, getBankTransferSummary, downloadBankTransferFile } from "../../../service/payrollService";

function fmtCurrencyLocal(n, fmtCurrency) {
  if (fmtCurrency) return fmtCurrency(n);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(v);
  }
}

const FORMAT_LABELS = { csv: "CSV", xlsx: "Excel (.xlsx)", txt: "TXT" };

function SummaryRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] font-medium text-[#6B6560] dark:text-[#A69B93]">{label}</span>
      <span className={`text-[13px] font-bold ${accent || "text-[#1A1816] dark:text-[#F0EDE8]"}`}>{value}</span>
    </div>
  );
}

export default function ApprovalDialog({ run, onClose, onApproved, fmtCurrency }) {
  // stage: "summary" (pre-approval) -> "approving" -> "approved" (preview + download)
  const [stage, setStage] = useState("summary");
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");
  const [downloadResult, setDownloadResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError("");
    try {
      const data = await getBankTransferSummary(run.id);
      setSummary(data);
    } catch {
      setError("Could not load the payroll summary for this run.");
    } finally {
      setLoadingSummary(false);
    }
  }, [run.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleConfirmApproval = async () => {
    setStage("approving");
    setError("");
    try {
      await approveRun(run.id);
      setStage("approved");
      onApproved?.();
    } catch {
      setError("Failed to approve this payroll run. Please try again.");
      setStage("summary");
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const result = await downloadBankTransferFile(run.id);
      setDownloadResult(result);
    } catch {
      setError("Failed to generate the bank transfer file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#1A1816]/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#221D1A] rounded-[18px] shadow-[0_24px_48px_rgba(0,0,0,0.15)] p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-1">
          {stage === "approved" ? "Run Approved" : "Approve Payroll Run"}
        </h3>
        <p className="text-[12px] text-[#9E9690] mb-4">{run.period}</p>

        {loadingSummary ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#19C58A]" />
          </div>
        ) : (
          <>
            <div className="rounded-[12px] bg-[#F8F7F4] dark:bg-[#1A1816] px-4 py-1 mb-4 divide-y divide-[#E5E0D9] dark:divide-[#38312D]">
              <SummaryRow label="Total Employees" value={summary?.totalEmployees ?? "—"} />
              <SummaryRow label="Gross Payroll" value={fmtCurrencyLocal(summary?.grossPayroll, fmtCurrency)} />
              <SummaryRow label="Total Deductions" value={fmtCurrencyLocal(summary?.totalDeductions, fmtCurrency)} accent="text-[#FF6E86]" />
              <SummaryRow label="Net Payroll" value={fmtCurrencyLocal(summary?.netPayroll, fmtCurrency)} accent="text-[#19C58A]" />
              <SummaryRow label="Payment Date" value={fmtDate(summary?.paymentDate)} />
              <SummaryRow
                label="Bank File Format"
                value={FORMAT_LABELS[summary?.bankFormat] || (summary?.bankFormat || "CSV").toUpperCase()}
              />
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-[#FF6E86]/10 px-3.5 py-2.5 text-[12px] text-[#FF6E86]">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {stage !== "approved" ? (
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] hover:bg-[#F0EDE8] dark:hover:bg-[#38312D] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproval}
                  disabled={stage === "approving"}
                  className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold text-white bg-[#19C58A] hover:bg-[#15B07A] transition-colors disabled:opacity-60"
                >
                  {stage === "approving" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {stage === "approving" ? "Approving…" : "Confirm Approval"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4 text-[13px] font-semibold text-[#19C58A]">
                  <CheckCircle2 size={16} />
                  Run approved successfully.
                </div>
                <p className="text-[12px] text-[#9E9690] mb-3">
                  Generate the bank transfer file for this run's Banking Policy format
                  ({FORMAT_LABELS[summary?.bankFormat] || "CSV"}) and download it.
                </p>
                {downloadResult && (
                  <p className="text-[12px] text-[#1A1816] dark:text-[#F0EDE8] mb-3">
                    Downloaded <span className="font-bold">{downloadResult.filename}</span> ({(downloadResult.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] hover:bg-[#F0EDE8] dark:hover:bg-[#38312D] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold text-white bg-[#35B6F5] hover:bg-[#2AA0DE] transition-colors disabled:opacity-60"
                  >
                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {downloading ? "Generating…" : downloadResult ? "Download Again" : "Generate & Download File"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
