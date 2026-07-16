import { Download } from "lucide-react";
import { downloadPayslip } from "../../../service/payrollService";

export default function PayslipDownloadButton({ payslip, className = "" }) {
  return (
    <button
      onClick={() => downloadPayslip(payslip)}
      className={`flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-[12px] font-semibold border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] text-[#19C58A] transition-all duration-200 hover:border-[#19C58A] hover:shadow-[0_2px_8px_rgba(25,197,138,0.15)] ${className}`}
    >
      <Download size={12} /> Download
    </button>
  );
}
