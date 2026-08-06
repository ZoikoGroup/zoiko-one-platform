import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, ClipboardList } from "lucide-react";
import { getPublicForm, submitPublicForm } from "../../service/payrollService";

const BRAND = "#19C58A";
const DARK = "#1A1816";
const MUTED = "#9E9690";
const BORDER = "#E5E0D9";

const inputClass =
  "w-full rounded-[10px] border border-[#E5E0D9] bg-[#F8F7F4] px-3.5 py-2.5 text-[13px] text-[#1A1816] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200";

function FieldInput({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select className={inputClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Choose {field.label.toLowerCase()}…</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      className={inputClass}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`}
    />
  );
}

export default function EmployeeFormFill() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPublicForm(token)
      .then((data) => {
        setForm(data);
        setValues(data.currentValues || {});
        if (data.status === "submitted") setSubmitted(true);
      })
      .catch((err) => setError(err.message || "This link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  function updateValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitPublicForm(token, values);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F8F7F4" }}>
      <div className="w-full max-w-lg rounded-[18px] border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-8" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center" style={{ background: `${BRAND}14` }}>
            <ClipboardList size={18} style={{ color: BRAND }} />
          </div>
          <span className="text-[13px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Zoiko Payroll</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin" style={{ color: BRAND }} />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle size={36} className="mx-auto mb-3" style={{ color: "#FF6E86" }} />
            <p className="text-[15px] font-bold" style={{ color: DARK }}>{error}</p>
          </div>
        ) : submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: BRAND }} />
            <p className="text-[16px] font-bold" style={{ color: DARK }}>Thank you!</p>
            <p className="text-[13px] mt-1.5" style={{ color: MUTED }}>Your response has been submitted for review. You can close this page.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-[18px] font-extrabold" style={{ color: DARK }}>{form.formName}</h1>
              <p className="text-[13px] mt-1" style={{ color: MUTED }}>Hi {form.employeeName}, please review and update the details below.</p>
            </div>

            {(form.fields || []).map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{field.label}</span>
                <FieldInput field={field} value={values[field.key]} onChange={(v) => updateValue(field.key, v)} />
              </label>
            ))}

            <p className="text-[11.5px]" style={{ color: MUTED }}>
              Your response will be reviewed by an administrator before it's applied to your record.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[12px] py-2.5 text-[13px] font-bold text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: BRAND }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
