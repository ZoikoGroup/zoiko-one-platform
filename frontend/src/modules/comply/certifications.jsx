import { useState, useEffect } from "react";
import { getCertifications } from "../../service/complyService";
import { Award, FileCheck, AlertTriangle } from "lucide-react";

// ==========================================
// INTERNAL MOCKED COMPONENTS (NO DEPENDENCIES)
// ==========================================

const DataTable = ({ columns = [], data = [], onRowClick }) => (
  <div className="overflow-x-auto w-full border border-gray-100 rounded-lg">
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
          {columns.map((col, idx) => (
            <th key={idx} className="p-3">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data && data.length > 0 ? (
          data.map((row, rIdx) => (
            <tr 
              key={rIdx} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-b border-gray-100 hover:bg-gray-50 text-gray-700 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="p-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="p-8 text-center text-gray-400">
              No certifications found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  const badgeStyles = {
    active: "bg-green-50 text-green-700 border-green-100",
    in_progress: "bg-blue-50 text-blue-700 border-blue-100",
    expired: "bg-red-50 text-red-700 border-red-100",
    pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };

  const style = badgeStyles[normalized] || "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${style}`}>
      {normalized.replace("_", " ")}
    </span>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
};

// ==========================================
// MAIN MODULE EXPORT
// ==========================================

export default function Certifications() {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getCertifications().then(setCertifications).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading certifications...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certifications</h1>
        <p className="text-sm text-gray-500 mt-1">Manage compliance certifications and accreditation status</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Certifications</p>
              <p className="text-lg font-bold text-gray-900">{certifications.filter(c => c.status === "active").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">In Progress</p>
              <p className="text-lg font-bold text-gray-900">{certifications.filter(c => c.status === "in_progress").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Expiring Soon</p>
              <p className="text-lg font-bold text-gray-900">{certifications.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "name", label: "Certification", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "standard", label: "Standard", render: (v) => <span className="text-sm text-gray-600">{v}</span> },
            { key: "issuedDate", label: "Issued", render: (v) => formatDate(v) },
            { key: "expiryDate", label: "Expiry", render: (v) => formatDate(v) },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            { key: "auditor", label: "Auditor" },
          ]}
          data={certifications}
        />
      </div>
    </div>
  );
}