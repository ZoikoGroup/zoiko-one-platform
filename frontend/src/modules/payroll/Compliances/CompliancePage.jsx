import { useState, useEffect, useMemo } from "react";
import { Shield, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "../ToastContext";
import ComplianceForm from "./ComplianceForm";
import ContributionRatesTable from "./ContributionRatesTable";
import TaxSlabTable from "./TaxSlabTable";
import ComplianceDocumentUpload from "./ComplianceDocuments";
import {
  fetchComplianceData,
  updateCompanyDetails,
  getCountryMeta,
  DEFAULT_COUNTRY,
} from "../../../service/payrollService";

const tabs = ["Overview", "Company Details", "Contribution Rates", "Tax Slabs", "Documents"];

const defaultCompany = {
  name: "",
  type: "",
  taxNo: "",
  employerId: "",
  address: "",
  industry: "",
  jurisdictionCountry: DEFAULT_COUNTRY, // country code, e.g. "IN" / "US" / "UK"
  jurisdictionState: "",
  compliancePack: "",
  settlementBank: "",
  settlementAcc: "",
};

export default function CompliancePage() {
  const { addToast } = useToast();
  const [companyDetails, setCompanyDetails] = useState(defaultCompany);
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchComplianceData().then((data) => {
      if (data && data.company) setCompanyDetails(data.company);
    }).catch(() => {});
  }, []);

  const handleUpdate = (field, value) => {
    setCompanyDetails((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });
  };

  // Single source of truth for "which country's compliance pack are we
  // looking at" — the Contribution Rates and Tax Slabs tabs both key off
  // this, so changing jurisdiction in Company Details immediately updates
  // every other tab too.
  const country = companyDetails.jurisdictionCountry || DEFAULT_COUNTRY;
  const countryMeta = getCountryMeta(country);

  const checklist = useMemo(() => [
    { id: "chk-name",     label: "Company name & legal entity",          done: !!companyDetails.name },
    { id: "chk-tax",      label: "Tax registration number",              done: !!companyDetails.taxNo },
    { id: "chk-empId",    label: "Employer ID registered",               done: !!companyDetails.employerId },
    { id: "chk-sched",    label: "Payroll schedule configured",          done: !!companyDetails.schedule },
    { id: "chk-bank",     label: "Payroll bank account linked",          done: !!companyDetails.settlementBank && !!companyDetails.settlementAcc },
    { id: "chk-juris",    label: "Jurisdiction & compliance pack selected", done: !!companyDetails.jurisdictionState && !!companyDetails.compliancePack },
  ], [companyDetails]);

  const dueItems = checklist.filter((c) => !c.done);
  const doneItems = checklist.filter((c) => c.done);
  const readiness = Math.round((doneItems.length / checklist.length) * 100);

  const handleSaveCompany = async () => {
    try {
      await updateCompanyDetails(companyDetails);
      addToast?.("Company details saved successfully.", "success");
    } catch {
      addToast?.("Failed to save company details.", "error");
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/15 p-7">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Audit & Compliance</h1>
              <p className="text-slate-500 text-sm">{doneItems.length}/{checklist.length} compliance checks passed</p>
            </div>
          </div>
          <span className="rounded-full bg-white/70 border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-700">
            {countryMeta.name} compliance pack
          </span>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Readiness bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Compliance Readiness</span>
          <span className="text-sm font-bold text-slate-800">{readiness}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${
            readiness >= 80 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-red-500"
          }`} style={{ width: `${readiness}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-700">Completed ({doneItems.length})</h3>
          </div>
          <div className="space-y-2">
            {doneItems.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> {c.label}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-700">Pending ({dueItems.length})</h3>
          </div>
          <div className="space-y-2">
            {dueItems.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={13} className="text-amber-500 shrink-0" /> {c.label}
              </div>
            ))}
            {dueItems.length === 0 && (
              <p className="text-xs text-emerald-600 font-semibold">All compliance checks passed!</p>
            )}
          </div>
        </div>
      </div>

      {activeTab === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Compliance Overview</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600">Company</p>
              <p className="text-sm text-slate-800">{companyDetails.name}</p>
              <p className="text-xs text-slate-400">{companyDetails.type} · {companyDetails.industry}</p>
              <p className="text-xs text-slate-400">Tax ID: {companyDetails.taxNo}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600">Jurisdiction</p>
              <p className="text-sm text-slate-800">{countryMeta.name}</p>
              <p className="text-xs text-slate-400">{companyDetails.jurisdictionState}</p>
              <p className="text-xs text-slate-400">Pack: {companyDetails.compliancePack}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-4">
          <ComplianceForm
            companyDetails={companyDetails}
            onUpdate={handleUpdate}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveCompany}
              className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
            >
              Save Company Details
            </button>
          </div>
        </div>
      )}

      {activeTab === 2 && <ContributionRatesTable documents={documents} />}
      {activeTab === 3 && <TaxSlabTable documents={documents} />}
      {activeTab === 4 && <ComplianceDocumentUpload country={country} addToast={addToast} documents={documents} setDocuments={setDocuments} />}
    </div>
  );
}