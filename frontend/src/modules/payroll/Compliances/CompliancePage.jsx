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
    <div className="bg-[#F8F7F4] dark:bg-[#1A1816] min-h-screen p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[12px] bg-[#19C58A] flex items-center justify-center shadow-[0_2px_8px_rgba(25,197,138,0.3)]">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-[#1A1816] dark:text-[#F0EDE8]">Audit & Compliance</h1>
            <p className="text-[13px] font-medium text-[#9E9690]">Manage your statutory compliance</p>
          </div>
        </div>
        <span className="rounded-full bg-[#19C58A]/10 border border-[#19C58A]/20 px-3.5 py-1.5 text-[11px] font-bold text-[#19C58A]">
          {countryMeta.name} compliance pack
        </span>
      </div>

      <div className="flex gap-1 bg-[#F0EDE8] dark:bg-[#38312D] rounded-[14px] p-1 w-fit flex-wrap">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-[12px] text-[13px] font-semibold transition-all duration-200 ${
              activeTab === i ? "bg-white dark:bg-[#221D1A] text-[#19C58A] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#9E9690] hover:text-[#1A1816] dark:hover:text-[#F0EDE8]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[15px] font-bold text-[#1A1816] dark:text-[#F0EDE8] mb-5">Compliance Overview</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Company</p>
              <p className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{companyDetails.name}</p>
              <p className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">{companyDetails.type} · {companyDetails.industry}</p>
              <p className="text-[13px] text-[#9E9690]">Tax ID: {companyDetails.taxNo}</p>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9690]">Jurisdiction</p>
              <p className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{countryMeta.name}</p>
              <p className="text-[13px] text-[#6B6560] dark:text-[#A69B93]">{companyDetails.jurisdictionState || "All states"}</p>
              <p className="text-[13px] text-[#9E9690]">Pack: {companyDetails.compliancePack}</p>
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
              className="rounded-[12px] bg-[#19C58A] px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:bg-[#15B07A] shadow-[0_2px_8px_rgba(25,197,138,0.3)]"
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
