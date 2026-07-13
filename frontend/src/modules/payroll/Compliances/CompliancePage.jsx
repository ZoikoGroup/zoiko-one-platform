import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { useToast } from "../ToastContext";
import ComplianceForm from "./ComplianceForm";
import PackMetadataPanel from "./PackMetadataPanel";
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
  jurisdictionCountry: DEFAULT_COUNTRY,
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
  const countryMeta = getCountryMeta(companyDetails.jurisdictionCountry);

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
      <div className="rounded-3xl bg-gradient-to-br from-teal-500/10 via-teal-400/5 to-transparent border border-teal-500/15 p-7">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Audit & Compliance</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your statutory compliance</p>
            </div>
          </div>
          <span className="rounded-full bg-white/70 dark:bg-slate-800/70 border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-700">
            {countryMeta.name} compliance pack
          </span>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-2xl p-1 w-fit flex-wrap">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i ? "bg-white dark:bg-slate-800 text-teal-700 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Compliance Overview</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Company</p>
              <p className="text-sm text-slate-800">{companyDetails.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{companyDetails.type} · {companyDetails.industry}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tax ID: {companyDetails.taxNo}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Jurisdiction</p>
              <p className="text-sm text-slate-800">{countryMeta.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{companyDetails.jurisdictionState || "All states"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Pack: {companyDetails.compliancePack}</p>
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
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Save Company Details
            </button>
          </div>
          <PackMetadataPanel
            country={companyDetails.jurisdictionCountry}
            state={companyDetails.jurisdictionState}
            addToast={addToast}
          />
        </div>
      )}

      {activeTab === 2 && (
        <ContributionRatesTable documents={documents} country={companyDetails.jurisdictionCountry} />
      )}
      {activeTab === 3 && (
        <TaxSlabTable documents={documents} country={companyDetails.jurisdictionCountry} />
      )}
      {activeTab === 4 && (
        <ComplianceDocumentUpload
          country={companyDetails.jurisdictionCountry}
          addToast={addToast}
          documents={documents}
          setDocuments={setDocuments}
        />
      )}
    </div>
  );
}
