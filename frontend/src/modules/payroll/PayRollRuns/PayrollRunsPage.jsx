import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, Plus, List, FileText, Play } from "lucide-react";
import { useToast } from "../ToastContext";
import RunsTable from "./RunsTable";
import RunDetailPage from "./RunDetailPage";
import {
  fetchRuns,
  createRun,
  deletePayRun,
  downloadRunPayslips,
  getEmployeesWithAttendance,
  fetchComplianceData,
  previewPayrollRun,
  DEFAULT_COUNTRY,
} from "../../../service/payrollService";
import { getCurrencyForJurisdiction } from "../../../utils/currency";

const WIZARD_STEPS = [
  { id: 1, label: "Configure", icon: FileText },
  { id: 2, label: "Calculate", icon: List },
  { id: 3, label: "Approve", icon: Check },
  { id: 4, label: "Process", icon: Play },
];

function createCurrencyFormatter(currencyInfo) {
  if (!currencyInfo) {
    return (n) => {
      if (n == null) return "—";
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
    };
  }
  return (n) => {
    if (n == null) return "—";
    return new Intl.NumberFormat(currencyInfo.locale || "en-US", {
      style: "currency",
      currency: currencyInfo.code,
      maximumFractionDigits: currencyInfo.decimalDigits ?? 2,
    }).format(n);
  };
}

export default function PayrollRunsPage() {
  const { addToast } = useToast();
  const [runs, setRuns] = useState([]);
  const [view, setView] = useState("list");
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardConfig, setWizardConfig] = useState({
    periodStart: "",
    periodEnd: "",
    payDate: "",
    schedule: "Monthly",
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [jurisdictionCountry, setJurisdictionCountry] = useState(DEFAULT_COUNTRY);
  const [jurisdictionState, setJurisdictionState] = useState("");
  const [createdRunId, setCreatedRunId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const currencyInfo = useMemo(() => getCurrencyForJurisdiction(jurisdictionCountry), [jurisdictionCountry]);
  const fmtCurrency = useMemo(() => createCurrencyFormatter(currencyInfo), [currencyInfo]);

  const loadRuns = useCallback(async () => {
    const data = await fetchRuns();
    setRuns(data);
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadJurisdiction = useCallback(async () => {
    try {
      const data = await fetchComplianceData();
      if (data?.company?.jurisdictionCountry) {
        setJurisdictionCountry(data.company.jurisdictionCountry);
        setJurisdictionState(data.company.jurisdictionState || "");
      }
    } catch {
      // keep default
    }
  }, []);

  useEffect(() => {
    loadJurisdiction();
  }, [loadJurisdiction]);

  const stats = useMemo(() => {
    const total = runs.length;
    const pending = runs.filter(
      (r) => r.status === "Draft" || r.status === "Review"
    ).length;
    const paid = runs.filter((r) => r.status === "Paid").length;
    return { total, pending, paid };
  }, [runs]);

  const totals = useMemo(() => {
    if (previewData?.totals) return previewData.totals;
    return { count: 0, totalGross: 0, totalTax: 0, totalContributions: 0, totalNet: 0 };
  }, [previewData]);

  const loadPreview = useCallback(async (empIds) => {
    setLoadingPreview(true);
    try {
      const data = await previewPayrollRun(empIds, jurisdictionCountry);
      setPreviewData(data);
    } catch {
      addToast?.("Failed to calculate payroll preview.", "error");
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [jurisdictionCountry, addToast]);

  const startWizard = async () => {
    setLoadingEmployees(true);
    setView("wizard");
    setWizardStep(1);
    try {
      const empData = await getEmployeesWithAttendance();
      const list = Array.isArray(empData) ? empData : [];
      setEmployees(list);
      setSelectedEmployees(list.map((e) => e.id));
    } catch {
      setEmployees([]);
      setSelectedEmployees([]);
      addToast?.("Failed to load payroll data.", "error");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const nextStep = async () => {
    if (wizardStep === 2) {
      try {
        const newRun = await createRun({
          periodStart: wizardConfig.periodStart,
          periodEnd: wizardConfig.periodEnd,
          payDate: wizardConfig.payDate,
          schedule: wizardConfig.schedule,
          employeeIds: selectedEmployees,
          totals,
        });
        const id = newRun?.id ?? newRun?._id ?? newRun?.runId;
        if (id) setCreatedRunId(id);
      } catch {
        addToast?.("Failed to create payroll run. Please try again.", "error");
        return;
      }
    }
    if (wizardStep < 4) setWizardStep((s) => s + 1);
    if (wizardStep === 3) {
      addToast?.("Payroll run submitted successfully.", "success");
      setView("list");
      setWizardStep(0);
      setEmployees([]);
      setSelectedEmployees([]);
      setCreatedRunId(null);
      setPreviewData(null);
      loadRuns();
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) setWizardStep((s) => s - 1);
  };

  const recalculate = async () => {
    await loadPreview(selectedEmployees);
    addToast?.("Payroll data refreshed from server.", "success");
  };

  const handleDeleteRun = async (runId) => {
    try {
      await deletePayRun(runId);
      addToast?.("Payroll run deleted.", "success");
      await loadRuns();
    } catch {
      addToast?.("Failed to delete payroll run.", "error");
    }
  };

  const handleDownloadRun = async (runId) => {
    try {
      await downloadRunPayslips(runId);
      addToast?.("Payslips downloaded.", "success");
    } catch {
      addToast?.("Failed to download payslips.", "error");
    }
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((e) => e.id));
    }
  };

  const isWizard = view === "wizard";

  return (
    <div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="w-[200px] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
          Run Progress
        </p>
        <div className="flex-1 space-y-1">
          {WIZARD_STEPS.map((step, i) => {
            const completed = isWizard && wizardStep > step.id;
            const active = isWizard && wizardStep === step.id;
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                    <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                      completed
                        ? "border-teal-600 bg-teal-600 text-white"
                        : active
                        ? "border-teal-600 bg-teal-50 text-teal-600 ring-4 ring-teal-100"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {completed ? <Check size={14} /> : <StepIcon size={14} />}
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={`w-px h-5 my-0.5 ${completed || active ? "bg-teal-400" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </div>
                <div className="pt-1.5">
                  <p className={`text-xs font-semibold ${completed || active ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {jurisdictionCountry && (
          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Jurisdiction</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{jurisdictionCountry}</p>
            {jurisdictionState && <p className="text-[10px] text-slate-500 mt-0.5">{jurisdictionState}</p>}
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Payroll Run</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isWizard ? `Processing payroll for ${jurisdictionCountry}` : "View and manage existing payroll runs"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
              </span>
              <span className="text-xs font-semibold text-teal-600">Live Data</span>
            </div>
            {!isWizard ? (
              <button
                onClick={startWizard}
                disabled={loadingEmployees}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-700 hover:scale-[1.02] shadow-lg shadow-teal-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={15} />
                {loadingEmployees ? "Loading…" : "New Payroll Run"}
              </button>
            ) : (
              <button
                onClick={() => { setView("list"); setWizardStep(0); setEmployees([]); setSelectedEmployees([]); setPreviewData(null); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 p-5">
          {!isWizard ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Runs", value: stats.total, accent: "text-slate-800" },
                  { label: "Pending Review", value: stats.pending, accent: "text-amber-600" },
                  { label: "Paid", value: stats.paid, accent: "text-teal-600" },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase text-slate-400">{c.label}</p>
                    <p className={`mt-2 text-3xl font-extrabold ${c.accent}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-5">
                  <h3 className="text-base font-bold text-slate-800">Payroll Runs</h3>
                  <button
                    onClick={startWizard}
                    disabled={loadingEmployees}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-700 hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Plus size={14} /> Create Run
                  </button>
                </div>
                <div className="px-5 pb-5">
                  <RunsTable runs={runs} onSelect={() => {}} onDelete={handleDeleteRun} onDownload={handleDownloadRun} isWizardMode={false} />
                </div>
              </div>
            </div>
          ) : (
            <RunDetailPage
              step={wizardStep}
              config={wizardConfig}
              setConfig={setWizardConfig}
              employees={employees}
              selectedEmployees={selectedEmployees}
              toggleEmployee={toggleEmployee}
              toggleAllEmployees={toggleAllEmployees}
              previewData={previewData}
              totals={totals}
              jurisdictionCountry={jurisdictionCountry}
              createdRunId={createdRunId}
              loading={loadingEmployees || loadingPreview}
              onNext={nextStep}
              onBack={prevStep}
              onRecalculate={recalculate}
              onLoadPreview={loadPreview}
              fmtCurrency={fmtCurrency}
            />
          )}
        </div>
      </div>
    </div>
  );
}
