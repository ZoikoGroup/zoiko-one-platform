import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import TaxSlabTable from "../TaxSlabTable";
import {
  addEnterpriseJurisdiction, updateEnterpriseJurisdiction, verifyEnterpriseJurisdiction,
  getEnterpriseContributionRates, updateEnterpriseContributionRate,
} from "../../../../service/payrollService";

const inputClass =
  "w-full rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3 py-2 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:ring-2 focus:ring-[#9D7BF2]/30 disabled:opacity-60";

function Section({ title, children }) {
  return (
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] rounded-[14px] p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690] mb-3">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-[#6B6560] dark:text-[#A69B93] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export default function JurisdictionConfigPanel({ meta, jurisdiction, onClose, onSaved, canEdit = true }) {
  const [row, setRow] = useState(jurisdiction || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState([]);

  const [general, setGeneral] = useState({ payrollFrequency: "Monthly", timeZone: "" });
  const [compliance, setCompliance] = useState({
    governmentFilingSchedule: "", requiredReports: "", payrollRegistrationNumbers: "", taxIdentificationNumbers: "",
  });
  const [rules, setRules] = useState({ overtime: "", leave: "", holidayCalendar: "", terminationRules: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let current = jurisdiction;
      if (!current) {
        current = await addEnterpriseJurisdiction(meta.code);
      }
      setRow(current);
      if (current.generalConfig) setGeneral((g) => ({ ...g, ...current.generalConfig }));
      if (current.complianceConfig) {
        setCompliance((c) => ({
          ...c,
          ...current.complianceConfig,
          requiredReports: Array.isArray(current.complianceConfig.requiredReports)
            ? current.complianceConfig.requiredReports.join(", ")
            : current.complianceConfig.requiredReports || "",
        }));
      }
      if (current.payrollRulesConfig) setRules((r) => ({ ...r, ...current.payrollRulesConfig }));
      const rateRows = await getEnterpriseContributionRates(current.id);
      setRates(rateRows);
    } finally {
      setLoading(false);
    }
  }, [meta.code, jurisdiction]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRateChange = (componentKey, field, value) => {
    setRates((prev) => prev.map((r) => (r.componentKey === componentKey ? { ...r, [field]: value } : r)));
  };

  const handleSaveRate = async (rate) => {
    await updateEnterpriseContributionRate(row.id, rate.componentKey, {
      employeeRatePct: rate.employeeRatePct === "" ? null : Number(rate.employeeRatePct),
      employerRatePct: rate.employerRatePct === "" ? null : Number(rate.employerRatePct),
      flatAmount: rate.flatAmount === "" ? null : Number(rate.flatAmount),
    });
  };

  const handleSaveSections = async (markConfigured = false) => {
    setSaving(true);
    try {
      const updated = await updateEnterpriseJurisdiction(row.id, {
        generalConfig: general,
        complianceConfig: {
          ...compliance,
          requiredReports: compliance.requiredReports
            ? compliance.requiredReports.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        },
        payrollRulesConfig: rules,
        markConfigured,
      });
      setRow(updated);
      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setSaving(true);
    try {
      const updated = await verifyEnterpriseJurisdiction(row.id);
      setRow(updated);
      onSaved?.(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#1A1816]/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white dark:bg-[#221D1A] border-l border-[#E5E0D9] dark:border-[#38312D] shadow-[0_24px_48px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D9] dark:border-[#38312D]">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F0EDE8] dark:bg-[#38312D] text-[18px] leading-none text-[#1A1816] dark:text-[#F0EDE8]"
              title={meta.code}
            >
              {meta.flag}
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{meta.name}</h2>
              <p className="text-[12px] text-[#9E9690]">
                {meta.currency} · {meta.financialYear} · Status: {row?.status || "draft"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#2A2520] rounded-[12px] p-2 text-[#9E9690] hover:border-[#9D7BF2] hover:text-[#9D7BF2] transition-all duration-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={22} className="animate-spin text-[#9D7BF2]" />
            </div>
          ) : (
            <>
              <Section title="General">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Payroll Frequency">
                    <select
                      className={inputClass}
                      disabled={!canEdit}
                      value={general.payrollFrequency}
                      onChange={(e) => setGeneral({ ...general, payrollFrequency: e.target.value })}
                    >
                      {["Weekly", "Bi-Weekly", "Semi-Monthly", "Monthly"].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time Zone">
                    <input
                      className={inputClass}
                      disabled={!canEdit}
                      placeholder="e.g. America/New_York"
                      value={general.timeZone}
                      onChange={(e) => setGeneral({ ...general, timeZone: e.target.value })}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Tax">
                <TaxSlabTable country={meta.code} />
              </Section>

              <Section title="Employer &amp; Employee Contributions">
                {rates.length === 0 ? (
                  <p className="text-[12px] text-[#9E9690]">No contribution components for this jurisdiction.</p>
                ) : (
                  <div className="space-y-2">
                    {rates.map((r) => (
                      <div key={r.componentKey} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#1A1816] dark:text-[#F0EDE8] truncate">{r.label}</span>
                        <input
                          type="number" step="0.01" disabled={!canEdit}
                          className={inputClass + " text-right"}
                          placeholder="Employee %"
                          value={r.employeeRatePct ?? ""}
                          onChange={(e) => handleRateChange(r.componentKey, "employeeRatePct", e.target.value)}
                        />
                        <input
                          type="number" step="0.01" disabled={!canEdit}
                          className={inputClass + " text-right"}
                          placeholder="Employer %"
                          value={r.employerRatePct ?? ""}
                          onChange={(e) => handleRateChange(r.componentKey, "employerRatePct", e.target.value)}
                        />
                        <button
                          disabled={!canEdit}
                          onClick={() => handleSaveRate(r)}
                          className="text-[11px] font-bold text-[#9D7BF2] hover:underline disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Compliance">
                <div className="space-y-3">
                  <Field label="Government Filing Schedule">
                    <textarea
                      rows={2} disabled={!canEdit} className={inputClass}
                      value={compliance.governmentFilingSchedule}
                      onChange={(e) => setCompliance({ ...compliance, governmentFilingSchedule: e.target.value })}
                    />
                  </Field>
                  <Field label="Required Reports (comma-separated)">
                    <input
                      className={inputClass} disabled={!canEdit}
                      value={compliance.requiredReports}
                      onChange={(e) => setCompliance({ ...compliance, requiredReports: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Payroll Registration Numbers">
                      <input
                        className={inputClass} disabled={!canEdit}
                        value={compliance.payrollRegistrationNumbers}
                        onChange={(e) => setCompliance({ ...compliance, payrollRegistrationNumbers: e.target.value })}
                      />
                    </Field>
                    <Field label="Tax Identification Numbers">
                      <input
                        className={inputClass} disabled={!canEdit}
                        value={compliance.taxIdentificationNumbers}
                        onChange={(e) => setCompliance({ ...compliance, taxIdentificationNumbers: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              <Section title="Payroll Rules">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Overtime">
                    <textarea rows={2} disabled={!canEdit} className={inputClass} value={rules.overtime} onChange={(e) => setRules({ ...rules, overtime: e.target.value })} />
                  </Field>
                  <Field label="Leave">
                    <textarea rows={2} disabled={!canEdit} className={inputClass} value={rules.leave} onChange={(e) => setRules({ ...rules, leave: e.target.value })} />
                  </Field>
                  <Field label="Holiday Calendar">
                    <textarea rows={2} disabled={!canEdit} className={inputClass} value={rules.holidayCalendar} onChange={(e) => setRules({ ...rules, holidayCalendar: e.target.value })} />
                  </Field>
                  <Field label="Termination Rules">
                    <textarea rows={2} disabled={!canEdit} className={inputClass} value={rules.terminationRules} onChange={(e) => setRules({ ...rules, terminationRules: e.target.value })} />
                  </Field>
                </div>
              </Section>
            </>
          )}
        </div>

        {!loading && canEdit && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E0D9] dark:border-[#38312D]">
            <button
              onClick={() => handleSaveSections(false)}
              disabled={saving}
              className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#6B6560] dark:text-[#A69B93] hover:bg-[#F0EDE8] dark:hover:bg-[#38312D] transition-colors disabled:opacity-60"
            >
              Save Draft
            </button>
            {row?.status === "draft" && (
              <button
                onClick={() => handleSaveSections(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-[10px] bg-[#35B6F5] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#2AA0DE] transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Mark as Configured
              </button>
            )}
            {row?.status === "configured" && (
              <button
                onClick={handleVerify}
                disabled={saving}
                className="flex items-center gap-2 rounded-[10px] bg-[#19C58A] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#15B07A] transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Verify
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
