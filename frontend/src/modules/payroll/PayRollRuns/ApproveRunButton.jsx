import { CheckCircle2 } from "lucide-react";
import { approveRun } from "../../../service/payrollService";

export default function ApproveRunButton({ runId, onApproved, disabled = false, className = "" }) {
  const handleApprove = async () => {
    try {
      await approveRun(runId);
      if (onApproved) onApproved(runId);
    } catch {
      // error handled upstream
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
        disabled
          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
      } ${className}`}
    >
      <CheckCircle2 size={12} /> Approve
    </button>
  );
}
