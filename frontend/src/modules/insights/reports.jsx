import { useState, useEffect } from "react";
import { getCustomReportsData, getSavedReportsData } from "../../service/insightsService";
import { FileText, Plus, BarChart3, Star, Clock, Download, Eye, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ==========================================
// EMBEDDED DEPENDENCIES & HELPERS
// ==========================================
const CHART_COLORS = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4"
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const StatsCard = ({ title, value, icon: Icon, subtitle }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
    {Icon && (
      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
        <Icon size={20} />
      </div>
    )}
  </div>
);

const FilterBar = ({ search, onSearchChange, filters = [], onFilterChange }) => (
  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
    <div className="relative w-full sm:flex-1">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder="Search reports..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
      />
    </div>
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => onFilterChange(filter.key, e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{filter.placeholder}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  </div>
);

const DataTable = ({ columns = [], data = [] }) => (
  <div className="overflow-x-auto w-full border border-gray-100 rounded-lg bg-white">
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
          {columns.map((col, idx) => <th key={idx} className="p-3">{col.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data && data.length > 0 ? (
          data.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
              {columns.map((col, cIdx) => (
                <td key={cIdx} className="p-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr><td colSpan={columns.length} className="p-8 text-center text-gray-400">No reports matched.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const tabs = [
  { id: "custom", label: "Custom Reports" },
  { id: "saved", label: "Saved Reports" },
];

export default function Reports({ defaultTab = "custom" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [customData, setCustomData] = useState(null);
  const [savedData, setSavedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", format: "" });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCustomReportsData().then(setCustomData).catch(() => {}),
      getSavedReportsData().then(setSavedData).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const targetedSource = activeTab === "custom" ? customData?.reports || [] : savedData || [];
  const filteredReports = targetedSource.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.createdBy?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.type && r.type !== filters.type) return false;
    if (filters.format && r.format?.toLowerCase() !== filters.format.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Repository</h1>
          <p className="text-sm text-gray-500 mt-1">Export, design and configure operational custom reports summaries</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> New Report
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSearch(""); setFilters({ type: "", format: "" }); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Total Formulated" value={targetedSource.length} icon={FileText} subtitle="Generated files" />
        <StatsCard title="Most Exported Format" value="PDF Document" icon={Download} />
        <StatsCard title="Automated Schedules" value="4 Active Runs" icon={Clock} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={[
          { key: "type", placeholder: "All Types", value: filters.type, options: ["Financial", "Workforce", "Compliance", "Project", "Inventory", "Payroll"].map(t => ({ value: t, label: t })) },
          { key: "format", placeholder: "All Formats", value: filters.format, options: [{ value: "pdf", label: "PDF" }, { value: "excel", label: "Excel" }, { value: "csv", label: "CSV" }] }
        ]}
        onFilterChange={handleFilterChange}
      />

      <DataTable
        columns={[
          { key: "name", label: "Report Title", render: (v) => <span className="font-medium text-gray-900">{v}</span> },
          { key: "type", label: "Classification" },
          { key: "createdDate", label: "Generated Date", render: (v) => formatDate(v) },
          { key: "createdBy", label: "Owner / Author" },
          { key: "format", label: "Format", render: (v) => <span className="uppercase text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{v || "pdf"}</span> },
          {
            key: "actions",
            label: "Action",
            render: () => (
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Eye size={12} /> Preview</button>
                <button className="text-gray-500 hover:text-gray-700 flex items-center gap-1"><Download size={12} /> Download</button>
              </div>
            )
          }
        ]}
        data={filteredReports}
      />
    </div>
  );
}