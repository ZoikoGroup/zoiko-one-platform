import { Shield } from "lucide-react";
import { COMPLIANCE_COUNTRIES, getStatesForCountry } from "../../../service/payrollService";

// Text fields render as plain inputs. Jurisdiction fields render as selects
// (see FIELD_TYPES) so values stay consistent with what the tax/contribution
// engine expects, instead of free text that can drift ("India" vs "IN" vs
// "india "). Settlement fields were previously missing from this form even
// though they exist on companyDetails and on the CompanyComplianceDetails
// backend table — there was no way to ever set them through the UI.
const FIELDS = [
  { label: "Company Legal Name", field: "name", type: "text" },
  { label: "Company Type", field: "type", type: "text" },
  { label: "Tax Registration No. (PAN/GST)", field: "taxNo", type: "text" },
  { label: "Employer ID", field: "employerId", type: "text" },
  { label: "Registered Address", field: "address", type: "text" },
  { label: "Industry", field: "industry", type: "text" },
  { label: "Jurisdiction — Country", field: "jurisdictionCountry", type: "country-select" },
  { label: "Jurisdiction — State / Province", field: "jurisdictionState", type: "state-select" },
  { label: "Compliance Pack", field: "compliancePack", type: "text" },
  { label: "Settlement Bank", field: "settlementBank", type: "text" },
  { label: "Settlement Account Number", field: "settlementAcc", type: "text" },
];

export default function ComplianceForm({ companyDetails, onUpdate, addToast }) {
  const handleChange = (field, value) => {
    if (onUpdate) onUpdate(field, value);
  };

  const states = getStatesForCountry(companyDetails?.jurisdictionCountry);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Shield size={18} className="text-violet-500" />
        <h3 className="text-base font-bold text-slate-800">Company Compliance Details</h3>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELDS.map((f) => (
          <div key={f.field}>
            <label className="text-xs text-slate-500 mb-1 block font-medium">{f.label}</label>

            {f.type === "text" && (
              <input
                type="text"
                value={companyDetails?.[f.field] || ""}
                onChange={(e) => handleChange(f.field, e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white"
              />
            )}

            {f.type === "country-select" && (
              <select
                value={companyDetails?.[f.field] || ""}
                onChange={(e) => {
                  handleChange(f.field, e.target.value);
                  // Changing country invalidates whatever state was picked
                  // for the old country — clear it rather than leave a
                  // mismatched state/country pair silently sitting there.
                  handleChange("jurisdictionState", "");
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white"
              >
                <option value="">— Select country —</option>
                {COMPLIANCE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            )}

            {f.type === "state-select" && (
              <select
                value={companyDetails?.[f.field] || ""}
                onChange={(e) => handleChange(f.field, e.target.value)}
                disabled={states.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white disabled:text-slate-400"
              >
                <option value="">
                  {states.length === 0 ? "— No states configured for this country —" : "— All states —"}
                </option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Statutory deductions such as Professional Tax vary by state. Selecting a specific state here applies
        that state's rules company-wide — per-employee state assignment isn't supported yet.
      </p>
    </div>
  );
}