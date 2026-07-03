import { useState } from "react";
import HRPage from "../../../../components/HRPage";
import { createLeaveRequest } from "../../../../service/employee";
import { CheckCircle, AlertCircle, Loader2, Calendar, User, FileText } from "lucide-react";

export default function ApplyLeaveForm() {
  const [form, setForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  const leaveTypes = [
    "Annual Leave",
    "Sick Leave",
    "Casual Leave",
    "Unpaid Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Bereavement Leave",
  ];

  const validate = () => {
    const e = {};
    if (!form.leave_type) e.leave_type = "Select a leave type";
    if (!form.start_date) e.start_date = "Select start date";
    if (!form.end_date) e.end_date = "Select end date";
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      e.end_date = "End date must be after start date";
    }
    if (!form.reason.trim() || form.reason.length < 10) e.reason = "Provide at least 10 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    setErrors({});
    setSuccess(null);
    try {
      await createLeaveRequest(form);
      setSuccess("Leave application submitted successfully! It is under process.");
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
    } catch (err) {
      setErrors({ _api: err?.message || "Failed to submit leave request" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HRPage title="Apply Leave" subtitle="Submit a new leave request for approval.">
      <div className="max-w-lg">
        {success && (
          <div className="mb-6 flex items-center gap-3 bg-green-100 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm font-semibold">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {errors._api && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-semibold">
            <AlertCircle size={16} /> {errors._api}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                <FileText size={13} className="inline mr-1" /> Leave Type
              </label>
              <select
                value={form.leave_type}
                onChange={(e) => setForm((p) => ({ ...p, leave_type: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition ${errors.leave_type ? "border-red-300" : "border-slate-200"}`}
              >
                <option value="">Select leave type...</option>
                {leaveTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
              {errors.leave_type && <p className="text-xs text-red-500 mt-1">{errors.leave_type}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  <Calendar size={13} className="inline mr-1" /> Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition ${errors.start_date ? "border-red-300" : "border-slate-200"}`}
                />
                {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  <Calendar size={13} className="inline mr-1" /> End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition ${errors.end_date ? "border-red-300" : "border-slate-200"}`}
                />
                {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                <User size={13} className="inline mr-1" /> Reason
              </label>
              <textarea
                rows={4}
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Describe the reason for your leave..."
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition resize-none ${errors.reason ? "border-red-300" : "border-slate-200"}`}
              />
              {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : "Submit Leave Request"}
          </button>
        </div>
      </div>
    </HRPage>
  );
}
