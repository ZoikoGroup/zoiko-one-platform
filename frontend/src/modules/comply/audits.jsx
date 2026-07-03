import { useState, useEffect } from "react";
import { getAudits, getAuditFindings, getAuditsSummary } from "../../service/complyService";
import { Search, FileCheck, ClipboardCheck, Clock, CheckCircle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

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
        {data.length > 0 ? (
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
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  
  // Custom design configurations based on the badge value strings used in the JSX below
  const badgeStyles = {
    planning: "bg-gray-100 text-gray-700 border-gray-200",
    active: "bg-blue-50 text-blue-700 border-blue-100",
    review: "bg-yellow-50 text-yellow-700 border-yellow-100",
    closed: "bg-green-50 text-green-700 border-green-100",
    high: "bg-red-50 text-red-700 border-red-100",
    medium: "bg-orange-50 text-orange-700 border-orange-100",
    low: "bg-gray-50 text-gray-600 border-gray-200",
    internal_audit: "bg-purple-50 text-purple-700 border-purple-100",
    external_audit: "bg-indigo-50 text-indigo-700 border-indigo-100",
    regulatory_audit: "bg-cyan-50 text-cyan-700 border-cyan-100",
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
// CORE COMPONENT
// ==========================================

export default function Audits() {
  const [audits, setAudits] = useState([]);
  const [findings, setFindings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditId, setAuditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", type: "" });
  const [selectedAudit, setSelectedAudit] = useState(null);

  useEffect(() => {
    if (auditId) {
      getAuditFindings(auditId).then(setFindings).catch(() => {}).finally(() => setLoading(false));
    } else {
      Promise.all([getAudits(), getAuditsSummary()])
        .then(([a, s]) => { setAudits(a); setSummary(s); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [auditId]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const filtered = (audits || []).filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.lead.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.type && a.type !== filters.type) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-gray-500">Loading audits...</div>;

  const filterConfig = [
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "planning", label: "Planning" }, { value: "active", label: "Active" },
      { value: "review", label: "Review" }, { value: "closed", label: "Closed" },
    ]},
    { key: "type", placeholder: "All Types", value: filters.type, options: [
      { value: "internal", label: "Internal" }, { value: "external", label: "External" },
      { value: "regulatory", label: "Regulatory" },
    ]},
  ];

  const auditStatusData = summary ? [
    { name: "Planning", value: summary.byStatus.planning, color: "#6b7280" },
    { name: "Active", value: summary.byStatus.active, color: "#3b82f6" },
    { name: "Review", value: summary.byStatus.review, color: "#eab308" },
    { name: "Closed", value: summary.byStatus.closed, color: "#22c55e" },
  ] : [];

  if (selectedAudit) {
    const auditFindings = findings.length > 0 ? findings : [];
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedAudit(null); setAuditId(null); }} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Back to Audits
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedAudit.type === "internal" ? "internal_audit" : selectedAudit.type === "external" ? "external_audit" : "regulatory_audit"} />
                <StatusBadge status={selectedAudit.status} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{selectedAudit.title}</h2>
              <p className="text-sm text-gray-500 mt-1">Lead: {selectedAudit.lead} | {formatDate(selectedAudit.startDate)} - {formatDate(selectedAudit.endDate)}</p>
            </div>
            {selectedAudit.progress != null && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-lg font-bold text-emerald-600">{selectedAudit.progress}%</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">{selectedAudit.scope}</p>
          {selectedAudit.team && <p className="text-xs text-gray-500">Team: {selectedAudit.team.join(", ")}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Findings ({auditFindings.length})</h3>
          {auditFindings.length > 0 ? (
            <DataTable
              columns={[
                { key: "title", label: "Finding", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
                { key: "severity", label: "Severity", render: (v) => <StatusBadge status={v} /> },
                { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
                { key: "owner", label: "Owner" },
                { key: "dueDate", label: "Due Date", render: (v) => formatDate(v) },
              ]}
              data={auditFindings}
            />
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No findings recorded for this audit</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
        <p className="text-sm text-gray-500 mt-1">Manage audit programs, findings, and corrective actions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Audits" value={summary?.total || 20} icon={Search} />
        <StatsCard title="Active" value={summary?.byStatus?.active || 0} icon={ClipboardCheck} trend="up" change={15} />
        <StatsCard title="In Review" value={summary?.byStatus?.review || 0} icon={Clock} />
        <StatsCard title="Completed" value={summary?.byStatus?.closed || 0} icon={CheckCircle} trend="up" change={10} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Audit Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={auditStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {auditStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Audit Programs</h3>
          <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />
          <DataTable
            columns={[
              { key: "title", label: "Audit", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
              { key: "lead", label: "Lead" },
              { key: "type", label: "Type", render: (v) => <StatusBadge status={`${v}_audit`} /> },
              { key: "startDate", label: "Start", render: (v) => formatDate(v) },
              { key: "progress", label: "Progress", render: (v) => <div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-200 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${v || 0}%` }} /></div><span className="text-xs text-gray-500">{v || 0}%</span></div> },
              { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            ]}
            onRowClick={(row) => { setSelectedAudit(row); setAuditId(row.id); }}
            data={filtered}
          />
        </div>
      </div>
    </div>
  );
}