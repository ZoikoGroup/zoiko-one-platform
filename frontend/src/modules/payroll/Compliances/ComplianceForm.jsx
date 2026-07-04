import { Shield } from "lucide-react";

export default function ComplianceForm({ companyDetails, onUpdate, addToast }) {
  const handleChange = (field, value) => {
    if (onUpdate) onUpdate(field, value);
  };

  const fields = [
    { label: "Company Legal Name", field: "name", type: "text" },
    { label: "Company Type", field: "type", type: "text" },
    { label: "Tax Registration No. (PAN/GST)", field: "taxNo", type: "text" },
    { label: "Employer ID", field: "employerId", type: "text" },
    { label: "Registered Address", field: "address", type: "text" },
    { label: "Industry", field: "industry", type: "text" },
    { label: "Jurisdiction — Country", field: "jurisdictionCountry", type: "text" },
    { label: "Jurisdiction — State", field: "jurisdictionState", type: "text" },
    { label: "Compliance Pack", field: "compliancePack", type: "text" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Shield size={18} className="text-violet-500" />
        <h3 className="text-base font-bold text-slate-800">Company Compliance Details</h3>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.field}>
            <label className="text-xs text-slate-500 mb-1 block font-medium">{f.label}</label>
            <input
              type={f.type}
              value={companyDetails?.[f.field] || ""}
              onChange={(e) => handleChange(f.field, e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
