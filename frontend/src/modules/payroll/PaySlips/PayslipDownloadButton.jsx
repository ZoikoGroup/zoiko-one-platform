import { Download } from "lucide-react";
import { downloadPayslip } from "../../../service/payrollService";

export default function PayslipDownloadButton({ payslip, className = "" }) {
  return (
    <button
      onClick={() => downloadPayslip(payslip)}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border border-teal-200 bg-white text-teal-600 hover:bg-teal-50 transition-all ${className}`}
    >
      <Download size={12} /> Download
    </button>
  );
}
