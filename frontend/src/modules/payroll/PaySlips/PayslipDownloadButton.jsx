import { Download } from "lucide-react";
import { downloadPayslip } from "../../../service/payrollService";

export default function PayslipDownloadButton({ payslip, className = "" }) {
  return (
    <button
      onClick={() => downloadPayslip(payslip)}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border border-violet-200 bg-white text-violet-600 hover:bg-violet-50 transition-all ${className}`}
    >
      <Download size={12} /> Download
    </button>
  );
}
