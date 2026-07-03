import { useState, useEffect } from "react";
import { getRisks, getRiskRegister, updateRisk } from "../../service/complyService";
import { AlertTriangle, TrendingUp, Target, Shield, ArrowUpCircle, TrendingDown, Minus, Search } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

function StatsCard({ title, value, change, trend, icon: Icon }) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-400";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {Icon && <div className="p-2 bg-emerald-50 rounded-lg"><Icon className="w-5 h-5 text-emerald-600" /></div>}
      </div>
      {change != null && (
        <div className="flex items-center gap-1 mt-3">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span className={`text-sm font-medium ${trendColor}`}>
            {change > 0 ? "+" : ""}{change}%
          </span>
          <span className="text-sm text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

function FilterBar({ search, onSearchChange, filters = [], onFilterChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>
      {filters.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => onFilterChange(f.key, e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">{f.placeholder}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No data available</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`hover:bg-emerald-50/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const colorClass = statusColor(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {status ? status.replace(/_/g, " ") : "N/A"}
    </span>
  );
}

function statusColor(status) {
  const map = {
    active: "bg-emerald-100 text-emerald-800",
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800",
    archived: "bg-gray-100 text-gray-800",
    expired: "bg-red-100 text-red-800",
    open: "bg-red-100 text-red-800",
    investigating: "bg-blue-100 text-blue-800",
    resolved: "bg-emerald-100 text-emerald-800",
    closed: "bg-gray-100 text-gray-800",
    mitigated: "bg-yellow-100 text-yellow-800",
    planned: "bg-gray-100 text-gray-800",
    planning: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    low: "bg-gray-100 text-gray-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
    overdue: "bg-red-100 text-red-800",
    waived: "bg-purple-100 text-purple-800",
    regulatory: "bg-purple-100 text-purple-800",
    legal: "bg-indigo-100 text-indigo-800",
    contractual: "bg-cyan-100 text-cyan-800",
    internal: "bg-slate-100 text-slate-800",
    industry: "bg-amber-100 text-amber-800",
    identified: "bg-yellow-100 text-yellow-800",
    assessed: "bg-blue-100 text-blue-800",
    mitigating: "bg-orange-100 text-orange-800",
    accepted: "bg-gray-100 text-gray-800",
    transferred: "bg-purple-100 text-purple-800",
    avoided: "bg-emerald-100 text-emerald-800",
    financial: "bg-emerald-100 text-emerald-800",
    operational: "bg-amber-100 text-amber-800",
    strategic: "bg-blue-100 text-blue-800",
    compliance: "bg-purple-100 text-purple-800",
    reputational: "bg-pink-100 text-pink-800",
    monitored: "bg-cyan-100 text-cyan-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

export default function RiskManagement() {
  const [risks, setRisks] = useState([]);
  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", status: "" });
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [treatmentPlan, setTreatmentPlan] = useState("");

  useEffect(() => {
    Promise.all([getRisks(), getRiskRegister()])
      .then(([r, reg]) => { setRisks(r); setRegister(reg); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const filtered = (risks || []).filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.owner?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  const handleAddTreatment = () => {
    if (!treatmentPlan.trim() || !selectedRisk) return;
    updateRisk(selectedRisk.id, { treatmentPlan });
    setSelectedRisk(prev => ({ ...prev, treatmentPlan }));
    setTreatmentPlan("");
  };

  if (loading) return <div className="p-6 text-gray-500">Loading risk data...</div>;

  const filterConfig = [
    { key: "category", placeholder: "All Categories", value: filters.category, options: [
      { value: "strategic", label: "Strategic" }, { value: "operational", label: "Operational" },
      { value: "financial", label: "Financial" }, { value: "compliance", label: "Compliance" },
      { value: "reputational", label: "Reputational" },
    ]},
    { key: "status", placeholder: "All Statuses", value: filters.status, options: [
      { value: "identified", label: "Identified" }, { value: "assessed", label: "Assessed" },
      { value: "mitigated", label: "Mitigated" }, { value: "monitored", label: "Monitored" },
      { value: "closed", label: "Closed" },
    ]},
  ];

  const severityColors = {
    critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
  };

  const riskDistData = register ? Object.entries(register.severityDistribution || {}).map(([name, value]) => ({ name, value, color: severityColors[name] || "#6b7280" })) : [];

  if (selectedRisk) {
    return (
      <div className="space-y-6 max-w-4xl">
        <button onClick={() => setSelectedRisk(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">← Back to Risk Register</button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={selectedRisk.severity} />
                <StatusBadge status={selectedRisk.status} />
                <StatusBadge status={selectedRisk.category} />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{selectedRisk.title}</h2>
              <p className="text-xs text-gray-500 mt-1">Score: {selectedRisk.score} | Owner: {selectedRisk.owner || "Unassigned"}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{selectedRisk.description}</p>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Likelihood</p>
              <p className="font-medium text-gray-900">{selectedRisk.likelihood || "N/A"}/5</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Impact</p>
              <p className="font-medium text-gray-900">{selectedRisk.impact || "N/A"}/5</p>
            </div>
          </div>
          {selectedRisk.mitigation && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Current Mitigation</p>
              <p className="text-sm text-gray-700">{selectedRisk.mitigation}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Treatment Plan</h3>
          {selectedRisk.treatmentPlan ? (
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-blue-800">{selectedRisk.treatmentPlan}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">No treatment plan defined yet.</p>
          )}
          <div className="flex gap-2">
            <input type="text" value={treatmentPlan} onChange={e => setTreatmentPlan(e.target.value)} placeholder="Add treatment plan..." className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" onKeyDown={e => { if (e.key === "Enter") handleAddTreatment(); }} />
            <button onClick={handleAddTreatment} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"><ArrowUpCircle className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
        <p className="text-sm text-gray-500 mt-1">Identify, assess, and mitigate compliance risks</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Risks" value={register?.total || risks.length} icon={AlertTriangle} />
        <StatsCard title="Critical" value={register?.severityDistribution?.critical || 0} icon={Target} trend="down" change={0} />
        <StatsCard title="High" value={register?.severityDistribution?.high || 0} icon={TrendingUp} />
        <StatsCard title="Mitigated" value={risks.filter(r => ["mitigated", "monitored", "closed"].includes(r.status)).length} icon={Shield} trend="up" change={8} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={riskDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {riskDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Register</h3>
          <FilterBar search={search} onSearchChange={setSearch} filters={filterConfig} onFilterChange={updateFilter} />
          <DataTable
            columns={[
              { key: "title", label: "Risk", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
              { key: "category", label: "Category", render: (v) => <StatusBadge status={v} /> },
              { key: "score", label: "Score", render: (v, r) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${v >= 15 ? "bg-red-100 text-red-700" : v >= 10 ? "bg-orange-100 text-orange-700" : v >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{v}</span> },
              { key: "owner", label: "Owner" },
              { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
            ]}
            onRowClick={(row) => setSelectedRisk(row)}
            data={filtered}
          />
        </div>
      </div>
    </div>
  );
}
