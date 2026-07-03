import { useState, useEffect } from "react";
import { getControls, getControlsLibrary } from "../../service/complyService";
import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

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
    active: "bg-green-50 text-green-700 border-green-100",
    inactive: "bg-gray-100 text-gray-700 border-gray-200",
    not_implemented: "bg-red-50 text-red-700 border-red-100",
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

export default function Controls() {
  const [controls, setControls] = useState([]);
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ framework: "", status: "" });
  const [selectedControl, setSelectedControl] = useState(null);

  useEffect(() => {
    Promise.all([getControls(), getControlsLibrary()])
      .then(([c, lib]) => { setControls(c); setLibrary(lib); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const filtered = (controls || []).filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.framework?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.framework && c.framework !== filters.framework) return false;
    if (filters.status && c.status !== filters.status) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-gray-500">Loading controls...</div>;

  const filterConfig = [
    { key: "framework", placeholder: "All Frameworks", value: filters.framework, options: [
      { value: "ISO 27001", label: "ISO 27001" }, { value: "SOC 2", label: "SOC 2" },
      { value: "PCI DSS", label: "PCI DSS" }, { value: "GDPR", label: "GDPR" },
      { value: "HIPAA", label: "HIPAA" }, { value: "NIST", label: "NIST" },
    ]},
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
      { value: "not_implemented", label: "Not Implemented" },
    ]},
  ];

  const statusColors = { active: "#22c55e", inactive: "#6b7280", not_implemented: "#ef4444" };
  const libStatusData = library ? Object.entries(library.statusDistribution || {}).map(([name, value]) => ({ name, value, color: statusColors[name] || "#6b7280" })) : [];

  if (selectedControl) {
    return (
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => setSelectedControl(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back to Controls</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedControl.status} />
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">{selectedControl.framework}</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{selectedControl.name}</h2>
              <p className="text-xs text-gray-500 mt-1">ID: {selectedControl.controlId} | Owner: {selectedControl.owner}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{selectedControl.description}</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Last Tested</p>
              <p className="text-sm font-medium text-gray-900">{selectedControl.lastTested ? formatDate(selectedControl.lastTested) : "Never"}</p>
            </div>
            {selectedControl.testingFrequency && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Testing Frequency</p>
                <p className="text-sm font-medium text-gray-900">{selectedControl.testingFrequency}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">Evidence</p>
              {selectedControl.evidenceCount > 0 ? (
                <p className="text-sm font-medium text-gray-900">{selectedControl.evidenceCount} item(s)</p>
              ) : (
                <p className="text-sm text-gray-400">No evidence attached</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Controls</h1>
        <p className="text-sm text-gray-500 mt-1">Control library and effectiveness monitoring</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Controls" value={library?.total || controls.length} icon={Shield} />
        <StatsCard title="Active" value={library?.statusDistribution?.active || 0} icon={CheckCircle} trend="up" change={5} />
        <StatsCard title="Inactive" value={library?.statusDistribution?.inactive || 0} icon={Clock} />
        <StatsCard title="Not Implemented" value={library?.statusDistribution?.not_implemented || 0} icon={AlertTriangle} trend="down" change={0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={libStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {libStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Controls Library</h3>
          <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />
          <DataTable
            columns={[
              { key: "name", label: "Control", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
              { key: "controlId", label: "Control ID", render: (v) => <span className="font-mono text-xs text-gray-500">{v}</span> },
              { key: "framework", label: "Framework", render: (v) => <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">{v}</span> },
              { key: "owner", label: "Owner" },
              { key: "lastTested", label: "Last Tested", render: (v) => v ? formatDate(v) : <span className="text-gray-400">Never</span> },
              { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            ]}
            onRowClick={(row) => setSelectedControl(row)}
            data={filtered}
          />
        </div>
      </div>
    </div>
  );
}