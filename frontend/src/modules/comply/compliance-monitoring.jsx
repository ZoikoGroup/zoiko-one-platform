import { useState, useEffect } from "react";
import { getObligations, getEvidence, uploadEvidence } from "../../service/complyService";
import { CalendarDays, Upload, CheckCircle, Clock, AlertTriangle } from "lucide-react";

// ==========================================
// INTERNAL MOCKED COMPONENTS (NO DEPENDENCIES)
// ==========================================

const StatsCard = ({ title, value, icon: Icon, trend, change }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      {change !== undefined && change !== 0 && (
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
              No items discovered.
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
    pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
    in_progress: "bg-blue-50 text-blue-700 border-blue-100",
    completed: "bg-green-50 text-green-700 border-green-100",
    overdue: "bg-red-50 text-red-700 border-red-100",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rejected: "bg-rose-50 text-rose-700 border-rose-100",
    regulatory: "bg-purple-50 text-purple-700 border-purple-100",
    contractual: "bg-indigo-50 text-indigo-700 border-indigo-100",
    internal: "bg-gray-100 text-gray-700 border-gray-200",
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

export default function ComplianceMonitoring() {
  const [activeTab, setActiveTab] = useState("obligations");
  const [obligations, setObligations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "" });

  useEffect(() => {
    setLoading(true);
    const p = activeTab === "obligations" ? getObligations() : getEvidence();
    p.then(setEvidence).catch(() => {}).finally(() => setLoading(false));
    if (activeTab === "obligations") getObligations().then(setObligations).catch(() => {});
  }, [activeTab]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const [selectedObligation, setSelectedObligation] = useState(null);

  const filtered = ((activeTab === "obligations" ? obligations : evidence) || []).filter(item => {
    if (search && !(item.title || item.name || "").toLowerCase().includes(search.toLowerCase()) && !(item.owner || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.type && item.type !== filters.type) return false;
    return true;
  });

  const filterConfig = activeTab === "obligations" ? [
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "pending", label: "Pending" }, { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" }, { value: "overdue", label: "Overdue" },
    ]},
    { key: "type", placeholder: "All Types", value: filters.type, options: [
      { value: "regulatory", label: "Regulatory" }, { value: "contractual", label: "Contractual" },
      { value: "internal", label: "Internal" },
    ]},
  ] : [
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
    ]},
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadEvidence({ name: file.name, type: file.type, size: file.size });
    setEvidence(prev => [...prev, { id: Date.now(), name: file.name, status: "pending", uploadedBy: "Current User", uploadedDate: new Date().toISOString().split("T")[0] }]);
    e.target.value = "";
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  const tabContent = activeTab === "obligations" ? (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Obligations" value={obligations.length} icon={CalendarDays} />
        <StatsCard title="Overdue" value={obligations.filter(o => o.status === "overdue").length} icon={AlertTriangle} trend="down" change={0} />
        <StatsCard title="In Progress" value={obligations.filter(o => o.status === "in_progress").length} icon={Clock} />
        <StatsCard title="Completed" value={obligations.filter(o => o.status === "completed").length} icon={CheckCircle} trend="up" change={5} />
      </div>
      <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />
      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "title", label: "Obligation", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "type", label: "Type", render: (v) => <StatusBadge status={v} /> },
            { key: "owner", label: "Owner" },
            { key: "dueDate", label: "Due Date", render: (v) => formatDate(v) },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
          ]}
          onRowClick={(row) => setSelectedObligation(row)}
          data={filtered}
        />
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100">
            <Upload className="w-4 h-4" /> Upload Evidence
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "name", label: "File Name", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "uploadedBy", label: "Uploaded By" },
            { key: "uploadedDate", label: "Date", render: (v) => formatDate(v) },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
          ]}
          data={filtered}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">Track obligations and manage evidence repository</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("obligations")} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === "obligations" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Obligations</button>
        <button onClick={() => setActiveTab("evidence")} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === "evidence" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Evidence Repository</button>
      </div>

      {tabContent}
    </div>
  );
}