import { useState, useEffect } from "react";
import { getPolicies, getPoliciesSummary } from "../../service/complyService";
import { FileText, Shield, CheckCircle, Clock, AlertTriangle, History, User } from "lucide-react";

// ==========================================
// INTERNAL MOCKED COMPONENTS (NO DEPENDENCIES)
// ==========================================

const StatsCard = ({ title, value, icon: Icon, trend, change }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      {change && (
        <span className={`text-xs font-medium mt-1 inline-block ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? '↑' : '↓'} {change}%
        </span>
      )}
    </div>
    {Icon && (
      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
        <Icon size={20} />
      </div>
    )}
  </div>
);

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
              No entries found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const FilterBar = ({ search, onSearchChange, filters = [], onFilterChange }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
    <div className="relative w-full sm:w-72">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-4 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
      />
    </div>
    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => onFilterChange(f.key, e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="">{f.placeholder}</option>
          {f.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  const badgeStyles = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    pending_review: "bg-yellow-50 text-yellow-700 border-yellow-100",
    approved: "bg-blue-50 text-blue-700 border-blue-100",
    published: "bg-green-50 text-green-700 border-green-100",
    archived: "bg-red-50 text-red-600 border-red-100",
    security: "bg-purple-50 text-purple-700 border-purple-100",
    data_privacy: "bg-indigo-50 text-indigo-700 border-indigo-100",
    hr: "bg-pink-50 text-pink-700 border-pink-100",
    finance: "bg-amber-50 text-amber-700 border-amber-100",
    operations: "bg-cyan-50 text-cyan-700 border-cyan-100",
    legal: "bg-orange-50 text-orange-700 border-orange-100",
    it: "bg-teal-50 text-teal-700 border-teal-100",
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
// MAIN EXPORT
// ==========================================

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([getPolicies(), getPoliciesSummary()])
      .then(([p, s]) => { setPolicies(p); setSummary(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", status: "" });
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const filtered = (policies || []).filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-gray-500">Loading policies...</div>;

  const filterConfig = [
    { key: "category", placeholder: "All Categories", value: filters.category, options: [
      { value: "security", label: "Security" }, { value: "data_privacy", label: "Data Privacy" },
      { value: "hr", label: "HR" }, { value: "finance", label: "Finance" },
      { value: "operations", label: "Operations" }, { value: "legal", label: "Legal" },
      { value: "it", label: "IT" },
    ]},
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "draft", label: "Draft" }, { value: "pending_review", label: "Pending Review" },
      { value: "approved", label: "Approved" }, { value: "published", label: "Published" },
      { value: "archived", label: "Archived" },
    ]},
  ];

  if (selectedPolicy) {
    const versions = [
      { version: "4.2", date: "2026-01-15", status: "published", author: "CISO" },
      { version: "4.1", date: "2025-07-01", status: "archived", author: "CISO" },
      { version: "4.0", date: "2025-01-10", status: "archived", author: "IT Director" },
      { version: "3.2", date: "2024-06-15", status: "archived", author: "IT Director" },
    ];
    return (
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => setSelectedPolicy(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back to Policies</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedPolicy.category} />
                <StatusBadge status={selectedPolicy.status} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{selectedPolicy.title}</h2>
              <p className="text-xs text-gray-500 mt-1">Version {selectedPolicy.version} | Owner: {selectedPolicy.owner}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Effective: {formatDate(selectedPolicy.effectiveDate)}</p>
              <p>Review: {formatDate(selectedPolicy.reviewDate)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{selectedPolicy.description}</p>
          {selectedPolicy.acknowledgementRequired && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Employee Acknowledgment</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2.5 bg-gray-200 rounded-full">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(selectedPolicy.acknowledgedCount / selectedPolicy.totalEmployees) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{selectedPolicy.acknowledgedCount}/{selectedPolicy.totalEmployees}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Version History</h3>
          <DataTable
            columns={[
              { key: "version", label: "Version", render: (v) => <span className="font-mono font-medium">{v}</span> },
              { key: "date", label: "Date", render: (v) => formatDate(v) },
              { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
              { key: "author", label: "Author" },
            ]}
            data={versions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
        <p className="text-sm text-gray-500 mt-1">Manage enterprise policies, versions, and employee acknowledgments</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard title="Total Policies" value={summary?.total || 55} icon={FileText} />
        <StatsCard title="Published" value={summary?.byStatus?.published || 0} icon={Shield} trend="up" change={2} />
        <StatsCard title="Draft" value={summary?.byStatus?.draft || 0} icon={Clock} />
        <StatsCard title="Pending Review" value={summary?.byStatus?.pending_review || 0} icon={AlertTriangle} />
        <StatsCard title="Compliance Rate" value={`${summary?.overallComplianceRate || 0}%`} icon={CheckCircle} trend="up" change={3} />
      </div>

      <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />

      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "title", label: "Policy", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "category", label: "Category", render: (v) => <StatusBadge status={v} /> },
            { key: "owner", label: "Owner" },
            { key: "version", label: "Version", render: (v) => <span className="font-mono text-xs">{v}</span> },
            { key: "reviewDate", label: "Review Date", render: (v) => formatDate(v) },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
          ]}
          onRowClick={(row) => setSelectedPolicy(row)}
          data={filtered}
        />
      </div>
    </div>
  );
}