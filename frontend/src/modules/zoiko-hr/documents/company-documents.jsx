import { useState, useEffect, useMemo } from "react";
import { Search, Building2, RefreshCw } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getDocuments } from "../../../service/hrService";

// ── Shared inline helpers ─────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { label: "Pending",  bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500"  },
  approved: { label: "Approved", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200",   dot: "bg-rose-500"   },
  expired:  { label: "Expired",  bg: "bg-slate-100",  text: "text-slate-500",  border: "border-slate-200",  dot: "bg-slate-400"  },
};
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};
const fileTypeIcon = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", pptx: "📑" };
  return map[ext] || "📎";
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "expired"];

export default function CompanyDocuments() {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = () => {
    setLoading(true);
    setError(null);
    getDocuments({ category: "company" })
      .then(res => { const raw = res?.data; setDocs(Array.isArray(raw) ? raw : (raw?.items || raw?.data || [])); })
      .catch(() => setError("Could not fetch company documents. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const companyDocs = useMemo(() =>
    docs
      .filter(d => statusFilter === "all" || d.status === statusFilter)
      .filter(d => !search.trim() || d.title?.toLowerCase().includes(search.trim().toLowerCase())),
    [docs, search, statusFilter]
  );

  return (
    <HRPage title="Company Documents">
      <div className="space-y-6 pb-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Company Documents</h2>
              <p className="text-sm text-slate-500">Policies, handbooks, and official company files.</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 self-start sm:self-center">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === s ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-medium">Loading company documents…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-rose-500 text-sm font-medium bg-rose-50 rounded-xl border border-rose-100 p-6">{error}</div>
        ) : companyDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🏢</span>
            <p className="text-base font-semibold text-slate-700 mb-1">
              {search || statusFilter !== "all" ? "No results found" : "No company documents yet"}
            </p>
            <p className="text-sm text-slate-400">
              {search || statusFilter !== "all" ? "Try adjusting your search or filter." : "Company policies and handbooks will appear here once uploaded."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 font-medium">{companyDocs.length} document{companyDocs.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companyDocs.map(d => (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3 group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl select-none shrink-0 mt-0.5">{fileTypeIcon(d.file_name || d.title)}</span>
                    <p className="font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {d.title}
                    </p>
                  </div>
                  {d.description && <p className="text-xs text-slate-400 line-clamp-2">{d.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <StatusBadge status={d.status} />
                    <span className="text-xs text-slate-400">{fmtDate(d.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </HRPage>
  );
}