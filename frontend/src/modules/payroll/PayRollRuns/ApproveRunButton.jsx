import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { approveRun } from "../../../service/payrollService";
import { useToast } from "../ToastContext";

export default function ApproveRunButton({ runId, onApproved, disabled = false, className = "" }) {
  const { addToast } = useToast();
  const [approving, setApproving] = useState(false);

  const handleApprove = async (e) => {
    e?.stopPropagation();
    if (approving || disabled) return;
    setApproving(true);
    try {
      await approveRun(runId);
      addToast?.("Payroll run approved successfully.", "success");
      if (onApproved) onApproved(runId);
    } catch {
      addToast?.("Failed to approve payroll run.", "error");
    } finally {
      setApproving(false);
    }
  };

  return (
    <button
      onClick={handleApprove}
      disabled={disabled || approving}
      className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
        disabled || approving
          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
          : "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25 hover:scale-[1.02]"
      } ${className}`}
    >
      {approving ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <CheckCircle2 size={14} />
      )}
      {approving ? "Submitting…" : "Submit Payroll Run"}
    </button>
  );
}
