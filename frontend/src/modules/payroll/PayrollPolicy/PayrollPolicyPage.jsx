import { useState, useEffect, useCallback } from "react";
import { Settings, ChevronDown, Users, Plug, ToggleLeft, CalendarClock, Lock } from "lucide-react";
import { useToast } from "../ToastContext";
import {
  getActivePolicy,
  updatePolicy,
  enablePolicyIntegration,
  disablePolicyIntegration,
  CALCULATION_MODE_LABELS,
  INTEGRATION_LABELS,
  FEATURE_FLAG_LABELS,
  EMPLOYEE_CATEGORY_LABELS,
} from "../../../service/payrollService";

const tabs = ["General", "Employee Categories", "Leave & Overtime", "Integrations", "Feature Flags"];

const INTEGRATION_CATEGORY_ORDER = ["attendance", "banking", "accounting", "notifications", "identity"];
const INTEGRATION_CATEGORY_LABELS = {
  attendance: "Attendance",
  banking: "Banking",
  accounting: "Accounting",
  notifications: "Notifications",
  identity: "Identity",
};

// ── Small shared UI bits ─────────────────────────────────────────────

function Toggle({ checked, onChange, disabled = false, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-[#FF6E86]" : "bg-[#E5E0D9] dark:bg-[#38312D]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-[16px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function ExpandableCard({ title, subtitle, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <p className="text-[14px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{title}</p>
          {subtitle && <p className="text-[12px] text-[#9E9690] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {badge}
          <ChevronDown
            size={18}
            className={`text-[#9E9690] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-[#E5E0D9] dark:border-[#38312D] px-5 py-4 space-y-4">{children}</div>
      )}
    </Card>
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

const inputClass =
  "w-full rounded-[10px] border border-[#E5E0D9] dark:border-[#38312D] bg-[#F8F7F4] dark:bg-[#1A1816] px-3 py-2 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] focus:outline-none focus:ring-2 focus:ring-[#FF6E86]/30";

// ── Main page ─────────────────────────────────────────────────────────

export default function PayrollPolicyPage() {
  const { addToast } = useToast();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivePolicy();
      setPolicy(data);
      if (data?.calculationMode) localStorage.setItem("zoiko_payroll_calc_mode", data.calculationMode);
    } catch {
      addToast?.("Failed to load payroll policy.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveGeneral = async (patch) => {
    if (!policy) return;
    setSaving(true);
    try {
      const updated = await updatePolicy(policy.id, patch);
      setPolicy(updated);
      if (updated?.calculationMode) localStorage.setItem("zoiko_payroll_calc_mode", updated.calculationMode);
      addToast?.("Policy updated.", "success");
    } catch {
      addToast?.("Failed to update policy.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCalculationModeChange = (mode) => {
    if (mode === policy.calculationMode) return;
    const label = CALCULATION_MODE_LABELS[mode];
    const ok = window.confirm(
      `Switch to ${label}? This only affects FUTURE payroll runs — already-approved or paid runs are never recalculated.`
    );
    if (!ok) return;
    handleSaveGeneral({ calculationMode: mode });
  };

  const handleCategoryChange = (category, field, value) => {
    const next = policy.employeeCategories.map((c) =>
      c.category === category ? { ...c, [field]: value } : c
    );
    setPolicy({ ...policy, employeeCategories: next });
  };

  const handleSaveCategories = async () => {
    await handleSaveGeneral({ employeeCategories: policy.employeeCategories });
  };

  const handleToggleIntegration = async (category, providerKey, currentlyEnabled) => {
    // Optimistic update so the toggle feels instant, reverted on failure.
    const prevIntegrations = policy.integrations;
    const next = policy.integrations.map((i) =>
      i.category === category && i.providerKey === providerKey ? { ...i, enabled: !currentlyEnabled } : i
    );
    setPolicy({ ...policy, integrations: next });
    try {
      if (currentlyEnabled) {
        await disablePolicyIntegration(policy.id, category, providerKey);
      } else {
        await enablePolicyIntegration(policy.id, category, providerKey);
      }
      addToast?.(`${INTEGRATION_LABELS[providerKey] || providerKey} ${currentlyEnabled ? "disabled" : "enabled"}.`, "success");
    } catch {
      setPolicy((p) => ({ ...p, integrations: prevIntegrations }));
      addToast?.("Failed to update integration.", "error");
    }
  };

  const handleToggleFlag = async (flagKey, currentlyEnabled) => {
    const prevFlags = policy.featureFlags;
    const next = policy.featureFlags.map((f) => (f.flagKey === flagKey ? { ...f, enabled: !currentlyEnabled } : f));
    setPolicy({ ...policy, featureFlags: next });
    try {
      await updatePolicy(policy.id, { featureFlags: next });
    } catch {
      setPolicy((p) => ({ ...p, featureFlags: prevFlags }));
      addToast?.("Failed to update feature flag.", "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8">
        <p className="text-[13px] text-[#9E9690]">Loading payroll policy…</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8">
        <p className="text-[13px] text-[#9E9690]">Could not load payroll policy.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#FF6E86] flex items-center justify-center shadow-[0_2px_8px_rgba(255,110,134,0.3)]">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">
              Payroll Policy
            </h1>
            <p className="text-[13px] font-medium text-[#9E9690]">
              Central configuration for how payroll is calculated and processed
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#FF6E86]/10 border border-[#FF6E86]/20 px-3.5 py-1.5 text-[11px] font-bold text-[#FF6E86]">
          {policy.name} {policy.isDefault && "· Default"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 w-fit flex-wrap">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-[12px] text-[13px] font-semibold transition-all duration-200 ${
              activeTab === i
                ? "bg-white dark:bg-[#221D1A] text-[#FF6E86] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#9E9690] hover:text-[#1A1816] dark:hover:text-[#F0EDE8]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 0 && (
        <Card className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Policy Name">
              <input
                className={inputClass}
                defaultValue={policy.name}
                onBlur={(e) => e.target.value !== policy.name && handleSaveGeneral({ name: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={policy.status}
                onChange={(e) => handleSaveGeneral({ status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={inputClass}
              rows={2}
              defaultValue={policy.description || ""}
              onBlur={(e) =>
                e.target.value !== (policy.description || "") && handleSaveGeneral({ description: e.target.value })
              }
            />
          </Field>
          <Field label="Effective Date">
            <input
              type="date"
              className={inputClass}
              value={policy.effectiveDate}
              onChange={(e) => handleSaveGeneral({ effectiveDate: e.target.value })}
            />
          </Field>

          <div>
            <span className="block text-[12px] font-semibold text-[#6B6560] dark:text-[#A69B93] mb-2">
              Payroll Calculation Mode
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(CALCULATION_MODE_LABELS).map(([mode, label]) => (
                <button
                  key={mode}
                  disabled={saving}
                  onClick={() => handleCalculationModeChange(mode)}
                  className={`rounded-[12px] border px-4 py-3 text-left transition-all ${
                    policy.calculationMode === mode
                      ? "border-[#FF6E86] bg-[#FF6E86]/5"
                      : "border-[#E5E0D9] dark:border-[#38312D] hover:border-[#FF6E86]/40"
                  }`}
                >
                  <p className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{label}</p>
                  {mode === "simple" && (
                    <p className="text-[11px] text-[#9E9690] mt-1">Net = Gross − Unpaid Leave. No PF/ESI/PT/TDS.</p>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#9E9690] mt-2">
              Switching modes only affects future payroll runs — never already-approved or paid ones.
            </p>
          </div>
        </Card>
      )}

      {/* Employee Categories */}
      {activeTab === 1 && (
        <div className="space-y-3 max-w-3xl">
          {policy.employeeCategories.map((cat) => {
            const isIntern = cat.category === "intern";
            return (
              <ExpandableCard
                key={cat.category}
                title={EMPLOYEE_CATEGORY_LABELS[cat.category] || cat.category}
                subtitle={`${cat.workingDays} working days · ${cat.expectedHours}h expected`}
                badge={
                  <Users size={16} className="text-[#9E9690]" />
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field label="Working Days">
                    <input
                      type="number"
                      className={inputClass}
                      value={cat.workingDays}
                      onChange={(e) => handleCategoryChange(cat.category, "workingDays", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Expected Hours">
                    <input
                      type="number"
                      className={inputClass}
                      value={cat.expectedHours}
                      onChange={(e) => handleCategoryChange(cat.category, "expectedHours", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Minimum Hours">
                    <input
                      type="number"
                      className={inputClass}
                      value={cat.minimumHours}
                      onChange={(e) => handleCategoryChange(cat.category, "minimumHours", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Grace Time (min)">
                    <input
                      type="number"
                      className={inputClass}
                      value={cat.graceTimeMinutes}
                      onChange={(e) => handleCategoryChange(cat.category, "graceTimeMinutes", Number(e.target.value))}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between rounded-[10px] bg-[#F8F7F4] dark:bg-[#1A1816] px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isIntern && <Lock size={14} className="text-[#9E9690]" />}
                    <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8]">
                      Paid Leave Eligible
                    </span>
                  </div>
                  <Toggle
                    checked={isIntern ? false : cat.paidLeaveEligible}
                    disabled={isIntern}
                    title={isIntern ? "Interns are never eligible for paid leave" : undefined}
                    onChange={(val) => handleCategoryChange(cat.category, "paidLeaveEligible", val)}
                  />
                </div>
                {isIntern && (
                  <p className="text-[11px] text-[#9E9690]">
                    Interns never receive paid leave — this is enforced by the backend regardless of this toggle.
                  </p>
                )}
              </ExpandableCard>
            );
          })}
          <div className="flex justify-end">
            <button
              onClick={handleSaveCategories}
              disabled={saving}
              className="rounded-[12px] bg-[#FF6E86] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(255,110,134,0.3)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Categories"}
            </button>
          </div>
        </div>
      )}

      {/* Leave & Overtime */}
      {activeTab === 2 && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock size={16} className="text-[#9E9690]" />
              <p className="text-[14px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Overtime Rules</p>
            </div>
            {policy.overtimeRule ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8]">Enable Overtime</span>
                  <Toggle
                    checked={policy.overtimeRule.enabled}
                    onChange={(val) =>
                      handleSaveGeneral({ overtimeRule: { ...policy.overtimeRule, enabled: val } })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8]">
                    Approval Required
                  </span>
                  <Toggle
                    checked={policy.overtimeRule.approvalRequired}
                    disabled={!policy.overtimeRule.enabled}
                    onChange={(val) =>
                      handleSaveGeneral({ overtimeRule: { ...policy.overtimeRule, approvalRequired: val } })
                    }
                  />
                </div>
                <Field label="Minimum Overtime (minutes)">
                  <input
                    type="number"
                    disabled={!policy.overtimeRule.enabled}
                    className={inputClass}
                    value={policy.overtimeRule.minimumOvertimeMinutes}
                    onChange={(e) =>
                      handleSaveGeneral({
                        overtimeRule: { ...policy.overtimeRule, minimumOvertimeMinutes: Number(e.target.value) },
                      })
                    }
                  />
                </Field>
              </div>
            ) : (
              <p className="text-[12px] text-[#9E9690]">No overtime rule configured yet.</p>
            )}
          </Card>

          <Card>
            <p className="text-[14px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-3">Leave Rules</p>
            <p className="text-[12px] text-[#9E9690]">
              Paid Leave, Unpaid Leave, Half Day, Absent, Holiday, Week Off, and Intern Leave rules are configured
              here per policy. Detailed per-rule editing UI ships alongside the Leave Rules backend endpoints
              (planned next).
            </p>
          </Card>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 3 && (
        <div className="space-y-4 max-w-3xl">
          {INTEGRATION_CATEGORY_ORDER.map((cat) => {
            const items = policy.integrations.filter((i) => i.category === cat);
            if (!items.length) return null;
            return (
              <Card key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Plug size={16} className="text-[#9E9690]" />
                  <p className="text-[14px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">
                    {INTEGRATION_CATEGORY_LABELS[cat]}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((i) => (
                    <div
                      key={i.providerKey}
                      className="flex items-center justify-between rounded-[10px] bg-[#F8F7F4] dark:bg-[#1A1816] px-4 py-3"
                    >
                      <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8]">
                        {INTEGRATION_LABELS[i.providerKey] || i.providerKey}
                      </span>
                      <Toggle
                        checked={i.enabled}
                        onChange={() => handleToggleIntegration(cat, i.providerKey, i.enabled)}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feature Flags */}
      {activeTab === 4 && (
        <Card className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <ToggleLeft size={16} className="text-[#9E9690]" />
            <p className="text-[14px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">Feature Flags</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {policy.featureFlags.map((f) => (
              <div
                key={f.flagKey}
                className="flex items-center justify-between rounded-[10px] bg-[#F8F7F4] dark:bg-[#1A1816] px-4 py-3"
              >
                <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8]">
                  {FEATURE_FLAG_LABELS[f.flagKey] || f.flagKey}
                </span>
                <Toggle checked={f.enabled} onChange={() => handleToggleFlag(f.flagKey, f.enabled)} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}