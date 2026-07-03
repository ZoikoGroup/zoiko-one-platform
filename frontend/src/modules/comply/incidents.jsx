import { useState, useEffect } from "react";
import { getIncidents, getIncidentsSummary, getIncidentById, updateIncident } from "../../service/complyService";
import { AlertTriangle, AlertCircle, CheckCircle, Clock, MessageSquare } from "lucide-react";

// ==========================================
// INTERNAL MOCKED COMPONENTS (NO DEPENDENCIES)
// ==========================================

const StatsCard = ({ title, value, icon: Icon, trend, change }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1\">{value}</h3>
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
  <div className="overflow-x-auto w-full border border-gray-200 rounded-xl bg-white">
    <table className="w-full text-sm text-left text-gray-500">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-6 py-3 font-semibold">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-400">No records found</td>
          </tr>
        ) : (
          data.map((row, index) => (
            <tr 
              key={row.id || index} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const FilterBar = ({ search, onSearchChange, filters = [], onFilterChange }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between w-full">
    <div className="relative w-full sm:max-w-xs">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
    <div className="flex gap-2 w-full sm:w-auto justify-end">
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => onFilterChange(f.key, e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
  const config = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-blue-50 text-blue-700 border-blue-200",
    reported: "bg-gray-100 text-gray-700 border-gray-200",
    investigating: "bg-amber-50 text-amber-700 border-amber-200",
    contained: "bg-indigo-50 text-indigo-700 border-indigo-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-gray-50 text-gray-500 border-gray-200",
    required: "bg-purple-50 text-purple-700 border-purple-200"
  };
  const style = config[status?.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${style}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
};

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ severity: "", status: "" });
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (selectedIncident) {
      getIncidentById(selectedIncident.id).then(setSelectedIncident).catch(() => {});
    } else {
      setLoading(true);
      Promise.all([getIncidents(), getIncidentsSummary()])
        .then(([i, s]) => { setIncidents(i); setSummary(s); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [selectedIncident?.id]);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleStatusChange = (newStatus) => {
    updateIncident(selectedIncident.id, { status: newStatus })
      .then(() => setSelectedIncident(prev => ({ ...prev, status: newStatus })))
      .catch(() => {});
  };

  if (loading && !selectedIncident) return <div className="p-6 text-gray-500">Loading incidents...</div>;

  const filterConfig = [
    { key: "severity", placeholder: "All Severities", value: filters.severity, options: [
      { value: "critical", label: "Critical" }, { value: "high", label: "High" },
      { value: "medium", label: "Medium" }, { value: "low", label: "Low" },
    ]},
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "reported", label: "Reported" }, { value: "investigating", label: "Investigating" },
      { value: "contained", label: "Contained" }, { value: "resolved", label: "Resolved" },
      { value: "closed", label: "Closed" },
    ]},
  ];

  const filtered = (incidents || []).filter(item => {
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase()) && !item.assignee?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });

  if (selectedIncident) {
    return (
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => setSelectedIncident(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back to Incidents</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedIncident.severity} />
                <StatusBadge status={selectedIncident.status} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{selectedIncident.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Reported on {formatDate(selectedIncident.reportedDate)}</p>
            </div>
            <div className="flex gap-2">
              <select 
                value={selectedIncident.status} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value="reported">Reported</option>
                <option value="investigating">Investigating</option>
                <option value="contained">Contained</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">{selectedIncident.description || "No description provided."}</p>

          <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4 mb-6 text-sm">
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold">Assignee</span>
              <span className="text-gray-800 font-medium">{selectedIncident.assignee || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase font-semibold">Regulatory Reporting</span>
              {selectedIncident.regulatoryReporting ? <StatusBadge status="required" /> : <span className="text-gray-500">Not Required</span>}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5"><MessageSquare size={16} /> Audit Trail & Comments</h4>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
              {(selectedIncident.comments || []).map((c, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                  <div className="flex justify-between font-medium text-gray-700 mb-1">
                    <span>{c.user}</span>
                    <span className="text-gray-400">{formatDate(c.date)}</span>
                  </div>
                  <p className="text-gray-600">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Add an update note..." 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button 
                onClick={() => {
                  if(!comment.trim()) return;
                  const n = [...(selectedIncident.comments || []), { user: "Current User", text: comment, date: new Date().toISOString() }];
                  updateIncident(selectedIncident.id, { comments: n }).then(() => {
                    setSelectedIncident(prev => ({ ...prev, comments: n }));
                    setComment("");
                  });
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage compliance violations or data breaches</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Open Incidents" value={summary?.open || 0} icon={AlertCircle} />
        <StatsCard title="Critical" value={summary?.bySeverity?.critical || 0} icon={AlertTriangle} trend="down" change={0} />
        <StatsCard title="Investigating" value={summary?.byStatus?.investigating || 0} icon={Clock} />
        <StatsCard title="Resolved" value={summary?.byStatus?.resolved || 0} icon={CheckCircle} trend="up" change={12} />
      </div>

      <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />

      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={[
            { key: "title", label: "Incident", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
            { key: "severity", label: "Severity", render: (v) => <StatusBadge status={v} /> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            { key: "assignee", label: "Assignee" },
            { key: "reportedDate", label: "Reported", render: (v) => formatDate(v) },
            { key: "regulatoryReporting", label: "Regulatory", render: (v) => v ? <StatusBadge status="required" /> : <span className="text-gray-400">No</span> },
          ]}
          data={filtered}
          onRowClick={setSelectedIncident}
        />
      </div>
    </div>
  );
}